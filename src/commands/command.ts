import {
    ApplicationCommandOptionType,
    type APIApplicationCommandInteractionDataBasicOption,
    type APIApplicationCommandInteractionDataStringOption,
    type APIChatInputApplicationCommandInteraction,
    type APIInteractionResponse,
    type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';
import { Game } from '../games/game';

export type CommandInteraction<
    TName extends string = string,
    TOptions extends readonly APIApplicationCommandInteractionDataBasicOption[] | never = never,
> = Omit<APIChatInputApplicationCommandInteraction, 'data'> & {
    data: Omit<APIChatInputApplicationCommandInteraction['data'], 'name' | 'options'> & {
        name: TName;
        options?: TOptions;
    };
};

export interface CommandDefinition<
    TName extends string = string,
    TOptions extends readonly APIApplicationCommandInteractionDataBasicOption[] | never = never,
> {
    meta: Omit<RESTPostAPIChatInputApplicationCommandsJSONBody, 'name'> & {
        name: TName;
    };
    execute(interaction: CommandInteraction<TName, TOptions>, env: Env): Promise<APIInteractionResponse> | APIInteractionResponse;
}

type CommandMetadata<TName extends string> = Omit<RESTPostAPIChatInputApplicationCommandsJSONBody, 'name' | 'options'> & {
    name: TName;
};

export function defineBareCommand<const TName extends string>(spec: {
    meta: CommandMetadata<TName>;
    execute(interaction: CommandInteraction<TName, never>, env: Env): Promise<APIInteractionResponse> | APIInteractionResponse;
}): CommandDefinition<TName, never> {
    return spec;
}

export type GameCommandOption = Omit<APIApplicationCommandInteractionDataStringOption, 'name' | 'value'> & {
    name: 'game';
    value: Game;
};

export function defineGameCommand<const TName extends string>(spec: {
    meta: CommandMetadata<TName>;
    execute(
        game: Game,
        interaction: CommandInteraction<TName, [GameCommandOption]>,
        env: Env,
    ): Promise<APIInteractionResponse> | APIInteractionResponse;
}): CommandDefinition<TName, [GameCommandOption]> {
    return {
        meta: {
            ...spec.meta,
            options: [
                {
                    name: 'game',
                    description: 'Which game to view',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        { name: 'catfishing', value: Game.CATFISHING },
                        { name: 'krillion', value: Game.KRILLION },
                    ],
                },
            ],
        },
        execute(interaction, env) {
            const game = interaction.data.options![0].value;
            return spec.execute(game, interaction, env);
        },
    };
}
