import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../src/index.js";
import { HISTORICAL_ADAPTERS } from "../src/history/adapters.js";
import { checksum, reconstructionJobKey, sourceIdentity } from "../src/history/reconstruction.js";
import {
  completenessFromCoverage,
  decodeCursor,
  encodeCursor,
  historicalBriefState,
  isReplayVisible,
  latestHistoricalRevisions,
  separateEventKnowledge,
  temporalState,
  validateHistoryRange,
} from "../src/history/temporal.js";

const migration = await readFile(new URL("../migrations/0005_phase71_historical_reconstruction.sql", import.meta.url), "utf8");
const routes = await readFile(new URL("../src/history/routes.js", import.meta.url), "utf8");
const reconstruction = await readFile(new URL("../src/history/reconstruction.js", import.meta.url), "utf8");
const temporal = await readFile(new URL("../src/history/temporal.js", import.meta.url), "utf8");

test("Phase 7.1 migration creates every historical table with foreign keys and replay indexes", () => {
  for (const table of ["history_days", "history_snapshots", "history_sources", "history_provider_status", "history_events", "history_replay_sessions", "history_reconstruction_jobs"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  }
  assert.match(migration, /REFERENCES history_days\(id\) ON DELETE CASCADE/);
  assert.match(migration, /REFERENCES pcs_events\(id\) ON DELETE SET NULL/);
  assert.match(migration, /idx_history_snapshots_replay/);
});

test("temporal integrity excludes snapshots before documented PCS availability", () => {
  const record = { observed_at: "2026-07-02T01:00:00Z", published_at: "2026-07-02T02:00:00Z", retrieved_at: "2026-07-02T03:00:00Z", available_to_pcs_at: "2026-07-02T03:00:00Z" };
  assert.equal(temporalState(record, "2026-07-02T02:30:00Z"), "RETRIEVED_LATER");
  assert.equal(isReplayVisible(record, "2026-07-02T02:30:00Z"), false);
  assert.equal(temporalState(record, "2026-07-02T03:00:00Z"), "AVAILABLE_AT_TIME");
  assert.equal(isReplayVisible(record, "2026-07-02T03:00:00Z"), true);
});

test("publication and retrieval times remain distinct from observation time", () => {
  const record = { observed_at: "2026-07-02T00:00:00Z", published_at: "2026-07-03T00:00:00Z", retrieved_at: "2026-07-03T01:00:00Z", available_to_pcs_at: "2026-07-03T01:00:00Z" };
  assert.equal(temporalState(record, "2026-07-02T23:59:59Z"), "PUBLISHED_LATER");
  assert.equal(isReplayVisible(record, record.observed_at), false);
});

test("unknown availability is excluded from strict replay", () => {
  assert.equal(temporalState({ observed_at: "2026-07-02T00:00:00Z" }, "2026-07-02T12:00:00Z"), "AVAILABILITY_UNKNOWN");
  assert.equal(isReplayVisible({ observed_at: "2026-07-02T00:00:00Z" }, "2026-07-02T12:00:00Z"), false);
});

test("replay keeps only the latest available revision for one archived reference", () => {
  const rows = [
    { id: "v1", snapshot_type: "earthquake_event", provider: "USGS", dataset: "FDSN", raw_reference: "usgs:1", available_to_pcs_at: "2026-07-22T01:00:00Z" },
    { id: "v2", snapshot_type: "earthquake_event", provider: "USGS", dataset: "FDSN", raw_reference: "usgs:1", available_to_pcs_at: "2026-07-22T02:00:00Z" },
    { id: "other", raw_reference: null },
  ];
  assert.deepEqual(latestHistoricalRevisions(rows).map((row) => row.id), ["v2", "other"]);
});

test("later official confirmation and later sources stay out of pre-event sections", () => {
  const event = { first_available_to_pcs_time: "2026-07-02T01:00:00Z", causal_status: "NOT_ESTABLISHED" };
  const payload = separateEventKnowledge({
    event,
    evidence: [{ official_confirmation_time: "2026-07-02T06:00:00Z", actual_event: "confirmed", result: "confirmed" }],
    sources: [{ first_known_available_time: "2026-07-02T07:00:00Z" }],
  }, "2026-07-02T05:00:00Z");
  assert.equal(payload.before_event.causal_status, "NOT_ESTABLISHED");
  assert.deepEqual(payload.after_event.official_confirmation, []);
  assert.deepEqual(payload.after_event.later_source_reports, []);
});

test("Daily Brief historical state distinguishes stored-at-time, later backfill and unknown", () => {
  assert.equal(historicalBriefState({ published_at: "2026-07-02T01:00:00Z", retrieved_at: "2026-07-02T05:00:00Z" }), "STORED_AT_TIME");
  assert.equal(historicalBriefState({ published_at: "2026-07-02T01:00:00Z", retrieved_at: "2026-07-03T05:00:00Z" }), "BACKFILLED_LATER");
  assert.equal(historicalBriefState({ published_at: "2026-07-02T01:00:00Z" }), "AVAILABILITY_UNKNOWN");
});

test("manual reconstruction validates dates and rejects unbounded ranges", () => {
  assert.equal(validateHistoryRange("2026-07-01", "2026-07-22").ok, true);
  assert.equal(validateHistoryRange("not-a-date", "2026-07-22").ok, false);
  assert.equal(validateHistoryRange("2026-07-22", "2026-07-01").ok, false);
  assert.equal(validateHistoryRange("2026-01-01", "2026-07-22").ok, false);
  assert.match(temporal, /HISTORY_MAX_PROVIDER_REQUESTS = 20/);
  assert.match(reconstruction, /status='PAUSED_LIMIT'/);
  assert.match(reconstruction, /status='ERROR'/);
});

test("source and snapshot checksums are deterministic for idempotent deduplication", async () => {
  const value = { provider: "USGS", id: "abc", observed_at: "2026-07-02T00:00:00Z" };
  assert.equal(await checksum(value), await checksum(value));
  assert.notEqual(await checksum(value), await checksum({ ...value, id: "def" }));
  assert.match(migration, /UNIQUE\(history_day_id, checksum\)/);
  assert.match(migration, /UNIQUE\(history_day_id, source_snapshot_hash\)/);
  assert.match(reconstruction, /ON CONFLICT\(history_day_id, source_snapshot_hash\) DO NOTHING/);
});

test("source identity deduplicates retries but preserves later catalog revisions", () => {
  const source = { provider: "USGS", dataset: "FDSN", source_url: "https://example.test/event/1", publication_time: "2026-07-22T01:00:00Z", archived_reference: "usgs:1", retrieval_time: "2026-07-22T02:00:00Z" };
  assert.deepEqual(sourceIdentity(source), sourceIdentity({ ...source, retrieval_time: "2026-07-22T03:00:00Z" }));
  assert.notDeepEqual(sourceIdentity(source), sourceIdentity({ ...source, publication_time: "2026-07-22T04:00:00Z" }));
});

test("reconstruction job identity is stable across provider and region ordering", () => {
  const a = reconstructionJobKey({ start_date: "2026-07-01", end_date: "2026-07-02", providers: ["b", "a"], regions: ["tw", "global"], force_refresh: false });
  const b = reconstructionJobKey({ start_date: "2026-07-01", end_date: "2026-07-02", providers: ["a", "b"], regions: ["global", "tw"], force_refresh: false });
  assert.equal(a, b);
  assert.match(reconstruction, /ON CONFLICT\(history_day_id, source_snapshot_hash\)/);
});

test("pagination cursors round-trip without exposing query fragments", () => {
  const source = "history-snapshot:測試/2026-07-02";
  const encoded = encodeCursor(source);
  assert.notEqual(encoded, source);
  assert.equal(decodeCursor(encoded), source);
  assert.equal(decodeCursor("%%%"), null);
});

test("completeness never becomes a misleading total when components are missing", () => {
  const partial = completenessFromCoverage({ provider_coverage: 1, source_coverage: 0.5 });
  assert.equal(partial.score, null);
  assert.ok(partial.missing_components.includes("temporal_coverage"));
  assert.equal(partial.formula_version, "history-completeness-v1");
});

test("every historical adapter declares the complete semantics contract", () => {
  const required = ["provider", "dataset", "supported_start_date", "supported_end_date", "temporal_resolution", "historical_query_supported", "immutable_archive_supported", "revision_behavior", "authentication_requirement", "rate_limit_notes", "observation_time_field", "publication_time_field", "retrieval_time_behavior", "regional_coverage", "variable_coverage", "adapter_version"];
  for (const adapter of HISTORICAL_ADAPTERS) for (const field of required) assert.ok(Object.hasOwn(adapter, field), `${adapter.id}.${field}`);
});

test("unsupported historical providers expose reasons and forbid live fallback", () => {
  for (const id of ["nasa-firms-history", "celestrak-history", "ais-history", "aviation-history", "lightning-history", "taiwan-cwa-tide-history", "japan-tide-history"]) {
    const adapter = HISTORICAL_ADAPTERS.find((item) => item.id === id);
    assert.equal(adapter.historical_query_supported, false);
    assert.ok(adapter.unavailable_reason);
    assert.match(adapter.retrieval_time_behavior, /No live fallback|No historical reconstruction/i);
  }
});

test("all historical admin endpoints retain bearer authentication", async () => {
  const requests = [
    ["POST", "/api/admin/history/reconstruct"],
    ["POST", "/api/admin/history/reconstruct/job-1/resume"],
    ["POST", "/api/admin/history/reconstruct/job-1/cancel"],
    ["GET", "/api/admin/history/jobs"],
  ];
  for (const [method, path] of requests) {
    const response = await worker.fetch(new Request(`https://pcs.test${path}`, { method, headers: { "content-type": "application/json" }, body: method === "GET" ? undefined : "{}" }), { ADMIN_API_KEY: "server-only" }, {});
    assert.equal(response.status, 401, `${method} ${path}`);
  }
});

test("authenticated reconstruction rejects malformed JSON before any database mutation", async () => {
  const response = await worker.fetch(new Request("https://pcs.test/api/admin/history/reconstruct", {
    method: "POST", headers: { authorization: "Bearer server-only", "content-type": "application/json" }, body: "{broken",
  }), { ADMIN_API_KEY: "server-only" }, {});
  assert.equal(response.status, 400);
  assert.match(await response.text(), /valid JSON/);
});

test("replay SQL filters by available_to_pcs_at and never invokes regional live fallback", () => {
  assert.match(routes, /available_to_pcs_at IS NOT NULL/);
  assert.match(routes, /datetime\(available_to_pcs_at\)<=datetime\(\?\)/);
  assert.match(routes, /layer_id IS NULL OR layer_id IN/);
  assert.match(routes, /live_fallback_used:\s*false/);
  assert.doesNotMatch(routes, /\/api\/regional/);
});

test("history API exposes all public routes and explicit before-after event sections", () => {
  for (const endpoint of ["/api/history/status", "/api/history/days", "/api/history/snapshots", "/api/history/providers", "/api/history/events", "/api/history/replay/timeline", "/api/history/replay/frame"]) assert.ok(routes.includes(endpoint));
  assert.match(temporal, /before_event/);
  assert.match(temporal, /after_event/);
});

test("USGS reconstruction is bounded, revision-aware, and never invents first confirmation time", () => {
  assert.match(reconstruction, /limit:\s*"200"/);
  assert.match(reconstruction, /available_to_pcs_at:\s*retrievedAt/);
  assert.match(reconstruction, /kind:\s*"earthquake_point"/);
  assert.match(reconstruction, /properties\.place \|\| "global", state, observedAt, null, retrievedAt/);
  assert.match(reconstruction, /later catalog revisions are not backdated as PCS knowledge/);
});
