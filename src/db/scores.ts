import upsertScoreSql from './queries/upsert_score.sql';
import type { GameId } from '../games';

export interface ScoreSubmission {
    guildId: string;
    channelId: string;
    userId: string;
    game: GameId;
    puzzleId: string;
    score: number;
    sourceMessageId: string;
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
            submission.game,
            submission.puzzleId,
            submission.score,
            submission.sourceMessageId,
        );
}
