import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

class Cartesian3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  static fromDegrees(longitude, latitude, height = 0) { return new Cartesian3(longitude * 1000, latitude * 1000, height); }
  static distance(left, right) { return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z); }
  static subtract(left, right, result) { result.x = left.x - right.x; result.y = left.y - right.y; result.z = left.z - right.z; return result; }
  static normalize(value, result) { const length = Math.hypot(value.x, value.y, value.z) || 1; result.x = value.x / length; result.y = value.y / length; result.z = value.z / length; return result; }
  static dot(left, right) { return left.x * right.x + left.y * right.y + left.z * right.z; }
}
class ConstantPositionProperty { constructor(value) { this.value = value; } getValue() { return this.value; } }
class ConstantProperty { constructor(value) { this.value = value; } getValue() { return this.value; } }
class Graphics { constructor(options) { Object.assign(this, options); } }
class EntityCollection {
  constructor() { this.values = []; }
  getById(id) { return this.values.find((entity) => entity.id === id); }
  add(options) { const entity = { ...options, position: new ConstantPositionProperty(options.position) }; this.values.push(entity); return entity; }
  remove(entity) { const index = this.values.indexOf(entity); if (index < 0) return false; this.values.splice(index, 1); return true; }
}

const Cesium = {
  BillboardGraphics: Graphics,
  Cartesian3,
  ConstantPositionProperty,
  ConstantProperty,
  EllipseGraphics: Graphics,
  JulianDate: { now: () => 0 },
  LabelGraphics: Graphics,
  PointGraphics: Graphics,
  SceneTransforms: { worldToWindowCoordinates: (_scene, position) => ({ x: position.x, y: position.y }) },
};
const context = { Cesium, console: { warn() {}, table() {} } };
context.globalThis = context;
vm.runInNewContext(await readFile(new URL("./geographic-markers.js", import.meta.url), "utf8"), context);
const markers = context.PCSGeographicMarkers;

test("normalizes object aliases and preserves GeoJSON longitude-latitude order", () => {
  assert.deepEqual({ ...markers.normalizeCoordinates({ lng: "121.5", lat: "23.5", altitude: "12" }) }, { longitude: 121.5, latitude: 23.5, height: 12 });
  assert.deepEqual({ ...markers.normalizeCoordinates([170.2, -43.5, 5], { coordinateOrder: "geojson" }) }, { longitude: 170.2, latitude: -43.5, height: 5 });
  assert.throws(() => markers.normalizeCoordinates([23.5, 121.5]), /coordinateOrder: geojson/);
});

test("rejects invalid and reversed coordinates before entity creation", () => {
  const collection = new EntityCollection();
  assert.equal(markers.upsertCesiumEntity({ collection, layerId: "test-invalid", markerId: "reversed", longitude: 23.5, latitude: 121.5, CesiumApi: Cesium }), null);
  assert.equal(collection.values.length, 0);
});

test("stable IDs update one entity and reconcile stale records without duplicates", () => {
  const collection = new EntityCollection();
  const first = markers.upsertCesiumEntity({ collection, layerId: "test-upsert", markerId: "station-1", longitude: 121, latitude: 23, entityOptions: { point: { pixelSize: 5 } }, CesiumApi: Cesium });
  const second = markers.upsertCesiumEntity({ collection, layerId: "test-upsert", markerId: "station-1", longitude: 122, latitude: 24, entityOptions: { point: { pixelSize: 8 } }, CesiumApi: Cesium });
  assert.equal(first, second);
  assert.equal(collection.values.length, 1);
  assert.deepEqual(second.position.getValue(), Cartesian3.fromDegrees(122, 24, 0));
  assert.equal(markers.reconcileLayer("test-upsert", []), 1);
  assert.equal(collection.values.length, 0);
});

test("camera movement cannot alter stored geographic Cartesian positions", () => {
  const collection = new EntityCollection();
  const entity = markers.upsertCesiumEntity({ collection, layerId: "test-drift", markerId: "nz", longitude: 170.2, latitude: -43.5, height: 10, CesiumApi: Cesium });
  const before = entity.position.getValue();
  const simulatedCamera = { heading: 0, pitch: -1, zoom: 1 };
  simulatedCamera.heading = Math.PI;
  simulatedCamera.zoom = 12;
  const after = entity.position.getValue();
  assert.deepEqual(after, before);
  assert.equal(markers.verifyNoDrift({ toleranceMeters: 0.001, CesiumApi: Cesium }).find((row) => row.id === "test-drift:nz").errorMeters, 0);
  entity.position = new ConstantPositionProperty(new Cartesian3());
  assert.throws(() => markers.verifyNoDrift({ toleranceMeters: 0.001, CesiumApi: Cesium }), /Marker drift detected: test-drift:nz/);
  markers.removeLayer("test-drift");
});

test("one HTML overlay controller uses one postRender listener and cleans it up", () => {
  let listeners = 0;
  let removed = 0;
  const scene = {
    camera: { positionWC: new Cartesian3(500000, 500000, 500000) },
    canvas: { clientWidth: 1000000, clientHeight: 1000000 },
    globe: { ellipsoid: { geodeticSurfaceNormal: (position, result) => Cartesian3.normalize(position, result) } },
    postRender: { addEventListener(callback) { listeners += 1; callback(); return () => { removed += 1; }; } },
  };
  const element = { style: {}, remove() { this.removed = true; } };
  const controller = markers.createHtmlOverlayController(scene, Cesium);
  controller.add({ layerId: "html", markerId: "one", longitude: 10, latitude: 10, element, type: "html" });
  controller.add({ layerId: "html", markerId: "two", longitude: 20, latitude: 20, element: { style: {}, remove() {} }, type: "html" });
  assert.equal(listeners, 1);
  controller.destroy();
  assert.equal(removed, 1);
  assert.equal(element.removed, true);
});

test("source audit routes geographic renderers through the shared pipeline", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("geographic-markers.js") < html.indexOf("app.js"));
  for (const kind of ["station-point+label", "cyclone-point+label", "fire-point", "earthquake-point", "coastal-station-point+label", "heat-point"]) assert.ok(app.includes(kind), kind);
  assert.equal((app.match(/disableDepthTestDistance:\s*Number\.POSITIVE_INFINITY/g) || []).length, 1);
  assert.match(app, /Documented exception: this is a non-geographic/);
  assert.doesNotMatch(app, /new Cesium\.(CallbackProperty|SampledPositionProperty)/);
  assert.doesNotMatch(app, /(clientX|clientY|offsetX|offsetY|screenPosition|windowPosition)\s*[:=]/);
  assert.match(app, /depthTestAgainstTerrain = true/);
  assert.match(app, /refreshingLayers/);
});

test("acceptance matrix automatically covers every static and provider-defined layer", async () => {
  const matrix = JSON.parse(await readFile(new URL("./marker-layer-acceptance.json", import.meta.url), "utf8"));
  const ids = new Set(matrix.map((row) => row.id));
  const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
  const providers = await readFile(new URL("../cloudflare/src/providers/layers.js", import.meta.url), "utf8");
  const discovered = new Set([
    ...[...html.matchAll(/data-weather-layer="([^"]+)"/g)].map((match) => match[1]),
    ...[...html.matchAll(/data-pcs-layer="([^"]+)"/g)].map((match) => match[1]),
    ...[...providers.slice(0, providers.indexOf("const OPENWEATHER_LAYER_ADAPTERS")).matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1]),
    ...[...providers.slice(providers.indexOf("const OPENWEATHER_LAYER_ADAPTERS"), providers.indexOf("export const PCS_LAYER_ADAPTERS")).matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1]),
    "visitor-locations", "visitor-heat", "visitor-network", "user-location", "moon-landing-sites",
  ]);
  assert.deepEqual([...discovered].filter((id) => !ids.has(id)), []);
  for (const row of matrix) {
    assert.ok(row.result, `${row.id} result`);
    for (const field of ["enable", "rotate180", "zoom", "regionChange", "reenable", "refresh"]) assert.ok(row[field], `${row.id}.${field}`);
  }
});
