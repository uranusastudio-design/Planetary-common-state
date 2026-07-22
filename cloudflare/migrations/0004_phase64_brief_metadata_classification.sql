-- Historical brief rows are publication records, never scientific observations.
UPDATE pcs_daily_brief_items
SET data_state = 'PUBLICATION_METADATA',
    event_summary = COALESCE(event_summary, summary),
    observed_event_time = NULL,
    confidence = NULL,
    created_at = COALESCE(created_at, retrieved_at),
    updated_at = COALESCE(updated_at, retrieved_at)
WHERE data_state = 'OBSERVED';
