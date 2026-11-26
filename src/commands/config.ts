import {
    ApplicationCommandOptionType,
    ComponentType,
    InteractionResponseType,
    MessageFlags,
    PermissionFlagsBits,
    type APIApplicationCommandInteractionDataStringOption,
    type APIInteractionResponse,
    type APIMessageComponentInteraction,
} from 'discord-api-types/v10';

import { getChannelGames, setChannelGames } from '../db/channel-games';
import { GAMES, GAME_IDS, getGame, isGame, type GameId } from '../games';
import type { CommandDefinition } from './utils';

export const CONFIG_SELECT_ID = 'config:games';

type PresetOption = Omit<APIApplicationCommandInteractionDataStringOption, 'name' | 'value'> & {
    name: 'preset';
    value: 'all' | 'none';
};

export const configCommand: CommandDefinition<'config', [PresetOption]> = {
    meta: {
        name: 'config',
        description: 'Configure which games are enabled in this channel',
        default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
        options: [
            {
                name: 'preset',
                description: 'Quickly enable all or disable all games',
                type: ApplicationCommandOptionType.String,
                required: false,
                choices: [
                    { name: 'Enable all games', value: 'all' },
                    { name: 'Disable all games', value: 'none' },
                ],
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

        const preset = interaction.data.options?.[0]?.value;

        if (preset === 'all' || preset === 'none') {
            const targetGames = preset === 'all' ? GAME_IDS : [];
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
                        preset === 'all'
                            ? `Enabled **all games** (${GAMES.map((g) => g.displayName).join(', ')}) in <#${interaction.channel.id}>.`
                            : `Disabled **all games** in <#${interaction.channel.id}>.`,
                    flags: MessageFlags.Ephemeral,
                },
            };
        }

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
