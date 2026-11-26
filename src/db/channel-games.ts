import getChannelGamesSql from './queries/get_channel_games.sql';
import disableChannelGamesSql from './queries/disable_channel_games.sql';
import enableChannelGameSql from './queries/enable_channel_games.sql';
import { isGame, type GameId } from '../games';

export async function getChannelGames(db: D1Database, channelId: string): Promise<GameId[]> {
    const { results } = await db
        .prepare(getChannelGamesSql)
        .bind(channelId)
        .all<{ game: string }>();

    return results.map((r) => r.game).filter((g): g is GameId => isGame(g));
}

export async function setChannelGames(
    db: D1Database,
    guildId: string,
    channelId: string,
    games: readonly GameId[],
): Promise<void> {
    const disableStmt = db.prepare(disableChannelGamesSql).bind(channelId);
    const enableStmt = db.prepare(enableChannelGameSql);

    const statements: D1PreparedStatement[] = [
        disableStmt,
        ...games.map((game) => enableStmt.bind(guildId, channelId, game)),
    ];

    await db.batch(statements);
}
