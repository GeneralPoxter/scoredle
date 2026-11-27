import {
    ApplicationCommandOptionType,
    ComponentType,
    InteractionResponseType,
    MessageFlags,
    PermissionFlagsBits,
    type APIApplicationCommandInteractionDataSubcommandOption,
    type APIInteractionResponse,
    type APIMessageComponentInteraction,
} from 'discord-api-types/v10';

import { getChannelGames, setChannelGames } from '../db/channel-games';
import { GAMES, GAME_IDS, getGame, isGame, type GameId } from '../games';
import type { CommandDefinition } from './utils';

export const CONFIG_SELECT_ID = 'config:games';

type ConfigSubcommandName = 'select' | 'enable-all' | 'disable-all';

type ConfigSubcommandOption = Omit<APIApplicationCommandInteractionDataSubcommandOption, 'name'> & {
    name: ConfigSubcommandName;
};

export const configCommand: CommandDefinition<'config', [ConfigSubcommandOption]> = {
    meta: {
        name: 'config',
        description: 'Configure which games are enabled in this channel',
        default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
        options: [
            {
                name: 'select',
                description: 'Choose which games to track in this channel',
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: 'enable-all',
                description: 'Enable all games in this channel',
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: 'disable-all',
                description: 'Disable all games in this channel',
                type: ApplicationCommandOptionType.Subcommand,
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

        const subcommand = interaction.data.options?.[0]?.name;

        if (subcommand === 'enable-all' || subcommand === 'disable-all') {
            const targetGames = subcommand === 'enable-all' ? GAME_IDS : [];
            await setChannelGames(
                env.DB,
                interaction.guild_id,
                interaction.channel.id,
                targetGames,
            );

            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: {
                    content:
                        subcommand === 'enable-all'
                            ? `Enabled **all games** (${GAMES.map((g) => g.displayName).join(', ')}) in <#${interaction.channel.id}>.`
                            : `Disabled **all games** in <#${interaction.channel.id}>.`,
                    flags: MessageFlags.Ephemeral,
                },
            };
        }

        // Subcommand: 'select'
        const enabledGames = await getChannelGames(env.DB, interaction.channel.id);
        const enabledSet = new Set(enabledGames);

        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                content: `Select which games to track in <#${interaction.channel.id}>:`,
                flags: MessageFlags.Ephemeral,
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                type: ComponentType.StringSelect,
                                custom_id: CONFIG_SELECT_ID,
                                placeholder: 'Choose games to enable...',
                                min_values: 0,
                                max_values: GAMES.length,
                                options: GAMES.map((game) => ({
                                    label: game.displayName,
                                    value: game.id,
                                    default: enabledSet.has(game.id),
                                })),
                            },
                        ],
                    },
                ],
            },
        };
    },
};

export async function handleConfigSelect(
    interaction: APIMessageComponentInteraction,
    env: Env,
): Promise<APIInteractionResponse> {
    if (interaction.data.component_type !== ComponentType.StringSelect || !interaction.guild_id) {
        return {
            type: InteractionResponseType.UpdateMessage,
            data: { content: 'Invalid selection.', components: [] },
        };
    }

    const selectedGames = interaction.data.values.filter((v): v is GameId => isGame(v));

    await setChannelGames(env.DB, interaction.guild_id, interaction.channel.id, selectedGames);

    const summary =
        selectedGames.length > 0
            ? `Enabled: **${selectedGames.map((id) => getGame(id).displayName).join(', ')}**`
            : 'All games disabled for this channel.';

    return {
        type: InteractionResponseType.UpdateMessage,
        data: {
            content: `Updated <#${interaction.channel.id}> — ${summary}`,
            components: [],
        },
    };
}
