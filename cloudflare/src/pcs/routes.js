import { domainReadiness } from "../providers/registry.js";
import { retrieveAllLayers } from "../providers/layers.js";
import { readDailyBrief, proposeAiAnalysis } from "./intelligence.js";

export const PCS_ROUTES = [
  "/api/domain-readiness", "/api/daily-brief", "/api/events",
  "/api/evidence-ledger", "/api/mass-gatherings", "/api/human-mobility",
  "/api/validation/metrics",
  "/api/layers", "/api/system-status", "/api/evidence-explorer", "/api/ai-analysis/status",
];

const EVENT_COLUMNS = [
  "id", "title", "category", "region", "event_type", "event_summary",
  "why_it_matters", "research_relevance", "published_at", "observed_event_time",
  "source_url", "source_name", "source_type", "image_url", "confidence",
];

const RETROSPECTIVE_JSON = [
  "affected_systems", "precursor_signals", "causal_chain", "amplification_factors",
  "exposure_factors", "data_sources_used", "missing_data", "pcs_observability",
  "proposed_warning_rules", "proposed_interventions",
];

function response(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "cache-control": "no-store",
    },
  });
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

function decodeJsonFields(row, fields = RETROSPECTIVE_JSON) {
  if (!row) return row;
  const result = { ...row };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      try { result[field] = JSON.parse(result[field]); } catch { result[field] = null; }
    }
  }
  return result;
}

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function adminAllowed(request, env) {
  const expected = env.ADMIN_API_KEY || env.INGEST_SECRET;
  const supplied = bearer(request);
  if (!expected || !supplied) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(expected);
  const b = encoder.encode(supplied);
  return a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b);
}

function eventIdFrom(pathname) {
  return decodeURIComponent(pathname.split("/")[3] || "");
}

function adminResourceId(pathname) {
  return decodeURIComponent(pathname.split("/")[4] || "");
}

async function listEvents(env, url, dailyOnly = false) {
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const category = url.searchParams.get("category");
  const values = [];
  const clauses = [];
  if (dailyOnly) clauses.push("published_at >= datetime('now', '-1 day')");
  if (category) { clauses.push("category = ?"); values.push(category); }
  const sql = `SELECT * FROM pcs_events ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY COALESCE(observed_event_time, published_at, created_at) DESC LIMIT ?`;
  const { results } = await env.PCS_DB.prepare(sql).bind(...values, limit).all();
  return results;
}

async function getEventBundle(env, id) {
  const event = await env.PCS_DB.prepare("SELECT * FROM pcs_events WHERE id = ?").bind(id).first();
  if (!event) return null;
  const [retrospective, timeline, evidence, sources] = await Promise.all([
    env.PCS_DB.prepare("SELECT * FROM pcs_retrospective_analyses WHERE event_id = ? ORDER BY created_at DESC LIMIT 1").bind(id).first(),
    env.PCS_DB.prepare("SELECT * FROM pcs_event_timeline WHERE event_id = ? ORDER BY occurred_at").bind(id).all(),
    env.PCS_DB.prepare("SELECT * FROM pcs_evidence_ledger WHERE event_id = ? ORDER BY issued_at DESC").bind(id).all(),
    env.PCS_DB.prepare("SELECT * FROM pcs_event_sources WHERE event_id = ? ORDER BY published_at").bind(id).all(),
  ]);
  return {
    ...event,
    retrospective_analysis: decodeJsonFields(retrospective),
    timeline: timeline.results,
    evidence: evidence.results.map((row) => decodeJsonFields(row, ["input_data_snapshot", "precursor_signals", "causal_chain", "proposed_actions"])),
    sources: sources.results,
  };
}

async function createEvent(env, body) {
  const id = body.id || crypto.randomUUID();
  const values = EVENT_COLUMNS.map((key) => key === "id" ? id : body[key] ?? null);
  await env.PCS_DB.prepare(`INSERT INTO pcs_events (${EVENT_COLUMNS.join(",")}) VALUES (${EVENT_COLUMNS.map(() => "?").join(",")})`).bind(...values).run();
  return getEventBundle(env, id);
}

async function patchEvent(env, id, body) {
  const allowed = EVENT_COLUMNS.filter((key) => key !== "id" && Object.hasOwn(body, key));
  if (!allowed.length) return getEventBundle(env, id);
  await env.PCS_DB.prepare(`UPDATE pcs_events SET ${allowed.map((key) => `${key} = ?`).join(",")}, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
    .bind(...allowed.map((key) => body[key]), id).run();
  return getEventBundle(env, id);
}

async function saveRetrospective(env, id, body) {
  const analysisId = body.analysis_id || crypto.randomUUID();
  const fields = [
    "analysis_id", "event_id", "result_time", "analysis_start_time", "precursor_window_start",
    "precursor_window_end", "earliest_detectable_time", "estimated_lead_time_hours", "region",
    ...RETROSPECTIVE_JSON, "validation_status", "validation_notes", "analyst_confidence",
  ];
  const valueFor = (field) => {
    if (field === "analysis_id") return analysisId;
    if (field === "event_id") return id;
    const value = body[field];
    return RETROSPECTIVE_JSON.includes(field) ? JSON.stringify(value ?? (field === "pcs_observability" ? {} : [])) : value ?? null;
  };
  await env.PCS_DB.prepare(`INSERT INTO pcs_retrospective_analyses (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`).bind(...fields.map(valueFor)).run();
  return decodeJsonFields(await env.PCS_DB.prepare("SELECT * FROM pcs_retrospective_analyses WHERE analysis_id = ?").bind(analysisId).first());
}

async function linkSource(env, id, body) {
  await env.PCS_DB.prepare(`INSERT INTO pcs_event_sources (event_id, source_url, source_name, source_type, published_at, relationship) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, body.source_url, body.source_name ?? null, body.source_type ?? null, body.published_at ?? null, body.relationship ?? "confirmation").run();
  return getEventBundle(env, id);
}

export function eventSimilarity(a, b) {
  const region = String(a.region || "").toLowerCase();
  const otherRegion = String(b.region || "").toLowerCase();
  const geographic = region && otherRegion && (region.includes(otherRegion) || otherRegion.includes(region)) ? 1 : 0;
  const type = a.event_type === b.event_type ? 1 : 0;
  const aTime = new Date(a.observed_event_time || a.published_at || 0).getTime();
  const bTime = new Date(b.observed_event_time || b.published_at || 0).getTime();
  const temporal = Number.isFinite(aTime) && Number.isFinite(bTime) && Math.abs(aTime - bTime) <= 14 * 86400000 ? 1 : 0;
  const words = new Set(String(a.title || "").toLowerCase().split(/\W+/).filter((word) => word.length > 3));
  const otherWords = new Set(String(b.title || "").toLowerCase().split(/\W+/).filter((word) => word.length > 3));
  const overlap = words.size ? [...words].filter((word) => otherWords.has(word)).length / words.size : 0;
  return (geographic + type + temporal + overlap) / 4;
}

async function mergeEvent(env, targetId, body) {
  const sourceId = body.source_event_id;
  if (!sourceId || sourceId === targetId) throw new Error("Invalid source event");
  const [target, source] = await Promise.all([
    env.PCS_DB.prepare("SELECT * FROM pcs_events WHERE id = ?").bind(targetId).first(),
    env.PCS_DB.prepare("SELECT * FROM pcs_events WHERE id = ?").bind(sourceId).first(),
  ]);
  if (!target || !source) throw new Error("Event not found");
  const score = eventSimilarity(target, source);
  if (score < 0.5 && body.manual_override !== true) return { merged: false, requires_review: true, similarity: score };
  const cluster = target.cluster_id || source.cluster_id || crypto.randomUUID();
  await env.PCS_DB.batch([
    env.PCS_DB.prepare("UPDATE pcs_events SET cluster_id = ?, merge_status = 'reviewed' WHERE id IN (?, ?)").bind(cluster, targetId, sourceId),
    env.PCS_DB.prepare("UPDATE pcs_event_sources SET event_id = ? WHERE event_id = ?").bind(targetId, sourceId),
  ]);
  return { merged: true, cluster_id: cluster, similarity: score, event: await getEventBundle(env, targetId) };
}

function ratio(numerator, denominator) { return denominator ? numerator / denominator : null; }

export function gatheringRisk(row) {
  const raw = [row.hazard_index, row.crowd_density, row.vulnerability, row.exposure_duration];
  if (raw.some((value) => value === null || value === undefined || value === "")) return null;
  const factors = raw.map(Number);
  return factors.every(Number.isFinite) ? factors.reduce((product, value) => product * value, 1) : null;
}

export async function validationMetrics(env) {
  const { results } = await env.PCS_DB.prepare("SELECT result, confidence, retrospective_score, false_positive, false_negative, partial_hit, data_missing FROM pcs_evidence_ledger WHERE result != 'unresolved'").all();
  const eligible = results.filter((row) => ["confirmed", "partially_confirmed", "false_alarm", "missed"].includes(row.result));
  const base = { sample_size: eligible.length, minimum_sample_size: 5, precision: null, recall: null, false_positive_rate: null, false_negative_rate: null, brier_score: null, calibration_error: null, actionability_score: null,
    data_completeness_score: eligible.length ? 1 - eligible.filter((r) => r.data_missing).length / eligible.length : null };
  if (eligible.length < base.minimum_sample_size) return { ...base, status: "INSUFFICIENT_DATA" };
  const tp = eligible.filter((r) => r.result === "confirmed" || r.result === "partially_confirmed").length;
  const fp = eligible.filter((r) => r.false_positive).length;
  const fn = eligible.filter((r) => r.false_negative).length;
  const scored = eligible.filter((r) => Number.isFinite(Number(r.confidence)));
  const brier = scored.length ? scored.reduce((sum, row) => {
    const outcome = row.result === "confirmed" || row.result === "partially_confirmed" ? 1 : 0;
    return sum + (Number(row.confidence) - outcome) ** 2;
  }, 0) / scored.length : null;
  return {
    ...base, status: "CALCULATED",
    precision: ratio(tp, tp + fp), recall: ratio(tp, tp + fn),
    false_positive_rate: ratio(fp, results.length), false_negative_rate: ratio(fn, results.length),
    brier_score: brier, calibration_error: null,
    actionability_score: null,
  };
}

export function validationEvidenceSufficient(body) {
  if (["unresolved", "insufficient_data"].includes(body.result)) return true;
  return Array.isArray(body.input_data_snapshot) && body.input_data_snapshot.length > 0 && Boolean(body.official_confirmation_time);
}

async function evidenceExplorer(env, url) {
  const eventId = url.searchParams.get("event_id");
  const primaryRegion = url.searchParams.get("primary_region");
  const comparisonRegion = url.searchParams.get("comparison_region");
  const windowStart = url.searchParams.get("window_start");
  const windowEnd = url.searchParams.get("window_end");
  const baselineStart = url.searchParams.get("baseline_start");
  const baselineEnd = url.searchParams.get("baseline_end");
  const variables = url.searchParams.getAll("variable");
  const events = await listEvents(env, new URL("https://pcs.local/api/events?limit=100"));
  if (!eventId) return { events: events.map(({ id, title, region, event_type }) => ({ id, title, region, event_type })), selection: null, causal_status: "NOT_ESTABLISHED" };
  const event = await env.PCS_DB.prepare("SELECT * FROM pcs_events WHERE id = ?").bind(eventId).first();
  if (!event) return null;
  const { results } = await env.PCS_DB.prepare(`SELECT id, provider, dataset, endpoint, timestamp AS observation_time,
    retrieved_at, spatial_resolution, temporal_resolution, latency, license, quality_flag, uncertainty,
    retrieval_status, payload FROM pcs_data_snapshots WHERE event_id = ? ORDER BY retrieved_at DESC LIMIT 200`).bind(eventId).all();
  const snapshots = results.map((row) => {
    let payload = null;
    try { payload = row.payload ? JSON.parse(row.payload) : null; } catch { payload = null; }
    return { ...row, payload };
  });
  const observed = snapshots.filter((item) => item.retrieval_status === "LIVE" || item.retrieval_status === "LATEST");
  const presentVariables = new Set(observed.map((item) => item.payload?.variable || item.dataset));
  const missing = variables.filter((variable) => !presentVariables.has(variable));
  const anomalies = observed.flatMap((item) => item.payload?.data_state === "CALCULATED" && Number.isFinite(item.payload?.anomaly)
    ? [{ variable: item.payload.variable || item.dataset, anomaly: item.payload.anomaly, source_snapshot_id: item.id }] : []);
  return {
    events: events.map(({ id, title, region, event_type }) => ({ id, title, region, event_type })),
    selection: { event_id: eventId, primary_region: primaryRegion || event.region, comparison_region: comparisonRegion || null,
      time_window: { start: windowStart, end: windowEnd }, baseline_period: { start: baselineStart, end: baselineEnd }, variables },
    event: { id: event.id, title: event.title, region: event.region, event_type: event.event_type },
    observed_variables: observed, missing_variables: missing, anomalies,
    temporal_correlation: { value: null, status: "INSUFFICIENT_DATA", method: null },
    spatial_overlap: { value: null, status: "INSUFFICIENT_DATA", method: null },
    data_completeness: variables.length ? (variables.length - missing.length) / variables.length : null,
    inferred_relationships: [], source_list: [...new Map(snapshots.map((item) => [item.endpoint, { provider: item.provider, dataset: item.dataset, endpoint: item.endpoint }])).values()],
    validation_state: "UNVALIDATED", causal_status: "NOT_ESTABLISHED",
  };
}

export function residualState() {
  const reason = "Formula, baseline, normalization, weights, coverage, uncertainty, and validation method are not configured.";
  return {
    total_l_t: { value: null, status: "UNAVAILABLE", reason: "Component definitions and a validated aggregation method are unavailable." },
    components: ["thermal", "flow", "chemical", "informational", "structural"].map((component) => ({
      component, value: null, data_state: "UNAVAILABLE", reason, formula_version: null, baseline_period: null,
      variables_used: [], normalization_method: null, weights: null, data_coverage: null,
      uncertainty: null, calculated_at: null, validation_status: "UNVALIDATED",
    })),
  };
}

async function systemStatus(env) {
  const [layers, metrics] = await Promise.all([retrieveAllLayers(env), validationMetrics(env)]);
  let reviewHistory = [], aiOutput = null;
  if (env.PCS_DB) {
    const [reviews, ai] = await Promise.all([
      env.PCS_DB.prepare("SELECT * FROM pcs_review_history ORDER BY reviewed_at DESC LIMIT 20").all(),
      env.PCS_DB.prepare("SELECT model_provider, model_name, model_version, generated_at, confidence, review_status, prompt_or_rule_version FROM pcs_ai_outputs ORDER BY generated_at DESC LIMIT 1").first(),
    ]);
    reviewHistory = reviews.results; aiOutput = ai;
  }
  return {
    generated_at: new Date().toISOString(),
    observation: { status: layers.layers.some((item) => ["LIVE", "LATEST"].includes(item.retrieval_status)) ? "ACTIVE" : "UNAVAILABLE", variables: layers.layers },
    connectors: layers.layers.map((item) => ({ provider: item.provider, dataset: item.dataset, status: item.retrieval_status, latency: item.latency, last_successful_retrieval: ["LIVE", "LATEST", "PARTIAL"].includes(item.retrieval_status) ? item.retrieved_at : null, error_details: item.error })),
    validation: { ...metrics, supported_results: ["confirmed", "partially_confirmed", "false_alarm", "missed", "unresolved", "insufficient_data"] },
    engine: [
      { id: "ingestion", status: "ACTIVE" }, { id: "event_clustering", status: "ACTIVE" },
      { id: "retrospective", status: "CONNECTED" }, { id: "validation", status: "ACTIVE" },
      { id: "ai_analysis", status: env.AI && env.AI_MODEL ? "CONNECTED" : "NOT_CONFIGURED" },
      { id: "evidence_ledger_writer", status: "ACTIVE" },
    ],
    pcs_state: residualState(),
    data_flow: ["provider", "adapter", "normalization", "snapshot", "event", "retrospective_analysis", "validation", "evidence_ledger"],
    review: { ai_proposal: aiOutput || { review_status: "NO_PROPOSAL", model_version: null }, human_review_status: reviewHistory.length ? reviewHistory[0].status : "NOT_REVIEWED", review_history: reviewHistory },
  };
}

async function saveAiProposal(env, eventId, body) {
  const event = await getEventBundle(env, eventId);
  if (!event) return null;
  const output = await proposeAiAnalysis(env, { source_record: event, input_snapshot_ids: body.input_snapshot_ids || [], prompt_or_rule_version: body.prompt_or_rule_version });
  if (output.proposal) await env.PCS_DB.prepare(`INSERT INTO pcs_ai_outputs
    (id, event_id, model_provider, model_name, model_version, generated_at, input_snapshot_ids, confidence, review_status, prompt_or_rule_version, output)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), eventId, output.model_provider, output.model_name, output.model_version, output.generated_at,
      JSON.stringify(output.input_snapshot_ids), output.confidence, "PROPOSAL", output.prompt_or_rule_version, JSON.stringify(output.proposal)).run();
  return output;
}

export async function handlePcsRequest(request, env) {
  if (request.method === "OPTIONS") return response({}, 204);
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === "/api/domain-readiness") {
      const cacheKey = "pcs:domain-readiness:v1";
      const cached = env.PCS_CACHE ? await env.PCS_CACHE.get(cacheKey, "json") : null;
      if (cached && Date.now() - new Date(cached.generated_at).getTime() < 10 * 60 * 1000) return response(cached);
      const readiness = await domainReadiness(env);
      if (env.PCS_CACHE) await env.PCS_CACHE.put(cacheKey, JSON.stringify(readiness), { expirationTtl: 600 });
      return response(readiness);
    }
    if (path === "/api/layers") return response(await retrieveAllLayers(env));
    if (path === "/api/daily-brief") {
      const brief = await readDailyBrief(env);
      return response({ ...brief, event_candidates: await listEvents(env, url, true) });
    }
    if (path === "/api/system-status") return response(await systemStatus(env));
    if (path === "/api/ai-analysis/status") return response({ status: env.AI && env.AI_MODEL ? "CONNECTED" : "NOT_CONFIGURED", proposal_only: true, can_validate: false, can_create_observations: false });
    if (path === "/api/evidence-explorer") {
      const explorer = await evidenceExplorer(env, url);
      return explorer ? response(explorer) : response({ error: "Event not found" }, 404);
    }
    if (path === "/api/events" && request.method === "GET") return response({ events: await listEvents(env, url) });
    if (/^\/api\/events\/[^/]+$/.test(path)) {
      const item = await getEventBundle(env, eventIdFrom(path));
      return item ? response(item) : response({ error: "Event not found" }, 404);
    }
    if (/^\/api\/events\/[^/]+\/(retrospective|timeline|evidence)$/.test(path)) {
      const item = await getEventBundle(env, eventIdFrom(path));
      if (!item) return response({ error: "Event not found" }, 404);
      if (path.endsWith("/retrospective")) return response(item.retrospective_analysis);
      if (path.endsWith("/timeline")) return response({ timeline: item.timeline });
      return response({ evidence: item.evidence });
    }
    if (path === "/api/evidence-ledger") {
      const { results } = await env.PCS_DB.prepare("SELECT * FROM pcs_evidence_ledger ORDER BY issued_at DESC LIMIT 100").all();
      return response({ entries: results.map((row) => decodeJsonFields(row, ["input_data_snapshot", "precursor_signals", "causal_chain", "proposed_actions"])) });
    }
    if (/^\/api\/evidence-ledger\/[^/]+$/.test(path)) {
      const row = await env.PCS_DB.prepare("SELECT * FROM pcs_evidence_ledger WHERE analysis_id = ?").bind(eventIdFrom(path)).first();
      return row ? response(decodeJsonFields(row, ["input_data_snapshot", "precursor_signals", "causal_chain", "proposed_actions"])) : response({ error: "Evidence entry not found" }, 404);
    }
    if (path === "/api/mass-gatherings" || path === "/api/human-mobility") {
      const table = path.endsWith("mass-gatherings") ? "pcs_mass_gatherings" : "pcs_human_mobility";
      const orderColumn = table === "pcs_mass_gatherings" ? "start_time" : "observed_at";
      const { results } = await env.PCS_DB.prepare(`SELECT * FROM ${table} ORDER BY ${orderColumn}`).all();
      return response({ data: table === "pcs_mass_gatherings" ? results.map((row) => ({ ...row, risk_index: gatheringRisk(row) })) : results });
    }
    if (path === "/api/validation/metrics") return response(await validationMetrics(env));

    if (!path.startsWith("/api/admin/")) return response({ error: "Not found" }, 404);
    if (!(await adminAllowed(request, env))) return response({ error: "Unauthorized" }, 401);
    const id = adminResourceId(path);
    const body = await readBody(request);
    if (path === "/api/admin/events" && request.method === "POST") return response(await createEvent(env, body), 201);
    if (/^\/api\/admin\/events\/[^/]+$/.test(path) && request.method === "PATCH") return response(await patchEvent(env, id, body));
    if (path.endsWith("/analyze") && request.method === "POST") return response(await saveRetrospective(env, id, body), 201);
    if (path.endsWith("/ai-analyze") && request.method === "POST") {
      const proposal = await saveAiProposal(env, id, body);
      return proposal ? response(proposal, proposal.proposal ? 201 : 200) : response({ error: "Event not found" }, 404);
    }
    if (path.endsWith("/link-source") && request.method === "POST") return response(await linkSource(env, id, body));
    if (path.endsWith("/merge") && request.method === "POST") return response(await mergeEvent(env, id, body));
    if (path.endsWith("/validate") && request.method === "POST") {
      const allowedResults = ["confirmed", "partially_confirmed", "false_alarm", "missed", "unresolved", "insufficient_data"];
      if (body.result && !allowedResults.includes(body.result)) return response({ error: "Invalid validation result" }, 400);
      if (body.result && !validationEvidenceSufficient(body)) return response({ error: "Evidence-backed validation requires input_data_snapshot and official_confirmation_time" }, 400);
      await env.PCS_DB.prepare("UPDATE pcs_retrospective_analyses SET validation_status = ?, validation_notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE event_id = ?")
        .bind(body.validation_status, body.validation_notes ?? null, id).run();
      const reviewerType = body.reviewer_type === "rule" ? "rule" : "human";
      await env.PCS_DB.prepare(`INSERT INTO pcs_review_history
        (id, event_id, ai_output_id, reviewer_type, status, notes, warning_rule_version, reviewed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), id, body.ai_output_id ?? null, reviewerType, body.validation_status || "UNVALIDATED",
          body.validation_notes ?? null, body.warning_rule_version ?? null, body.reviewed_at || new Date().toISOString()).run();
      if (body.result) {
        const ledgerId = body.analysis_id || `ledger-${id}`;
        const event = await env.PCS_DB.prepare("SELECT region, event_type, confidence, published_at FROM pcs_events WHERE id = ?").bind(id).first();
        await env.PCS_DB.prepare(`INSERT INTO pcs_evidence_ledger
          (analysis_id, event_id, issued_at, region, event_type, expected_event_window, input_data_snapshot,
           precursor_signals, causal_chain, warning_rule_version, confidence, proposed_actions, actual_event,
           official_confirmation_time, news_publication_time, lead_time_hours, result, false_positive,
           false_negative, partial_hit, data_missing, retrospective_score, lessons_learned, model_revision, reviewed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(analysis_id) DO UPDATE SET actual_event=excluded.actual_event,
            official_confirmation_time=excluded.official_confirmation_time, news_publication_time=excluded.news_publication_time,
            lead_time_hours=excluded.lead_time_hours, result=excluded.result, false_positive=excluded.false_positive,
            false_negative=excluded.false_negative, partial_hit=excluded.partial_hit, data_missing=excluded.data_missing,
            retrospective_score=excluded.retrospective_score, lessons_learned=excluded.lessons_learned,
            model_revision=excluded.model_revision, reviewed_at=excluded.reviewed_at`)
          .bind(ledgerId, id, body.issued_at || new Date().toISOString(), event?.region || "unknown", event?.event_type || "other",
            body.expected_event_window ?? null, JSON.stringify(body.input_data_snapshot || []), JSON.stringify(body.precursor_signals || []),
            JSON.stringify(body.causal_chain || []), body.warning_rule_version ?? null, body.confidence ?? event?.confidence ?? null,
            JSON.stringify(body.proposed_actions || []), body.actual_event ?? null, body.official_confirmation_time ?? null,
            body.news_publication_time ?? event?.published_at ?? null, body.lead_time_hours ?? null, body.result,
            body.false_positive ? 1 : 0, body.false_negative ? 1 : 0, body.partial_hit ? 1 : 0, body.data_missing ? 1 : 0,
            body.retrospective_score ?? null, body.lessons_learned ?? null, body.model_revision ?? null, body.reviewed_at || new Date().toISOString()).run();
      }
      return response(await getEventBundle(env, id));
    }
    if (path === "/api/admin/warning-rules" && request.method === "POST") {
      const ruleId = body.id || crypto.randomUUID();
      await env.PCS_DB.prepare("INSERT INTO pcs_warning_rules (id, event_type, version, conditions, data_sources, test_results, false_positive_rate, false_negative_rate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'candidate')")
        .bind(ruleId, body.event_type, body.version, JSON.stringify(body.conditions || []), JSON.stringify(body.data_sources || []), JSON.stringify(body.test_results || {}), body.false_positive_rate ?? null, body.false_negative_rate ?? null).run();
      return response({ id: ruleId, status: "candidate" }, 201);
    }
    if (/^\/api\/admin\/warning-rules\/[^/]+$/.test(path) && request.method === "PATCH") {
      const ruleId = adminResourceId(path);
      await env.PCS_DB.prepare("UPDATE pcs_warning_rules SET conditions = ?, test_results = ?, false_positive_rate = ?, false_negative_rate = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?")
        .bind(JSON.stringify(body.conditions || []), JSON.stringify(body.test_results || {}), body.false_positive_rate ?? null, body.false_negative_rate ?? null, ruleId).run();
      return response({ id: ruleId, updated: true });
    }
    return response({ error: "Not found" }, 404);
  } catch (error) {
    return response({ error: "PCS request failed", detail: error?.message || "Unknown error" }, 500);
  }
}
