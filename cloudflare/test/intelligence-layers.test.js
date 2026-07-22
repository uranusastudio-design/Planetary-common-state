import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PCS_LAYER_ADAPTERS, retrieveLayer } from "../src/providers/layers.js";
import { ingestDailyBrief, proposeAiAnalysis } from "../src/pcs/intelligence.js";
import { residualState, validationEvidenceSufficient } from "../src/pcs/routes.js";

test("layer adapters expose the complete observation contract", async () => {
  const adapter = PCS_LAYER_ADAPTERS.find((item) => item.id === "global-temperature");
  const result = await retrieveLayer(adapter, {}, async () => new Response("Land-Ocean Temperature Index, x\nYear,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec\n2026,1.01,1.02,***,***,***,***,***,***,***,***,***,***", { status: 200 }), new Date("2026-02-05T00:00:00Z"));
  for (const key of ["layer_id", "provider", "dataset", "source_type", "data_endpoint", "visualization_type", "spatial_data_available", "time_series_available", "cesium_renderer_available", "checkbox_connected", "legend_available", "opacity_control_available", "latest_observation_time", "latest_retrieval_time", "data_quality", "uncertainty", "runtime_status", "failure_reason"]) assert.ok(Object.hasOwn(result, key), key);
  assert.equal(result.value, 1.02);
  assert.equal(result.data_state, "OBSERVED");
  assert.notEqual(result.dataset, "OpenWeather");
  assert.equal(result.runtime_status, "AVAILABLE");
  assert.equal(result.cesium_renderer_available, true);
  assert.equal(result.details.baseline_period, "1951–1980");
  assert.equal(result.visualization.layer, "MODIS_Terra_Land_Surface_Temp_Day_TES");
  assert.match(result.details.value_semantics, /positive means warmer/);
});

test("all fifteen audited Earth layers are registered and weather layers expose real Cesium capabilities", async () => {
  assert.equal(PCS_LAYER_ADAPTERS.length, 15);
  assert.deepEqual(PCS_LAYER_ADAPTERS.slice(-4).map((item) => item.id), ["clouds", "rain", "temperature", "wind"]);
  const temperature = PCS_LAYER_ADAPTERS.find((item) => item.id === "temperature");
  const result = await retrieveLayer(temperature, { OPENWEATHER_API_KEY: "test-key" }, async (url) => {
    assert.match(String(url), /temp_new\/1\/1\/1\.png\?appid=test-key$/);
    return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { status: 200, headers: { "content-type": "image/png", "last-modified": "Sat, 18 Jul 2026 05:00:00 GMT" } });
  }, new Date("2026-07-18T05:05:00Z"));
  assert.equal(result.runtime_status, "AVAILABLE");
  assert.equal(result.visualization_type, "cesium_imagery");
  assert.equal(result.cesium_renderer_available, true);
  assert.equal(result.checkbox_connected, true);
  assert.equal(result.legend_available, true);
  assert.equal(result.opacity_control_available, true);
  assert.equal(result.latest_observation_time, "2026-07-18T05:00:00.000Z");
});

test("credentialed FIRMS layer remains visibly AUTH_REQUIRED without a key", async () => {
  const adapter = PCS_LAYER_ADAPTERS.find((item) => item.id === "wildfire");
  const result = await retrieveLayer(adapter, {}, async () => { throw new Error("must not fetch"); });
  assert.equal(result.retrieval_status, "AUTH_REQUIRED");
  assert.match(result.error, /FIRMS_MAP_KEY/);
  assert.equal(result.visualization.credential_mode, "backend_secret_only");
});

test("scientific raster layers publish exact sustainable GIBS products and controls", async () => {
  const expected = {
    "global-temperature": "MODIS_Terra_Land_Surface_Temp_Day_TES",
    precipitation: "IMERG_Precipitation_Rate_30min",
    ndvi: "MODIS_Terra_L3_NDVI_16Day",
    "sea-ice": "GHRSST_L4_MUR_Sea_Ice_Concentration",
  };
  for (const [id, gibsLayer] of Object.entries(expected)) {
    const adapter = PCS_LAYER_ADAPTERS.find((item) => item.id === id);
    const body = adapter.parser === "gistemp"
      ? "Land-Ocean Temperature Index\nYear,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec\n2026,1.08,1.25,1.32,1.17,1.13,1.18,***,***,***,***,***,***"
      : adapter.parser === "nsidc"
        ? "Year,Month,Day,Extent,Missing,Source Data\n2026,7,16,7.691,0.000,NRTSI-G"
        : JSON.stringify({ feed: { entry: [{ title: "granule", time_start: "2026-07-16T00:00:00Z" }] } });
    const result = await retrieveLayer(adapter, {}, async () => new Response(body, { status: 200, headers: { "content-type": adapter.parser === "cmr_granule" ? "application/json" : "text/csv" } }), new Date("2026-07-18T06:00:00Z"));
    assert.equal(result.cesium_renderer_available, true, id);
    assert.equal(result.checkbox_connected, true, id);
    assert.equal(result.legend_available, true, id);
    assert.equal(result.opacity_control_available, true, id);
    assert.equal(result.visualization.layer, gibsLayer, id);
    if (id === "ndvi") assert.equal(result.visualization.composite_days, 16);
  }
});

test("NOAA station values remain station-scoped and use the documented columns and datum", async () => {
  const co2 = PCS_LAYER_ADAPTERS.find((item) => item.id === "co2");
  const co2Result = await retrieveLayer(co2, {}, async () => new Response("# header\n2026,6,2026.4583,431.44,429.06,19,0.35,0.15", { status: 200 }), new Date("2026-07-18T00:00:00Z"));
  assert.equal(co2Result.value, 431.44);
  assert.equal(co2Result.details.station, "Mauna Loa Observatory (MLO)");
  assert.match(co2Result.details.spatial_warning, /not a global CO2 surface/);
  const seaLevel = PCS_LAYER_ADAPTERS.find((item) => item.id === "sea-level");
  const payload = { metadata: { id: "1612340", name: "Honolulu", lat: "21.3033", lon: "-157.8645" }, data: [{ t: "2026-07-18 06:30", v: "0.298", s: "0.024", f: "0,0,0,0", q: "p" }] };
  const seaLevelResult = await retrieveLayer(seaLevel, {}, async () => new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }), new Date("2026-07-18T06:35:00Z"));
  assert.equal(seaLevelResult.details.datum, "MSL");
  assert.equal(seaLevelResult.details.latitude, 21.3033);
  assert.match(seaLevelResult.details.spatial_warning, /not global sea level/);
});

test("NHC active storm response retains a normalized center and official GIS products", async () => {
  const adapter = PCS_LAYER_ADAPTERS.find((item) => item.id === "tropical-cyclones");
  const payload = { activeStorms: [{ id: "ep052026", name: "Elida", classification: "TS", intensity: "55", pressure: "994", latitudeNumeric: 16.8, longitudeNumeric: -120.8, lastUpdate: "2026-07-17T15:00:00.000Z", forecastTrack: { kmzFile: "https://www.nhc.noaa.gov/track.kmz" }, trackCone: { kmzFile: "https://www.nhc.noaa.gov/cone.kmz" }, initialWindExtent: { kmzFile: "https://www.nhc.noaa.gov/radii.kmz" } }] };
  const result = await retrieveLayer(adapter, {}, async () => new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }), new Date("2026-07-18T00:00:00Z"));
  assert.equal(result.value, 1);
  assert.equal(result.details.storms[0].classification.normalized, "tropical_storm");
  assert.equal(result.details.storms[0].latitude, 16.8);
  assert.match(result.details.storms[0].gis.forecast_cone, /cone\.kmz$/);
});

test("configured FIRMS adapter returns coordinates without exposing its secret", async () => {
  const adapter = PCS_LAYER_ADAPTERS.find((item) => item.id === "wildfire");
  const csv = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,type\n23.5,121.0,330,0.4,0.4,2026-07-18,0430,N20,VIIRS,h,0";
  const result = await retrieveLayer(adapter, { FIRMS_MAP_KEY: "server-secret" }, async (url) => {
    assert.match(url, /server-secret/);
    return new Response(csv, { status: 200, headers: { "content-type": "text/csv" } });
  }, new Date("2026-07-18T05:00:00Z"));
  assert.equal(result.details.detections[0].latitude, 23.5);
  assert.equal(result.details.detections[0].confidence, "h");
  assert.doesNotMatch(JSON.stringify(result), /server-secret/);
});

test("daily brief produces ten deduplicated publication items and no measurements or automatic events", async () => {
  const items = Array.from({ length: 12 }, (_, index) => `<item><title>Research report ${index}</title><link>https://example.test/${index}</link><description>Peer-reviewed climate dataset release.</description><pubDate>Fri, ${String(index + 1).padStart(2, "0")} Jul 2026 00:00:00 GMT</pubDate></item>`).join("");
  const result = await ingestDailyBrief({}, async () => new Response(`<rss><channel>${items}</channel></rss>`, { status: 200 }), new Date("2026-07-17T00:00:00Z"));
  assert.equal(result.primary.length, 10);
  assert.equal(new Set(result.primary.map((item) => item.source_url)).size, 10);
  assert.ok(result.primary.every((item) => item.event_candidate === false));
  assert.ok(result.primary.every((item) => item.data_state === "PUBLICATION_METADATA"));
  assert.ok(result.primary.every((item) => item.observed_event_time === null && item.confidence === null));
  assert.deepEqual(result.counts, { brief_items: 10, event_candidates: 0, retrospective_analyses: 0 });
  assert.equal(result.policy.article_measurements, false);
});

test("historical Daily Brief rows are migrated away from OBSERVED", async () => {
  const migration = await readFile(new URL("../migrations/0004_phase64_brief_metadata_classification.sql", import.meta.url), "utf8");
  assert.match(migration, /SET data_state = 'PUBLICATION_METADATA'/);
  assert.match(migration, /observed_event_time = NULL/);
});

test("AI adapter is proposal-only and does not invent output when unconfigured", async () => {
  const result = await proposeAiAnalysis({}, { source_record: { title: "A report" }, input_snapshot_ids: [] }, new Date("2026-07-17T00:00:00Z"));
  assert.equal(result.status, "NOT_CONFIGURED");
  assert.equal(result.proposal, null);
  assert.equal(result.review_status, "PROPOSAL");
  assert.equal(result.confidence, null);
});

test("PCS residuals and total L(t) remain unavailable without scientific definitions", () => {
  const state = residualState();
  assert.equal(state.total_l_t.value, null);
  assert.equal(state.total_l_t.status, "UNAVAILABLE");
  assert.deepEqual(state.components.map((item) => item.component), ["thermal", "flow", "chemical", "structural", "informational"]);
  assert.ok(state.components.every((item) => item.value === null && item.validation_status === "UNVALIDATED"));
  for (const component of state.components) {
    for (const field of ["connected_datasets", "required_datasets", "missing_datasets", "spatial_coverage", "temporal_coverage", "formula_version", "baseline_period", "normalization_method", "weights", "uncertainty", "validation_method", "last_calculated_at", "validation_status", "unavailable_reason"]) assert.ok(Object.hasOwn(component, field), `${component.component}.${field}`);
  }
});

test("resolved validation requires evidence snapshots and official confirmation", () => {
  assert.equal(validationEvidenceSufficient({ result: "confirmed", input_data_snapshot: [], official_confirmation_time: null }), false);
  assert.equal(validationEvidenceSufficient({ result: "confirmed", input_data_snapshot: ["snapshot-1"], official_confirmation_time: "2026-07-17T00:00:00Z" }), true);
  assert.equal(validationEvidenceSufficient({ result: "insufficient_data" }), true);
});
