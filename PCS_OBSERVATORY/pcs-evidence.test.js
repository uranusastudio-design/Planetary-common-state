import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const layerProviders = await readFile(new URL("../cloudflare/src/providers/layers.js", import.meta.url), "utf8");

test("Temperature uses the Worker route contract and one Cesium Viewer", () => {
  assert.match(app, /temp:\s*\{[^}]*path:\s*"temperature"/);
  assert.equal((app.match(/new Cesium\.Viewer\(/g) || []).length, 1);
});

test("Domain readiness has no static WAITING or PLANNED cards", () => {
  const start = html.indexOf('id="domain-readiness-grid"');
  assert.ok(start >= 0);
  const domainSection = html.slice(Math.max(0, start - 300), start + 300);
  assert.doesNotMatch(domainSection, /Waiting|Planned|confirmed|placeholder/i);
  assert.match(app, /\/api\/domain-readiness/);
});

test("Retrospective, gathering, and Evidence Ledger panels use live APIs", () => {
  for (const id of ["daily-brief-list", "mass-gathering-list", "evidence-ledger-list"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const endpoint of ["/api/events?limit=20", "/api/evidence-ledger", "/api/mass-gatherings"]) assert.ok(app.includes(endpoint));
});

test("PCS intelligence layers are provider-driven with no planned layer controls", () => {
  const start = html.indexOf('id="pcs-layer-list"');
  const end = html.indexOf('class="weather-layers-section"', start);
  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(html.slice(start, end), /planned|data-layer-status/i);
  assert.match(app, /\/api\/system-status/);
  assert.match(app, /renderPcsLayers/);
});

test("unsupported residual values and total L(t) stay unavailable", () => {
  assert.doesNotMatch(html, /0\.853|0\.811|Prototype Domain Values/);
  for (const id of ["projection-thermal", "projection-flow", "projection-chemical", "projection-informational", "projection-structural"]) assert.match(html, new RegExp(`id="${id}">UNAVAILABLE`));
  assert.match(app, /earthPcsReference = null/);
});

test("Evidence Explorer and runtime animation statuses are data-driven", () => {
  for (const id of ["evidence-explorer-form", "evidence-event", "evidence-explorer-results", "evidence-causal-status"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(app, /\/api\/evidence-explorer/);
  assert.doesNotMatch(html, /Framework Ready/);
  for (const status of ["NO_ACTIVE_ALERT", "WAITING_FOR_TIME_SERIES", "NOT_CONFIGURED"]) assert.match(html, new RegExp(status));
});

test("Earth layer audit uses one shared Cesium runtime with honest activation controls", () => {
  assert.match(app, /class CesiumLayerRuntimeController/);
  assert.match(app, /duplicatePrevented: true/);
  assert.match(app, /validateWeatherTile/);
  assert.match(app, /control\.checked = false/);
  assert.match(app, /updateOpacity\(layerId, opacity\)/);
  assert.match(app, /earthLayerCapabilityMatrix/);
  assert.match(html, /id="weather-legends"/);
  for (const layer of ["clouds", "rain", "temp", "wind"]) {
    assert.match(html, new RegExp(`data-weather-opacity="${layer}"`));
  }
  assert.equal((app.match(/new Cesium\.Viewer\(/g) || []).length, 1);
});

test("Phase 6.2 scientific layers use the shared runtime and exact spatial products", () => {
  for (const product of [
    "MODIS_Terra_Land_Surface_Temp_Day_TES",
    "IMERG_Precipitation_Rate_30min",
    "MODIS_Terra_L3_NDVI_16Day",
    "GHRSST_L4_MUR_Sea_Ice_Concentration",
  ]) assert.match(layerProviders, new RegExp(product));
  for (const kind of ["gibs_wmts", "station", "tropical_cyclones", "fire_detections"]) assert.match(app, new RegExp(kind));
  assert.match(app, /resolveGibsDefinition/);
  assert.match(app, /Cesium\.KmlDataSource\.load/);
  assert.match(app, /upsertGeographicEntity/);
  assert.match(app, /failed provider|control\.checked = active|checkbox\.checked = false/i);
  assert.equal((app.match(/new Cesium\.Viewer\(/g) || []).length, 1);
});

test("scientific layer metadata exposes provenance, time, units, latency, uncertainty, and auth", () => {
  for (const label of ["Map product", "Map units", "Map observation end", "Visualization details", "Authentication requirement", "Last successful request", "Planned adapter interface", "Value semantics"]) assert.ok(app.includes(label), label);
  assert.match(app, /latest_observation_time/);
  assert.match(app, /latest_retrieval_time/);
  assert.match(app, /layer\.latency/);
  assert.match(app, /layer\.uncertainty/);
  assert.match(app, /scientific-legend-image/);
});

test("Phase 6.3 regional observations preserve one Viewer and honest hazard controls", () => {
  for (const id of ["regional-observation-panel", "regional-legends", "regional-weather", "regional-coastal", "regional-hazards", "regional-seasonal", "regional-sources"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const group of ["COUNTRY", "CRITICAL REGION", "SEASONAL & CIVILIZATION"]) assert.ok(app.includes(group));
  for (const id of ["regional-earthquakes", "regional-coastal"]) assert.ok(app.includes(id));
  for (const status of ["PREDICTED_TIDE", "OBSERVED_WATER_LEVEL", "STORM_SURGE_RESIDUAL", "FORECAST", "OBSERVED"]) assert.ok(app.includes(status));
  assert.match(app, /regionalObservationAbortController\?\.abort/);
  assert.match(app, /earthLayerRuntime\?\.deactivate\("regional-earthquakes"\)/);
  assert.match(app, /dataset\.cameraAction = "flyTo"/);
  assert.match(app, /dataset\.lastFlyToRegion = region\.id/);
  assert.match(app, /config\.kind\.startsWith\("regional_"\)/);
  assert.equal((app.match(/new Cesium\.Viewer\(/g) || []).length, 1);
});

test("all Observatory dictionaries contain the PCS evidence labels", async () => {
  for (const language of ["en", "zh-TW", "ja", "ko"]) {
    const dictionary = JSON.parse(await readFile(new URL(`./i18n/${language}.json`, import.meta.url), "utf8"));
    for (const key of ["connected_datasets", "retrospective_analysis", "human_mobility", "evidence_ledger", "validation_status", "data_quality", "evidence_explorer", "ai_proposal_status", "pcs_residual_status", "status_auth_required", "animation_runtime_status", "required_datasets", "validation_method", "brief_item_count", "ledger_record_details", "calculated_variables", "validated_timeline_unavailable"]) assert.equal(typeof dictionary[key], "string", `${language}.${key}`);
  }
});

test("Phase 6.4 exposes provenance-rich readiness, publication metadata, and runtime details", () => {
  for (const token of ["connected_datasets", "required_datasets", "missing_datasets", "formula_version", "normalization_method", "validation_method", "unavailable_reason"]) assert.ok(app.includes(token));
  assert.match(app, /PUBLICATION_METADATA/);
  assert.match(html, /id="daily-brief-status"/);
  assert.match(html, /data-animation-detail="data_update"/);
  assert.match(app, /timelineFrames/);
  assert.equal((app.match(/new Cesium\.Viewer\(/g) || []).length, 1);
});
