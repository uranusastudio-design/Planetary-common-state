const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = name => fs.readFileSync(path.join(__dirname, name), "utf8");
const manager = read("deep-space.js");

test("focus uses measured usable viewport bounds and camera-scale fit", () => {
  assert.match(manager, /function usableViewportBounds\(\)/);
  assert.match(manager, /getBoundingClientRect\(\)/);
  assert.match(manager, /function viewportAdjustedCamera\(/);
  assert.match(manager, /CameraScale\.fitDistance\(\{radius,fovY,aspectRatio,margin\}\)/);
  assert.doesNotMatch(manager, /(?:focus|viewport)[\s\S]{0,80}(?:1920|390|\b320px\b)/i);
});

test("camera history is transactional and contains complete restore state", () => {
  for (const token of [
    "positionWC", "directionWC", "upWC", "rightWC", "transform",
    "frustum:frustumSnapshot()", "scaleName", "scaleIntent", "focusMode",
    "nearbySelected", "phase3Selected", "phase4Selected",
  ]) assert.ok(manager.includes(token), token);
  assert.match(manager, /const snapshot=cameraHistory\.at\(-1\)/);
  assert.match(manager, /if\(cameraHistory\.at\(-1\)\?\.id===snapshot\.id\)cameraHistory\.pop\(\)/);
  assert.match(manager, /cancel:\(\)=>\{if\(cameraFlight\?\.token===token\)cameraFlight=null/);
  assert.doesNotMatch(manager, /const snapshot=cameraHistory\.pop\(\)/);
});

test("blank-space return filters drill picks and rejects gestures", () => {
  assert.match(manager, /scene\.drillPick\(position,12,3,3\)/);
  assert.match(manager, /function selectablePick\(picked\)/);
  assert.match(manager, /if\(!selection\)\{const restored=restoreCameraHistory\(\)/);
  assert.match(manager, /moved\|\|pinchState\|\|performance\.now\(\)<suppressBlankUntil/);
  assert.match(manager, /Math\.hypot\([\s\S]{0,140}>6/);
  assert.match(manager, /handleSceneClick\(\{position:new Cesium\.Cartesian2\(event\.clientX-rect\.left,event\.clientY-rect\.top\)\}\)/);
  assert.doesNotMatch(manager, /new Cesium\.ScreenSpaceEventHandler/);
});

test("wheel and pinch avoid GPU picking and interrupt flights cleanly", () => {
  assert.match(manager, /PointerNavigation\.viewPlaneAnchor/);
  assert.match(manager, /event\.ctrlKey\?"trackpad-pinch":"mouse-wheel"/);
  assert.match(manager, /interruptCameraFlight\("mobile-pinch"\)/);
  assert.match(manager, /viewer\.camera\.cancelFlight\(\)/);
  const navigation = manager.match(/function navigationAnchor\([\s\S]*?\n  \}/)?.[0] || "";
  assert.doesNotMatch(navigation, /scene\.pick|pickPosition|drillPick/);
});

test("camera hot path and lifecycle remain bounded", () => {
  const cosmicWeb = read("cosmic-web-layer.js");
  assert.match(cosmicWeb, /camera\.changed\.addEventListener\(\(\) => this\.updateLod\(false\)\)/);
  assert.match(cosmicWeb, /camera\.moveEnd\.addEventListener\(\(\) => this\.updateLod\(true\)\)/);
  assert.match(cosmicWeb, /this\.cameraMoveEndRemover\?\.\(\)/);
  assert.match(manager, /new ResizeObserver\(scheduleViewportResize\)/);
  assert.match(manager, /stopViewportResize\(\)/);
  assert.doesNotMatch(manager, /new Cesium\.Viewer|createElement\(["']canvas/);
});
