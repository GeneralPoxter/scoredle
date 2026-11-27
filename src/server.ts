import { AutoRouter, error, json, type IRequest } from 'itty-router';
import { verifyKey } from 'discord-interactions';
import {
    APIInteraction,
    ApplicationCommandType,
    InteractionResponseType,
    InteractionType,
    type APIInteractionResponse,
} from 'discord-api-types/v10';

import { syncDiscordMessages } from './sync';
import { executeCommand, type ApplicationCommandInteraction } from './commands';
import { CONFIG_SELECT_ID, handleConfigSelect } from './commands/config';
import { postDailyLeaderboards } from './commands/leaderboard';
import { handleGameAutocomplete } from './commands/utils';

async function verifyDiscordRequest(request: Request, env: Env): Promise<APIInteraction | null> {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');

    if (!signature || !timestamp) {
        return null;
    }

    const body = await request.text();
    const isValid = await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);

    return isValid ? (JSON.parse(body) as APIInteraction) : null;
}

const router = AutoRouter<IRequest, [Env]>();

router.get('/', (_request, env) => {
    return new Response(`scoredle app id: ${env.DISCORD_APPLICATION_ID}`);
});

router.post('/', async (request, env) => {
    const interaction = await verifyDiscordRequest(request, env);
    if (!interaction) {
        return new Response('Bad request signature.', { status: 401 });
    }

    if (interaction.type === InteractionType.Ping) {
        return json({
            type: InteractionResponseType.Pong,
        } satisfies APIInteractionResponse);
    }

    if (
        interaction.type === InteractionType.ApplicationCommand &&
        interaction.data.type === ApplicationCommandType.ChatInput
    ) {
        const response = await executeCommand(interaction as ApplicationCommandInteraction, env);
        return json(response);
    }

    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        const response = await handleGameAutocomplete(interaction, env);
        return json(response);
    }

    if (
        interaction.type === InteractionType.MessageComponent &&
        interaction.data.custom_id === CONFIG_SELECT_ID
    ) {
        const response = await handleConfigSelect(interaction, env);
        return json(response);
    }

    return error(400, 'Unknown interaction');
});

router.all('*', () => error(404));

export default {
    fetch: router.fetch,

    async scheduled(controller: ScheduledController, env: Env): Promise<void> {
        await syncDiscordMessages(env);

        if (controller.cron === env.DAILY_LEADERBOARD_CRON) {
            await postDailyLeaderboards(env);
        }
    },
} satisfies ExportedHandler<Env>;
