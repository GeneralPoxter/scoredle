import getSyncStateSql from './queries/get_sync_state.sql';
import setSyncStateSql from './queries/set_sync_state.sql';
import type { GameId } from '../games';

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
