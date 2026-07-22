import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./style.css", import.meta.url), "utf8");
const historyRoutes = await readFile(new URL("../cloudflare/src/history/routes.js", import.meta.url), "utf8");

test("LIVE, REPLAY and ARCHIVED are visible modes in the existing timeline", () => {
  assert.match(html, /id="history-mode-indicator"/);
  assert.match(html, /id="history-mode-selector"/);
  for (const mode of ["LIVE", "REPLAY", "ARCHIVED"]) assert.match(html, new RegExp(`value="${mode}"`));
  assert.match(html, /id="history-reconstruction-panel"/);
});

test("replay controls expose date, UTC, local time, speed, gap policy and LIVE restoration", () => {
  for (const id of ["history-date", "history-utc-time", "history-local-time", "history-completeness", "history-missing-frame", "history-gap-policy", "timeline-speed"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const action of ["return-live", "step-back", "play", "pause", "step-forward"]) assert.match(html, new RegExp(`data-timeline-action="${action}"`));
  for (const speed of ["1", "2", "0.5"]) assert.match(html, new RegExp(`option value="${speed}"`));
});

test("historical requests use only history APIs and live loaders are guarded by mode", () => {
  for (const endpoint of ["/api/history/status", "/api/history/days", "/api/history/replay/timeline", "/api/history/replay/frame", "/api/history/day/"]) assert.ok(app.includes(endpoint));
  assert.match(app, /LIVE_DATA_DISABLED_IN_HISTORICAL_MODE/);
  assert.match(app, /LIVE_REGIONAL_DATA_DISABLED_IN_HISTORICAL_MODE/);
  assert.match(app, /LIVE_LAYER_REFRESH_DISABLED_IN_HISTORICAL_MODE/);
  assert.match(historyRoutes, /live_fallback_used:\s*false/);
});

test("rapid date and region switching aborts obsolete replay requests", () => {
  assert.match(app, /historyRequestGeneration/);
  assert.match(app, /historyAbortController\?\.abort/);
  assert.match(app, /generation !== historyRequestGeneration/);
  assert.match(app, /void loadSelectedHistoryFrame\(\)/);
});

test("shared Cesium runtime owns a separate replay resource scope", () => {
  assert.match(app, /class CesiumLayerRuntimeController/);
  assert.match(app, /this\.replayScope/);
  assert.match(app, /clearReplayFrame\(\)/);
  assert.match(app, /applyReplayFrame\(frame, generation\)/);
  assert.match(app, /updateReplayOpacity/);
  assert.equal((app.match(/new Cesium\.Viewer\(/g) || []).length, 1);
  assert.equal((html.match(/id="cesium-globe"/g) || []).length, 1);
});

test("frame cleanup removes replay imagery and data sources without mutating live registry", () => {
  assert.match(app, /this\.replayScope\.imageryLayers\.forEach/);
  assert.match(app, /this\.replayScope\.dataSources\.forEach/);
  const method = app.slice(app.indexOf("async applyReplayFrame"), app.indexOf("updateReplayOpacity", app.indexOf("async applyReplayFrame")));
  assert.doesNotMatch(method, /activeEarthLayers\.set/);
  assert.doesNotMatch(method, /this\.registry\.set/);
});

test("historical imagery URLs use the selected historical date and do not interpolate", () => {
  assert.match(app, /String\(resource\.observation_time \|\| frame\.replay_date\)\.slice\(0, 10\)/);
  assert.match(app, /imageryDate/);
  assert.match(historyRoutes, /irregular_no_interpolation/);
  assert.match(historyRoutes, /synthetic_frames:\s*false/);
});

test("replay layer toggles and opacity stay isolated from LIVE activation", () => {
  assert.match(app, /if \(pcsSystemMode !== "LIVE"\)/);
  assert.match(app, /!replaySelectionInitialized && availableLayers\.size/);
  assert.match(app, /replaySelectedLayers\.size \? \[\.\.\.replaySelectedLayers\]\.join\(","\) : "__none__"/);
  assert.match(app, /replaySelectedLayers\.add/);
  assert.match(app, /replaySelectedLayers\.delete/);
  assert.match(app, /earthLayerRuntime\.updateReplayOpacity/);
});

test("historical event UI keeps before-event and after-event sections separate", () => {
  assert.match(html, /id="history-events"/);
  assert.match(app, /history-event-before/);
  assert.match(app, /history-event-after/);
  assert.match(app, /not_available_at_time/);
  assert.match(app, /NOT_ESTABLISHED/);
});

test("return to LIVE restores captured layer opacity and active layers", () => {
  assert.match(app, /liveStateBeforeReplay/);
  assert.match(app, /earthLayerRuntime\?\.deactivateAll\(\)/);
  assert.match(app, /await earthLayerRuntime\?\.activate\(item\.layerId\)/);
  assert.match(app, /await Promise\.allSettled\(\[loadLatestState\(\), loadRegionalObservation/);
});

test("all four dictionaries contain the complete Phase 7.1 vocabulary", async () => {
  const required = ["system_mode", "mode_live", "mode_replay", "mode_archived", "replay_controls", "historical_day", "source_availability", "reconstruction_completeness", "archive_coverage", "missing_frames", "stopped_at_missing_frame", "historical_layer_unavailable", "before_event", "after_event", "not_available_at_time"];
  for (const language of ["en", "zh-TW", "ja", "ko"]) {
    const dictionary = JSON.parse(await readFile(new URL(`./i18n/${language}.json`, import.meta.url), "utf8"));
    for (const key of required) assert.equal(typeof dictionary[key], "string", `${language}.${key}`);
  }
});

test("historical controls and event sections have mobile layout rules", () => {
  assert.match(css, /\.history-mode-controls/);
  assert.match(css, /\.history-time-grid/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.history-mode-controls/);
  assert.match(css, /\.history-event-after/);
});

test("Deep Space and visitor refresh remain present while only live state refresh is paused", () => {
  assert.match(app, /"deep-space"/);
  assert.match(app, /pingVisitorPresence/);
  assert.match(app, /refreshVisitorStats/);
  assert.match(app, /if \(pcsSystemMode === "LIVE"\) void runSafeAsync\("auto dashboard refresh"/);
});
