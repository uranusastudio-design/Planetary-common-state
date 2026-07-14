-- Compatibility migration for the deployed visitor Worker.
-- Keeps existing columns and adds the names currently used by visitors.js.

ALTER TABLE visitor_sessions ADD COLUMN country TEXT;

ALTER TABLE visitor_events ADD COLUMN event_type TEXT DEFAULT 'visit';

ALTER TABLE visitor_events ADD COLUMN created_at TEXT;

UPDATE visitor_sessions
SET country = country_name
WHERE country IS NULL;

UPDATE visitor_events
SET event_type = 'visit'
WHERE event_type IS NULL OR event_type = '';

UPDATE visitor_events
SET created_at = visited_at
WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at
ON visitor_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_events_event_type
ON visitor_events(event_type);
