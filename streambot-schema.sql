CREATE TABLE IF NOT EXISTS streambot_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS streambot_oauth_tokens (
  provider TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER NOT NULL,
  scope TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS streambot_oauth_states (
  state TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS streambot_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  response TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS streambot_timed_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  interval_minutes INTEGER NOT NULL DEFAULT 15,
  enabled INTEGER NOT NULL DEFAULT 1,
  next_run_ms INTEGER NOT NULL,
  last_sent_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_streambot_timed_messages_due
  ON streambot_timed_messages(enabled, next_run_ms);

CREATE TABLE IF NOT EXISTS streambot_tts_queue (
  id TEXT PRIMARY KEY,
  redemption_id TEXT UNIQUE,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  char_count INTEGER NOT NULL,
  audio BLOB,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_streambot_tts_queue_status_created
  ON streambot_tts_queue(status, created_at);

CREATE TABLE IF NOT EXISTS streambot_webhook_events (
  message_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS streambot_redemptions (
  redemption_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  reason TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS streambot_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL DEFAULT 'info',
  type TEXT NOT NULL,
  username TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_streambot_logs_created
  ON streambot_logs(created_at DESC);

INSERT OR IGNORE INTO streambot_commands (name, response, enabled)
VALUES
  ('instagram', 'Instagram: https://www.instagram.com/miner_design', 1),
  ('discord', 'Discord: https://discord.com/invite/p7w6NBq9n2', 1);
-- MinerBot v9 · Overlay Control
-- Ejecutar UNA vez en la consola de D1 (es idempotente).

CREATE TABLE IF NOT EXISTS streambot_mod_oauth_states (
  state TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS streambot_mod_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kick_user_id TEXT UNIQUE,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  active INTEGER NOT NULL DEFAULT 1,
  can_control INTEGER NOT NULL DEFAULT 1,
  can_upload INTEGER NOT NULL DEFAULT 0,
  can_delete INTEGER NOT NULL DEFAULT 0,
  is_owner INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS streambot_mod_sessions (
  token_hash TEXT PRIMARY KEY,
  mod_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_streambot_mod_sessions_expires
  ON streambot_mod_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_streambot_mod_sessions_mod
  ON streambot_mod_sessions(mod_id);

CREATE TABLE IF NOT EXISTS streambot_media_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  approved INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS streambot_overlay_items (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  x REAL NOT NULL DEFAULT 0.35,
  y REAL NOT NULL DEFAULT 0.30,
  width REAL NOT NULL DEFAULT 0.30,
  height REAL NOT NULL DEFAULT 0.30,
  rotation REAL NOT NULL DEFAULT 0,
  opacity REAL NOT NULL DEFAULT 1,
  volume REAL NOT NULL DEFAULT 1,
  z_index INTEGER NOT NULL DEFAULT 1,
  visible INTEGER NOT NULL DEFAULT 0,
  play_nonce INTEGER NOT NULL DEFAULT 0,
  loop INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  visible_until INTEGER,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_streambot_overlay_items_visible
  ON streambot_overlay_items(visible, z_index);

CREATE INDEX IF NOT EXISTS idx_streambot_overlay_items_asset
  ON streambot_overlay_items(asset_id);

-- MinerBot v12 · The Crown
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
