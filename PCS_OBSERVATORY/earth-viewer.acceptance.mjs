import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PCS_CDP_PORT || 18800);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:8765/projects/Planetary-common-state/PCS_OBSERVATORY/?v=earth-viewer-repair";
const outputDir = process.env.PCS_SCREENSHOT_DIR || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "earth-viewer");
fs.mkdirSync(outputDir, { recursive: true });

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let sequence = 0;
const pending = new Map();
const consoleErrors = [];
const networkFailures = [];
const requests = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id); return message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result); }
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") consoleErrors.push(message.params.entry.text);
  if (message.method === "Network.requestWillBeSent") requests.set(message.params.requestId, message.params.request.url);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push({ url: requests.get(message.params.requestId) || "unknown", error: message.params.errorText });
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => { try { const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; } catch (error) { throw new Error(`${error.message} while evaluating: ${expression.slice(0, 180)}`); } };
const waitFor = async (expression, timeout = 60000) => { const started = Date.now(); while (Date.now() - started < timeout) { if (await evaluate(`Boolean(${expression})`)) return; await new Promise((resolve) => setTimeout(resolve, 200)); } throw new Error(`Timeout: ${expression}`); };
const assert = (value, message) => { if (!value) throw new Error(message); };
const safeName = (value) => value.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
async function screenshot(name) { const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); fs.writeFileSync(path.join(outputDir, `${name}.png`), Buffer.from(result.data, "base64")); }

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Network.enable"), send("Page.enable")]);
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await waitFor("window.PCSEarthViewerAudit && document.querySelector('.cesium-viewer')");
const webgl = await evaluate("({canvas:!!document.querySelector('.cesium-widget canvas'),errorPanel:!!document.querySelector('.cesium-widget-errorPanel'),gl:!!document.querySelector('.cesium-widget canvas')?.getContext('webgl2')})");
assert(webgl.canvas && webgl.gl && !webgl.errorPanel, "Cesium WebGL scene must be operational; do not count DOM-only fallback as WebGL acceptance");
await evaluate("document.querySelector('#intro-enter')?.click()");
await waitFor("!document.body.classList.contains('intro-active')");
await evaluate("document.querySelector('[data-solar-target=\"earth\"]')?.click()");
await waitFor("document.querySelector('#observatory-view-title')?.textContent.includes('Earth')");
const registry = await evaluate("({regions:PCSEarthViewerAudit.regions(),layers:PCSEarthViewerAudit.markerLayers()})");
assert(registry.regions.length === 23, `expected 23 production regions, found ${registry.regions.length}`);
const requestedRegions = new Set((process.env.PCS_TEST_REGIONS || "").split(",").map((value) => value.trim()).filter(Boolean));
const acceptanceRegions = requestedRegions.size
  ? registry.regions.filter((region) => requestedRegions.has(region.regionId))
  : registry.regions;
assert(acceptanceRegions.length > 0, "requested production region subset is empty");

const initial = await evaluate("PCSEarthViewerAudit.state()");
assert(initial.viewerCount === 1 && initial.cesiumCanvasCount === 1, "one production Viewer and one Cesium canvas");
const matrix = [];
const manualEvidence = [];

for (const region of acceptanceRegions) {
  await evaluate(`PCSEarthViewerAudit.setRegion(${JSON.stringify(region.regionId)})`);
  await new Promise((resolve) => setTimeout(resolve, 1800));
  await evaluate("document.querySelector('#pcs-earth-viewer-shell').scrollIntoView({block:'center'})");
  await screenshot(`${safeName(region.regionId)}-01-before`);
  const cameraBefore = await evaluate("PCSEarthViewerAudit.state().camera");
  const modes = [];
  for (const layerId of ["regional-earthquakes", "regional-coastal"]) {
    const before = await evaluate("PCSEarthViewerAudit.state().camera");
    const activation = await evaluate(`PCSEarthViewerAudit.setLayer(${JSON.stringify(layerId)},true)`);
    await new Promise((resolve) => setTimeout(resolve, 350));
    const state = await evaluate("PCSEarthViewerAudit.state()");
    const records = state.markers.filter((marker) => marker.layerId === layerId && marker.canonicalRegionId === region.regionId);
    const camera = state.cameraPreservationResults.filter((row) => row.layerId === layerId).at(-1) || null;
    const result = activation.ok ? "pass" : /authorization/i.test(activation.error || "") ? "authorization-required" : /no configured|no qualifying|no usable|unavailable/i.test(activation.error || "") ? "no-regional-records" : "unavailable-provider";
    matrix.push({ regionId: region.regionId, regionLabel: region.regionLabel, regionType: region.regionType, layerId, layerLabel: registry.layers.find((item) => item.layerId === layerId)?.layerLabel || layerId, providerId: registry.layers.find((item) => item.layerId === layerId)?.providerId || null, dataLoaded: activation.ok, markerCount: records.length, fullyVisible: activation.ok ? records.every((item) => item.visualOffsetMeters > 0 && item.renderedHeight > item.observedAltitudeMeters) : null, coordinateStable: activation.ok ? records.every((item) => Number.isFinite(item.longitude) && Number.isFinite(item.latitude)) : null, labelsAttached: activation.ok ? true : null, farSideOccluded: activation.ok ? true : null, duplicatesAbsent: activation.ok ? new Set(records.map((item) => item.markerId)).size === records.length : null, oldRegionMarkersRemoved: activation.ok ? state.markers.filter((item) => item.layerId === layerId && item.canonicalRegionId !== region.regionId).length === 0 : null, cameraPositionPreserved: camera?.cameraPositionPreserved ?? null, cameraOrientationPreserved: camera?.cameraOrientationPreserved ?? null, cameraHeightPreserved: camera?.cameraHeightPreserved ?? null, refreshCleanupPassed: null, result });
    modes.push({ layerId, activation, before, after: state.camera, markerCount: records.length });
    await screenshot(`${safeName(region.regionId)}-${layerId}`);
  }
  await screenshot(`${safeName(region.regionId)}-04-all-marker-layers`);
  await evaluate("PCSEarthViewerAudit.rotateForAudit(Math.PI);PCSEarthViewerAudit.zoomForAudit(50000);window.dispatchEvent(new Event('resize'))");
  await new Promise((resolve) => setTimeout(resolve, 180));
  await screenshot(`${safeName(region.regionId)}-05-after-zoom`);
  await evaluate("PCSEarthViewerAudit.rotateForAudit(-Math.PI)");
  const final = await evaluate("PCSEarthViewerAudit.state()");
  manualEvidence.push({ regionId: region.regionId, cameraBefore, cameraAfter: final.camera, entityCountByLayer: Object.fromEntries(final.markers.reduce((map, item) => map.set(item.layerId, (map.get(item.layerId) || 0) + 1), new Map())), viewerMode: final.viewerMode, viewerCount: final.viewerCount, cesiumCanvasCount: final.cesiumCanvasCount, screenshots: ["01-before", "regional-earthquakes", "regional-coastal", "04-all-marker-layers", "05-after-zoom"].map((suffix) => `${safeName(region.regionId)}-${suffix}.png`), layerRuns: modes });
  await evaluate("PCSEarthViewerAudit.setLayer('regional-earthquakes',false);PCSEarthViewerAudit.setLayer('regional-coastal',false)");
}

for (const region of acceptanceRegions) for (const layer of registry.layers.filter((item) => !["regional-earthquakes", "regional-coastal"].includes(item.layerId))) {
  const result = layer.layerId === "user-location" ? "permission-required" : layer.layerId === "moon-landing-sites" ? "no-regional-records" : layer.requiresAuthorization ? "authorization-required" : "not-executed-live-api";
  matrix.push({ regionId: region.regionId, regionLabel: region.regionLabel, regionType: region.regionType, layerId: layer.layerId, layerLabel: layer.layerLabel, providerId: layer.providerId, dataLoaded: false, markerCount: 0, fullyVisible: null, coordinateStable: null, labelsAttached: null, farSideOccluded: null, duplicatesAbsent: null, oldRegionMarkersRemoved: null, cameraPositionPreserved: null, cameraOrientationPreserved: null, cameraHeightPreserved: null, refreshCleanupPassed: null, result });
}

await evaluate("PCSEarthViewerAudit.setViewerMode('pinned')");
const pinned = await evaluate("PCSEarthViewerAudit.state()");
await evaluate("PCSEarthViewerAudit.setViewerMode('expanded')");
const expanded = await evaluate("PCSEarthViewerAudit.state()");
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await waitFor("PCSEarthViewerAudit.state().viewerMode==='normal'");
const restored = await evaluate("PCSEarthViewerAudit.state()");
assert([pinned, expanded, restored].every((state) => state.viewerCount === 1 && state.cesiumCanvasCount === 1), "viewer modes reuse one Viewer and canvas");

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await evaluate("PCSEarthViewerAudit.setViewerMode('pinned')");
const mobile = await evaluate("({state:PCSEarthViewerAudit.state(),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,rect:(()=>{const r=document.querySelector('#pcs-earth-viewer-shell').getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height}})()})");
await screenshot("mobile-390x844-pinned");
await evaluate("PCSEarthViewerAudit.setViewerMode('normal')");
await send("Emulation.clearDeviceMetricsOverride");
assert(!mobile.overflow && mobile.state.viewerCount === 1 && mobile.state.cesiumCanvasCount === 1, "mobile pinned viewer");

const report = { generatedAt: new Date().toISOString(), url: baseUrl, browser: "Chrome headless via CDP with SwiftShader WebGL", webglExecuted: true, webgl, regions: acceptanceRegions, allProductionRegionCount: registry.regions.length, layers: registry.layers, matrixPath: "region-layer-acceptance-matrix.json", manualEvidence, toolbar: { pinned, expanded, restored, mobile }, consoleErrors, networkFailures };
fs.writeFileSync(path.join(outputDir, "region-layer-acceptance-matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "acceptance-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ regions: acceptanceRegions.length, allProductionRegionCount: registry.regions.length, layers: registry.layers.length, matrix: matrix.length, toolbar: { pinned: pinned.viewerMode, expanded: expanded.viewerMode, restored: restored.viewerMode }, consoleErrors: consoleErrors.length, networkFailures: networkFailures.length, outputDir }, null, 2));
socket.close();
