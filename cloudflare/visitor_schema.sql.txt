-- PCS Global Observatory Network
-- Additive visitor schema only; does not modify PCS scientific tables.
-- Country values are ISO 3166-1 alpha-2 codes. Display names are normalized by the Worker.

CREATE TABLE IF NOT EXISTS visitor_sessions (
  session_id TEXT PRIMARY KEY,
  country TEXT,
  city TEXT,
  region TEXT,
  continent TEXT,
  timezone TEXT,
  latitude REAL,
  longitude REAL,
  first_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS visitor_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES visitor_sessions(session_id),
  event_type TEXT NOT NULL DEFAULT 'visit',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_seen
  ON visitor_sessions (last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country
  ON visitor_sessions (country);

CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at
  ON visitor_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_events_session_created
  ON visitor_events (session_id, created_at DESC);
