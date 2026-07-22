import { domainReadiness } from "../providers/registry.js";
import { retrieveAllLayers } from "../providers/layers.js";
import { eventSimilarity, validationMetrics } from "./routes.js";
import { ingestDailyBrief } from "./intelligence.js";
import { runScheduledHistoryReconstruction } from "../history/reconstruction.js";

async function persistProviderStatus(env, readiness) {
  if (!env.PCS_DB) return;
  const statements = readiness.datasets.map((item) => env.PCS_DB.prepare(`
    INSERT INTO pcs_provider_status
      (adapter_id, provider, dataset, endpoint, timestamp, latency, quality_flag, uncertainty, license, validation_status, availability, retrieval_status, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(adapter_id) DO UPDATE SET
      timestamp=excluded.timestamp, latency=excluded.latency, quality_flag=excluded.quality_flag,
      uncertainty=excluded.uncertainty, validation_status=excluded.validation_status,
      availability=excluded.availability, retrieval_status=excluded.retrieval_status, checked_at=excluded.checked_at
  `).bind(item.id, item.provider, item.dataset, item.endpoint, item.timestamp, item.latency,
    item.quality_flag, item.uncertainty, item.license, item.validation_status,
    item.availability, item.retrieval_status, item.checked_at));
  for (let index = 0; index < statements.length; index += 50) {
    await env.PCS_DB.batch(statements.slice(index, index + 50));
  }
}

async function persistLayerSnapshots(env, payload) {
  if (!env.PCS_DB) return;
  const statements = payload.layers.map((item) => env.PCS_DB.prepare(`INSERT OR IGNORE INTO pcs_data_snapshots
    (id, provider, dataset, endpoint, timestamp, spatial_resolution, temporal_resolution, latency,
     license, quality_flag, uncertainty, retrieval_status, payload, retrieved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(`layer:${item.id}:${item.observation_time || item.retrieved_at}`, item.provider, item.dataset, item.endpoint,
      item.observation_time, item.spatial_resolution, item.temporal_resolution, item.latency, item.license,
      item.quality_flag, typeof item.uncertainty === "number" ? item.uncertainty : null, item.retrieval_status,
      JSON.stringify(item), item.retrieved_at));
  for (let index = 0; index < statements.length; index += 50) await env.PCS_DB.batch(statements.slice(index, index + 50));
}

function classifyAlert(event) {
  const text = `${event || ""}`.toLowerCase();
  if (text.includes("heat")) return "heatwave";
  if (text.includes("flood")) return "flood";
  if (text.includes("fire")) return "wildfire";
  if (text.includes("hurricane") || text.includes("cyclone") || text.includes("typhoon")) return "cyclone";
  return "other";
}

async function existingCluster(env, candidate) {
  const { results } = await env.PCS_DB.prepare(`SELECT id, cluster_id, title, region, event_type, observed_event_time, published_at
    FROM pcs_events WHERE event_type = ? AND COALESCE(observed_event_time, published_at) >= datetime(?, '-14 days') LIMIT 50`)
    .bind(candidate.event_type, candidate.observed_event_time || candidate.published_at).all();
  const match = results.map((row) => ({ row, score: eventSimilarity(row, candidate) })).sort((a, b) => b.score - a.score)[0];
  return match && match.score >= 0.5 ? match.row.cluster_id || match.row.id : null;
}

async function insertOfficialEvent(env, candidate) {
  if (!candidate.id || !candidate.title || !candidate.region) return;
  const cluster = await existingCluster(env, candidate);
  await env.PCS_DB.prepare(`INSERT OR IGNORE INTO pcs_events
    (id, cluster_id, title, category, region, event_type, event_summary, why_it_matters, research_relevance,
     published_at, observed_event_time, source_url, source_name, source_type, confidence, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(candidate.id, cluster, candidate.title, candidate.category, candidate.region, candidate.event_type,
      candidate.event_summary, candidate.why_it_matters, candidate.research_relevance,
      candidate.published_at, candidate.observed_event_time, candidate.source_url,
      candidate.source_name, "official_scientific_feed", null, candidate.latitude ?? null, candidate.longitude ?? null).run();
  await env.PCS_DB.prepare(`INSERT OR IGNORE INTO pcs_data_snapshots
    (id, event_id, provider, dataset, endpoint, timestamp, quality_flag, retrieval_status, payload, retrieved_at)
    VALUES (?, ?, ?, ?, ?, ?, 'OFFICIAL_PROVIDER_RECORD', 'LIVE', ?, ?)`)
    .bind(`event:${candidate.id}:${candidate.published_at || candidate.observed_event_time || "undated"}`, candidate.id, candidate.source_name, candidate.event_type, candidate.source_url,
      candidate.observed_event_time, JSON.stringify({ ...candidate, data_state: "OBSERVED" }), new Date().toISOString()).run();
}

async function ingestNoaaAlerts(env, fetcher) {
  const response = await fetcher("https://api.weather.gov/alerts/active?status=actual", { headers: { "user-agent": "PCS-Observatory/1.0 contact:public-repository" } });
  if (!response.ok) return;
  const payload = await response.json();
  for (const feature of (payload.features || []).slice(0, 100)) {
    const p = feature.properties || {};
    await insertOfficialEvent(env, {
      id: `noaa-${String(feature.id || crypto.randomUUID()).split("/").pop()}`,
      title: p.headline || p.event,
      category: "earth_system",
      region: p.areaDesc || "United States",
      event_type: classifyAlert(p.event),
      event_summary: p.description || null,
      why_it_matters: p.severity || null,
      research_relevance: "Official alert used as event confirmation; precursor analysis requires separate observations.",
      published_at: p.sent || null,
      observed_event_time: p.onset || p.effective || null,
      source_url: p.web || feature.id,
      source_name: "NOAA National Weather Service",
      latitude: feature.geometry?.type === "Point" ? feature.geometry.coordinates?.[1] : null,
      longitude: feature.geometry?.type === "Point" ? feature.geometry.coordinates?.[0] : null,
    });
  }
}

async function ingestUsgsEarthquakes(env, fetcher) {
  const response = await fetcher("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson");
  if (!response.ok) return;
  const payload = await response.json();
  for (const feature of payload.features || []) {
    const p = feature.properties || {};
    const occurred = Number.isFinite(p.time) ? new Date(p.time).toISOString() : null;
    await insertOfficialEvent(env, {
      id: `usgs-${feature.id}`,
      title: p.title,
      category: "earth_system",
      region: p.place || "Unknown region",
      event_type: "earthquake",
      event_summary: p.title,
      why_it_matters: p.alert || p.tsunami ? "Official impact products are available." : null,
      research_relevance: "USGS observation confirms the event; it does not by itself establish predictability.",
      published_at: Number.isFinite(p.updated) ? new Date(p.updated).toISOString() : null,
      observed_event_time: occurred,
      source_url: p.url,
      source_name: "USGS Earthquake Hazards Program",
      latitude: feature.geometry?.coordinates?.[1] ?? null,
      longitude: feature.geometry?.coordinates?.[0] ?? null,
    });
  }
}

async function updateEvidenceLedgerAtEndOfDay(env) {
  if (!env.PCS_DB) return 0;
  const result = await env.PCS_DB.prepare(`INSERT OR IGNORE INTO pcs_evidence_ledger
    (analysis_id, event_id, issued_at, region, event_type, input_data_snapshot, precursor_signals,
     causal_chain, confidence, proposed_actions, result, data_missing, lessons_learned)
    SELECT 'ledger-auto-' || a.analysis_id, a.event_id, strftime('%Y-%m-%dT%H:%M:%SZ','now'),
      e.region, e.event_type, '[]', '[]', '[]', NULL, '[]', 'insufficient_data', 1,
      'Automated end-of-day review found no evidence-backed validation outcome.'
    FROM pcs_retrospective_analyses a
    JOIN pcs_events e ON e.id = a.event_id
    WHERE NOT EXISTS (SELECT 1 FROM pcs_evidence_ledger l WHERE l.event_id = a.event_id)`).run();
  return result.meta?.changes || 0;
}

export async function runScheduledJobs(env, cron, fetcher = fetch) {
  const startedAt = new Date().toISOString();
  try {
    const [readiness, layers] = await Promise.all([domainReadiness(env, fetcher), retrieveAllLayers(env, fetcher)]);
    await persistProviderStatus(env, readiness);
    await persistLayerSnapshots(env, layers);

  // All configured schedules refresh active official events. The operation is
  // idempotent because provider event identifiers are primary keys.
    await Promise.allSettled([ingestNoaaAlerts(env, fetcher), ingestUsgsEarthquakes(env, fetcher)]);

    let brief = null;
    let history = null;
    if (cron === "15 0 * * *") brief = await ingestDailyBrief(env, fetcher);
    if (cron === "15 0 * * *") history = await runScheduledHistoryReconstruction(env);
    const ledgerUpdates = cron === "45 23 * * *" ? await updateEvidenceLedgerAtEndOfDay(env) : 0;
    const weeklyMetrics = cron === "30 1 * * 1" ? await validationMetrics(env) : null;

    if (env.PCS_DB) {
      await env.PCS_DB.prepare(`INSERT INTO pcs_scheduled_runs (id, cron, started_at, completed_at, status, details)
        VALUES (?, ?, ?, ?, 'completed', ?)`)
        .bind(crypto.randomUUID(), cron, startedAt, new Date().toISOString(), JSON.stringify({ datasets_checked: readiness.datasets.length, layers_checked: layers.layers.length, brief_items: brief ? brief.primary.length + brief.more_intelligence.length : 0, history_job: history?.job?.id || null, history_status: history?.execution?.job?.status || history?.job?.status || null, ledger_updates: ledgerUpdates, weekly_metrics: weeklyMetrics })).run();
    }
    return { readiness, layers, brief, history };
  } catch (error) {
    if (env.PCS_DB) await env.PCS_DB.prepare(`INSERT INTO pcs_scheduled_runs (id, cron, started_at, completed_at, status, details)
      VALUES (?, ?, ?, ?, 'failed', ?)`)
      .bind(crypto.randomUUID(), cron, startedAt, new Date().toISOString(), JSON.stringify({ error: error?.message || "Scheduled job failed" })).run();
    throw error;
  }
}
