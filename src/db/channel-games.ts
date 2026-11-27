import getChannelGamesSql from './queries/get_channel_games.sql';
import disableChannelGamesSql from './queries/disable_channel_games.sql';
import enableChannelGameSql from './queries/enable_channel_games.sql';
import { isGame, type GameId } from '../games';

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
