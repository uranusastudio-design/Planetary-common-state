import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFile} from "node:fs/promises";

const source = await readFile(new URL("./phase3-coordinates.js", import.meta.url), "utf8");
const context = {globalThis:{}};
vm.runInNewContext(source, context);
const C = context.globalThis.PCSPhase3Coordinates;
const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test("fixed Phase 3 frame is explicit and right-handed", () => {
  assert.equal(C.FRAME.id, "pcs-galactocentric-gravity2019-v2");
  assert.equal(C.FRAME.handedness, "right-handed");
  assert.deepEqual([...C.FRAME.sun], [-8.178, 0, 0.0208]);
  near(C.FRAME.galcenDistanceStatisticalUncertaintyKpc, 0.013);
  near(C.FRAME.galcenDistanceSystematicUncertaintyKpc, 0.022);
});

test("Galactic axes map to the documented Galactocentric orientation", () => {
  const centerLine = C.galacticToGalactocentric(0, 0, 8.178);
  near(centerLine[0], 0); near(centerLine[1], 0); near(centerLine[2], 0.0208);
  const yAxis = C.galacticToGalactocentric(90, 0, 1);
  near(yAxis[0], -8.178); near(yAxis[1], 1); near(yAxis[2], 0.0208);
  const north = C.galacticToGalactocentric(0, 90, 1);
  near(north[2], 1.0208);
});

test("ICRS Galactic-center direction is a sanity check, not an exact Sgr A* origin claim", () => {
  const result = C.icrsToGalactocentric(266.4051, -28.936175, 8.178);
  assert.ok(Math.hypot(result[0], result[1]) < 0.001);
  near(result[2], 0.0208, 0.001);
});

test("distance modulus, kpc-light-year and logarithmic spiral calculations are stable", () => {
  near(C.distanceModulusToKpc(25), 1000);
  near(C.KPC_TO_LY, 3261.563777);
  near(C.logarithmicSpiral(8, 0, 0, 12), 8);
  assert.ok(C.logarithmicSpiral(8, 1, 0, 12) > 8);
});

test("scene compression preserves direction and scientific coordinates remain linear", () => {
  assert.deepEqual(C.scenePosition([1, 2, 2], "scientific"), [1000000, 2000000, 2000000]);
  const compressed = C.scenePosition([1, 2, 2], "exhibition", "local-group");
  near(compressed[1] / compressed[0], 2);
  near(compressed[2] / compressed[0], 2);
  near(C.inverseSceneRadiusKpc(C.sceneRadiusKpc(18, "exhibition"), "exhibition"), 18);
  near(C.inverseSceneRadiusKpc(C.sceneRadiusKpc(18, "scientific"), "scientific"), 18);
});
