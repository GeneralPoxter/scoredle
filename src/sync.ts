import { RouteBases, Routes, type APIMessage } from 'discord-api-types/v10';
import getSyncChannelGamesSql from './db/queries/get_sync_channel_games.sql';
import { prepareUpsertScore } from './db/scores';
import { getSyncState, prepareSetSyncState } from './db/sync-state';
import { getGame, isGame, type GameId } from './games';
import { snowflakeToFormattedTime } from './utils/time';

interface SyncChannelGameRow {
    guild_id: string;
    channel_id: string;
    game_id: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function discordGet<T>(
    route: string,
    token: string,
    budget: { remaining: number },
): Promise<T | null> {
    while (budget.remaining > 0) {
        budget.remaining--;

        const res = await fetch(RouteBases.api + route, {
            headers: { Authorization: `Bot ${token}` },
        });

        if (res.status === 429) {
            const retryAfterSec = Number(res.headers.get('Retry-After') ?? '1');
            const waitMs = Math.ceil(retryAfterSec * 1000) + 100;
            console.warn(`[sync] Rate limited on ${route}; waiting ${waitMs}ms...`);
            await sleep(waitMs);
            continue;
        }

        if (!res.ok) {
            console.error(`[sync] Discord GET ${route} failed: ${res.status} ${res.statusText}`);
            return null;
        }

        const bucketRemaining = res.headers.get('X-RateLimit-Remaining');
        const resetAfterSec = res.headers.get('X-RateLimit-Reset-After');
        if (bucketRemaining === '0' && resetAfterSec) {
            const waitMs = Math.ceil(Number(resetAfterSec) * 1000) + 50;
            await sleep(waitMs);
        }

        return (await res.json()) as T;
    }

    return null;
}

async function syncChannel(
    guildId: string,
    channelId: string,
    gameIds: readonly GameId[],
    env: Env,
    budget: { remaining: number },
): Promise<void> {
    if (gameIds.length === 0 || budget.remaining <= 0) return;

    const pageSize = Number(env.PAGE_SIZE);

    const lastSyncedMessageId = new Map<GameId, string>();
    for (const gameId of gameIds) {
        const id = await getSyncState(env.DB, guildId, channelId, gameId);
        lastSyncedMessageId.set(gameId, id);
    }

    let oldestId = [...lastSyncedMessageId.values()].reduce((min, id) =>
        BigInt(id) < BigInt(min) ? id : min,
    );

    let totalMessagesFetched = 0;
    let totalScoresUpserted = 0;

    while (budget.remaining > 0) {
        const params = new URLSearchParams({
            after: oldestId,
            limit: String(pageSize),
        });

        const messages = await discordGet<APIMessage[]>(
            `${Routes.channelMessages(channelId)}?${params.toString()}`,
            env.DISCORD_TOKEN,
            budget,
        );

        if (!messages?.length) break;

        totalMessagesFetched += messages.length;

        const ordered = [...messages].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
        const newestMessageId = ordered[ordered.length - 1].id;

        const statements: D1PreparedStatement[] = [];

        const lastMessageIdMap = new Map<GameId, bigint>(
            [...lastSyncedMessageId.entries()].map(([game, id]) => [game, BigInt(id)]),
        );

        for (const msg of ordered) {
            // Filter messages authored by the bot, or which do not contain digits
            if (msg.author.bot || !/\d/.test(msg.content)) continue;

            const msgId = BigInt(msg.id);

            for (const [game, lastMsgId] of lastMessageIdMap) {
                if (msgId <= lastMsgId) continue;

                const res = getGame(game).parseScores(msg.content);
                for (const parsed of res) {
                    totalScoresUpserted++;
                    statements.push(
                        prepareUpsertScore(env.DB, {
                            guildId,
                            channelId,
                            userId: msg.author.id,
                            gameId: game,
                            puzzleId: parsed.puzzleId,
                            score: parsed.score,
                            sourceMessageId: msg.id,
                            submittedAt: msg.timestamp,
                        }),
                    );
                }
            }
        }

        for (const game of lastSyncedMessageId.keys()) {
            statements.push(prepareSetSyncState(env.DB, guildId, channelId, game, newestMessageId));
            lastSyncedMessageId.set(game, newestMessageId);
        }

        if (statements.length > 0) {
            await env.DB.batch(statements);
        }

        oldestId = newestMessageId;

        if (messages.length < pageSize) break;
    }

    if (totalMessagesFetched > 0) {
        const cursorSummary = [...lastSyncedMessageId.entries()]
            .map(([game, id]) => `${game} @ ${snowflakeToFormattedTime(id, env.TIMEZONE)}`)
            .join(', ');

        console.log(
            `[sync] Channel ${channelId}: fetched ${totalMessagesFetched} message(s), parsed ${totalScoresUpserted} score(s) [${cursorSummary}]`,
        );
    }
}

export async function syncDiscordMessages(env: Env): Promise<void> {
    console.log('[sync] Starting Discord message sync...');

    const { results } = await env.DB.prepare(getSyncChannelGamesSql).all<SyncChannelGameRow>();

    if (!results.length) {
        console.log('[sync] No active channel games configured; skipping.');
        return;
    }

    const byChannel = new Map<string, { guildId: string; channelId: string; gameIds: GameId[] }>();

    for (const row of results) {
        if (!isGame(row.game_id)) continue;
        const entry = byChannel.get(row.channel_id) ?? {
            guildId: row.guild_id,
            channelId: row.channel_id,
            gameIds: [],
        };
        entry.gameIds.push(row.game_id);
        byChannel.set(row.channel_id, entry);
    }

    const maxSubrequests = Number(env.MAX_SUBREQUESTS_PER_RUN);
    console.log(`[sync] Syncing ${byChannel.size} active channel(s) (budget=${maxSubrequests})...`);

    const budget = { remaining: maxSubrequests };

    for (const { guildId, channelId, gameIds } of byChannel.values()) {
        if (budget.remaining <= 0) {
            console.warn(
                '[sync] Subrequest budget exhausted; remaining channels will continue on next cron run.',
            );
            break;
        }
        await syncChannel(guildId, channelId, gameIds, env, budget);
    }

    console.log(
        `[sync] Sync complete (${maxSubrequests - budget.remaining} Discord API request(s) used).`,
    );
}
