-- MinerBot v12 · The Crown
-- Ejecutar UNA vez en D1. Es idempotente.

CREATE TABLE IF NOT EXISTS streambot_crown_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_user_id TEXT,
  current_username TEXT,
  crowned_at_ms INTEGER,
  steal_open_at_ms INTEGER,
  steal_close_at_ms INTEGER,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO streambot_crown_state (id, version)
VALUES (1, 0);

CREATE TABLE IF NOT EXISTS streambot_crown_users (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  crowns_won INTEGER NOT NULL DEFAULT 0,
  total_reign_ms INTEGER NOT NULL DEFAULT 0,
  best_reign_ms INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_streambot_crown_users_total
  ON streambot_crown_users(total_reign_ms DESC);
