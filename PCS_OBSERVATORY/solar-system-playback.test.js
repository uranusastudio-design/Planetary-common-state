const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Solar playback exposes provider-bounded fine and long-horizon controls", () => {
  const source = read("deep-space.js");
  assert.match(source, /MAX_PLAYBACK_DAYS_PER_SECOND=3652500/);
  assert.match(source, /data-ds-speed type="number"[^>]+max="\$\{MAX_PLAYBACK_DAYS_PER_SECOND\}"/);
  assert.match(source, /delta\*playbackDaysPerSecond\*SolarCore\.DAY_MS\/1000/);
  assert.match(source, /Math\.min\(now-lastTick,1000\)/);
  assert.match(source, /LongHorizon\.jdTdbToDisplayDate/);
  assert.match(source, /data-ds-step-years/);
  assert.match(source, /data-ds-custom-year/);
  assert.match(source, /paused=true;translate\(\)/);
});

test("crossing a playback day updates stable entities instead of rebuilding the Solar layer", () => {
  const source = read("deep-space.js");
  const updateStart = source.indexOf("function updatePositions()");
  const updateEnd = source.indexOf("const objectCardLanguage", updateStart);
  const update = source.slice(updateStart, updateEnd);
  assert.ok(updateStart > 0 && updateEnd > updateStart);
  assert.doesNotMatch(update, /renderAll\(/);
  assert.match(update, /scheduleEpoch\(epoch\)/);
  assert.match(update, /processEpochUpdate\(128\)/);
  assert.equal((source.match(/dataSource\.entities\.removeAll\(\)/g) || []).length, 2, "only explicit full render and scale cleanup may clear entities");
});

test("catalog epoch work is processed in bounded chunks without replacing point primitives", () => {
  class PointPrimitiveCollection {
    constructor() { this.items = []; this.removeAllCount = 0; }
    add(options) { this.items.push(options); return options; }
    removeAll() { this.removeAllCount += 1; this.items.length = 0; }
  }
  const Cesium = {
    PointPrimitiveCollection,
    Cartesian3: { magnitude: () => 10_000_000_000 },
    Color: { fromCssColorString: () => ({ withAlpha() { return this; } }) },
  };
  const core = {
    validDate: value => new Date(value),
    utcToJdTdb: value => 2451545 + (new Date(value).getTime() - Date.parse("2000-01-01T12:00:00Z")) / 86400000,
    timeConversionQuality: () => ({ status: "future-leap-second-unverified" }),
  };
  const record = index => ({ spkid: String(index), diameterKm: 10, elements: { e: .1, a: 2 + index / 10, i: 2, om: 30, w: 40, ma: 50, epochJdTdb: 2451545, meanMotionDegPerDay: .2 } });
  const window = {
    PCSSolarSystemCore: core,
    PCSSolarSystemSmallBodyDataset: { datasetId: "small", dwarfPlanets: [], dwarfEphemeris: { records: [] }, mainBelt: { lod: { far: 5 }, selection: {}, upstreamClassCount: 5 } },
  };
  const context = vm.createContext({ window, Cesium, Date, Math, Object, Map, Number, String, Boolean, Infinity });
  vm.runInContext(read("small-body-catalog.js"), context);
  window.PCSSolarSystemTnoDataset = { datasetId: "tno", lod: { far: 5 }, selection: {}, representativePopulation: false };
  vm.runInContext(read("tno-catalog.js"), context);
  const primitiveCollections = [];
  const viewer = {
    scene: { primitives: { add(value) { primitiveCollections.push(value); return value; }, remove() {} }, requestRender() {} },
    camera: { positionWC: {}, moveEnd: { addEventListener: () => () => {} } },
  };
  const records = Array.from({ length: 5 }, (_, index) => record(index + 1));
  for (const Layer of [window.PCSSmallBodies.MainBeltLayer, window.PCSTnoCatalog.TnoLayer]) {
    const layer = new Layer(viewer, state => state.positionAu);
    layer.load(records, "2026-08-09T00:00:00Z");
    const identities = [...layer.points];
    const removeAllCount = layer.collection.removeAllCount;
    layer.scheduleEpoch("2026-08-10T00:00:00Z");
    assert.equal(layer.processEpochUpdate(2), 2);
    assert.equal(layer.debug().epochUpdateCursor, 2);
    assert.equal(layer.processEpochUpdate(2), 2);
    assert.equal(layer.processEpochUpdate(2), 1);
    assert.equal(layer.debug().epochUpdatePending, false);
    assert.equal(layer.debug().completedEpochUpdates, 1);
    assert.equal(layer.collection.removeAllCount, removeAllCount);
    assert.ok(layer.points.every((point, index) => point === identities[index]));
  }
});

test("scientific scale and selection reframe targets while comet context reaches analysis", () => {
  const manager = read("deep-space.js");
  const app = read("app.js");
  const html = read("index.html");
  assert.match(manager, /else\{renderAll\(\);if\(smallBodySelected\|\|selected!=="sun"\)focusSelectedObject\(\);else setCamera\("inclined"\);\}/);
  assert.match(manager, /renderAll\(\);renderInfo\(\);focusSelectedObject\(\{history:false\}\)/);
  assert.match(manager, /function selectSmallBody\([\s\S]*?if\(options\.focus\)focusSelectedObject\(\{history:false\}\)/);
  assert.match(manager, /new CustomEvent\("pcs:analysis-context"/);
  assert.match(app, /addEventListener\("pcs:analysis-context"/);
  assert.match(app, /selectedScientificAnalysisContext = model/);
  assert.match(html, /id="scientific-analysis-context"/);
});
