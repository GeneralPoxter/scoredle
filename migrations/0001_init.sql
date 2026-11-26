-- Migration number: 0001 	 2026-11-26T11:06:52.959Z
CREATE TABLE IF NOT EXISTS scoredle_results (
    guild_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    game TEXT NOT NULL,                  -- e.g. 'catfishing', 'krillion'
    puzzle_id TEXT NOT NULL,             -- e.g. '1234', '#882', '2026-11-26'\
    score INTEGER NOT NULL,
    source_message_id TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (guild_id, channel_id, user_id, game, puzzle_id)
);

CREATE INDEX IF NOT EXISTS scoredle_channel_game_user
    ON scoredle_results (guild_id, channel_id, game, user_id);

CREATE TABLE IF NOT EXISTS scoredle_sync_state (
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    game TEXT NOT NULL,
    last_synced_message_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (guild_id, channel_id, game)
);

CREATE INDEX IF NOT EXISTS scoredle_sync_channel_game
    ON scoredle_sync_state (guild_id, channel_id, game);