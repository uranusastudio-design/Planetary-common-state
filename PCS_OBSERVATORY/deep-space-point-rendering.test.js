const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const read = name => fs.readFileSync(path.join(root, name), "utf8");

test("human-rejected camera-motion trail runtime is fully absent", () => {
  const runtime = read("deep-space.js");
  const html = read("index.html");
  const layers = [read("nearby-stars.js"), read("milky-way-layer.js"), read("local-group-layer.js")];

  assert.equal(fs.existsSync(path.join(root, "deep-space-motion-streaks.js")), false);
  assert.equal(fs.existsSync(path.join(root, "deep-space-motion-streaks.test.js")), false);
  assert.equal(fs.existsSync(path.join(root, "motion-streaks.acceptance.mjs")), false);
  assert.equal(fs.existsSync(path.join(root, "docs", "DEEP_SPACE_MOTION_STREAKS.md")), false);

  for (const source of [runtime, html, ...layers]) {
    assert.doesNotMatch(source, /motionStreak|motion-streak|data-ds-motion-streak|pcs:deep-space-navigation/i);
  }
  assert.doesNotMatch(runtime, /postRender\.addEventListener|requestAnimationFrame/);
  assert.doesNotMatch(layers[1], /pointRecords/);
  assert.doesNotMatch(layers[2], /pointRecords/);
  assert.match(runtime, /viewer\.scene\.skyBox\.show=false/);
  assert.match(runtime, /viewer\.scene\.skyBox\.show=saved\.skyBox/);
});

test("normal catalog point rendering and selection identities remain intact", () => {
  const nearby = read("nearby-stars.js");
  const milkyWay = read("milky-way-layer.js");
  const localGroup = read("local-group-layer.js");
  const runtime = read("deep-space.js");

  assert.match(nearby, /new Cesium\.PointPrimitiveCollection\(\)/);
  assert.match(nearby, /id:\{nearbyStar:record\}/);
  assert.match(milkyWay, /new Cesium\.PointPrimitiveCollection\(\)/);
  assert.match(milkyWay, /phase3Object:record/);
  assert.match(localGroup, /new Cesium\.PointPrimitiveCollection\(\)/);
  assert.match(localGroup, /phase3Object:record/);
  assert.match(runtime, /function selectablePick\(picked\)/);
  assert.match(runtime, /candidate\.nearbyStar/);
  assert.match(runtime, /candidate\.phase3Object/);
  assert.match(runtime, /scene\.drillPick/);
});

test("v2.2.0 history records removal and exposes no active trail roadmap item", () => {
  const registry = JSON.parse(read("data/releases.json"));
  const current = registry.releases.find(item => item.version === "v2.2.0");
  const text = JSON.stringify(current);

  assert.match(text, /has been removed|已移除|削除済み|제거되었습니다/);
  assert.equal(registry.roadmap.some(item => /motion-streak/i.test(item.id)), false);
  assert.equal(registry.latestAdditions.some(item => /Motion Streak/i.test(item.title)), false);
  assert.equal(current.assets.some(item => /Motion Streak/i.test(item)), false);
  assert.equal(current.documentation.some(item => /Motion Streak/i.test(item.label)), false);
});
