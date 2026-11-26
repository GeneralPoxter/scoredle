import { InteractionResponseType } from 'discord-api-types/v10';

import { getGame } from '../games';
import { defineGameCommand } from './utils';

export const leaderboardCommand = defineGameCommand({
    meta: {
        name: 'leaderboard',
        description: 'Show the all-time leaderboard for a game',
    },
    async execute(game, interaction, env) {
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: `All-time leaderboard for **${getGame(game).displayName}**` },
        };
    },
});

export const leaderboardDailyCommand = defineGameCommand({
    meta: {
        name: 'leaderboard-daily',
        description: "Show today's leaderboard for a game",
    },
    async execute(game, interaction, env) {
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: `Daily leaderboard for **${getGame(game).displayName}**` },
        };
    },
});
