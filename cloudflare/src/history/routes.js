import { HISTORICAL_ADAPTERS } from "./adapters.js";
import {
  HISTORY_DEFAULT_START,
  decodeCursor,
  encodeCursor,
  isReplayVisible,
  latestHistoricalRevisions,
  normalizeTimestamp,
  parseIsoDate,
  parseLimit,
  separateEventKnowledge,
  temporalState,
  validateHistoryRange,
} from "./temporal.js";
import {
  cancelReconstructionJob,
  createReconstructionJob,
  decodeJob,
  processReconstructionJob,
  resumeReconstructionJob,
} from "./reconstruction.js";

export const HISTORY_PUBLIC_PREFIX = "/api/history";
export const HISTORY_ADMIN_PREFIX = "/api/admin/history";

function response(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "cache-control": "no-store",
    },
  });
}

async function readBody(request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ok: true, value }
      : { ok: false, error: "Request body must be a JSON object" };
  } catch {
    return { ok: false, error: "Request body must be valid JSON" };
  }
}

async function adminAllowed(request, env) {
  const expected = env.ADMIN_API_KEY || env.INGEST_SECRET;
  const value = request.headers.get("authorization") || "";
  const supplied = value.startsWith("Bearer ") ? value.slice(7) : "";
  if (!expected || !supplied) return false;
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index % left.length] || 0) ^ (right[index % right.length] || 0);
  }
  return difference === 0;
}

function decodeJsonRow(row, fields = []) {
  if (!row) return row;
  const result = { ...row };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      try { result[field] = JSON.parse(result[field]); } catch { result[field] = null; }
    }
  }
  return result;
}

const DAY_JSON_FIELDS = ["completeness_components_json", "completeness_weights_json", "missing_components_json"];
const SNAPSHOT_JSON_FIELDS = ["value_json"];

function decodedDay(row) {
  const day = decodeJsonRow(row, DAY_JSON_FIELDS);
  if (!day) return day;
  return {
    ...day,
    reconstruction_completeness: {
      score: day.completeness_score,
      components: day.completeness_components_json,
      formula_version: day.completeness_formula_version,
      weights: day.completeness_weights_json,
      missing_components: day.missing_components_json,
      label: "reconstruction completeness",
      is_accuracy_metric: false,
    },
  };
}

function decodedSnapshot(row, replayTimestamp = null) {
  const snapshot = decodeJsonRow(row, SNAPSHOT_JSON_FIELDS);
  if (!snapshot) return snapshot;
  return {
    ...snapshot,
    data_state_at_request: replayTimestamp ? temporalState(snapshot, replayTimestamp) : snapshot.data_state,
    revision: {
      revision_of_id: snapshot.revision_of_id || null,
      revision_number: snapshot.revision_number,
      revision_note: snapshot.revision_note || null,
    },
  };
}

function addFilter(clauses, values, expression, value) {
  if (value !== null && value !== undefined && value !== "") {
    clauses.push(expression);
    values.push(value);
  }
}

async function statusPayload(env) {
  const [range, totals, providerCoverage, jobs] = await env.PCS_DB.batch([
    env.PCS_DB.prepare(`SELECT MIN(date_utc) AS earliest, MAX(date_utc) AS latest, COUNT(*) AS available_day_count
      FROM history_days WHERE reconstruction_status != 'NOT_ARCHIVED'`),
    env.PCS_DB.prepare(`SELECT
      (SELECT COUNT(*) FROM history_snapshots) AS snapshot_count,
      (SELECT COUNT(*) FROM history_sources) AS source_count,
      (SELECT COUNT(*) FROM history_events) AS event_count,
      (SELECT COUNT(*) FROM history_snapshots WHERE snapshot_type='daily_brief') AS daily_brief_count`),
    env.PCS_DB.prepare(`SELECT provider, dataset, COUNT(*) AS checks,
      SUM(CASE WHEN runtime_status IN ('SUCCESS','LIVE','LATEST','AVAILABLE','CONNECTED') THEN 1 ELSE 0 END) AS successes,
      SUM(snapshot_count) AS snapshot_count, MAX(completed_at) AS last_completed_at
      FROM history_provider_status GROUP BY provider, dataset ORDER BY provider, dataset`),
    env.PCS_DB.prepare(`SELECT * FROM history_reconstruction_jobs
      WHERE status IN ('QUEUED','RUNNING','PAUSED_LIMIT','ERROR') ORDER BY requested_at DESC LIMIT 20`),
  ]);
  const unavailable = HISTORICAL_ADAPTERS.filter((adapter) => !adapter.historical_query_supported || adapter.unavailable_reason)
    .map((adapter) => ({ id: adapter.id, provider: adapter.provider, dataset: adapter.dataset, reason: adapter.unavailable_reason || "Historical query is not supported.", access_status: adapter.access_status || "SOURCE_UNAVAILABLE" }));
  return {
    mode_support: {
      LIVE: "Current provider and regional state.",
      REPLAY: "Strict historical records filtered by available_to_pcs_at; never falls back to live APIs.",
      ARCHIVED: "Stored historical records without continuous playback.",
    },
    earliest_reconstructed_day: range.results[0]?.earliest || null,
    latest_reconstructed_day: range.results[0]?.latest || null,
    available_day_count: Number(range.results[0]?.available_day_count || 0),
    snapshot_count: Number(totals.results[0]?.snapshot_count || 0),
    source_count: Number(totals.results[0]?.source_count || 0),
    historical_event_count: Number(totals.results[0]?.event_count || 0),
    daily_brief_history_count: Number(totals.results[0]?.daily_brief_count || 0),
    provider_coverage: providerCoverage.results,
    current_reconstruction_jobs: jobs.results.map(decodeJob),
    adapters: HISTORICAL_ADAPTERS,
    default_reconstruction_window: { start: HISTORY_DEFAULT_START, end: "current available archive date" },
    known_limitations: unavailable,
    temporal_integrity: {
      strict_field: "available_to_pcs_at",
      unknown_availability_excluded: true,
      live_fallback: false,
      publication_is_observation: false,
      retrieval_is_observation: false,
      revisions_preserved: true,
    },
  };
}

async function listDays(env, url) {
  const clauses = [];
  const values = [];
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (start && !parseIsoDate(start)) return response({ error: "start must use YYYY-MM-DD" }, 400);
  if (end && !parseIsoDate(end)) return response({ error: "end must use YYYY-MM-DD" }, 400);
  if (start && end) {
    const range = validateHistoryRange(start, end, { maxDays: 366 });
    if (!range.ok) return response({ error: range.error }, range.status);
  }
  addFilter(clauses, values, "date_utc >= ?", start);
  addFilter(clauses, values, "date_utc <= ?", end);
  addFilter(clauses, values, "reconstruction_status = ?", url.searchParams.get("status"));
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  addFilter(clauses, values, "date_utc > ?", cursor);
  const region = url.searchParams.get("region");
  if (region) {
    clauses.push("EXISTS (SELECT 1 FROM history_snapshots s WHERE s.history_day_id=history_days.id AND s.region_id=?)");
    values.push(region);
  }
  const limit = parseLimit(url.searchParams.get("limit"));
  const { results } = await env.PCS_DB.prepare(`SELECT * FROM history_days ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY date_utc LIMIT ?`).bind(...values, limit + 1).all();
  const hasMore = results.length > limit;
  const rows = results.slice(0, limit).map(decodedDay);
  return response({ days: rows, next_cursor: hasMore ? encodeCursor(rows.at(-1)?.date_utc) : null, limit });
}

async function dayDetail(env, date) {
  if (!parseIsoDate(date)) return response({ error: "Historical day must use YYYY-MM-DD" }, 400);
  const day = await env.PCS_DB.prepare("SELECT * FROM history_days WHERE date_utc=?").bind(date).first();
  if (!day) return response({ error: "Historical day is not archived", date, data_state: "NOT_ARCHIVED" }, 404);
  const [providers, snapshots, sources, events] = await env.PCS_DB.batch([
    env.PCS_DB.prepare("SELECT * FROM history_provider_status WHERE history_day_id=? ORDER BY requested_at, provider, dataset").bind(day.id),
    env.PCS_DB.prepare("SELECT * FROM history_snapshots WHERE history_day_id=? ORDER BY COALESCE(available_to_pcs_at, observed_at, published_at), id LIMIT 500").bind(day.id),
    env.PCS_DB.prepare("SELECT * FROM history_sources WHERE history_day_id=? ORDER BY COALESCE(first_known_available_time, publication_time), id LIMIT 500").bind(day.id),
    env.PCS_DB.prepare("SELECT * FROM history_events WHERE history_day_id=? ORDER BY COALESCE(observed_event_time, first_available_to_pcs_time), id LIMIT 500").bind(day.id),
  ]);
  const decodedSnapshots = snapshots.results.map((row) => decodedSnapshot(row));
  const successful = new Set(providers.results.filter((row) => ["SUCCESS", "LIVE", "LATEST", "AVAILABLE", "CONNECTED"].includes(row.runtime_status)).map((row) => `${row.provider}|${row.dataset}`));
  const missingDatasets = HISTORICAL_ADAPTERS.filter((adapter) => adapter.enabled_by_default && !successful.has(`${adapter.provider}|${adapter.dataset}`))
    .map((adapter) => ({ provider: adapter.provider, dataset: adapter.dataset, state: adapter.unavailable_reason ? "SOURCE_UNAVAILABLE" : "NOT_ARCHIVED", reason: adapter.unavailable_reason || "No successful archived retrieval for this day." }));
  return response({
    day: decodedDay(day), provider_statuses: providers.results,
    daily_brief_items: decodedSnapshots.filter((row) => row.snapshot_type === "daily_brief"),
    event_candidates: events.results, snapshots: decodedSnapshots, source_availability: sources.results,
    completeness: decodedDay(day).reconstruction_completeness, missing_datasets: missingDatasets,
  });
}

async function listSnapshots(env, url) {
  const clauses = [];
  const values = [];
  const date = url.searchParams.get("date");
  if (date && !parseIsoDate(date)) return response({ error: "date must use YYYY-MM-DD" }, 400);
  if (date) { clauses.push("history_day_id=(SELECT id FROM history_days WHERE date_utc=?)"); values.push(date); }
  const startTime = url.searchParams.get("start_time");
  const endTime = url.searchParams.get("end_time");
  if (startTime && !normalizeTimestamp(startTime)) return response({ error: "start_time must be an ISO timestamp" }, 400);
  if (endTime && !normalizeTimestamp(endTime)) return response({ error: "end_time must be an ISO timestamp" }, 400);
  addFilter(clauses, values, "datetime(COALESCE(observed_at, available_to_pcs_at)) >= datetime(?)", startTime);
  addFilter(clauses, values, "datetime(COALESCE(observed_at, available_to_pcs_at)) <= datetime(?)", endTime);
  for (const [parameter, column] of [["provider", "provider"], ["dataset", "dataset"], ["region", "region_id"], ["layer_id", "layer_id"], ["variable", "variable"], ["data_state", "data_state"]]) {
    addFilter(clauses, values, `${column} = ?`, url.searchParams.get(parameter));
  }
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  addFilter(clauses, values, "id > ?", cursor);
  const limit = parseLimit(url.searchParams.get("limit"));
  const { results } = await env.PCS_DB.prepare(`SELECT * FROM history_snapshots ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY id LIMIT ?`).bind(...values, limit + 1).all();
  const hasMore = results.length > limit;
  const rows = results.slice(0, limit).map((row) => decodedSnapshot(row));
  return response({ snapshots: rows, next_cursor: hasMore ? encodeCursor(rows.at(-1)?.id) : null, limit });
}

async function listProviders(env, url) {
  const clauses = [];
  const values = [];
  const date = url.searchParams.get("date");
  if (date && !parseIsoDate(date)) return response({ error: "date must use YYYY-MM-DD" }, 400);
  if (date) { clauses.push("history_day_id=(SELECT id FROM history_days WHERE date_utc=?)"); values.push(date); }
  for (const [parameter, column] of [["provider", "provider"], ["dataset", "dataset"], ["runtime_status", "runtime_status"]]) addFilter(clauses, values, `${column} = ?`, url.searchParams.get(parameter));
  const { results } = await env.PCS_DB.prepare(`SELECT * FROM history_provider_status ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY requested_at DESC, id LIMIT 500`).bind(...values).all();
  return response({ providers: results, adapter_declarations: HISTORICAL_ADAPTERS });
}

async function listEvents(env, url) {
  const clauses = [];
  const values = [];
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (start && !parseIsoDate(start)) return response({ error: "start must use YYYY-MM-DD" }, 400);
  if (end && !parseIsoDate(end)) return response({ error: "end must use YYYY-MM-DD" }, 400);
  if (start) { clauses.push("history_day_id IN (SELECT id FROM history_days WHERE date_utc>=?)"); values.push(start); }
  if (end) { clauses.push("history_day_id IN (SELECT id FROM history_days WHERE date_utc<=?)"); values.push(end); }
  for (const [parameter, column] of [["region", "region_id"], ["event_type", "event_type"], ["evidence_state", "evidence_state"]]) addFilter(clauses, values, `${column} = ?`, url.searchParams.get(parameter));
  if (url.searchParams.has("retrospective_eligible")) {
    const raw = url.searchParams.get("retrospective_eligible");
    if (!["true", "false", "1", "0"].includes(raw)) return response({ error: "retrospective_eligible must be boolean" }, 400);
    clauses.push("retrospective_eligible = ?"); values.push(["true", "1"].includes(raw) ? 1 : 0);
  }
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  addFilter(clauses, values, "id > ?", cursor);
  const limit = parseLimit(url.searchParams.get("limit"));
  const { results } = await env.PCS_DB.prepare(`SELECT * FROM history_events ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY id LIMIT ?`).bind(...values, limit + 1).all();
  const hasMore = results.length > limit;
  const rows = results.slice(0, limit);
  return response({ events: rows, next_cursor: hasMore ? encodeCursor(rows.at(-1)?.id) : null, limit });
}

function replayParameters(url, requireDate = true) {
  const date = url.searchParams.get("date") || url.searchParams.get("timestamp")?.slice(0, 10);
  const timestamp = url.searchParams.get("timestamp") || (date ? `${date}T23:59:59.999Z` : null);
  if (requireDate && !parseIsoDate(date)) return { ok: false, status: 400, error: "Replay requires a valid date" };
  const replayTime = timestamp ? new Date(timestamp) : null;
  if (!replayTime || !Number.isFinite(replayTime.getTime())) return { ok: false, status: 400, error: "Replay requires a valid timestamp" };
  if (replayTime.toISOString().slice(0, 10) !== date) return { ok: false, status: 400, error: "Replay timestamp must belong to the selected UTC date" };
  const layers = (url.searchParams.get("layers") || "").split(",").map((value) => value.trim()).filter(Boolean);
  return { ok: true, date, timestamp: replayTime.toISOString(), region: url.searchParams.get("region") || null, layers };
}

async function replayFrame(env, params) {
  const day = await env.PCS_DB.prepare("SELECT * FROM history_days WHERE date_utc=?").bind(params.date).first();
  if (!day) return { error: "Historical day is not archived", status: 404, data_state: "NOT_ARCHIVED" };
  const clauses = ["history_day_id=?", "available_to_pcs_at IS NOT NULL", "datetime(available_to_pcs_at)<=datetime(?)"];
  const values = [day.id, params.timestamp];
  const filterRegion = params.region && params.region !== "global";
  if (filterRegion) { clauses.push("(region_id=? OR region_id IS NULL OR region_id='global')"); values.push(params.region); }
  if (params.layers.length) { clauses.push(`(layer_id IS NULL OR layer_id IN (${params.layers.map(() => "?").join(",")}))`); values.push(...params.layers); }
  const [snapshots, providers, events, sources, layerAvailability] = await env.PCS_DB.batch([
    env.PCS_DB.prepare(`SELECT * FROM history_snapshots WHERE ${clauses.join(" AND ")} ORDER BY available_to_pcs_at, id LIMIT 500`).bind(...values),
    env.PCS_DB.prepare("SELECT * FROM history_provider_status WHERE history_day_id=? AND datetime(requested_at)<=datetime(?) ORDER BY requested_at, id").bind(day.id, params.timestamp),
    env.PCS_DB.prepare(`SELECT * FROM history_events WHERE history_day_id=? AND first_available_to_pcs_time IS NOT NULL
      AND datetime(first_available_to_pcs_time)<=datetime(?) ${filterRegion ? "AND (region_id=? OR region_id IS NULL OR region_id='global')" : ""}
      ORDER BY first_available_to_pcs_time, id`).bind(day.id, params.timestamp, ...(filterRegion ? [params.region] : [])),
    env.PCS_DB.prepare("SELECT * FROM history_sources WHERE history_day_id=? AND first_known_available_time IS NOT NULL AND datetime(first_known_available_time)<=datetime(?) ORDER BY first_known_available_time, id").bind(day.id, params.timestamp),
    env.PCS_DB.prepare(`SELECT DISTINCT layer_id FROM history_snapshots WHERE history_day_id=?
      AND available_to_pcs_at IS NOT NULL AND datetime(available_to_pcs_at)<=datetime(?) AND layer_id IS NOT NULL
      ${filterRegion ? "AND (region_id=? OR region_id IS NULL OR region_id='global')" : ""}
      ORDER BY layer_id`).bind(day.id, params.timestamp, ...(filterRegion ? [params.region] : [])),
  ]);
  const visibleSnapshots = snapshots.results.filter((row) => isReplayVisible(row, params.timestamp));
  const decodedSnapshots = latestHistoricalRevisions(visibleSnapshots).map((row) => decodedSnapshot(row, params.timestamp));
  const eventKnowledge = [];
  for (const event of events.results) {
    const ledger = decodedSnapshots.filter((snapshot) => snapshot.snapshot_type === "evidence_ledger"
      && snapshot.value_json?.event_id === event.event_id
      && snapshot.value_json?.official_confirmation_time
      && normalizeTimestamp(snapshot.value_json.official_confirmation_time) <= params.timestamp).map((snapshot) => snapshot.value_json);
    const linkedSources = sources.results.filter((source) => String(source.archived_reference || "").includes(event.event_id || "__none__"));
    eventKnowledge.push({ ...event, ...separateEventKnowledge({ event, evidence: ledger, sources: linkedSources }, params.timestamp) });
  }
  const latestAvailability = decodedSnapshots.at(-1)?.available_to_pcs_at || null;
  return {
    mode: "REPLAY", playback_status: decodedSnapshots.length || eventKnowledge.length ? "REPLAY_READY" : "FRAME_UNAVAILABLE",
    replay_date: params.date, frame_timestamp_utc: params.timestamp, region: params.region || "global",
    selected_layers: params.layers, day: decodedDay(day), snapshots: decodedSnapshots,
    available_layer_ids: layerAvailability.results.map((row) => row.layer_id),
    provider_statuses: providers.results, sources: sources.results, events: eventKnowledge,
    daily_brief_items: decodedSnapshots.filter((row) => row.snapshot_type === "daily_brief"),
    cesium_resources: decodedSnapshots.filter((row) => row.layer_id && row.value_json?.visualization).map((row) => ({
      snapshot_id: row.id, layer_id: row.layer_id, visualization: row.value_json.visualization,
      opacity: row.value_json.opacity ?? 0.8, observation_time: row.observed_at,
      available_to_pcs_at: row.available_to_pcs_at, provider: row.provider, dataset: row.dataset,
      source_url: row.source_url, data: row.value_json,
    })),
    completeness: decodedDay(day).reconstruction_completeness,
    latest_available_record_time: latestAvailability,
    missing_frame: decodedSnapshots.length === 0 && eventKnowledge.length === 0,
    live_fallback_used: false,
  };
}

async function replayTimeline(env, url) {
  const params = replayParameters(url);
  if (!params.ok) return response({ error: params.error }, params.status);
  const day = await env.PCS_DB.prepare("SELECT id FROM history_days WHERE date_utc=?").bind(params.date).first();
  if (!day) return response({ error: "Historical day is not archived", data_state: "NOT_ARCHIVED" }, 404);
  const filterRegion = params.region && params.region !== "global";
  const { results } = await env.PCS_DB.prepare(`SELECT available_to_pcs_at AS timestamp, COUNT(*) AS snapshot_count
    FROM history_snapshots WHERE history_day_id=? AND available_to_pcs_at IS NOT NULL AND date(available_to_pcs_at)=date(?)
    ${filterRegion ? "AND (region_id=? OR region_id IS NULL OR region_id='global')" : ""}
    GROUP BY available_to_pcs_at ORDER BY available_to_pcs_at`)
    .bind(day.id, params.date, ...(filterRegion ? [params.region] : [])).all();
  const timestamps = results.map((row) => row.timestamp);
  const gaps = [];
  for (let index = 1; index < timestamps.length; index += 1) {
    const seconds = (new Date(timestamps[index]).getTime() - new Date(timestamps[index - 1]).getTime()) / 1000;
    if (seconds > 21600) gaps.push({ after: timestamps[index - 1], before: timestamps[index], duration_seconds: seconds });
  }
  return response({ first_frame: timestamps[0] || null, last_frame: timestamps.at(-1) || null,
    available_frame_timestamps: timestamps, frame_interval: "irregular_no_interpolation",
    gap_threshold_seconds: 21600, gaps, snapshot_counts_per_frame: results,
    missing_frame_policy: "STOP_OR_SKIP_USER_SELECTED", synthetic_frames: false });
}

async function adminJobs(env) {
  const { results } = await env.PCS_DB.prepare("SELECT * FROM history_reconstruction_jobs ORDER BY requested_at DESC LIMIT 100").all();
  return response({ jobs: results.map(decodeJob) });
}

export async function handleHistoryRequest(request, env, ctx) {
  if (request.method === "OPTIONS") return response({}, 204);
  const url = new URL(request.url);
  const path = url.pathname;
  try {
    if (path.startsWith(HISTORY_ADMIN_PREFIX)) {
      if (!(await adminAllowed(request, env))) return response({ error: "Unauthorized" }, 401);
      if (path === "/api/admin/history/jobs" && request.method === "GET") return adminJobs(env);
      if (path === "/api/admin/history/reconstruct" && request.method === "POST") {
        const body = await readBody(request);
        if (!body.ok) return response({ error: body.error }, 400);
        const created = await createReconstructionJob(env, body.value);
        if (!created.ok) return response({ error: created.error, providers: created.providers || null }, created.status || 400);
        if (created.job.status === "COMPLETED") return response(created, 200);
        const execution = await processReconstructionJob(env, created.job.id);
        if (!execution.ok) return response({ error: execution.error, job: execution.job }, execution.status || 500);
        return response({ ...created, execution }, created.created ? 202 : 200);
      }
      const match = path.match(/^\/api\/admin\/history\/reconstruct\/([^/]+)\/(resume|cancel)$/);
      if (match && request.method === "POST") {
        const jobId = decodeURIComponent(match[1]);
        const result = match[2] === "resume" ? await resumeReconstructionJob(env, jobId) : await cancelReconstructionJob(env, jobId);
        return response(result.ok ? result : { error: result.error }, result.ok ? 200 : result.status || 400);
      }
      return response({ error: "Not found" }, 404);
    }
    if (request.method !== "GET") return response({ error: "Method not allowed" }, 405);
    if (path === "/api/history/status") return response(await statusPayload(env));
    if (path === "/api/history/days") return listDays(env, url);
    if (/^\/api\/history\/day\/[^/]+$/.test(path)) return dayDetail(env, decodeURIComponent(path.split("/")[4] || ""));
    if (path === "/api/history/snapshots") return listSnapshots(env, url);
    if (path === "/api/history/providers") return listProviders(env, url);
    if (path === "/api/history/events") return listEvents(env, url);
    if (path === "/api/history/replay/timeline") return replayTimeline(env, url);
    if (path === "/api/history/replay" || path === "/api/history/replay/frame") {
      const params = replayParameters(url);
      if (!params.ok) return response({ error: params.error }, params.status);
      const frame = await replayFrame(env, params);
      return response(frame.status ? { error: frame.error, data_state: frame.data_state } : frame, frame.status || 200);
    }
    return response({ error: "Not found" }, 404);
  } catch (error) {
    console.error(JSON.stringify({ message: "history request failed", path, error: error?.message || String(error) }));
    const missingMigration = String(error?.message || "").includes("no such table: history_");
    return response({ error: missingMigration ? "Historical schema is not migrated" : "Historical request failed",
      detail: error?.message || "Unknown error" }, missingMigration ? 503 : 500);
  }
}
