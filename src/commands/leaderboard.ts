import {
    InteractionResponseType,
    MessageFlags,
    type APIInteractionResponse,
} from 'discord-api-types/v10';

import { getLeaderboard, getDailyLeaderboard } from '../db/scores';
import { getGame } from '../games';
import { defineGameCommand } from './utils';
import { getTodayWindowUtc } from '../utils/time';

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
            gameId: gameId,
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

export const leaderboardDailyCommand = defineGameCommand({
    meta: {
        name: 'leaderboard-daily',
        description: "Show today's leaderboard",
    },
    async execute(gameId, interaction, env) {
        const game = getGame(gameId);
        const { startTs, endTs } = getTodayWindowUtc(env.TIMEZONE || 'America/New_York');

        const rows = await getDailyLeaderboard(env.DB, {
            guildId: interaction.guild_id,
            channelId: interaction.channel.id,
            gameId: gameId,
            sortDirection: game.sortDirection,
            startTs,
            endTs,
        });

        if (rows.length === 0) {
            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content: `No scores posted today for **${game.displayName}** in this channel.`,
                    flags: MessageFlags.Ephemeral,
                },
            };
        }

        const topRows = rows.slice(0, LEADERBOARD_SIZE);
        const puzzleId = topRows[0].puzzle_id;
        const lines = topRows.map((row, idx) => {
            const formatted = game.formatScore(row.score);
            return `${formatRank(idx)} <@${row.user_id}> — ${formatted}`;
        });

        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                embeds: [
                    {
                        title: `📅 ${game.displayName} #${puzzleId} — Today's Leaderboard`,
                        description: lines.join('\n'),
                        color: 0x57f287,
                    },
                ],
                allowed_mentions: { parse: [] },
            },
        } satisfies APIInteractionResponse;
    },
});
