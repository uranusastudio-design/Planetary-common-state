import { domainReadiness } from "../providers/registry.js";
import { eventSimilarity } from "./routes.js";

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
     published_at, observed_event_time, source_url, source_name, source_type, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(candidate.id, cluster, candidate.title, candidate.category, candidate.region, candidate.event_type,
      candidate.event_summary, candidate.why_it_matters, candidate.research_relevance,
      candidate.published_at, candidate.observed_event_time, candidate.source_url,
      candidate.source_name, "official_scientific_feed", null).run();
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
    });
  }
}

export async function runScheduledJobs(env, cron, fetcher = fetch) {
  const startedAt = new Date().toISOString();
  const readiness = await domainReadiness(env, fetcher);
  await persistProviderStatus(env, readiness);

  // All configured schedules refresh active official events. The operation is
  // idempotent because provider event identifiers are primary keys.
  await Promise.allSettled([ingestNoaaAlerts(env, fetcher), ingestUsgsEarthquakes(env, fetcher)]);

  if (env.PCS_DB) {
    await env.PCS_DB.prepare(`INSERT INTO pcs_scheduled_runs (id, cron, started_at, completed_at, status, details)
      VALUES (?, ?, ?, ?, 'completed', ?)`)
      .bind(crypto.randomUUID(), cron, startedAt, new Date().toISOString(), JSON.stringify({ datasets_checked: readiness.datasets.length })).run();
  }
  return readiness;
}
