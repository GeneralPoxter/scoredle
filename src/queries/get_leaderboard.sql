/**
 * Computes player standings and summary stats for a `(guild_id, channel_id, game)` over an optional
 * `submitted_at` time window (`[start_ts, end_ts)`).
 *
 * A player earns `+1` win (`is_win = 1`) for each `puzzle_id` where they achieve the best score according
 * to `sort_multiplier` (`1` for higher-is-better, `-1` for lower-is-better). Ties for the winning score
 * on a puzzle award `+1` win to every tied player. Results are ordered by `wins DESC`, then
 * `(avg_score * sort_multiplier) DESC`, then `games_played DESC`.
 *
 * @param ?1 `guild_id` (`string`) - Discord guild (server) snowflake ID.
 * @param ?2 `channel_id` (`string`) - Discord channel snowflake ID.
 * @param ?3 `game` (`string`) - Normalized lowercase game identifier.
 * @param ?4 `sort_multiplier` (`1 | -1`) - `1` when higher scores win, `-1` when lower scores win.
 * @param ?5 `start_ts` (`string | null`) - Inclusive lower bound (`"YYYY-MM-DD HH:MM:SS"` UTC), or `null` for no lower bound.
 * @param ?6 `end_ts` (`string | null`) - Exclusive upper bound (`"YYYY-MM-DD HH:MM:SS"` UTC), or `null` for no upper bound.
 * @returns Rows of `{ user_id: string; wins: number; games_played: number; avg_score: number }`.
 */

WITH scored AS (
    SELECT
        user_id,
        puzzle_id,
        score,
        CASE
            WHEN (score * ?4) = MAX(score * ?4) OVER (PARTITION BY puzzle_id) THEN 1
            ELSE 0
        END AS is_win
    FROM scoredle_results
    WHERE guild_id = ?1
      AND channel_id = ?2
      AND game = ?3
      AND (?5 IS NULL OR submitted_at >= ?5)
      AND (?6 IS NULL OR submitted_at < ?6)
)
SELECT
    user_id,
    SUM(is_win) AS wins,
    COUNT(*) AS games_played,
    ROUND(AVG(score), 2) AS avg_score
FROM scored
GROUP BY user_id
ORDER BY wins DESC, avg_score * ?4 DESC, games_played DESC;