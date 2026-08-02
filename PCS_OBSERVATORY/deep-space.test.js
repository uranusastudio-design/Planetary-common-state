const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const root = __dirname;
const read = (name) => fs.readFileSync(`${root}/${name}`, "utf8");
const app = read("app.js");
const manager = read("deep-space.js");
const html = read("index.html");

function loadDataRuntime() {
  const window = {};
  const context = vm.createContext({ window, console, Date, Math, Object, RangeError, Number });
  ["deep-space-registry.js", "deep-space-ephemeris-cache.js", "deep-space-ephemeris.js"].forEach((name) => vm.runInContext(read(name), context));
  return window;
}

test("Deep Space preserves the single existing Cesium Viewer and adds no animation loop", () => {
  assert.equal((app.match(/new Cesium\.Viewer\(/g) || []).length, 1);
  assert.equal((manager.match(/new Cesium\.Viewer\(/g) || []).length, 0);
  assert.doesNotMatch(manager, /requestAnimationFrame|setInterval|setTimeout/);
  assert.match(manager, /viewer\.clock\.onTick\.addEventListener/);
  assert.match(manager, /tickRemover\(\)/);
});

test("the Phase 1 registry contains the Sun, eight planets, and exactly eleven satellites", () => {
  const { PCSDeepSpaceRegistry: registry } = loadDataRuntime();
  assert.equal(registry.PLANET_IDS.length, 8);
  assert.equal(registry.SATELLITE_IDS.length, 11);
  assert.deepEqual([...registry.PLANET_IDS], ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]);
  assert.equal(Object.keys(registry.BODY_REGISTRY).length, 20);
  Object.values(registry.BODY_REGISTRY).forEach((body) => {
    assert.ok(body.dataStatus);
    assert.ok(body.coordinateFrame);
    assert.ok(body.ephemerisSource);
    assert.ok(body.visualizationStatus);
  });
});

test("fallback positions solve non-circular inclined Keplerian orbits", () => {
  const runtime = loadDataRuntime();
  const state = runtime.PCSDeepSpaceEphemeris.getFallbackOrbitalState("mars", "2026-08-01T12:00:00Z");
  assert.equal(state.dataStatus, "approximate");
  assert.ok(state.heliocentricDistanceAu > 1.3 && state.heliocentricDistanceAu < 1.7);
  assert.notEqual(state.positionAu[2], 0);
  assert.match(state.notice, /not mission-navigation precision/i);
});

test("the cache is an explicit JPL vector and out-of-window epochs fall back honestly", () => {
  const runtime = loadDataRuntime();
  const cached = runtime.PCSDeepSpaceEphemeris.getBodyState("earth", "2026-08-01T00:00:00Z");
  const fallback = runtime.PCSDeepSpaceEphemeris.getBodyState("earth", "2026-09-01T00:00:00Z");
  assert.equal(cached.dataStatus, "ephemeris-derived");
  assert.match(cached.source, /JPL Horizons/);
  assert.equal(fallback.dataStatus, "approximate");
});

test("Phase 2 Gaia and Phase 3 catalog layers share one manager while Phase 4 remains unavailable", () => {
  assert.match(manager, /PCSNearbyStars/);
  assert.match(manager, /PCSMilkyWay/);
  assert.match(manager, /PCSLocalGroup/);
  assert.match(manager, /scaleContext="solar"/);
  assert.match(manager, /phase4:"Cosmic Web \/ Observable Universe — Available in Phase 4"/);
  assert.match(manager, /smallBodyProvider=Object\.freeze\(\{status:"unavailable",getObjects:\(\)=>Promise\.resolve\(\[\]\)/);
  assert.doesNotMatch(manager, /Math\.random|cosmicWebLayer|observableUniverseLayer/);
  assert.doesNotMatch(manager, /new Cesium\.Viewer|requestAnimationFrame|new Worker/);
});

test("Titania assets and metadata are not implemented or rewritten by Deep Space", () => {
  assert.doesNotMatch(manager, /titania-global-1440\.jpg|mission-imagery-registry/);
  assert.match(manager, /Known issue: mission texture has incomplete lower-hemisphere coverage/);
});

test("overlay is keyboard-modal, mobile-safe, and uses the existing language state", () => {
  assert.match(manager, /role="dialog" aria-modal="true"/);
  assert.match(manager, /event\.key==="Escape"/);
  assert.match(manager, /pcs:languagechange/);
  assert.match(manager, /global\.PCSI18n\?\.getLanguage/);
  assert.match(html, /deep-space\.css/);
});

test("Phase 3 interface vocabulary is complete in all four existing languages", () => {
  const phase3Copy = manager.match(/const PHASE3_COPY=Object\.freeze\(\{([\s\S]*?)\n  \}\);/)?.[1] || "";
  for (const key of ["milkyWay","galacticCenter","sagittarius","galacticDisk","galacticBar","spiralArms","magellanic","localGroup","catalogObservation","observationReconstruction","representative","uncertainty","reduced","retry","returnNearby","phase4"]) {
    assert.equal((phase3Copy.match(new RegExp(`${key}:`, "g")) || []).length, 4, `${key} must exist in four Phase 3 dictionaries`);
  }
  assert.match(manager, /data-ds-return-nearby/);
  assert.doesNotMatch(manager, /distanceKpc\?\?0/);
});

test("runtime translation rerenders stable scale contexts instead of caching localized Phase 3 titles", () => {
  assert.match(manager, /function renderScaleTitle\(\)/);
  assert.match(manager, /scaleContext==="milky-way"[\s\S]*p3\(\)\.milkyWay[\s\S]*p3\(\)\.galacticCenter/);
  assert.match(manager, /scaleContext==="local-group"[\s\S]*p3\(\)\.localGroup/);
  assert.match(manager, /function translate\(\)[\s\S]*renderScaleTitle\(\)/);
  assert.match(manager, /phase3Search\.placeholder=p3\(\)\.searchLabel/);
});

test("Phase 3 scales use the existing Deep Space state machine and cleanup path", () => {
  assert.match(manager, /let scaleContext="solar"/);
  for (const context of ["nearby", "milky-way", "local-group", "solar"]) assert.ok(manager.includes(`setScaleControls("${context}")`));
  assert.match(manager, /function clearScaleLayers\(\)\{nearbyLayer\?\.unload\(\);milkyWayLayer\?\.unload\(\);localGroupLayer\?\.unload\(\)/);
  assert.match(manager, /function close\(\)[\s\S]*milkyWayLayer\?\.dispose\(\)[\s\S]*localGroupLayer\?\.dispose\(\)/);
  assert.doesNotMatch(manager, /new Cesium\.Viewer|createElement\(["']canvas|requestAnimationFrame/);
});
