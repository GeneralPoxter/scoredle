import type { APIInteractionResponse } from 'discord-api-types/v10';
import { helloCommand } from './hello';
import { leaderboardCommand, leaderboardDailyCommand } from './leaderboard';

const COMMANDS = [helloCommand, leaderboardCommand, leaderboardDailyCommand] as const;

type AnyCommand = (typeof COMMANDS)[number];

export type CommandKey = AnyCommand['meta']['name'];
export type ApplicationCommandInteraction = Parameters<AnyCommand['execute']>[0];

const COMMAND_MAP = Object.fromEntries(COMMANDS.map((cmd) => [cmd.meta.name, cmd])) as {
    [K in CommandKey]: Extract<AnyCommand, { meta: { name: K } }>;
};

export const COMMAND_METADATA = COMMANDS.map((cmd) => cmd.meta);

export async function executeCommand(interaction: ApplicationCommandInteraction, env: Env): Promise<APIInteractionResponse> {
    const command = COMMAND_MAP[interaction.data.name];
    return (
        command.execute as (
            interaction: ApplicationCommandInteraction,
            env: Env,
        ) => Promise<APIInteractionResponse> | APIInteractionResponse
    )(interaction, env);
}
