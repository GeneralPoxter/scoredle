import type { APIInteractionResponse } from 'discord-api-types/v10';

import { configCommand } from './config';
import { leaderboardCommand, leaderboardDailyCommand } from './leaderboard';

// Register new commands here
const COMMANDS = [configCommand, leaderboardCommand, leaderboardDailyCommand] as const;

type Command = (typeof COMMANDS)[number];
type CommandName = Command['meta']['name'];

export type ApplicationCommandInteraction = Parameters<Command['execute']>[0];

const COMMAND_MAP = Object.fromEntries(COMMANDS.map((cmd) => [cmd.meta.name, cmd])) as {
    [Name in CommandName]: Extract<Command, { meta: { name: Name } }>;
};

export const COMMAND_METADATA = COMMANDS.map((cmd) => cmd.meta);

export async function executeCommand(
    interaction: ApplicationCommandInteraction,
    env: Env,
): Promise<APIInteractionResponse> {
    const command = COMMAND_MAP[interaction.data.name];
    return (
        command.execute as (
            interaction: ApplicationCommandInteraction,
            env: Env,
        ) => Promise<APIInteractionResponse> | APIInteractionResponse
    )(interaction, env);
}
