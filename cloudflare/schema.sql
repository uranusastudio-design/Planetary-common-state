-- PCS Backend – Cloudflare D1 schema
-- Apply to a fresh database with:
--   wrangler d1 execute pcsbackend --file=cloudflare/schema.sql
-- Or against the local dev database:
--   wrangler d1 execute pcsbackend --local --file=cloudflare/schema.sql

-- ──────────────────────────────────────────────────────────────────────────────
-- Regions
-- region_id = 1 is the global/planetary aggregate used by the ingest worker.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pcs_regions (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL UNIQUE,
  code    TEXT    NOT NULL UNIQUE   -- e.g. "GLOBAL", "NH", "SH"
);

INSERT OR IGNORE INTO pcs_regions (id, name, code) VALUES (1, 'Global', 'GLOBAL');

-- ──────────────────────────────────────────────────────────────────────────────
-- Data sources
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pcs_sources (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL UNIQUE,
  url  TEXT
);

INSERT OR IGNORE INTO pcs_sources (name, url) VALUES
  ('NASA GISTEMP',             'https://data.giss.nasa.gov/gistemp/'),
  ('NOAA GML CO2',             'https://gml.noaa.gov/ccgg/trends/'),
  ('NOAA GML CH4',             'https://gml.noaa.gov/ccgg/trends_ch4/'),
  ('NASA POWER',               'https://power.larc.nasa.gov/'),
  ('NOAA OISST',               'https://www.ncei.noaa.gov/products/optimum-interpolation-sst'),
  ('NASA Sea Level',           'https://sealevel.nasa.gov/'),
  ('NOAA Ocean Heat Content',  'https://www.ncei.noaa.gov/access/global-ocean-heat-content/'),
  ('NSIDC Sea Ice',            'https://nsidc.org/data/seaice_index/'),
  ('NASA MODIS NDVI',          'https://modis.gsfc.nasa.gov/data/dataprod/mod13.php'),
  ('NASA FIRMS',               'https://firms.modaps.eosdis.nasa.gov/'),
  ('World Bank Population',    'https://data.worldbank.org/indicator/SP.POP.TOTL'),
  ('Energy Institute',         'https://www.energyinst.org/statistical-review');

-- ──────────────────────────────────────────────────────────────────────────────
-- Planetary variables (the PCS variable registry)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pcs_variables (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol         TEXT    NOT NULL UNIQUE,
  name           TEXT    NOT NULL,
  category       TEXT    NOT NULL,   -- e.g. "thermal", "carbon", "cryosphere"
  residual_group TEXT,               -- PCS layer: L_T, L_C, L_S, L_I, L_H, L_E
  unit           TEXT    NOT NULL
);

INSERT OR IGNORE INTO pcs_variables (symbol, name, category, residual_group, unit) VALUES
  ('GMST',       'Global Mean Surface Temperature',  'thermal',    'L_T', '°C anomaly'),
  ('SST',        'Sea Surface Temperature',           'thermal',    'L_T', '°C'),
  ('CO2',        'Atmospheric CO₂',                  'carbon',     'L_C', 'ppm'),
  ('CH4',        'Atmospheric CH₄',                  'carbon',     'L_C', 'ppb'),
  ('ARCTIC_ICE', 'Arctic Sea Ice Extent',             'cryosphere', 'L_S', 'million km²'), -- symbol kept short to match ingest code
  ('GMSL',       'Global Mean Sea Level',             'cryosphere', 'L_S', 'mm'),
  ('NDVI',       'Normalized Difference Vegetation',  'biosphere',  'L_I', 'index'),
  ('FIRE',       'Active Fire Detections',            'biosphere',  'L_I', 'count'),
  ('POP',        'World Population',                  'human',      'L_H', 'billions'),
  ('ENERGY',     'Primary Energy Consumption',        'human',      'L_E', 'EJ'),
  ('PRECIP',     'Global Precipitation',              'water',      NULL,  'mm/day'),
  ('CLOUD',      'Cloud Cover',                       'atmosphere', NULL,  '%'),
  ('UV',         'UV Index',                          'atmosphere', NULL,  'index'),
  ('RAD',        'Surface Solar Radiation',           'energy',     NULL,  'kWh/m²/day');

-- ──────────────────────────────────────────────────────────────────────────────
-- Observations
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pcs_observations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  variable_id INTEGER NOT NULL REFERENCES pcs_variables(id),
  region_id   INTEGER NOT NULL REFERENCES pcs_regions(id)  DEFAULT 1,
  timestamp   TEXT    NOT NULL,   -- ISO-8601, e.g. "2024-12-31T00:00:00Z"
  value       REAL    NOT NULL,
  uncertainty REAL,
  source_id   INTEGER NOT NULL REFERENCES pcs_sources(id),
  ingested_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_obs_variable_time
  ON pcs_observations (variable_id, timestamp DESC);

-- ------------------------------------------------------------
-- PCS Global Observatory Network
-- Lightweight visitor observatory tables. These tables do not
-- participate in PCS scientific calculations.
-- Country values are ISO 3166-1 alpha-2 codes; the Worker returns normalized names.
-- ------------------------------------------------------------
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

-- PCS retrospective analysis and validation. JSON fields store source snapshots
-- and ordered evidence without flattening provider-specific scientific data.
CREATE TABLE IF NOT EXISTS pcs_events (
  id TEXT PRIMARY KEY,
  cluster_id TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  region TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_summary TEXT,
  why_it_matters TEXT,
  research_relevance TEXT,
  published_at TEXT,
  observed_event_time TEXT,
  source_url TEXT,
  source_name TEXT,
  source_type TEXT,
  image_url TEXT,
  confidence REAL,
  latitude REAL,
  longitude REAL,
  merge_status TEXT NOT NULL DEFAULT 'unreviewed',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_pcs_events_type_time ON pcs_events(event_type, observed_event_time DESC);
CREATE INDEX IF NOT EXISTS idx_pcs_events_cluster ON pcs_events(cluster_id);

CREATE TABLE IF NOT EXISTS pcs_event_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES pcs_events(id),
  source_url TEXT NOT NULL,
  source_name TEXT,
  source_type TEXT,
  published_at TEXT,
  relationship TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(event_id, source_url)
);

CREATE TABLE IF NOT EXISTS pcs_retrospective_analyses (
  analysis_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES pcs_events(id),
  result_time TEXT,
  analysis_start_time TEXT,
  precursor_window_start TEXT,
  precursor_window_end TEXT,
  earliest_detectable_time TEXT,
  estimated_lead_time_hours REAL,
  region TEXT,
  affected_systems TEXT NOT NULL DEFAULT '[]',
  precursor_signals TEXT NOT NULL DEFAULT '[]',
  causal_chain TEXT NOT NULL DEFAULT '[]',
  amplification_factors TEXT NOT NULL DEFAULT '[]',
  exposure_factors TEXT NOT NULL DEFAULT '[]',
  data_sources_used TEXT NOT NULL DEFAULT '[]',
  missing_data TEXT NOT NULL DEFAULT '[]',
  pcs_observability TEXT NOT NULL DEFAULT '{}',
  proposed_warning_rules TEXT NOT NULL DEFAULT '[]',
  proposed_interventions TEXT NOT NULL DEFAULT '[]',
  validation_status TEXT NOT NULL DEFAULT 'unvalidated',
  validation_notes TEXT,
  analyst_confidence REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS pcs_event_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES pcs_events(id),
  milestone_type TEXT NOT NULL,
  occurred_at TEXT,
  value_status TEXT NOT NULL CHECK(value_status IN ('observed','inferred','estimated','unavailable','delayed')),
  description TEXT,
  source_url TEXT,
  confidence REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS pcs_warning_rules (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  version TEXT NOT NULL,
  conditions TEXT NOT NULL,
  data_sources TEXT NOT NULL,
  test_results TEXT NOT NULL DEFAULT '{}',
  false_positive_rate REAL,
  false_negative_rate REAL,
  status TEXT NOT NULL DEFAULT 'candidate',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(event_type, version)
);

CREATE TABLE IF NOT EXISTS pcs_evidence_ledger (
  analysis_id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES pcs_events(id),
  issued_at TEXT NOT NULL,
  region TEXT NOT NULL,
  event_type TEXT NOT NULL,
  expected_event_window TEXT,
  input_data_snapshot TEXT NOT NULL DEFAULT '[]',
  precursor_signals TEXT NOT NULL DEFAULT '[]',
  causal_chain TEXT NOT NULL DEFAULT '[]',
  warning_rule_version TEXT,
  confidence REAL,
  proposed_actions TEXT NOT NULL DEFAULT '[]',
  actual_event TEXT,
  official_confirmation_time TEXT,
  news_publication_time TEXT,
  lead_time_hours REAL,
  result TEXT NOT NULL CHECK(result IN ('confirmed','partially_confirmed','false_alarm','missed','unresolved','insufficient_data')),
  false_positive INTEGER NOT NULL DEFAULT 0,
  false_negative INTEGER NOT NULL DEFAULT 0,
  partial_hit INTEGER NOT NULL DEFAULT 0,
  data_missing INTEGER NOT NULL DEFAULT 0,
  retrospective_score REAL,
  lessons_learned TEXT,
  model_revision TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS pcs_data_snapshots (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES pcs_events(id),
  provider TEXT NOT NULL,
  dataset TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp TEXT,
  spatial_resolution TEXT,
  temporal_resolution TEXT,
  latency REAL,
  license TEXT,
  quality_flag TEXT,
  uncertainty REAL,
  retrieval_status TEXT NOT NULL,
  payload TEXT,
  retrieved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS pcs_mass_gatherings (
  id TEXT PRIMARY KEY,
  case_id TEXT,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  venue TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  latitude REAL,
  longitude REAL,
  start_time TEXT,
  end_time TEXT,
  estimated_attendance REAL,
  venue_capacity REAL,
  outdoor_exposure TEXT,
  queue_duration_estimate REAL,
  transport_load REAL,
  international_arrival_estimate REAL,
  domestic_arrival_estimate REAL,
  hotel_occupancy REAL,
  airport_load REAL,
  rail_load REAL,
  road_congestion REAL,
  medical_capacity REAL,
  shade_availability REAL,
  water_availability REAL,
  hazard_index REAL,
  crowd_density REAL,
  vulnerability REAL,
  exposure_duration REAL,
  risk_index REAL,
  source TEXT,
  confidence REAL,
  data_status TEXT NOT NULL DEFAULT 'unavailable',
  source_limitations TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS pcs_human_mobility (
  id TEXT PRIMARY KEY,
  case_id TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  observed_at TEXT,
  metric TEXT NOT NULL,
  observed_total REAL,
  estimated_related REAL,
  confidence_interval_low REAL,
  confidence_interval_high REAL,
  estimation_method TEXT,
  data_latency REAL,
  source TEXT,
  source_url TEXT,
  data_status TEXT NOT NULL CHECK(data_status IN ('observed','estimated','unavailable','delayed','inferred')),
  source_limitations TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS pcs_provider_status (
  adapter_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  dataset TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp TEXT,
  latency REAL,
  quality_flag TEXT,
  uncertainty REAL,
  license TEXT,
  validation_status TEXT,
  availability TEXT,
  retrieval_status TEXT,
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pcs_scheduled_runs (
  id TEXT PRIMARY KEY,
  cron TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  details TEXT
);

-- Case shells contain no synthetic observations. They make missing inputs
-- explicit until scheduled adapters retrieve traceable provider records.
INSERT OR IGNORE INTO pcs_events
  (id, title, category, region, event_type, event_summary, why_it_matters, research_relevance, source_name, source_type, confidence)
VALUES
  ('usa-heat-dome-2026-07', 'United States heat-dome retrospective case', 'climate', 'United States', 'heat_dome',
   'Backtest workspace covering Montana, Utah, Wyoming, Nevada, Colorado, the Northern Plains, Midwest, and Eastern United States.',
   'Tests whether precursor observations were available before public confirmation.',
   'Causal-chain reconstruction and lead-time validation.', 'PCS Evidence Ledger', 'analysis', NULL),
  ('fifa-world-cup-2026-multicity', 'FIFA World Cup 2026 multi-city gathering case', 'civilization', 'United States host cities', 'mass_gathering',
   'Multi-city case for public schedules, aggregate arrivals, transport, weather, air quality, and medical-capacity evidence.',
   'Separates aggregate human exposure from the natural physical state.',
   'Crowd-risk timeline and public-data observability.', 'FIFA and public agencies', 'official_public', NULL);

INSERT OR IGNORE INTO pcs_retrospective_analyses
  (analysis_id, event_id, region, affected_systems, precursor_signals, causal_chain, amplification_factors, exposure_factors, data_sources_used, missing_data, pcs_observability, proposed_warning_rules, proposed_interventions, validation_status, validation_notes)
VALUES
  ('analysis-usa-heat-dome-2026-07', 'usa-heat-dome-2026-07', 'United States',
   '["thermal","atmosphere","hydrosphere","biosphere","civilization","infrastructure","human_mobility"]', '[]', '[]', '[]', '[]', '[]',
   '["2 m air temperature","daily maximum temperature","nighttime minimum temperature","500 hPa geopotential height","blocking index","wind speed","cloud cover","net radiation","precipitation anomaly","soil moisture","evapotranspiration","sensible heat flux","latent heat flux","H/LE ratio","vegetation condition","wildfire risk","smoke / PM2.5","grid demand","mass gathering schedule","airport passenger volume","international arrival estimates","major sports and public events"]',
   '{"meteorology":"unavailable","ocean":"unavailable","soil":"unavailable","vegetation":"unavailable","air_quality":"unavailable","energy":"unavailable","transport":"unavailable","human_mobility":"unavailable","mass_gathering":"unavailable","medical_capacity":"unavailable","infrastructure":"unavailable","socioeconomic":"unavailable"}',
   '[]', '[]', 'unvalidated', 'No observation snapshot has been ingested; no lead-time or causal claim is made.'),
  ('analysis-fifa-world-cup-2026-multicity', 'fifa-world-cup-2026-multicity', 'United States host cities',
   '["civilization","infrastructure","human_mobility","atmosphere"]', '[]', '[]', '[]', '[]', '[]',
   '["actual attendance","tournament-related arrival estimates","hotel occupancy","interstate travel","transport congestion","WBGT","air quality","medical capacity","local concurrent events"]',
   '{"meteorology":"unavailable","ocean":"unavailable","soil":"unavailable","vegetation":"unavailable","air_quality":"unavailable","energy":"unavailable","transport":"unavailable","human_mobility":"unavailable","mass_gathering":"unavailable","medical_capacity":"unavailable","infrastructure":"unavailable","socioeconomic":"unavailable"}',
   '[]', '[]', 'unvalidated', 'Public sources cannot identify individual traveler intent; only aggregate observed and explicitly modeled estimates are permitted.');

INSERT OR IGNORE INTO pcs_evidence_ledger
  (analysis_id, event_id, issued_at, region, event_type, input_data_snapshot, precursor_signals, causal_chain, confidence, proposed_actions, result, data_missing, lessons_learned)
VALUES
  ('ledger-usa-heat-dome-2026-07', 'usa-heat-dome-2026-07', strftime('%Y-%m-%dT%H:%M:%SZ','now'), 'United States', 'heat_dome', '[]', '[]', '[]', NULL, '[]', 'insufficient_data', 1, 'Await traceable pre-event observations and official confirmation before scoring.'),
  ('ledger-fifa-world-cup-2026-multicity', 'fifa-world-cup-2026-multicity', strftime('%Y-%m-%dT%H:%M:%SZ','now'), 'United States host cities', 'mass_gathering', '[]', '[]', '[]', NULL, '[]', 'insufficient_data', 1, 'Do not infer traveler purpose from aggregate arrivals.');

INSERT OR IGNORE INTO pcs_mass_gatherings
  (id, case_id, event_name, event_category, city, region, country, source, data_status, source_limitations)
VALUES
  ('wc26-atlanta', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'Atlanta', 'Georgia', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-boston', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'Boston', 'Massachusetts', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-dallas', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'Dallas', 'Texas', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-houston', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'Houston', 'Texas', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-kansas-city', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'Kansas City', 'Missouri', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-los-angeles', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'Los Angeles', 'California', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-miami', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'Miami', 'Florida', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-new-york-new-jersey', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'New York / New Jersey', 'New York / New Jersey', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-philadelphia', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'Philadelphia', 'Pennsylvania', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-san-francisco-bay', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'San Francisco Bay Area', 'California', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.'),
  ('wc26-seattle', 'fifa-world-cup-2026-multicity', 'FIFA World Cup 2026', 'football', 'Seattle', 'Washington', 'United States', 'FIFA public match schedule', 'unavailable', 'Awaiting retrieval; no attendance or traveler attribution is inferred.');

-- Additive intelligence-layer migration. No existing row or table is modified.
CREATE TABLE IF NOT EXISTS pcs_daily_brief_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  event_summary TEXT,
  why_it_matters TEXT,
  research_relevance TEXT,
  category TEXT NOT NULL,
  region TEXT NOT NULL,
  event_type TEXT NOT NULL,
  pcs_domains TEXT NOT NULL DEFAULT '[]',
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  reliability TEXT NOT NULL,
  published_at TEXT,
  observed_event_time TEXT,
  confidence REAL,
  image_url TEXT,
  event_candidate INTEGER NOT NULL DEFAULT 0,
  event_candidate_reason TEXT,
  data_state TEXT NOT NULL DEFAULT 'PUBLICATION_METADATA',
  retrieved_at TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(source_url)
);
CREATE INDEX IF NOT EXISTS idx_pcs_brief_published ON pcs_daily_brief_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pcs_brief_category ON pcs_daily_brief_items(category, published_at DESC);

CREATE TABLE IF NOT EXISTS pcs_ai_outputs (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES pcs_events(id),
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT,
  generated_at TEXT NOT NULL,
  input_snapshot_ids TEXT NOT NULL DEFAULT '[]',
  confidence REAL,
  review_status TEXT NOT NULL DEFAULT 'PROPOSAL',
  prompt_or_rule_version TEXT NOT NULL,
  output TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pcs_ai_event ON pcs_ai_outputs(event_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS pcs_review_history (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES pcs_events(id),
  ai_output_id TEXT REFERENCES pcs_ai_outputs(id),
  reviewer_type TEXT NOT NULL CHECK(reviewer_type IN ('human','rule')),
  status TEXT NOT NULL,
  notes TEXT,
  warning_rule_version TEXT,
  reviewed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pcs_review_event ON pcs_review_history(event_id, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS pcs_residual_calculations (
  id TEXT PRIMARY KEY,
  component TEXT NOT NULL CHECK(component IN ('thermal','flow','chemical','informational','structural')),
  value REAL,
  formula_version TEXT NOT NULL,
  baseline_period TEXT NOT NULL,
  variables_used TEXT NOT NULL,
  normalization_method TEXT NOT NULL,
  weights TEXT NOT NULL,
  data_coverage REAL NOT NULL,
  spatial_coverage TEXT,
  temporal_coverage TEXT,
  uncertainty REAL,
  validation_method TEXT,
  unavailable_reason TEXT,
  calculated_at TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  input_snapshot_ids TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_pcs_residual_component ON pcs_residual_calculations(component, calculated_at DESC);
