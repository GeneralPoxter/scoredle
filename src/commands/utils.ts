import {
    ApplicationCommandOptionType,
    InteractionResponseType,
    MessageFlags,
    type APIApplicationCommandAutocompleteInteraction,
    type APIApplicationCommandInteractionDataOption,
    type APIApplicationCommandInteractionDataStringOption,
    type APIChatInputApplicationCommandInteraction,
    type APIInteractionResponse,
    type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { getChannelGames } from '../db/sync-state';
import { getGame, isGame, type GameId } from '../games';

export type CommandInteraction<
    TName extends string = string,
    TOptions extends readonly APIApplicationCommandInteractionDataOption[] | never = never,
> = Omit<APIChatInputApplicationCommandInteraction, 'data'> & {
    data: Omit<APIChatInputApplicationCommandInteraction['data'], 'name' | 'options'> & {
        name: TName;
        options?: TOptions;
    };
};

export interface CommandDefinition<
    TName extends string = string,
    TOptions extends readonly APIApplicationCommandInteractionDataOption[] | never = never,
> {
    meta: Omit<RESTPostAPIChatInputApplicationCommandsJSONBody, 'name'> & {
        name: TName;
    };
    execute(
        interaction: CommandInteraction<TName, TOptions>,
        env: Env,
    ): Promise<APIInteractionResponse> | APIInteractionResponse;
}

export type CommandMetadata<TName extends string> = Omit<
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    'name' | 'options'
> & {
    name: TName;
};

export function defineBareCommand<const TName extends string>(spec: {
    meta: CommandMetadata<TName>;
    execute(
        interaction: CommandInteraction<TName, never>,
        env: Env,
    ): Promise<APIInteractionResponse> | APIInteractionResponse;
}): CommandDefinition<TName, never> {
    return spec;
}

const GAME_OPTION_NAME = 'game';

export type GameCommandOption = Omit<
    APIApplicationCommandInteractionDataStringOption,
    'name' | 'value'
> & {
    name: typeof GAME_OPTION_NAME;
    value: GameId;
};

export type GuildCommandInteraction<
    TName extends string = string,
    TOptions extends readonly APIApplicationCommandInteractionDataOption[] | never = never,
> = CommandInteraction<TName, TOptions> & {
    guild_id: string;
};

export function defineGameCommand<const TName extends string>(spec: {
    meta: CommandMetadata<TName>;
    execute(
        gameId: GameId,
        interaction: GuildCommandInteraction<TName, [GameCommandOption]>,
        env: Env,
    ): Promise<APIInteractionResponse> | APIInteractionResponse;
}): CommandDefinition<TName, [GameCommandOption]> {
    return {
        meta: {
            ...spec.meta,
            options: [
                {
                    name: GAME_OPTION_NAME,
                    description: 'Which game to view',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true,
                },
            ],
        },
        async execute(interaction, env) {
            if (!interaction.guild_id) {
                return {
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        content: 'This command can only be used inside a server channel.',
                        flags: MessageFlags.Ephemeral,
                    },
                };
            }

            const gameId = interaction.data.options![0].value.trim().toLowerCase();
            if (!isGame(gameId)) {
                return {
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        content: `Unknown game \`${gameId ?? ''}\`.`,
                        flags: MessageFlags.Ephemeral,
                    },
                };
            }

            const enabledGames = await getChannelGames(env.DB, interaction.channel.id);
            if (!enabledGames.includes(gameId)) {
                return {
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: {
                        content: `**${getGame(gameId).displayName}** is not enabled in this channel. Ask an admin to run \`/config\`.`,
                        flags: MessageFlags.Ephemeral,
                    },
                };
            }

            return spec.execute(
                gameId,
                interaction as GuildCommandInteraction<TName, [GameCommandOption]>,
                env,
            );
        },
    };
}

export async function handleGameAutocomplete(
    interaction: APIApplicationCommandAutocompleteInteraction,
    env: Env,
): Promise<APIInteractionResponse> {
    const channelId = interaction.channel?.id;
    if (!channelId) {
        return {
            type: InteractionResponseType.ApplicationCommandAutocompleteResult,
            data: { choices: [] },
        };
    }

    const focused = interaction.data.options.find(
        (opt) =>
            opt.type === ApplicationCommandOptionType.String &&
            opt.name === GAME_OPTION_NAME &&
            opt.focused,
    );
    const query =
        focused?.type === ApplicationCommandOptionType.String ? focused.value.toLowerCase() : '';

    const enabledGames = await getChannelGames(env.DB, channelId);

    const choices = enabledGames
        .map((id) => getGame(id))
        .filter((game) => game.id.includes(query) || game.displayName.toLowerCase().includes(query))
        .map((game) => ({
            name: game.displayName,
            value: game.id,
        }));

    return {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: { choices },
    };
}
