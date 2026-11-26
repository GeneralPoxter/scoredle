/**
 * Inserts a new score entry or overwrites an existing score for a `(guild_id, channel_id, user_id, game, puzzle_id)`
 * tuple when the incoming Discord message snowflake ID is strictly newer than the stored `source_message_id`
 * (or when `source_message_id` is `NULL`).
 *
 * Used by both live message ingestion and `/sync` so reposted messages with newer snowflakes overwrite
 * older scores while re-scanned or older messages are skipped as zero-write noops.
 *
 * @param ?1 `guild_id` (`string`) - Discord guild (server) snowflake ID.
 * @param ?2 `channel_id` (`string`) - Discord channel snowflake ID.
 * @param ?3 `user_id` (`string`) - Discord author snowflake ID.
 * @param ?4 `game` (`string`) - Normalized lowercase game identifier (e.g. `"krillion"`, `"catfishing"`).
 * @param ?5 `puzzle_id` (`string`) - Game puzzle identifier for the day or round.
 * @param ?6 `score` (`number`) - Parsed numeric score (`INTEGER`).
 * @param ?7 `source_message_id` (`string`) - Discord message snowflake ID that produced this score.
 * @returns D1 run result (`meta.changes` is `1` on insert/overwrite, `0` if skipped).
 */

INSERT INTO scoredle_results (
    guild_id,
    channel_id,
    user_id,
    game,
    puzzle_id,
    score,
    source_message_id,
    submitted_at
)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
ON CONFLICT(guild_id, channel_id, user_id, game, puzzle_id)
DO UPDATE SET
    score = excluded.score,
    source_message_id = excluded.source_message_id,
    submitted_at = datetime('now')
WHERE scoredle_results.source_message_id IS NULL
   OR CAST(excluded.source_message_id AS INTEGER) > CAST(scoredle_results.source_message_id AS INTEGER);