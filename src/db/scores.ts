import upsertScoreSql from './queries/upsert_score.sql';
import getLeaderboardSql from './queries/get_leaderboard.sql';
import getDailyLeaderboardSql from './queries/get_daily_leaderboard.sql';
import type { GameId } from '../games';

export interface ScoreSubmission {
    guildId: string;
    channelId: string;
    userId: string;
    gameId: GameId;
    puzzleId: string;
    score: number;
    sourceMessageId: string;
    submittedAt: string | Date;
}

function toSqliteUtc(timestamp: string | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toISOString().replace('T', ' ').slice(0, 19);
}

export function prepareUpsertScore(
    db: D1Database,
    submission: ScoreSubmission,
): D1PreparedStatement {
    return db
        .prepare(upsertScoreSql)
        .bind(
            submission.guildId,
            submission.channelId,
            submission.userId,
            submission.gameId,
            submission.puzzleId,
            submission.score,
            submission.sourceMessageId,
            toSqliteUtc(submission.submittedAt),
        );
}

export interface LeaderboardRow {
    user_id: string;
    wins: number;
    games_played: number;
    avg_score: number;
}

export async function getLeaderboard(
    db: D1Database,
    params: {
        guildId: string;
        channelId: string;
        gameId: GameId;
        sortDirection: 1 | -1;
        startTs?: string | null;
        endTs?: string | null;
    },
): Promise<LeaderboardRow[]> {
    const { results } = await db
        .prepare(getLeaderboardSql)
        .bind(
            params.guildId,
            params.channelId,
            params.gameId,
            params.sortDirection,
            params.startTs ?? null,
            params.endTs ?? null,
        )
        .all<LeaderboardRow>();

    return results;
}

export interface DailyLeaderboardRow {
    user_id: string;
    puzzle_id: string;
    score: number;
}

export async function getDailyLeaderboard(
    db: D1Database,
    params: {
        guildId: string;
        channelId: string;
        gameId: GameId;
        sortDirection: 1 | -1;
        startTs: string;
        endTs: string;
    },
): Promise<DailyLeaderboardRow[]> {
    const { results } = await db
        .prepare(getDailyLeaderboardSql)
        .bind(
            params.guildId,
            params.channelId,
            params.gameId,
            params.sortDirection,
            params.startTs,
            params.endTs,
        )
        .all<DailyLeaderboardRow>();

    return results;
}
