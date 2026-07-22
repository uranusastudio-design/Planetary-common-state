-- Phase 7.1 historical reconstruction is additive. Historical rows never
-- overwrite live provider or Phase 6 evidence records.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS history_days (
  id TEXT PRIMARY KEY,
  date_utc TEXT NOT NULL UNIQUE,
  reconstruction_status TEXT NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 0,
  snapshot_count INTEGER NOT NULL DEFAULT 0,
  event_candidate_count INTEGER NOT NULL DEFAULT 0,
  daily_brief_count INTEGER NOT NULL DEFAULT 0,
  provider_success_count INTEGER NOT NULL DEFAULT 0,
  provider_failure_count INTEGER NOT NULL DEFAULT 0,
  completeness_score REAL,
  completeness_components_json TEXT NOT NULL DEFAULT '{}',
  completeness_formula_version TEXT NOT NULL DEFAULT 'history-completeness-v1',
  completeness_weights_json TEXT NOT NULL DEFAULT '{"provider_coverage":0.2,"source_coverage":0.15,"temporal_coverage":0.2,"spatial_coverage":0.15,"variable_coverage":0.1,"event_coverage":0.1,"daily_brief_coverage":0.1}',
  missing_components_json TEXT NOT NULL DEFAULT '[]',
  earliest_available_at TEXT,
  latest_available_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_history_days_status_date ON history_days(reconstruction_status, date_utc DESC);

CREATE TABLE IF NOT EXISTS history_sources (
  id TEXT PRIMARY KEY,
  history_day_id TEXT NOT NULL REFERENCES history_days(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  dataset TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT NOT NULL,
  publication_time TEXT,
  retrieval_time TEXT,
  first_known_available_time TEXT,
  reliability_class TEXT,
  access_status TEXT NOT NULL,
  auth_required INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  archived_reference TEXT,
  checksum TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(history_day_id, checksum)
);
CREATE INDEX IF NOT EXISTS idx_history_sources_day_provider ON history_sources(history_day_id, provider, dataset);
CREATE INDEX IF NOT EXISTS idx_history_sources_available ON history_sources(first_known_available_time);

CREATE TABLE IF NOT EXISTS history_snapshots (
  id TEXT PRIMARY KEY,
  history_day_id TEXT NOT NULL REFERENCES history_days(id) ON DELETE CASCADE,
  history_source_id TEXT REFERENCES history_sources(id) ON DELETE SET NULL,
  snapshot_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  dataset TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT NOT NULL,
  region_id TEXT,
  layer_id TEXT,
  variable TEXT,
  value_json TEXT NOT NULL,
  unit TEXT,
  spatial_coverage TEXT,
  temporal_coverage TEXT,
  observed_at TEXT,
  valid_from TEXT,
  valid_to TEXT,
  published_at TEXT,
  retrieved_at TEXT,
  available_to_pcs_at TEXT,
  official_confirmation_time TEXT,
  latency_seconds REAL,
  quality TEXT,
  uncertainty REAL,
  data_state TEXT NOT NULL,
  source_snapshot_hash TEXT NOT NULL,
  raw_reference TEXT,
  revision_of_id TEXT REFERENCES history_snapshots(id) ON DELETE SET NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  revision_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(history_day_id, source_snapshot_hash)
);
CREATE INDEX IF NOT EXISTS idx_history_snapshots_replay ON history_snapshots(history_day_id, available_to_pcs_at, data_state);
CREATE INDEX IF NOT EXISTS idx_history_snapshots_filters ON history_snapshots(provider, dataset, region_id, layer_id, variable);
CREATE INDEX IF NOT EXISTS idx_history_snapshots_observed ON history_snapshots(observed_at);

CREATE TABLE IF NOT EXISTS history_provider_status (
  id TEXT PRIMARY KEY,
  history_day_id TEXT NOT NULL REFERENCES history_days(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  dataset TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  completed_at TEXT,
  runtime_status TEXT NOT NULL,
  http_status INTEGER,
  item_count INTEGER NOT NULL DEFAULT 0,
  snapshot_count INTEGER NOT NULL DEFAULT 0,
  latency_ms REAL,
  failure_reason TEXT,
  adapter_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(history_day_id, provider, dataset, requested_at)
);
CREATE INDEX IF NOT EXISTS idx_history_provider_day_status ON history_provider_status(history_day_id, runtime_status, provider, dataset);

CREATE TABLE IF NOT EXISTS history_events (
  id TEXT PRIMARY KEY,
  history_day_id TEXT NOT NULL REFERENCES history_days(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES pcs_events(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  region_id TEXT,
  event_status TEXT NOT NULL,
  observed_event_time TEXT,
  first_public_confirmation_time TEXT,
  first_available_to_pcs_time TEXT,
  candidate_generated_at TEXT,
  confidence REAL,
  evidence_state TEXT NOT NULL,
  causal_status TEXT NOT NULL DEFAULT 'NOT_ESTABLISHED',
  source_count INTEGER NOT NULL DEFAULT 0,
  retrospective_eligible INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(history_day_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_history_events_query ON history_events(history_day_id, region_id, event_type, evidence_state);
CREATE INDEX IF NOT EXISTS idx_history_events_availability ON history_events(first_available_to_pcs_time);

CREATE TABLE IF NOT EXISTS history_replay_sessions (
  id TEXT PRIMARY KEY,
  replay_date TEXT NOT NULL,
  replay_start_time TEXT,
  replay_end_time TEXT,
  current_frame_time TEXT,
  region_id TEXT,
  selected_layers_json TEXT NOT NULL DEFAULT '[]',
  playback_speed REAL NOT NULL DEFAULT 1,
  playback_state TEXT NOT NULL DEFAULT 'REPLAY_READY',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_history_replay_date ON history_replay_sessions(replay_date, updated_at DESC);

CREATE TABLE IF NOT EXISTS history_reconstruction_jobs (
  id TEXT PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  providers_json TEXT NOT NULL,
  regions_json TEXT NOT NULL,
  force_refresh INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  cursor_date TEXT,
  processed_days INTEGER NOT NULL DEFAULT 0,
  provider_request_count INTEGER NOT NULL DEFAULT 0,
  max_provider_requests INTEGER NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  requested_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_history_jobs_status_requested ON history_reconstruction_jobs(status, requested_at DESC);
