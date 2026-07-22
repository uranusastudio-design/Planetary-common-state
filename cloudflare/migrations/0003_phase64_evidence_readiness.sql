-- Phase 6.4 additive provenance and readiness fields.
ALTER TABLE pcs_events ADD COLUMN latitude REAL;
ALTER TABLE pcs_events ADD COLUMN longitude REAL;

ALTER TABLE pcs_daily_brief_items ADD COLUMN event_summary TEXT;
ALTER TABLE pcs_daily_brief_items ADD COLUMN why_it_matters TEXT;
ALTER TABLE pcs_daily_brief_items ADD COLUMN research_relevance TEXT;
ALTER TABLE pcs_daily_brief_items ADD COLUMN observed_event_time TEXT;
ALTER TABLE pcs_daily_brief_items ADD COLUMN confidence REAL;
ALTER TABLE pcs_daily_brief_items ADD COLUMN created_at TEXT;
ALTER TABLE pcs_daily_brief_items ADD COLUMN updated_at TEXT;

ALTER TABLE pcs_residual_calculations ADD COLUMN spatial_coverage TEXT;
ALTER TABLE pcs_residual_calculations ADD COLUMN temporal_coverage TEXT;
ALTER TABLE pcs_residual_calculations ADD COLUMN validation_method TEXT;
ALTER TABLE pcs_residual_calculations ADD COLUMN unavailable_reason TEXT;
