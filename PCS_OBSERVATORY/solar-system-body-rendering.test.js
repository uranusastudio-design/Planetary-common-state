const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = name => fs.readFileSync(path.join(__dirname, name), "utf8");
const manager = read("deep-space.js");
const cards = read("unified-object-card.js");

test("major bodies have FAR point, MID disc, and NEAR solid-sphere representations", () => {
  assert.match(manager, /point:\{pixelSize:entry\.type==="star"\?16:13/);
  assert.match(manager, /billboard:\{image:bodyDiscImage\(entry\)/);
  assert.match(manager, /ellipsoid:\{radii:new Cesium\.Cartesian3\(lod\.displayRadius/);
  assert.match(manager, /lodContract:"FAR point → MID resolved disc → NEAR solid sphere; overlapping distance bands"/);
});

test("physical and display radii remain distinct, explicit, and scientifically labelled", () => {
  for (const token of ["physicalRadius:lod.physicalRadius", "displayRadius:lod.displayRadius", "displayScaleMode:lod.displayScaleMode", "representative-display-scaling"]) assert.ok(manager.includes(token), token);
  assert.match(manager, /displayScaleMode=mode==="scientific"\?"physical-radius":"representative-display-scaling"/);
  for (const token of ["physicalRadius:valueOrNull(input.physicalRadius)", "displayRadius:valueOrNull(input.displayRadius)", "displayScaleMode:valueOrNull(input.displayScaleMode)", "Representative display scaling"]) assert.ok(cards.includes(token), token);
});

test("selected asteroid, TNO, dwarf planet, or comet cannot disappear", () => {
  assert.match(manager, /function ensureSelectedSmallBodyEntity\(record\)/);
  assert.match(manager, /point:\{pixelSize:16,color,outlineColor:Cesium\.Color\.WHITE,outlineWidth:2\}/);
  assert.match(manager, /ensureSelectedSmallBodyEntity\(record\)/);
  assert.match(manager, /deep-space-small-orbit-/);
  assert.match(manager, /Source-derived orbit arc; no invented trajectory/);
});

test("Deep Space uses only its clean primitive field and restores Earth skybox ownership", () => {
  assert.match(manager, /skyBox:viewer\.scene\.skyBox\?\.show/);
  assert.match(manager, /viewer\.scene\.skyBox\.show=false/);
  assert.match(manager, /viewer\.scene\.skyBox\.show=saved\.skyBox/);
});

test("closing Deep Space clears selected catalog state before a lifecycle reopen", () => {
  assert.match(manager, /setScaleControls\("solar"\);selected="sun";smallBodySelected=null;interstellarSelected=null;meteorSelected=null;nearbySelected=null;phase3Selected=null;phase4Selected=null;focusParent=null;closeObjectCard\(\)/);
  assert.match(manager, /if\(!active\|\|dataSource!==openedDataSource\)viewer\.dataSources\.remove\(added,true\)/);
});

test("Nearby and Phase 3 wheel zoom never resolve a Solar body radius", () => {
  assert.match(manager, /selectedRadius=scaleContext==="solar"\?\(interstellarSelected\?8000:smallBodySelected\?/);
});
