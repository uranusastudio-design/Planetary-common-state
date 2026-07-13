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

-- ──────────────────────────────────────────────────────────────────────────────
-- Visitor observatory network
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitor_sessions (
  session_id      TEXT PRIMARY KEY,
  country         TEXT,
  region          TEXT,
  city            TEXT,
  latitude        REAL,
  longitude       REAL,
  timezone        TEXT,
  colo            TEXT,
  first_seen_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_seen_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  visit_count     INTEGER NOT NULL DEFAULT 1,
  last_user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_seen
  ON visitor_sessions (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country
  ON visitor_sessions (country);

CREATE TABLE IF NOT EXISTS visitor_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL REFERENCES visitor_sessions(session_id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('register', 'ping')),
  event_time  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  country     TEXT,
  region      TEXT,
  city        TEXT,
  latitude    REAL,
  longitude   REAL,
  timezone    TEXT,
  colo        TEXT
);

CREATE INDEX IF NOT EXISTS idx_visitor_events_time
  ON visitor_events (event_time DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_events_session_time
  ON visitor_events (session_id, event_time DESC);
