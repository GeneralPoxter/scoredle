-- Migration number: 0001 	 2026-11-26T11:06:52.959Z
CREATE TABLE IF NOT EXISTS scoredle_results (
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    puzzle_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    source_message_id TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (guild_id, channel_id, user_id, game_id, puzzle_id)
);

CREATE INDEX IF NOT EXISTS scoredle_channel_game_submitted
    ON scoredle_results (guild_id, channel_id, game_id, submitted_at);

CREATE TABLE IF NOT EXISTS scoredle_sync_state (
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_synced_message_id TEXT NOT NULL DEFAULT '0',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (guild_id, channel_id, game_id)
);

CREATE INDEX IF NOT EXISTS scoredle_sync_channel_game
    ON scoredle_sync_state (guild_id, channel_id, game_id);