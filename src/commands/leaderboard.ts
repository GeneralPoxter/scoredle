import {
    InteractionResponseType,
    MessageFlags,
    RouteBases,
    Routes,
    type APIEmbed,
    type APIInteractionResponse,
    type RESTPostAPIChannelMessageJSONBody,
} from 'discord-api-types/v10';

import { getDailyLeaderboard, getLeaderboard } from '../db/results';
import { getActiveChannelGames } from '../db/sync-state';
import { getGame, type GameId } from '../games';
import { getTodayWindowUtc } from '../utils/time';
import { defineGameCommand } from './utils';

const LEADERBOARD_SIZE = 10;
const MEDALS = ['🥇', '🥈', '🥉'] as const;

function formatRank(index: number): string {
    return MEDALS[index] ?? `**#${index + 1}**`;
}

export const leaderboardCommand = defineGameCommand({
    meta: {
        name: 'leaderboard',
        description: 'Show the all-time leaderboard for a game',
    },
    async execute(gameId, interaction, env) {
        const game = getGame(gameId);
        const rows = await getLeaderboard(env.DB, {
            guildId: interaction.guild_id,
            channelId: interaction.channel.id,
            gameId,
            sortDirection: game.sortDirection,
        });

        if (rows.length === 0) {
            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: `No scores recorded yet for **${game.displayName}** in this channel.`,
                    flags: MessageFlags.Ephemeral,
                },
            };
        }

        const topRows = rows.slice(0, LEADERBOARD_SIZE);
        const lines = topRows.map((row, idx) => {
            const avgFormatted = game.formatScore(row.avg_score);
            const winLabel = row.wins === 1 ? 'win' : 'wins';
            const gameLabel = row.games_played === 1 ? 'game' : 'games';
            return `${formatRank(idx)} <@${row.user_id}> — **${row.wins} ${winLabel}** · ${avgFormatted} avg (${row.games_played} ${gameLabel})`;
        });

        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [
                    {
                        title: `🏆 ${game.displayName} — All-Time Leaderboard`,
                        description: lines.join('\n'),
                        color: 0x5865f2,
                    },
                ],
                allowed_mentions: { parse: [] },
            },
        } satisfies APIInteractionResponse;
    },
});

export async function buildDailyLeaderboardEmbed(
    env: Env,
    guildId: string,
    channelId: string,
    gameId: GameId,
): Promise<APIEmbed | null> {
    const game = getGame(gameId);
    const { startTs, endTs } = getTodayWindowUtc(env.TIMEZONE);

    const rows = await getDailyLeaderboard(env.DB, {
        guildId,
        channelId,
        gameId,
        sortDirection: game.sortDirection,
        startTs,
        endTs,
    });

    if (rows.length === 0) return null;

    const topRows = rows.slice(0, LEADERBOARD_SIZE);
    const puzzleId = topRows[0].puzzle_id;
    const lines = topRows.map((row, idx) => {
        const formatted = game.formatScore(row.score);
        return `${formatRank(idx)} <@${row.user_id}> — ${formatted}`;
    });

    return {
        title: `📅 ${game.displayName} #${puzzleId} — Today's Leaderboard`,
        description: lines.join('\n'),
        color: 0x57f287,
    };
}

export const leaderboardDailyCommand = defineGameCommand({
    meta: {
        name: 'leaderboard-daily',
        description: "Show today's leaderboard",
    },
    async execute(gameId, interaction, env) {
        const game = getGame(gameId);
        const embed = await buildDailyLeaderboardEmbed(
            env,
            interaction.guild_id,
            interaction.channel.id,
            gameId,
        );

        if (!embed) {
            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: `No scores posted today for **${game.displayName}** in this channel.`,
                    flags: MessageFlags.Ephemeral,
                },
            };
        }

        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [embed],
                allowed_mentions: { parse: [] },
            },
        } satisfies APIInteractionResponse;
    },
});

export async function postDailyLeaderboards(env: Env): Promise<void> {
    console.log('[daily] Posting end-of-day leaderboards...');

    const channels = await getActiveChannelGames(env.DB);
    if (channels.length === 0) return;

    for (const { guildId, channelId, gameIds } of channels) {
        const embeds: APIEmbed[] = [];

        for (const gameId of gameIds) {
            const embed = await buildDailyLeaderboardEmbed(env, guildId, channelId, gameId);
            if (embed) embeds.push(embed);
        }

        if (embeds.length === 0) continue;

        const payload: RESTPostAPIChannelMessageJSONBody = {
            embeds: embeds.slice(0, 10),
            allowed_mentions: { parse: [] },
        };

        const res = await fetch(RouteBases.api + Routes.channelMessages(channelId), {
            method: 'POST',
            headers: {
                Authorization: `Bot ${env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            console.error(
                `[daily] Failed to post to channel ${channelId}: ${res.status} ${res.statusText}`,
            );
        } else {
            console.log(
                `[daily] Posted ${embeds.length} daily leaderboard(s) to channel ${channelId}.`,
            );
        }
    }
}
