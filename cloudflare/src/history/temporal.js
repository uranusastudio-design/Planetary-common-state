export const HISTORY_DATA_STATES = Object.freeze([
  "AVAILABLE_AT_TIME",
  "PUBLISHED_LATER",
  "RETRIEVED_LATER",
  "REVISED_LATER",
  "AVAILABILITY_UNKNOWN",
  "NOT_ARCHIVED",
  "AUTH_REQUIRED",
  "SOURCE_UNAVAILABLE",
]);

export const HISTORY_MAX_MANUAL_DAYS = 31;
export const HISTORY_MAX_PROVIDER_REQUESTS = 20;
export const HISTORY_MAX_PAGE_SIZE = 100;
export const HISTORY_MAX_RETRIES = 2;
export const HISTORY_DEFAULT_START = "2026-07-01";
export const HISTORY_COMPLETENESS_VERSION = "history-completeness-v1";
export const HISTORY_COMPLETENESS_WEIGHTS = Object.freeze({
  provider_coverage: 0.2,
  source_coverage: 0.15,
  temporal_coverage: 0.2,
  spatial_coverage: 0.15,
  variable_coverage: 0.1,
  event_coverage: 0.1,
  daily_brief_coverage: 0.1,
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value) {
  if (!ISO_DATE.test(String(value || ""))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function normalizeTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function validateHistoryRange(startValue, endValue, options = {}) {
  const maxDays = options.maxDays || HISTORY_MAX_MANUAL_DAYS;
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start || !end) return { ok: false, status: 400, error: "start_date and end_date must use YYYY-MM-DD" };
  if (start > end) return { ok: false, status: 400, error: "start_date must not be after end_date" };
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  if (days > maxDays) return { ok: false, status: 400, error: `Historical reconstruction is limited to ${maxDays} days per request`, days };
  return { ok: true, start: startValue, end: endValue, days };
}

export function enumerateDates(startValue, endValue) {
  const validation = validateHistoryRange(startValue, endValue);
  if (!validation.ok) return [];
  const result = [];
  const cursor = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export function dayBounds(dateValue) {
  const date = parseIsoDate(dateValue);
  if (!date) return null;
  return {
    start: date.toISOString(),
    end: new Date(date.getTime() + 86400000 - 1).toISOString(),
  };
}

export function temporalState(record, replayTimestamp) {
  const replay = normalizeTimestamp(replayTimestamp);
  if (!replay) return "AVAILABILITY_UNKNOWN";
  const available = normalizeTimestamp(record?.available_to_pcs_at || record?.first_available_to_pcs_time);
  if (!available) return "AVAILABILITY_UNKNOWN";
  if (available <= replay) {
    if (record?.revision_of_id && normalizeTimestamp(record?.created_at) > replay) return "REVISED_LATER";
    return "AVAILABLE_AT_TIME";
  }
  const published = normalizeTimestamp(record?.published_at || record?.publication_time);
  if (published && published > replay) return "PUBLISHED_LATER";
  const retrieved = normalizeTimestamp(record?.retrieved_at || record?.retrieval_time);
  if (retrieved && retrieved > replay) return "RETRIEVED_LATER";
  if (record?.revision_of_id || Number(record?.revision_number || 1) > 1) return "REVISED_LATER";
  return "RETRIEVED_LATER";
}

export function isReplayVisible(record, replayTimestamp) {
  return temporalState(record, replayTimestamp) === "AVAILABLE_AT_TIME";
}

export function latestHistoricalRevisions(records = []) {
  const latest = new Map();
  for (const record of records) {
    const key = record.raw_reference
      ? `${record.snapshot_type || "snapshot"}|${record.provider || ""}|${record.dataset || ""}|${record.raw_reference}`
      : record.id;
    if (key) latest.set(key, record);
  }
  return [...latest.values()];
}

export function historicalBriefState(item) {
  const published = normalizeTimestamp(item?.published_at);
  const retrieved = normalizeTimestamp(item?.retrieved_at);
  if (!retrieved) return "AVAILABILITY_UNKNOWN";
  if (!published) return "PUBLICATION_METADATA_ONLY";
  return retrieved.slice(0, 10) === published.slice(0, 10) ? "STORED_AT_TIME" : "BACKFILLED_LATER";
}

export function separateEventKnowledge({ event, evidence = [], sources = [] }, replayTimestamp) {
  const available = (record, field) => {
    const timestamp = normalizeTimestamp(record?.[field]);
    return Boolean(timestamp && timestamp <= normalizeTimestamp(replayTimestamp));
  };
  const before = {
    event,
    information_available: event && isReplayVisible({ available_to_pcs_at: event.first_available_to_pcs_time }, replayTimestamp) ? [event] : [],
    forecasts_available: [],
    precursor_variables: [],
    missing_variables: [],
    provider_failures: [],
    uncertainty: event?.confidence == null ? null : 1 - Number(event.confidence),
    causal_status: event?.causal_status || "NOT_ESTABLISHED",
  };
  const confirmations = evidence.filter((row) => available(row, "official_confirmation_time"));
  const laterSources = sources.filter((row) => available(row, "first_known_available_time"));
  return {
    before_event: before,
    after_event: {
      official_confirmation: confirmations,
      observed_outcome: confirmations.map((row) => row.actual_event).filter(Boolean),
      later_source_reports: laterSources,
      revisions: laterSources.filter((row) => row.access_status === "REVISED_LATER"),
      evidence_ledger_result: confirmations.map((row) => row.result).filter(Boolean),
    },
  };
}

export function completenessFromCoverage(components) {
  const normalized = {};
  const missing = [];
  for (const key of Object.keys(HISTORY_COMPLETENESS_WEIGHTS)) {
    const value = components?.[key];
    if (!Number.isFinite(value)) {
      normalized[key] = null;
      missing.push(key);
    } else {
      normalized[key] = Math.max(0, Math.min(1, value));
    }
  }
  const score = missing.length
    ? null
    : Object.entries(HISTORY_COMPLETENESS_WEIGHTS).reduce((sum, [key, weight]) => sum + normalized[key] * weight, 0);
  return { score, components: normalized, missing_components: missing, formula_version: HISTORY_COMPLETENESS_VERSION, weights: HISTORY_COMPLETENESS_WEIGHTS };
}

export function parseLimit(value, fallback = 50) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(HISTORY_MAX_PAGE_SIZE, Math.max(1, Math.trunc(numeric))) : fallback;
}

export function encodeCursor(value) {
  return value ? btoa(unescape(encodeURIComponent(String(value)))) : null;
}

export function decodeCursor(value) {
  if (!value) return null;
  try { return decodeURIComponent(escape(atob(value))); } catch { return null; }
}
