-- Additive intelligence-layer migration. No existing row or table is modified.
CREATE TABLE IF NOT EXISTS pcs_daily_brief_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL,
  region TEXT NOT NULL,
  event_type TEXT NOT NULL,
  pcs_domains TEXT NOT NULL DEFAULT '[]',
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  reliability TEXT NOT NULL,
  published_at TEXT,
  image_url TEXT,
  event_candidate INTEGER NOT NULL DEFAULT 0,
  event_candidate_reason TEXT,
  data_state TEXT NOT NULL DEFAULT 'PUBLICATION_METADATA',
  retrieved_at TEXT NOT NULL,
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
  uncertainty REAL,
  calculated_at TEXT NOT NULL,
  validation_status TEXT NOT NULL,
  input_snapshot_ids TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_pcs_residual_component ON pcs_residual_calculations(component, calculated_at DESC);
