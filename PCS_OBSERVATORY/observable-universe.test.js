const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = __dirname;
const base = path.join(root, "assets/deep-space/phase-4e");
const bundle = JSON.parse(fs.readFileSync(path.join(base, "observable-universe.json")));
const contract = JSON.parse(fs.readFileSync(path.join(base, "source-contract.json")));
const sha = (name) => crypto.createHash("sha256").update(fs.readFileSync(path.join(base, "raw", name))).digest("hex");

test("Phase 4E source snapshots and Planck18 calculation table are locked", () => {
  for (const [name, expected] of Object.entries(contract.rawChecksums)) assert.equal(sha(name), expected);
  assert.equal(bundle.model.id, "pcs-observable-universe-planck18-table-v1");
  assert.equal(bundle.model.ageGyr, 13.786885302009708);
  assert.equal(bundle.horizons.find((record) => record.id.endsWith("particle")).comovingMpc, 14165.16703226946);
  assert.equal(bundle.horizons.find((record) => record.id.endsWith("last-scattering")).comovingMpc, 13884.382223236);
  assert.deepEqual({ landmarks: bundle.catalogLandmarks.length, epochs: bundle.epochMarkers.length, horizons: bundle.horizons.length }, { landmarks: 2, epochs: 6, horizons: 2 });
});

test("catalog observations and model-derived quantities remain distinct", () => {
  for (const record of bundle.catalogLandmarks) {
    assert.match(record.observationStatus, /^Catalog Observation/);
    assert.match(record.dataStatus, /model-derived distance and age/);
    assert.ok(record.redshift > 13 && record.redshift < 15);
    assert.equal(record.positionIcrsComovingMpc.length, 3);
    assert.ok(Math.abs(Math.hypot(...record.positionIcrsComovingMpc) - record.comovingMpc) < 1e-5);
  }
  for (const record of [...bundle.epochMarkers, ...bundle.horizons]) assert.match(record.dataStatus, /^Model-derived Measurement/);
  assert.match(bundle.coverage.highRedshift, /Two JADES literature landmarks only/);
  assert.match(bundle.coverage.cmb, /No CMB anisotropy map/);
  assert.match(bundle.context.visualizationStatus, /not an external view/);
});

test("Phase 4E renderer uses representative geometry without fabricated all-sky matter or CMB", () => {
  const runtime = fs.readFileSync(path.join(root, "observable-universe-layer.js"), "utf8");
  assert.match(runtime, /PolylineCollection/);
  assert.match(runtime, /PointPrimitiveCollection/);
  assert.match(runtime, /LabelCollection/);
  assert.match(runtime, /camera\.changed\.addEventListener/);
  assert.match(runtime, /this\.cameraRemover\?\.\(\)/);
  assert.match(runtime, /allSkyFill: false/);
  assert.match(runtime, /cmbMapLoaded: false/);
  assert.doesNotMatch(runtime, /Math\.random|new Cesium\.Viewer|createElement\(["']canvas|requestAnimationFrame|SingleTileImageryProvider|ImageMaterialProperty/);
});

test("Phase 4E reuses the one Deep Space state, search, card, and canvas", () => {
  const manager = fs.readFileSync(path.join(root, "deep-space.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const card = fs.readFileSync(path.join(root, "unified-object-card.js"), "utf8");
  assert.match(html, /observable-universe-layer\.js\?v=phase-4e/);
  assert.match(manager, /const ObservableUniverse = global\.PCSObservableUniverse/);
  assert.match(manager, /function enterObservableUniverse\(/);
  assert.match(manager, /setScaleControls\("observable-universe"\)/);
  assert.match(manager, /observableUniverseLayer\?\.unload\(\)/);
  assert.match(manager, /observableUniverseLayer\?\.dispose\(\)/);
  assert.match(manager, /ObjectCard\.phase4e\(record\)/);
  assert.match(manager, /enterObservableUniverse,returnSolar/);
  assert.match(card, /function phase4e\(record\)/);
  assert.match(card, /phase4d,phase4e,render/);
  assert.doesNotMatch(manager, /new Cesium\.Viewer|createElement\(["']canvas|requestAnimationFrame|Math\.random/);
});

test("Phase 4E keeps the inner Phase 4D survey and unloads nested camera state in reverse order", () => {
  const manager = fs.readFileSync(path.join(root, "deep-space.js"), "utf8");
  const enter = manager.match(/async function enterObservableUniverse[\s\S]*?\n  function selectPhase4/)?.[0] || "";
  assert.match(enter, /cosmicWebCatalog\.load\(\)/);
  assert.match(enter, /cosmicWebLayer\.load\(cosmicWebCatalog,mode\)/);
  assert.match(enter, /observableUniverseLayer\.load\(observableUniverseCatalog,mode\)/);
  const clear = manager.match(/function clearScaleLayers\(\)\{([^}]*)\}/)?.[1] || "";
  assert.ok(clear.indexOf("observableUniverseLayer?.unload()") < clear.indexOf("cosmicWebLayer?.unload()"));
});

test("Phase 4E interface and scientific warning exist in all four runtime languages", () => {
  const manager = fs.readFileSync(path.join(root, "deep-space.js"), "utf8");
  const copy = manager.match(/const PHASE4E_COPY=Object\.freeze\(\{([\s\S]*?)\n  \}\);/)?.[1] || "";
  for (const key of ["observableUniverse", "loading", "searchLabel", "notice", "catalog", "epochs", "horizons", "guides", "coverage", "returnCosmicWeb"]) {
    assert.equal((copy.match(new RegExp(`${key}:`, "g")) || []).length, 4, `${key} must exist in four Phase 4E dictionaries`);
  }
  assert.match(copy, /not an external view of the whole Universe/);
  assert.match(copy, /未觀測方向保持空白/);
  assert.match(copy, /Phase 4E は CMB マップ/);
});
