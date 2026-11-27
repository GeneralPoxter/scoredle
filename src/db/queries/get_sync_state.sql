/**
 * Retrieves the last Discord message snowflake ID synced for a specific `(guild_id, channel_id, game)` scope.
 *
 * Callers should default to `"0"` when no row is returned so Discord's `after` cursor starts from the
 * earliest message in the channel.
 *
 * @param ?1 `guild_id` (`string`) - Discord guild (server) snowflake ID.
 * @param ?2 `channel_id` (`string`) - Discord channel snowflake ID.
 * @param ?3 `game_id` (`string`) - Normalized lowercase game identifier.
 * @returns `{ last_synced_message_id: string } | null`
 */

SELECT last_synced_message_id
FROM scoredle_sync_state
WHERE guild_id = ?1
  AND channel_id = ?2
  AND game_id = ?3;