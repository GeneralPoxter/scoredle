import { RouteBases, Routes, type APIGuild } from 'discord-api-types/v10';

export async function syncDiscordMessages(env: Env): Promise<void> {
    console.log('[sync] Starting Discord message sync...');

    // 1. Verify Discord API token & connectivity
    const url = RouteBases.api + Routes.userGuilds();
    const res = await fetch(url, {
        headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` },
    });

    if (!res.ok) {
        throw new Error(`[sync] Discord API failed: ${res.status} ${res.statusText}`);
    }

    const guilds = (await res.json()) as Pick<APIGuild, 'id' | 'name'>[];
    console.log(
        `[sync] Connected to ${guilds.length} guild(s):`,
        guilds.map((g) => g.name),
    );

    // 2. Verify D1 database binding
    const dbCheck = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
    console.log('[sync] D1 connection check:', dbCheck?.ok === 1 ? 'OK' : 'FAILED');

    console.log('[sync] Sync finished.');
}
