-- Additive migration. Run once against miner-streambot before enabling HUB_ENABLED.
CREATE TABLE IF NOT EXISTS hub_oauth_states (
 state_hash TEXT PRIMARY KEY,
 browser_hash TEXT NOT NULL,
 verifier TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hub_sessions (
 token_hash TEXT PRIMARY KEY,
 kick_id TEXT NOT NULL,
 username TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS hub_sessions_expiry ON hub_sessions(expires_at);
CREATE INDEX IF NOT EXISTS hub_oauth_expiry ON hub_oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS hub_event_inbox (
 id TEXT PRIMARY KEY,
 event_type TEXT NOT NULL,
 payload TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 next_try INTEGER NOT NULL DEFAULT 0,
 done INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS hub_inbox_due ON hub_event_inbox(done,next_try);
CREATE TABLE IF NOT EXISTS hub_config_lock (
 id TEXT PRIMARY KEY,
 owner TEXT NOT NULL,
 until_ms INTEGER NOT NULL
);
