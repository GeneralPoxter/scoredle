import { RouteBases, Routes, type APIMessage } from 'discord-api-types/v10';
import getSyncChannelGamesSql from './db/queries/get_sync_channel_games.sql';
import { prepareUpsertScore } from './db/scores';
import { getSyncState, prepareSetSyncState } from './db/sync-state';
import { getGame, isGame, type GameId } from './games';

const PAGE_SIZE = 100;
const MAX_SUBREQUESTS_PER_RUN = 45; // Safe for Cloudflare Free plan (50 subrequest limit)

interface ActiveChannelGameRow {
    guild_id: string;
    channel_id: string;
    game: string;
}

async function discordGet<T>(route: string, token: string): Promise<T | null> {
    const res = await fetch(RouteBases.api + route, {
        headers: { Authorization: `Bot ${token}` },
    });

    if (!res.ok) {
        console.error(`[sync] Discord GET ${route} failed: ${res.status} ${res.statusText}`);
        return null;
    }

    return (await res.json()) as T;
}

async function syncChannel(
    guildId: string,
    channelId: string,
    games: readonly GameId[],
    env: Env,
    budget: { remaining: number },
): Promise<void> {
    if (games.length === 0 || budget.remaining <= 0) return;

    const lastSyncedMessageId = new Map<GameId, string>();
    for (const game of games) {
        const id = await getSyncState(env.DB, guildId, channelId, game);
        lastSyncedMessageId.set(game, id);
    }

    let oldestId = [...lastSyncedMessageId.values()].reduce((min, id) =>
        BigInt(id) < BigInt(min) ? id : min,
    );

    let totalMessagesFetched = 0;
    let totalScoresUpserted = 0;

    while (budget.remaining > 0) {
        budget.remaining--;

        const params = new URLSearchParams({
            after: oldestId,
            limit: String(PAGE_SIZE),
        });

        const messages = await discordGet<APIMessage[]>(
            `${Routes.channelMessages(channelId)}?${params.toString()}`,
            env.DISCORD_TOKEN,
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

                const parsed = getGame(game).parseScore(msg.content);
                if (!parsed) continue;

                totalScoresUpserted++;
                statements.push(
                    prepareUpsertScore(env.DB, {
                        guildId,
                        channelId,
                        userId: msg.author.id,
                        game,
                        puzzleId: parsed.puzzleId,
                        score: parsed.score,
                        sourceMessageId: msg.id,
                    }),
                );
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

        if (messages.length < PAGE_SIZE) break;
    }

    if (totalMessagesFetched > 0) {
        console.log(
            `[sync] Channel ${channelId} (${games.join(', ')}): fetched ${totalMessagesFetched} message(s), parsed ${totalScoresUpserted} score(s), lastMessageId=${oldestId}`,
        );
    }
}

export async function syncDiscordMessages(env: Env): Promise<void> {
    console.log('[sync] Starting Discord message sync...');

    const { results } = await env.DB.prepare(getSyncChannelGamesSql).all<ActiveChannelGameRow>();

    if (!results.length) {
        console.log('[sync] No active channel games configured; skipping.');
        return;
    }

    const byChannel = new Map<string, { guildId: string; channelId: string; games: GameId[] }>();

    for (const row of results) {
        if (!isGame(row.game)) continue;
        const entry = byChannel.get(row.channel_id) ?? {
            guildId: row.guild_id,
            channelId: row.channel_id,
            games: [],
        };
        entry.games.push(row.game);
        byChannel.set(row.channel_id, entry);
    }

    console.log(`[sync] Syncing ${byChannel.size} active channel(s)...`);

    const budget = { remaining: MAX_SUBREQUESTS_PER_RUN };

    for (const { guildId, channelId, games } of byChannel.values()) {
        if (budget.remaining <= 0) {
            console.warn(
                '[sync] Subrequest budget exhausted; remaining channels will continue on next cron run.',
            );
            break;
        }
        await syncChannel(guildId, channelId, games, env, budget);
    }

    console.log(
        `[sync] Sync complete (${MAX_SUBREQUESTS_PER_RUN - budget.remaining} Discord API request(s) used).`,
    );
}
