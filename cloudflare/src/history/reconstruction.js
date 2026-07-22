import { DEFAULT_HISTORY_PROVIDERS, historicalAdapter } from "./adapters.js";
import {
  HISTORY_MAX_PROVIDER_REQUESTS,
  HISTORY_MAX_RETRIES,
  completenessFromCoverage,
  dayBounds,
  enumerateDates,
  historicalBriefState,
  temporalState,
  validateHistoryRange,
} from "./temporal.js";

function safeJson(value, fallback = null) {
  if (typeof value !== "string") return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function normalizedProviders(value) {
  const requested = Array.isArray(value) && value.length ? value : DEFAULT_HISTORY_PROVIDERS;
  return [...new Set(requested.map(String))].filter((id) => historicalAdapter(id));
}

function normalizedRegions(value) {
  return [...new Set((Array.isArray(value) && value.length ? value : ["global"]).map(String))];
}

export async function checksum(value) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function reconstructionJobKey({ start_date, end_date, providers, regions, force_refresh }) {
  return JSON.stringify({ start_date, end_date, providers: [...providers].sort(), regions: [...regions].sort(), force_refresh: Boolean(force_refresh) });
}

export function sourceIdentity(source) {
  return {
    provider: source.provider,
    dataset: source.dataset,
    source_url: source.source_url,
    publication_time: source.publication_time,
    archived_reference: source.archived_reference,
  };
}

async function ensureDay(env, date) {
  const id = `history-day:${date}`;
  await env.PCS_DB.prepare(`INSERT INTO history_days (id, date_utc, reconstruction_status)
    VALUES (?, ?, 'RUNNING')
    ON CONFLICT(date_utc) DO UPDATE SET reconstruction_status='RUNNING', updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')`)
    .bind(id, date).run();
  return env.PCS_DB.prepare("SELECT * FROM history_days WHERE date_utc = ?").bind(date).first();
}

async function upsertSource(env, dayId, source) {
  const sourceChecksum = await checksum(sourceIdentity(source));
  const id = `history-source:${dayId.slice("history-day:".length)}:${sourceChecksum}`;
  await env.PCS_DB.prepare(`INSERT INTO history_sources
    (id, history_day_id, provider, dataset, source_name, source_url, source_type, publication_time,
     retrieval_time, first_known_available_time, reliability_class, access_status, auth_required,
     failure_reason, archived_reference, checksum)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(history_day_id, checksum) DO UPDATE SET
      access_status=excluded.access_status, failure_reason=excluded.failure_reason,
      archived_reference=excluded.archived_reference, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')`)
    .bind(id, dayId, source.provider, source.dataset, source.source_name || source.provider,
      source.source_url || null, source.source_type || "scientific_archive", source.publication_time || null,
      source.retrieval_time || null, source.first_known_available_time || null, source.reliability_class || "stored_record",
      source.access_status || "AVAILABILITY_UNKNOWN", source.auth_required ? 1 : 0, source.failure_reason || null,
      source.archived_reference || null, sourceChecksum).run();
  return { id, checksum: sourceChecksum };
}

async function upsertSnapshot(env, dayId, sourceId, snapshot) {
  const hash = snapshot.source_snapshot_hash || await checksum({
    snapshot_type: snapshot.snapshot_type, provider: snapshot.provider, dataset: snapshot.dataset,
    raw_reference: snapshot.raw_reference, observed_at: snapshot.observed_at,
    published_at: snapshot.published_at, value_json: snapshot.value_json,
  });
  const id = `history-snapshot:${dayId.slice("history-day:".length)}:${hash}`;
  await env.PCS_DB.prepare(`INSERT INTO history_snapshots
    (id, history_day_id, history_source_id, snapshot_type, provider, dataset, source_name, source_url,
     source_type, region_id, layer_id, variable, value_json, unit, spatial_coverage, temporal_coverage,
     observed_at, valid_from, valid_to, published_at, retrieved_at, available_to_pcs_at,
     official_confirmation_time, latency_seconds, quality, uncertainty, data_state, source_snapshot_hash,
     raw_reference, revision_of_id, revision_number, revision_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(history_day_id, source_snapshot_hash) DO NOTHING`)
    .bind(id, dayId, sourceId || null, snapshot.snapshot_type, snapshot.provider, snapshot.dataset,
      snapshot.source_name || snapshot.provider, snapshot.source_url || null, snapshot.source_type || "scientific_archive",
      snapshot.region_id || null, snapshot.layer_id || null, snapshot.variable || null,
      typeof snapshot.value_json === "string" ? snapshot.value_json : JSON.stringify(snapshot.value_json ?? null),
      snapshot.unit || null, snapshot.spatial_coverage || null, snapshot.temporal_coverage || null,
      snapshot.observed_at || null, snapshot.valid_from || null, snapshot.valid_to || null,
      snapshot.published_at || null, snapshot.retrieved_at || null, snapshot.available_to_pcs_at || null,
      snapshot.official_confirmation_time || null, finiteOrNull(snapshot.latency_seconds), snapshot.quality || null,
      finiteOrNull(snapshot.uncertainty), snapshot.data_state, hash, snapshot.raw_reference || null,
      snapshot.revision_of_id || null, Number(snapshot.revision_number || 1), snapshot.revision_note || null).run();
  return id;
}

async function recordProviderStatus(env, dayId, adapter, startedAt, result, error = null) {
  const completedAt = new Date().toISOString();
  const idHash = await checksum(`${dayId}|${adapter.id}|${startedAt}`);
  await env.PCS_DB.prepare(`INSERT INTO history_provider_status
    (id, history_day_id, provider, dataset, requested_at, completed_at, runtime_status, http_status,
     item_count, snapshot_count, latency_ms, failure_reason, adapter_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(history_day_id, provider, dataset, requested_at) DO UPDATE SET
      completed_at=excluded.completed_at, runtime_status=excluded.runtime_status,
      item_count=excluded.item_count, snapshot_count=excluded.snapshot_count,
      latency_ms=excluded.latency_ms, failure_reason=excluded.failure_reason`)
    .bind(`history-provider:${idHash}`, dayId, adapter.provider, adapter.dataset, startedAt, completedAt,
      error ? "ERROR" : result.runtime_status || "SUCCESS", result.http_status || null,
      Number(result.item_count || 0), Number(result.snapshot_count || 0), new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      error?.message || result.failure_reason || null, adapter.adapter_version).run();
}

async function ingestDailyBrief(env, day, dayId) {
  const { results } = await env.PCS_DB.prepare(`SELECT * FROM pcs_daily_brief_items
    WHERE date(retrieved_at) = date(?) ORDER BY retrieved_at, id LIMIT 500`).bind(day).all();
  for (const item of results) {
    const state = historicalBriefState(item);
    const availability = item.retrieved_at || null;
    const source = await upsertSource(env, dayId, {
      provider: item.source_name || "PCS", dataset: "Daily Brief", source_name: item.source_name || "Unknown source",
      source_url: item.source_url, source_type: item.source_type || "publication", publication_time: item.published_at,
      retrieval_time: item.retrieved_at, first_known_available_time: availability, reliability_class: item.reliability,
      access_status: availability ? temporalState({ available_to_pcs_at: availability, published_at: item.published_at, retrieved_at: item.retrieved_at }, dayBounds(day).end) : "AVAILABILITY_UNKNOWN",
      archived_reference: `pcs_daily_brief_items:${item.id}`,
    });
    await upsertSnapshot(env, dayId, source.id, {
      snapshot_type: "daily_brief", provider: "PCS", dataset: "pcs_daily_brief_items",
      source_name: item.source_name, source_url: item.source_url, source_type: item.source_type || "publication",
      region_id: item.region, variable: "daily_brief_item", observed_at: item.observed_event_time,
      published_at: item.published_at, retrieved_at: item.retrieved_at, available_to_pcs_at: availability,
      temporal_coverage: day, quality: item.reliability, data_state: availability
        ? temporalState({ available_to_pcs_at: availability, published_at: item.published_at, retrieved_at: item.retrieved_at }, dayBounds(day).end)
        : "AVAILABILITY_UNKNOWN",
      value_json: { ...item, pcs_domains: safeJson(item.pcs_domains, []), historical_status: state },
      raw_reference: `pcs_daily_brief_items:${item.id}`,
    });
  }
  return { runtime_status: "SUCCESS", item_count: results.length, snapshot_count: results.length };
}

async function ingestEvents(env, day, dayId) {
  const { results } = await env.PCS_DB.prepare(`SELECT e.*,
      MIN(COALESCE(l.official_confirmation_time, s.published_at)) AS first_public_confirmation_time,
      COUNT(DISTINCT s.id) AS linked_source_count,
      MAX(CASE WHEN l.analysis_id IS NOT NULL THEN 1 ELSE 0 END) AS has_evidence
    FROM pcs_events e
    LEFT JOIN pcs_event_sources s ON s.event_id = e.id
    LEFT JOIN pcs_evidence_ledger l ON l.event_id = e.id
    WHERE date(e.created_at) = date(?)
    GROUP BY e.id ORDER BY e.created_at, e.id LIMIT 500`).bind(day).all();
  const replayEnd = dayBounds(day).end;
  for (const event of results) {
    const availability = event.created_at || null;
    const eventState = availability ? temporalState({ available_to_pcs_at: availability, published_at: event.published_at, retrieved_at: event.created_at }, replayEnd) : "AVAILABILITY_UNKNOWN";
    await env.PCS_DB.prepare(`INSERT INTO history_events
      (id, history_day_id, event_id, event_type, title, region_id, event_status, observed_event_time,
       first_public_confirmation_time, first_available_to_pcs_time, candidate_generated_at, confidence,
       evidence_state, causal_status, source_count, retrospective_eligible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NOT_ESTABLISHED', ?, ?)
      ON CONFLICT(history_day_id, event_id) DO UPDATE SET
        event_status=excluded.event_status, first_public_confirmation_time=excluded.first_public_confirmation_time,
        evidence_state=excluded.evidence_state, source_count=excluded.source_count,
        retrospective_eligible=excluded.retrospective_eligible, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')`)
      .bind(`history-event:${day}:${event.id}`, dayId, event.id, event.event_type, event.title, event.region,
        eventState, event.observed_event_time, event.first_public_confirmation_time, availability,
        event.created_at, finiteOrNull(event.confidence), event.has_evidence ? "EVIDENCE_LINKED" : "UNVALIDATED",
        Number(event.linked_source_count || 0), event.has_evidence ? 1 : 0).run();
  }
  const eventSources = await env.PCS_DB.prepare(`SELECT s.*, e.region, e.observed_event_time
    FROM pcs_event_sources s JOIN pcs_events e ON e.id=s.event_id
    WHERE date(e.created_at)=date(?)
    ORDER BY COALESCE(s.published_at, s.created_at), s.id LIMIT 500`).bind(day).all();
  for (const row of eventSources.results) {
    const availability = row.created_at || null;
    const state = availability ? temporalState({ available_to_pcs_at: availability, published_at: row.published_at, retrieved_at: row.created_at }, replayEnd) : "AVAILABILITY_UNKNOWN";
    const source = await upsertSource(env, dayId, {
      provider: row.source_name || "Event source", dataset: row.relationship || "event_source",
      source_name: row.source_name || "Event source", source_url: row.source_url,
      source_type: row.source_type || "event_source", publication_time: row.published_at,
      retrieval_time: row.created_at, first_known_available_time: availability,
      reliability_class: row.relationship, access_status: state,
      archived_reference: `pcs_event_sources:${row.event_id}:${row.id}`,
    });
    await upsertSnapshot(env, dayId, source.id, {
      snapshot_type: "event_source", provider: row.source_name || "Event source", dataset: row.relationship || "event_source",
      source_name: row.source_name || "Event source", source_url: row.source_url,
      source_type: row.source_type || "event_source", region_id: row.region,
      observed_at: row.observed_event_time, published_at: row.published_at, retrieved_at: row.created_at,
      available_to_pcs_at: availability, quality: row.relationship, data_state: state,
      value_json: { event_id: row.event_id, relationship: row.relationship, source_url: row.source_url,
        source_name: row.source_name, source_type: row.source_type, published_at: row.published_at },
      raw_reference: `pcs_event_sources:${row.event_id}:${row.id}`,
    });
  }
  return { runtime_status: "SUCCESS", item_count: results.length + eventSources.results.length, snapshot_count: eventSources.results.length };
}

async function ingestStoredSnapshots(env, day, dayId) {
  const { results } = await env.PCS_DB.prepare(`SELECT s.*, e.region
    FROM pcs_data_snapshots s LEFT JOIN pcs_events e ON e.id = s.event_id
    WHERE date(s.retrieved_at) = date(?)
    ORDER BY s.retrieved_at, s.id LIMIT 500`).bind(day).all();
  for (const row of results) {
    const payload = safeJson(row.payload, null);
    const availability = row.retrieved_at || null;
    const dataState = availability ? temporalState({ available_to_pcs_at: availability, retrieved_at: row.retrieved_at }, dayBounds(day).end) : "AVAILABILITY_UNKNOWN";
    const source = await upsertSource(env, dayId, {
      provider: row.provider, dataset: row.dataset, source_name: row.provider, source_url: row.endpoint,
      source_type: "scientific_snapshot", retrieval_time: row.retrieved_at, first_known_available_time: availability,
      reliability_class: row.quality_flag, access_status: dataState, archived_reference: `pcs_data_snapshots:${row.id}`,
    });
    await upsertSnapshot(env, dayId, source.id, {
      snapshot_type: "provider_snapshot", provider: row.provider, dataset: row.dataset, source_name: row.provider,
      source_url: row.endpoint, source_type: "scientific_snapshot", region_id: row.region,
      layer_id: payload?.layer_id || null, variable: payload?.variable || null, value_json: payload,
      unit: payload?.unit || null, spatial_coverage: row.spatial_resolution,
      temporal_coverage: row.temporal_resolution, observed_at: row.timestamp, retrieved_at: row.retrieved_at,
      available_to_pcs_at: availability, latency_seconds: row.latency, quality: row.quality_flag,
      uncertainty: row.uncertainty, data_state: dataState, source_snapshot_hash: await checksum(`pcs_data_snapshots:${row.id}`),
      raw_reference: `pcs_data_snapshots:${row.id}`,
    });
  }
  return { runtime_status: "SUCCESS", item_count: results.length, snapshot_count: results.length };
}

async function ingestEvidence(env, day, dayId) {
  const { results } = await env.PCS_DB.prepare(`SELECT l.*, e.title, e.source_url, e.source_name
    FROM pcs_evidence_ledger l LEFT JOIN pcs_events e ON e.id = l.event_id
    WHERE date(l.issued_at) = date(?) ORDER BY l.issued_at, l.analysis_id LIMIT 500`).bind(day).all();
  for (const row of results) {
    const availability = row.issued_at || row.reviewed_at || null;
    const dataState = availability ? temporalState({ available_to_pcs_at: availability, published_at: row.news_publication_time, retrieved_at: row.issued_at }, dayBounds(day).end) : "AVAILABILITY_UNKNOWN";
    const source = await upsertSource(env, dayId, {
      provider: "PCS", dataset: "Evidence Ledger", source_name: row.source_name || "PCS Evidence Ledger",
      source_url: row.source_url, source_type: "evidence_record", publication_time: row.news_publication_time,
      retrieval_time: row.issued_at, first_known_available_time: availability, reliability_class: row.result,
      access_status: dataState, archived_reference: `pcs_evidence_ledger:${row.analysis_id}`,
    });
    await upsertSnapshot(env, dayId, source.id, {
      snapshot_type: "evidence_ledger", provider: "PCS", dataset: "pcs_evidence_ledger",
      source_name: "PCS Evidence Ledger", source_url: row.source_url, source_type: "evidence_record",
      region_id: row.region, variable: "validation_result", observed_at: null,
      published_at: row.news_publication_time, retrieved_at: row.issued_at, available_to_pcs_at: availability,
      official_confirmation_time: row.official_confirmation_time, quality: row.result,
      uncertainty: row.confidence == null ? null : 1 - Number(row.confidence), data_state: dataState,
      value_json: { ...row, input_data_snapshot: safeJson(row.input_data_snapshot, []), precursor_signals: safeJson(row.precursor_signals, []), causal_chain: safeJson(row.causal_chain, []), proposed_actions: safeJson(row.proposed_actions, []) },
      raw_reference: `pcs_evidence_ledger:${row.analysis_id}`,
    });
  }
  return { runtime_status: "SUCCESS", item_count: results.length, snapshot_count: results.length };
}

async function ingestProviderStatuses(env, day, dayId) {
  const { results } = await env.PCS_DB.prepare(`SELECT * FROM pcs_provider_status
    WHERE date(checked_at) = date(?) ORDER BY checked_at, adapter_id LIMIT 500`).bind(day).all();
  for (const row of results) {
    const requestedAt = row.checked_at;
    const idHash = await checksum(`${dayId}|stored-provider-status|${row.adapter_id}|${row.checked_at}`);
    await env.PCS_DB.prepare(`INSERT INTO history_provider_status
      (id, history_day_id, provider, dataset, requested_at, completed_at, runtime_status, item_count,
       snapshot_count, latency_ms, failure_reason, adapter_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, 'phase6-provider-registry')
      ON CONFLICT(history_day_id, provider, dataset, requested_at) DO NOTHING`)
      .bind(`history-provider:${idHash}`, dayId, row.provider, row.dataset, requestedAt, requestedAt,
        String(row.retrieval_status || row.availability || "UNKNOWN").toUpperCase(), finiteOrNull(row.latency),
        ["error", "unavailable", "auth_required"].includes(String(row.retrieval_status).toLowerCase()) ? row.validation_status : null).run();
  }
  return { runtime_status: "SUCCESS", item_count: results.length, snapshot_count: 0 };
}

async function ingestUsgsHistory(env, day, dayId) {
  const bounds = dayBounds(day);
  const endpoint = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
  endpoint.search = new URLSearchParams({
    format: "geojson", starttime: bounds.start, endtime: new Date(new Date(bounds.end).getTime() + 1).toISOString(),
    orderby: "time-asc", limit: "200",
  }).toString();
  const retrievedAt = new Date().toISOString();
  const upstream = await fetch(endpoint, { headers: { "user-agent": "PCS-Observatory/7.1 historical-research" } });
  if (!upstream.ok) return { runtime_status: "ERROR", http_status: upstream.status, item_count: 0, snapshot_count: 0, failure_reason: `USGS FDSN HTTP ${upstream.status}` };
  const payload = await upstream.json();
  const features = Array.isArray(payload.features) ? payload.features.slice(0, 200) : [];
  for (const feature of features) {
    const properties = feature.properties || {};
    const coordinates = feature.geometry?.coordinates || [];
    const observedAt = Number.isFinite(properties.time) ? new Date(properties.time).toISOString() : null;
    const publishedAt = Number.isFinite(properties.updated) ? new Date(properties.updated).toISOString() : null;
    const state = temporalState({ available_to_pcs_at: retrievedAt, published_at: publishedAt, retrieved_at: retrievedAt }, bounds.end);
    const rawReference = `usgs-earthquake:${feature.id}`;
    const source = await upsertSource(env, dayId, {
      provider: "USGS", dataset: "Earthquake Catalog FDSN", source_name: "USGS Earthquake Hazards Program",
      source_url: properties.url || endpoint.toString(), source_type: "official_scientific_feed",
      publication_time: publishedAt, retrieval_time: retrievedAt, first_known_available_time: retrievedAt,
      reliability_class: properties.status || "automatic_or_reviewed", access_status: state,
      archived_reference: rawReference,
    });
    await upsertSnapshot(env, dayId, source.id, {
      snapshot_type: "earthquake_event", provider: "USGS", dataset: "Earthquake Catalog FDSN",
      source_name: "USGS Earthquake Hazards Program", source_url: properties.url || endpoint.toString(),
      source_type: "official_scientific_feed", region_id: properties.place || "global",
      layer_id: "regional-earthquakes", variable: "earthquake", value_json: {
        id: feature.id, title: properties.title, magnitude: finiteOrNull(properties.mag), place: properties.place,
        longitude: finiteOrNull(coordinates[0]), latitude: finiteOrNull(coordinates[1]), depth_km: finiteOrNull(coordinates[2]),
        reviewed_status: properties.status || null, tsunami_flag: Boolean(properties.tsunami),
        visualization: { kind: "earthquake_point", longitude: finiteOrNull(coordinates[0]), latitude: finiteOrNull(coordinates[1]) },
      },
      unit: "magnitude", spatial_coverage: "event point", temporal_coverage: day,
      observed_at: observedAt, published_at: publishedAt, retrieved_at: retrievedAt,
      available_to_pcs_at: retrievedAt, quality: properties.status || null,
      uncertainty: null, data_state: state, raw_reference: rawReference,
      revision_number: 1, revision_note: "Retrieved from the current USGS catalog; later catalog revisions are not backdated as PCS knowledge.",
    });
    await env.PCS_DB.prepare(`INSERT INTO history_events
      (id, history_day_id, event_id, event_type, title, region_id, event_status, observed_event_time,
       first_public_confirmation_time, first_available_to_pcs_time, candidate_generated_at, confidence,
       evidence_state, causal_status, source_count, retrospective_eligible)
      VALUES (?, ?, NULL, 'earthquake', ?, ?, ?, ?, ?, ?, NULL, NULL, 'OFFICIAL_SOURCE', 'NOT_ESTABLISHED', 1, 0)
      ON CONFLICT(id) DO UPDATE SET event_status=excluded.event_status,
        first_public_confirmation_time=excluded.first_public_confirmation_time,
        first_available_to_pcs_time=excluded.first_available_to_pcs_time, updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')`)
      .bind(`history-event:${day}:usgs:${feature.id}`, dayId, properties.title || `USGS earthquake ${feature.id}`,
        properties.place || "global", state, observedAt, null, retrievedAt).run();
  }
  return { runtime_status: features.length === 200 ? "PARTIAL" : "SUCCESS", http_status: upstream.status,
    item_count: features.length, snapshot_count: features.length,
    failure_reason: features.length === 200 ? "USGS result limit reached; request is intentionally capped at 200 events." : null };
}

const INTERNAL_INGESTERS = Object.freeze({
  "pcs-daily-brief-store": ingestDailyBrief,
  "pcs-event-store": ingestEvents,
  "pcs-snapshot-store": ingestStoredSnapshots,
  "pcs-evidence-ledger-store": ingestEvidence,
  "pcs-provider-status-store": ingestProviderStatuses,
  "usgs-earthquake-history": ingestUsgsHistory,
});

async function finalizeDay(env, dayId) {
  const [sourceStats, snapshotStats, providerStats, eventStats] = await env.PCS_DB.batch([
    env.PCS_DB.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN access_status='AVAILABLE_AT_TIME' THEN 1 ELSE 0 END) AS available,
      MIN(first_known_available_time) AS earliest, MAX(first_known_available_time) AS latest
      FROM history_sources WHERE history_day_id=?`).bind(dayId),
    env.PCS_DB.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN available_to_pcs_at IS NOT NULL THEN 1 ELSE 0 END) AS temporal,
      SUM(CASE WHEN spatial_coverage IS NOT NULL THEN 1 ELSE 0 END) AS spatial,
      SUM(CASE WHEN variable IS NOT NULL THEN 1 ELSE 0 END) AS variables,
      SUM(CASE WHEN snapshot_type='daily_brief' THEN 1 ELSE 0 END) AS briefs,
      SUM(CASE WHEN snapshot_type='daily_brief' AND data_state='AVAILABLE_AT_TIME' THEN 1 ELSE 0 END) AS briefs_available
      FROM history_snapshots WHERE history_day_id=?`).bind(dayId),
    env.PCS_DB.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN runtime_status IN ('SUCCESS','LIVE','LATEST','AVAILABLE','CONNECTED') THEN 1 ELSE 0 END) AS successful,
      SUM(CASE WHEN runtime_status IN ('ERROR','SOURCE_UNAVAILABLE','AUTH_REQUIRED') THEN 1 ELSE 0 END) AS failed
      FROM history_provider_status WHERE history_day_id=?`).bind(dayId),
    env.PCS_DB.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN event_status='AVAILABLE_AT_TIME' THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN retrospective_eligible=1 THEN 1 ELSE 0 END) AS candidates
      FROM history_events WHERE history_day_id=?`).bind(dayId),
  ]);
  const sources = sourceStats.results[0] || {};
  const snapshots = snapshotStats.results[0] || {};
  const providers = providerStats.results[0] || {};
  const events = eventStats.results[0] || {};
  const completeness = completenessFromCoverage({
    provider_coverage: ratio(Number(providers.successful || 0), Number(providers.total || 0)),
    source_coverage: ratio(Number(sources.available || 0), Number(sources.total || 0)),
    temporal_coverage: ratio(Number(snapshots.temporal || 0), Number(snapshots.total || 0)),
    spatial_coverage: ratio(Number(snapshots.spatial || 0), Number(snapshots.total || 0)),
    variable_coverage: ratio(Number(snapshots.variables || 0), Number(snapshots.total || 0)),
    event_coverage: ratio(Number(events.available || 0), Number(events.total || 0)),
    daily_brief_coverage: ratio(Number(snapshots.briefs_available || 0), Number(snapshots.briefs || 0)),
  });
  const status = Number(snapshots.total || 0) + Number(events.total || 0) > 0 ? "RECONSTRUCTED_PARTIAL" : "NOT_ARCHIVED";
  await env.PCS_DB.prepare(`UPDATE history_days SET reconstruction_status=?, source_count=?, snapshot_count=?,
      event_candidate_count=?, daily_brief_count=?, provider_success_count=?, provider_failure_count=?,
      completeness_score=?, completeness_components_json=?, completeness_formula_version=?,
      completeness_weights_json=?, missing_components_json=?, earliest_available_at=?, latest_available_at=?,
      updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?`)
    .bind(status, Number(sources.total || 0), Number(snapshots.total || 0), Number(events.candidates || 0),
      Number(snapshots.briefs || 0), Number(providers.successful || 0), Number(providers.failed || 0),
      completeness.score, JSON.stringify(completeness.components), completeness.formula_version,
      JSON.stringify(completeness.weights), JSON.stringify(completeness.missing_components),
      sources.earliest || null, sources.latest || null, dayId).run();
  return { status, completeness };
}

export async function createReconstructionJob(env, body = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const start = body.start_date || "2026-07-01";
  const end = body.end_date || today;
  const validation = validateHistoryRange(start, end);
  if (!validation.ok) return validation;
  if (end > today) return { ok: false, status: 400, error: "end_date cannot be in the future" };
  const providers = normalizedProviders(body.providers);
  if (!providers.length) return { ok: false, status: 400, error: "At least one supported historical provider is required" };
  const unsupported = providers.map(historicalAdapter).filter((adapter) => !adapter?.historical_query_supported || !INTERNAL_INGESTERS[adapter.id]);
  if (unsupported.length) return { ok: false, status: 400, error: "One or more providers do not support historical queries", providers: unsupported.map((item) => ({ id: item.id, reason: item.unavailable_reason })) };
  const regions = normalizedRegions(body.regions);
  const key = reconstructionJobKey({ start_date: start, end_date: end, providers, regions, force_refresh: body.force_refresh });
  const keyHash = await checksum(key);
  const reusableStatuses = body.force_refresh ? "'QUEUED','RUNNING','PAUSED_LIMIT'" : "'QUEUED','RUNNING','PAUSED_LIMIT','COMPLETED'";
  const existing = await env.PCS_DB.prepare(`SELECT * FROM history_reconstruction_jobs
    WHERE start_date=? AND end_date=? AND providers_json=? AND regions_json=? AND force_refresh=?
      AND status IN (${reusableStatuses}) ORDER BY requested_at DESC LIMIT 1`)
    .bind(start, end, JSON.stringify(providers), JSON.stringify(regions), body.force_refresh ? 1 : 0).first();
  if (existing) return { ok: true, created: false, idempotent: true, job: decodeJob(existing) };
  const id = `history-job:${keyHash.slice(0, 20)}:${crypto.randomUUID()}`;
  const requestedAt = new Date().toISOString();
  await env.PCS_DB.prepare(`INSERT INTO history_reconstruction_jobs
    (id, start_date, end_date, providers_json, regions_json, force_refresh, status, max_provider_requests, requested_at)
    VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', ?, ?)`)
    .bind(id, start, end, JSON.stringify(providers), JSON.stringify(regions), body.force_refresh ? 1 : 0,
      HISTORY_MAX_PROVIDER_REQUESTS, requestedAt).run();
  return { ok: true, created: true, idempotent: false, job: decodeJob(await env.PCS_DB.prepare("SELECT * FROM history_reconstruction_jobs WHERE id=?").bind(id).first()) };
}

export function decodeJob(row) {
  if (!row) return row;
  return { ...row, providers: safeJson(row.providers_json, []), regions: safeJson(row.regions_json, []), force_refresh: Boolean(row.force_refresh) };
}

async function executeReconstructionJob(env, jobId) {
  let job = await env.PCS_DB.prepare("SELECT * FROM history_reconstruction_jobs WHERE id=?").bind(jobId).first();
  if (!job) return { ok: false, status: 404, error: "Reconstruction job not found" };
  if (job.status === "CANCELLED") return { ok: false, status: 409, error: "Reconstruction job is cancelled" };
  if (job.status === "COMPLETED") return { ok: true, job: decodeJob(job), idempotent: true };
  const providers = safeJson(job.providers_json, DEFAULT_HISTORY_PROVIDERS);
  const dates = enumerateDates(job.cursor_date || job.start_date, job.end_date);
  const executionRequestLimit = Math.min(Number(job.max_provider_requests || HISTORY_MAX_PROVIDER_REQUESTS), HISTORY_MAX_PROVIDER_REQUESTS);
  let requestsThisExecution = 0;
  let processedDays = Number(job.processed_days || 0);
  await env.PCS_DB.prepare("UPDATE history_reconstruction_jobs SET status='RUNNING', started_at=COALESCE(started_at, ?), failure_reason=NULL, updated_at=? WHERE id=?")
    .bind(new Date().toISOString(), new Date().toISOString(), jobId).run();
  for (const day of dates) {
    const latest = await env.PCS_DB.prepare("SELECT status FROM history_reconstruction_jobs WHERE id=?").bind(jobId).first();
    if (latest?.status === "CANCELLED") return { ok: false, status: 409, error: "Reconstruction job is cancelled" };
    if (requestsThisExecution + providers.length > executionRequestLimit) {
      await env.PCS_DB.prepare("UPDATE history_reconstruction_jobs SET status='PAUSED_LIMIT', cursor_date=?, provider_request_count=provider_request_count+?, updated_at=? WHERE id=?")
        .bind(day, requestsThisExecution, new Date().toISOString(), jobId).run();
      return { ok: true, paused: true, reason: "MAX_PROVIDER_REQUESTS_PER_EXECUTION", job: decodeJob(await env.PCS_DB.prepare("SELECT * FROM history_reconstruction_jobs WHERE id=?").bind(jobId).first()) };
    }
    const historyDay = await ensureDay(env, day);
    for (const providerId of providers) {
      const adapter = historicalAdapter(providerId);
      const ingester = INTERNAL_INGESTERS[providerId];
      const startedAt = new Date().toISOString();
      requestsThisExecution += 1;
      if (!ingester) {
        const result = { runtime_status: adapter?.access_status || "SOURCE_UNAVAILABLE", item_count: 0, snapshot_count: 0, failure_reason: adapter?.unavailable_reason || "Historical adapter execution is not configured." };
        await recordProviderStatus(env, historyDay.id, adapter, startedAt, result);
        continue;
      }
      try {
        const result = await ingester(env, day, historyDay.id);
        await recordProviderStatus(env, historyDay.id, adapter, startedAt, result);
      } catch (error) {
        await recordProviderStatus(env, historyDay.id, adapter, startedAt, {}, error);
      }
    }
    await finalizeDay(env, historyDay.id);
    processedDays += 1;
    const next = new Date(`${day}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    await env.PCS_DB.prepare("UPDATE history_reconstruction_jobs SET cursor_date=?, processed_days=?, updated_at=? WHERE id=?")
      .bind(next.toISOString().slice(0, 10), processedDays, new Date().toISOString(), jobId).run();
  }
  await env.PCS_DB.prepare("UPDATE history_reconstruction_jobs SET status='COMPLETED', provider_request_count=provider_request_count+?, completed_at=?, updated_at=? WHERE id=?")
    .bind(requestsThisExecution, new Date().toISOString(), new Date().toISOString(), jobId).run();
  job = await env.PCS_DB.prepare("SELECT * FROM history_reconstruction_jobs WHERE id=?").bind(jobId).first();
  return { ok: true, job: decodeJob(job), retry_limit: HISTORY_MAX_RETRIES };
}

export async function processReconstructionJob(env, jobId) {
  try {
    return await executeReconstructionJob(env, jobId);
  } catch (error) {
    const message = String(error?.message || "Historical reconstruction failed").slice(0, 500);
    await env.PCS_DB.prepare(`UPDATE history_reconstruction_jobs SET status='ERROR', failure_reason=?, updated_at=?
      WHERE id=? AND status NOT IN ('COMPLETED','CANCELLED')`).bind(message, new Date().toISOString(), jobId).run();
    return { ok: false, status: 500, error: message, job: decodeJob(await env.PCS_DB.prepare("SELECT * FROM history_reconstruction_jobs WHERE id=?").bind(jobId).first()) };
  }
}

export async function resumeReconstructionJob(env, jobId) {
  const job = await env.PCS_DB.prepare("SELECT * FROM history_reconstruction_jobs WHERE id=?").bind(jobId).first();
  if (!job) return { ok: false, status: 404, error: "Reconstruction job not found" };
  if (!["PAUSED_LIMIT", "ERROR", "QUEUED"].includes(job.status)) return { ok: false, status: 409, error: `Job cannot resume from ${job.status}` };
  if (Number(job.retry_count || 0) >= HISTORY_MAX_RETRIES && job.status === "ERROR") return { ok: false, status: 409, error: "Retry limit reached" };
  await env.PCS_DB.prepare("UPDATE history_reconstruction_jobs SET status='QUEUED', retry_count=retry_count+1, failure_reason=NULL, updated_at=? WHERE id=?")
    .bind(new Date().toISOString(), jobId).run();
  return processReconstructionJob(env, jobId);
}

export async function cancelReconstructionJob(env, jobId) {
  const job = await env.PCS_DB.prepare("SELECT * FROM history_reconstruction_jobs WHERE id=?").bind(jobId).first();
  if (!job) return { ok: false, status: 404, error: "Reconstruction job not found" };
  if (["COMPLETED", "CANCELLED"].includes(job.status)) return { ok: false, status: 409, error: `Job cannot be cancelled from ${job.status}` };
  const now = new Date().toISOString();
  await env.PCS_DB.prepare("UPDATE history_reconstruction_jobs SET status='CANCELLED', cancelled_at=?, updated_at=? WHERE id=?").bind(now, now, jobId).run();
  return { ok: true, job: decodeJob(await env.PCS_DB.prepare("SELECT * FROM history_reconstruction_jobs WHERE id=?").bind(jobId).first()) };
}

export async function runScheduledHistoryReconstruction(env, now = new Date()) {
  const latest = await env.PCS_DB.prepare("SELECT MAX(date_utc) AS latest, COUNT(*) AS count FROM history_days").first();
  const end = now.toISOString().slice(0, 10);
  const rollingStart = new Date(`${end}T00:00:00Z`);
  rollingStart.setUTCDate(rollingStart.getUTCDate() - 30);
  const initialStart = rollingStart.toISOString().slice(0, 10) > "2026-07-01" ? rollingStart.toISOString().slice(0, 10) : "2026-07-01";
  const start = Number(latest?.count || 0) ? (latest.latest || end) : initialStart;
  const created = await createReconstructionJob(env, { start_date: start, end_date: end });
  if (!created.ok) return created;
  const execution = await processReconstructionJob(env, created.job.id);
  return { ...created, execution };
}
