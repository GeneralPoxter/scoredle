UPDATE scoredle_sync_state
SET enabled = 0, updated_at = datetime('now')
WHERE channel_id = ?1;