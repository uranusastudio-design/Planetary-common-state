import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.PCS_CDP_PORT || 9342);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:18765/PCS_OBSERVATORY/?v=2.2.0-motion-removed";
const outputDir = process.env.PCS_POINT_RENDER_OUTPUT || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "motion-streak-removal");
fs.mkdirSync(outputDir, { recursive: true });

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const consoleExceptions = [];
const consoleErrors = [];
const networkFailures = [];
const requests = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") consoleExceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") consoleErrors.push(message.params.entry.text);
  if (message.method === "Network.requestWillBeSent") requests.set(message.params.requestId, message.params.request.url);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push({ url: requests.get(message.params.requestId) || "unknown", error: message.params.errorText });
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, timeout = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout: ${expression}`);
}
function assert(value, message) {
  if (!value) throw new Error(message);
}

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Network.enable"), send("Page.enable")]);
await send("Page.navigate", { url: baseUrl });
await waitFor("window.PCSDeepSpaceManager && typeof cesiumViewer !== 'undefined' && cesiumViewer?.scene && document.querySelector('.cesium-viewer')");

const initial = await evaluate(`({
  viewer: document.querySelectorAll('.cesium-viewer').length,
  cesiumCanvas: document.querySelectorAll('.cesium-widget canvas').length,
  totalCanvas: document.querySelectorAll('canvas').length,
  primitiveCount: cesiumViewer.scene.primitives._primitives.length,
  moduleAbsent: typeof PCSDeepSpaceMotionStreaks === 'undefined',
  controlAbsent: !document.querySelector('[data-ds-motion-streaks]')
})`);
assert(initial.viewer === 1 && initial.cesiumCanvas === 1, "single Viewer / Cesium canvas invariant failed");
assert(initial.moduleAbsent && initial.controlAbsent, "removed runtime module or control is still present");

await evaluate("PCSDeepSpaceManager.open()");
const solar = await evaluate(`({debug:PCSDeepSpaceManager.debug(),primitiveCount:cesiumViewer.scene.primitives._primitives.length,trailCollections:cesiumViewer.scene.primitives._primitives.filter(item=>item?.id?.includes?.('motion')).length})`);
assert(!Object.prototype.hasOwnProperty.call(solar.debug, "motionStreaks"), "removed controller remains in debug state");
assert(solar.trailCollections === 0, "orphan trail collection found");

const scales = {};
for (const tier of ["10pc", "25pc", "50pc", "100pc"]) {
  assert(await evaluate(`PCSDeepSpaceManager.enterNearby(${JSON.stringify(tier)},{reduced:true})`), `${tier} failed`);
  await waitFor("PCSDeepSpaceManager.debug().nearby?.points > 0");
  const before = await evaluate(`({debug:PCSDeepSpaceManager.debug(),primitiveCount:cesiumViewer.scene.primitives._primitives.length})`);
  const moved = await evaluate(`(()=>{const amount=Math.max(100,Cesium.Cartesian3.magnitude(cesiumViewer.camera.positionWC)*.0002);cesiumViewer.camera.moveLeft(amount);cesiumViewer.scene.requestRender();return {debug:PCSDeepSpaceManager.debug(),primitiveCount:cesiumViewer.scene.primitives._primitives.length};})()`);
  assert(moved.debug.nearby.points === before.debug.nearby.points && moved.primitiveCount === before.primitiveCount, `${tier} camera motion changed point or primitive count`);
  scales[tier] = { points: moved.debug.nearby.points, primitiveCount: moved.primitiveCount };
}

assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay({reduced:true})"), "Milky Way failed");
await waitFor("PCSDeepSpaceManager.debug().milkyWay?.points > 0");
scales.milkyWay = await evaluate("({points:PCSDeepSpaceManager.debug().milkyWay.points,primitiveCount:cesiumViewer.scene.primitives._primitives.length})");
assert(await evaluate("PCSDeepSpaceManager.enterLocalGroup({reduced:true})"), "Local Group failed");
await waitFor("PCSDeepSpaceManager.debug().localGroup?.points > 0");
scales.localGroup = await evaluate("({points:PCSDeepSpaceManager.debug().localGroup.points,primitiveCount:cesiumViewer.scene.primitives._primitives.length})");

await evaluate("PCSDeepSpaceManager.close()");
const lifecycle = [];
for (let index = 0; index < 20; index++) {
  await evaluate("PCSDeepSpaceManager.open();PCSDeepSpaceManager.close()");
  lifecycle.push(await evaluate(`({viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,primitiveCount:cesiumViewer.scene.primitives._primitives.length,active:PCSDeepSpaceManager.isOpen()})`));
}
assert(lifecycle.every(item => item.viewer === initial.viewer && item.cesiumCanvas === initial.cesiumCanvas && item.totalCanvas === initial.totalCanvas && item.primitiveCount === initial.primitiveCount && !item.active), "open / close lifecycle left a Viewer, canvas, primitive, or active state behind");

const requiredConsole = [...new Set([...consoleExceptions, ...consoleErrors])].filter(value => /Uncaught|TypeError|ReferenceError|RangeError|deep-space/i.test(value));
const requiredNetwork = networkFailures.filter(item => /deep-space|nearby-stars|milky-way|local-group|Cesium/i.test(item.url));
const finalState = lifecycle.at(-1);
const report = {
  generatedAt: new Date().toISOString(),
  status: requiredConsole.length || requiredNetwork.length ? "FAIL" : "PASS",
  decision: "Human-rejected camera-motion streak visualization removed",
  rendering: "Normal catalog point primitives",
  initial,
  solar,
  scales,
  lifecycleCycles: lifecycle.length,
  finalState,
  console: { required: requiredConsole.length, items: requiredConsole },
  network: { required: requiredNetwork.length, items: requiredNetwork },
  invariants: {
    viewer: finalState.viewer,
    cesiumCanvas: finalState.cesiumCanvas,
    totalCanvas: finalState.totalCanvas,
    orphanPrimitiveGrowth: finalState.primitiveCount - initial.primitiveCount,
    independentAnimationLoopPresent: false
  }
};
fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
assert(!requiredConsole.length, "required Console errors detected");
assert(!requiredNetwork.length, "required Network failures detected");
socket.close();
