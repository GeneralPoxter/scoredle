INSERT INTO scoredle_sync_state (guild_id, channel_id, game, enabled, last_synced_message_id)
VALUES (?1, ?2, ?3, 1, '0')
ON CONFLICT(guild_id, channel_id, game) DO UPDATE SET
  enabled = 1,
  updated_at = datetime('now');