/**
 * Creates or advances the sync checkpoint (`last_synced_message_id`) for `(guild_id, channel_id, game)`
 * only when the new snowflake ID is strictly greater than the existing checkpoint.
 *
 * Prevents out-of-order or stale batch completions from rewinding the cursor backward.
 *
 * @param ?1 `guild_id` (`string`) - Discord guild (server) snowflake ID.
 * @param ?2 `channel_id` (`string`) - Discord channel snowflake ID.
 * @param ?3 `game_id` (`string`) - Normalized lowercase game identifier.
 * @param ?4 `last_synced_message_id` (`string`) - Candidate newest Discord message snowflake ID.
 * @returns D1 run result (`meta.changes` is `1` when inserted or advanced, `0` otherwise).
 */

INSERT INTO scoredle_sync_state (
    guild_id,
    channel_id,
    game_id,
    last_synced_message_id,
    updated_at
)
VALUES (?1, ?2, ?3, ?4, datetime('now'))
ON CONFLICT(guild_id, channel_id, game_id)
DO UPDATE SET
    last_synced_message_id = excluded.last_synced_message_id,
    updated_at = datetime('now')
WHERE CAST(excluded.last_synced_message_id AS INTEGER) > CAST(scoredle_sync_state.last_synced_message_id AS INTEGER);
