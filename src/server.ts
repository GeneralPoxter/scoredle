import { AutoRouter, error, json, type IRequest } from 'itty-router';
import { verifyKey } from 'discord-interactions';
import {
    ApplicationCommandType,
    InteractionResponseType,
    InteractionType,
    type APIInteractionResponse,
    type APIPingInteraction,
} from 'discord-api-types/v10';
import { executeCommand, type ApplicationCommandInteraction } from './commands';
import { syncDiscordMessages } from './sync';

type VerifiedInteraction = APIPingInteraction | ApplicationCommandInteraction;

async function verifyDiscordRequest(request: Request, env: Env): Promise<VerifiedInteraction | null> {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');

    if (!signature || !timestamp) {
        return null;
    }

    const body = await request.text();
    const isValid = await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);

    return isValid ? (JSON.parse(body) as VerifiedInteraction) : null;
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

    if (interaction.type === InteractionType.ApplicationCommand && interaction.data.type === ApplicationCommandType.ChatInput) {
        const response = await executeCommand(interaction, env);
        return json(response);
    }

    return error(400, 'Unknown interaction');
});

router.all('*', () => error(404));

export default {
    fetch: router.fetch,

    async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
        await syncDiscordMessages(env);
    },
};
