import getSyncStateSql from './queries/get_sync_state.sql';
import setSyncStateSql from './queries/set_sync_state.sql';
import getChannelGamesSql from './queries/get_channel_games.sql';
import disableChannelGamesSql from './queries/disable_channel_games.sql';
import enableChannelGameSql from './queries/enable_channel_games.sql';
import getSyncChannelGamesSql from './queries/get_sync_channel_games.sql';
import { isGame, type GameId } from '../games';

export async function getSyncState(
    db: D1Database,
    guildId: string,
    channelId: string,
    gameId: GameId,
): Promise<string> {
    const row = await db
        .prepare(getSyncStateSql)
        .bind(guildId, channelId, gameId)
        .first<{ last_synced_message_id: string }>();

    return row?.last_synced_message_id ?? '0';
}

export function prepareSetSyncState(
    db: D1Database,
    guildId: string,
    channelId: string,
    gameId: GameId,
    newestMessageId: string,
): D1PreparedStatement {
    return db.prepare(setSyncStateSql).bind(guildId, channelId, gameId, newestMessageId);
}

export async function getChannelGames(db: D1Database, channelId: string): Promise<GameId[]> {
    const { results } = await db
        .prepare(getChannelGamesSql)
        .bind(channelId)
        .all<{ game_id: string }>();

    return results.map((r) => r.game_id).filter((g): g is GameId => isGame(g));
}

export async function setChannelGames(
    db: D1Database,
    guildId: string,
    channelId: string,
    gameIds: readonly GameId[],
): Promise<void> {
    const disableStmt = db.prepare(disableChannelGamesSql).bind(channelId);
    const enableStmt = db.prepare(enableChannelGameSql);

    const statements: D1PreparedStatement[] = [
        disableStmt,
        ...gameIds.map((gameId) => enableStmt.bind(guildId, channelId, gameId)),
    ];

    await db.batch(statements);
}

interface ActiveChannelGameRow {
    guild_id: string;
    channel_id: string;
    game_id: string;
}

export interface ChannelGamesConfig {
    guildId: string;
    channelId: string;
    gameIds: GameId[];
}

export async function getActiveChannelGames(db: D1Database): Promise<ChannelGamesConfig[]> {
    const { results } = await db.prepare(getSyncChannelGamesSql).all<ActiveChannelGameRow>();

    const byChannel = new Map<string, ChannelGamesConfig>();

    for (const row of results) {
        if (!isGame(row.game_id)) continue;
        const entry = byChannel.get(row.channel_id) ?? {
            guildId: row.guild_id,
            channelId: row.channel_id,
            gameIds: [],
        };
        entry.gameIds.push(row.game_id);
        byChannel.set(row.channel_id, entry);
    }

    return [...byChannel.values()];
}
