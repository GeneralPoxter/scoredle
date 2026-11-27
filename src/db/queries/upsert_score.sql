/**
 * Inserts a new score entry or overwrites an existing score for a `(guild_id, channel_id, user_id, game_id, puzzle_id)`
 * tuple when the incoming Discord message snowflake ID is strictly newer than the stored `source_message_id`
 * (or when `source_message_id` is `NULL`).
 *
 * Used by both live message ingestion and `/sync` so reposted messages with newer snowflakes overwrite
 * older scores while re-scanned or older messages are skipped as zero-write noops.
 *
 * @param ?1 `guild_id` (`string`) - Discord guild (server) snowflake ID.
 * @param ?2 `channel_id` (`string`) - Discord channel snowflake ID.
 * @param ?3 `user_id` (`string`) - Discord author snowflake ID.
 * @param ?4 `game_id` (`string`) - Normalized lowercase game identifier (e.g. `"krillion"`, `"catfishing"`).
 * @param ?5 `puzzle_id` (`string`) - Game puzzle identifier for the day or round.
 * @param ?6 `score` (`number`) - Parsed numeric score (`INTEGER`).
 * @param ?7 `source_message_id` (`string`) - Discord message snowflake ID that produced this score.
 * @param ?8 `submitted_at` (`string`) - Discord message timestamp of source_message_id.
 * @returns D1 run result (`meta.changes` is `1` on insert/overwrite, `0` if skipped).
 */

INSERT INTO scoredle_results (
    guild_id,
    channel_id,
    user_id,
    game_id,
    puzzle_id,
    score,
    source_message_id,
    submitted_at,
    updated_at
)
VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
ON CONFLICT(guild_id, channel_id, user_id, game_id, puzzle_id)
DO UPDATE SET
    score = excluded.score,
    source_message_id = excluded.source_message_id,
    submitted_at = excluded.submitted_at,
    updated_at = datetime('now')
WHERE CAST(excluded.source_message_id AS INTEGER) > CAST(scoredle_results.source_message_id AS INTEGER);
