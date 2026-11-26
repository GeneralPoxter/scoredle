SELECT game
FROM scoredle_sync_state
WHERE channel_id = ?1 AND enabled = 1;