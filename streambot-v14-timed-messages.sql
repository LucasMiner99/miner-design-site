-- MinerBot v14 · mensajes automáticos temporizados
-- Es idempotente. El Worker también crea esta tabla automáticamente.

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
