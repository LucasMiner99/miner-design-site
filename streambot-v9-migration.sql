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
