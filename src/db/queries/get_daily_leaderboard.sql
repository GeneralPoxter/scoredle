/**
 * Retrieves the daily standings for the latest `puzzle_id` submitted within a `(guild_id, channel_id, game_id)`
 * scope over a `[start_ts, end_ts)` UTC time window.
 *
 * Selects the highest `puzzle_id` (ordered numerically by `CAST(puzzle_id AS INTEGER) DESC`, tie-broken by
 * newest `source_message_id`) posted during the window so catch-up submissions for older puzzles do not
 * affect today's daily board. Ties on the winning score are broken by earliest submission
 * (`CAST(source_message_id AS INTEGER) ASC`).
 *
 * @param ?1 `guild_id` (`string`) - Discord guild (server) snowflake ID.
 * @param ?2 `channel_id` (`string`) - Discord channel snowflake ID.
 * @param ?3 `game_id` (`string`) - Normalized lowercase game identifier.
 * @param ?4 `sort_direction` (`1 | -1`) - `1` when higher scores win, `-1` when lower scores win.
 * @param ?5 `start_ts` (`string`) - Inclusive lower bound (`"YYYY-MM-DD HH:MM:SS"` UTC).
 * @param ?6 `end_ts` (`string`) - Exclusive upper bound (`"YYYY-MM-DD HH:MM:SS"` UTC).
 * @returns Rows of `{ user_id: string; puzzle_id: string; score: number }`.
 */

WITH todays_scores AS (
    SELECT
        user_id,
        puzzle_id,
        score,
        source_message_id
    FROM scoredle_results
    WHERE guild_id = ?1
      AND channel_id = ?2
      AND game_id = ?3
      AND submitted_at >= ?5
      AND submitted_at < ?6
),
latest_puzzle AS (
    SELECT puzzle_id
    FROM todays_scores
    ORDER BY CAST(puzzle_id AS INTEGER) DESC, CAST(source_message_id AS INTEGER) DESC
    LIMIT 1
)
SELECT
    t.user_id,
    t.puzzle_id,
    t.score
FROM todays_scores t
JOIN latest_puzzle lp ON t.puzzle_id = lp.puzzle_id
ORDER BY t.score * ?4 DESC, CAST(t.source_message_id AS INTEGER) ASC;