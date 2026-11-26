/**
 * Run once from the command line to sync slash commands with Discord.
 * Not bundled into the Cloudflare Worker.
 */
import dotenv from 'dotenv';
import process from 'node:process';
import { RouteBases, Routes, type RESTPutAPIApplicationCommandsResult } from 'discord-api-types/v10';
import { COMMAND_METADATA } from './commands';

dotenv.config({ path: '.dev.vars' });

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`The ${name} environment variable is required.`);
    }
    return value;
}

const token = requireEnv('DISCORD_TOKEN');
const applicationId = requireEnv('DISCORD_APPLICATION_ID');

async function registerCommands(): Promise<void> {
    const url = RouteBases.api + Routes.applicationCommands(applicationId);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${token}`,
        },
        body: JSON.stringify(COMMAND_METADATA),
    });

    if (!response.ok) {
        let errorDetail = '';
        try {
            errorDetail = await response.text();
        } catch (err) {
            console.error(`Error reading body from request: ${err}`);
        }

        throw new Error(
            `Error registering commands (${response.status} ${response.statusText}) at ${response.url}` +
                (errorDetail ? `\n\n${errorDetail}` : ''),
        );
    }

    console.log('Registered all commands');
    const data = (await response.json()) as RESTPutAPIApplicationCommandsResult;
    console.log(JSON.stringify(data, null, 2));
}

await registerCommands();
