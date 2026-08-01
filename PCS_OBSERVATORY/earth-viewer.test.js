import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./style.css", import.meta.url), "utf8");
const regional = await readFile(new URL("../cloudflare/src/regional.js", import.meta.url), "utf8");

const productionRegions = [...regional.matchAll(/^\s{2}([a-z_]+): profile\(/gm)].map((match) => match[1]);

test("production-derived region registry includes every Worker profile exactly once", () => {
  assert.equal(productionRegions.length, 23);
  assert.equal(new Set(productionRegions).size, productionRegions.length);
  for (const regionId of productionRegions) assert.match(app, new RegExp(`\\b${regionId}: \\{`), regionId);
  assert.match(app, /normalizedEarthRegionRegistry/);
  assert.match(app, /aliases: \[\]/);
});

test("active production geographic renderers use shared altitude and normal depth pipeline", () => {
  assert.match(app, /observedAltitudeMeters/);
  assert.match(app, /visualOffsetMeters/);
  assert.match(app, /visualOffsetForCamera/);
  assert.equal((app.match(/HeightReference\.CLAMP_TO_GROUND/g) || []).length, 0);
  assert.equal((app.match(/disableDepthTestDistance:\s*Number\.POSITIVE_INFINITY/g) || []).length, 1);
  assert.match(app, /Documented exception: this is a non-geographic/);
  assert.match(app, /depthTestAgainstTerrain = true/);
});

test("layer activation, removal and refresh record numeric camera preservation", () => {
  assert.match(app, /captureCameraState/);
  assert.match(app, /Cartesian3\.distance\(before\.positionWC, after\.positionWC\)/);
  assert.match(app, /cameraPositionPreserved/);
  assert.match(app, /cameraOrientationPreserved/);
  assert.match(app, /cameraHeightPreserved/);
  assert.match(app, /operationGeneration/);
});

test("toolbar is mounted around the actual production Cesium container", () => {
  const shell = html.indexOf('id="pcs-earth-viewer-shell"');
  const viewer = html.indexOf('id="cesium-globe"');
  assert.ok(shell > 0 && viewer > shell);
  for (const action of ["reset", "pin", "restore", "expand"]) assert.match(html, new RegExp(`data-earth-viewer-action="${action}"`));
  assert.match(app, /earthViewerMode = "normal"/);
  assert.match(app, /new ResizeObserver\(resizeEarthViewer\)/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(css, /data-earth-viewer-mode="pinned"/);
  assert.match(css, /data-earth-viewer-mode="expanded"/);
});

test("Earth viewer modes preserve the one production Viewer initialization", () => {
  assert.equal((app.match(/new Cesium\.Viewer\(/g) || []).length, 1);
  assert.equal((html.match(/id="cesium-globe"/g) || []).length, 1);
  assert.doesNotMatch(app, /new (THREE|WebGLRenderer)/);
});
