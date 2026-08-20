import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PCS_CDP_PORT || 18800);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:8765/projects/Planetary-common-state/PCS_OBSERVATORY/?v=main-panel-layout-1";
const outputDir = process.env.PCS_SCREENSHOT_DIR || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "main-panel-layout");
fs.mkdirSync(outputDir, { recursive: true });

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const runtimeErrors = [];
const resourceErrors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const item = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") runtimeErrors.push(message.params.args.map((argument) => argument.description || argument.value || "console error").join(" "));
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") resourceErrors.push({ text: message.params.entry.text, url: message.params.entry.url || null });
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, includeCommandLineAPI: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression, timeout = 60000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timeout: ${expression}`);
};
const assert = (value, message) => { if (!value) throw new Error(message); };
const rectScript = (selector) => `(()=>{const r=document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null})()`;

async function capture(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(outputDir, name), Buffer.from(result.data, "base64"));
}

async function clickElement(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'center'})`);
  await new Promise((resolve) => setTimeout(resolve, 180));
  const rect = await evaluate(rectScript(selector));
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Page.enable")]);
await waitFor("window.PCSMainPanelLayoutAudit && window.PCSEarthViewerAudit && document.querySelector('.cesium-widget canvas') && document.querySelector('[data-solar-target=\"deep-space\"][aria-pressed]')");
const webgl = await evaluate("({canvas:Boolean(document.querySelector('.cesium-widget canvas')),context:Boolean(document.querySelector('.cesium-widget canvas')?.getContext('webgl2')),errorPanel:Boolean(document.querySelector('.cesium-widget-errorPanel'))})");
assert(webgl.canvas && webgl.context && !webgl.errorPanel, "Cesium WebGL context must be operational; DOM fallback is not accepted");
await evaluate("document.querySelector('#intro-enter')?.click()");
await waitFor("!document.body.classList.contains('intro-active')");

const viewports = [
  { width: 1920, height: 1080, screenshot: "1920-desktop.png" },
  { width: 1728, height: 1117 },
  { width: 1440, height: 900, screenshot: "1440-desktop.png" },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 390, height: 844, mobile: true, screenshot: "390-mobile.png" }
];

const results = [];
for (const viewport of viewports) {
  await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: Boolean(viewport.mobile), screenWidth: viewport.width, screenHeight: viewport.height });
  await evaluate("window.dispatchEvent(new Event('resize'));document.querySelector('.dashboard-layout').scrollIntoView({block:'start'})");
  await new Promise((resolve) => setTimeout(resolve, 350));
  const geometry = await evaluate(`({
    viewport:{width:document.documentElement.clientWidth,height:document.documentElement.clientHeight},
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    workspace:${rectScript(".observatory-shell")},
    dashboard:${rectScript(".dashboard-layout")},
    stage:${rectScript(".model-stage")},
    globe:${rectScript("#cesium-globe")},
    canvas:${rectScript(".cesium-widget canvas")},
    analysis:${rectScript(".analysis-alert-center")},
    lab:${rectScript(".model-literature-lab")},
    inspector:${rectScript(".secondary-inspector")},
    canvasCount:document.querySelectorAll('.cesium-widget canvas').length,
    viewerCount:document.querySelectorAll('.cesium-viewer').length,
    layout:PCSMainPanelLayoutAudit.state()
  })`);
  const centerDelta = Math.abs((geometry.workspace.left + geometry.workspace.right) / 2 - geometry.viewport.width / 2);
  assert(!geometry.overflow, `${viewport.width}x${viewport.height}: horizontal overflow`);
  assert(centerDelta <= 2, `${viewport.width}x${viewport.height}: workspace not centered (${centerDelta}px)`);
  assert(geometry.stage.width >= geometry.analysis.width, `${viewport.width}x${viewport.height}: stage narrower than analysis`);
  assert(geometry.globe.height >= (viewport.mobile ? 350 : 510), `${viewport.width}x${viewport.height}: globe stage compressed`);
  assert(geometry.canvasCount === 1 && geometry.viewerCount === 1, `${viewport.width}x${viewport.height}: production Cesium instance count changed`);
  assert(Math.abs(geometry.canvas.width - geometry.globe.width) <= 2, `${viewport.width}x${viewport.height}: canvas width is not container responsive`);
  if (viewport.width <= 1100) {
    assert(geometry.stage.top <= geometry.analysis.top && geometry.analysis.top <= geometry.lab.top && geometry.lab.top <= geometry.inspector.top, `${viewport.width}x${viewport.height}: responsive region order is incorrect`);
  }
  results.push({ ...viewport, centerDelta, geometry });
  if (viewport.screenshot) await capture(viewport.screenshot);
}

await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false, screenWidth: 1920, screenHeight: 1080 });
await evaluate("PCSEarthViewerAudit.setViewerMode('pinned')");
await waitFor("PCSEarthViewerAudit.state().viewerMode === 'pinned'");
const pinnedViewer = await evaluate("PCSEarthViewerAudit.state()");
await evaluate("PCSEarthViewerAudit.setViewerMode('expanded')");
await waitFor("PCSEarthViewerAudit.state().viewerMode === 'expanded'");
const expandedViewer = await evaluate("PCSEarthViewerAudit.state()");
await evaluate("PCSEarthViewerAudit.setViewerMode('normal')");
await waitFor("PCSEarthViewerAudit.state().viewerMode === 'normal'");
const restoredViewer = await evaluate("PCSEarthViewerAudit.state()");
assert([pinnedViewer, expandedViewer, restoredViewer].every((state) => state.viewerCount === 1 && state.cesiumCanvasCount === 1), "Earth viewer toolbar modes changed the production renderer count");

await evaluate("PCSMainPanelLayoutAudit.activateTab('external-papers')");
const literatureRelocation = await evaluate("document.querySelector('[data-research-mount=\"external-papers\"] > #pcs-daily-brief') !== null");
assert(literatureRelocation, "existing literature feed was not relocated into External Papers");
await evaluate("PCSMainPanelLayoutAudit.activateTab('pcs-model')");
const modelRelocation = await evaluate("document.querySelector('[data-research-mount=\"pcs-model\"] > #satellite-observation-panel') !== null");
assert(modelRelocation, "existing model metadata was not relocated into PCS Model");

await clickElement('[data-solar-target="deep-space"]');
await waitFor("PCSDeepSpaceManager.isOpen() && !document.querySelector('.deep-space-overlay').hidden");
const deepSpace = await evaluate("({open:PCSDeepSpaceManager.isOpen(),canvasCount:document.querySelectorAll('.cesium-widget canvas').length})");
assert(deepSpace.open && deepSpace.canvasCount === 1, "Deep Space overlay changed renderer ownership");
await evaluate("PCSDeepSpaceManager.close()");
await waitFor("!PCSDeepSpaceManager.isOpen() && document.querySelector('#pcs-earth-viewer-shell .cesium-widget canvas')");
await clickElement('[data-solar-target="mars"]');
await waitFor("document.querySelector('#observatory-view-title').textContent.includes('Mars')");
await clickElement('[data-solar-target="earth"]');
await waitFor("!PCSDeepSpaceManager.isOpen() && document.querySelector('#observatory-view-title').textContent.includes('Earth')");
const earth = await evaluate("({title:document.querySelector('#observatory-view-title').textContent,viewer:PCSEarthViewerAudit.state()})");
assert(earth.viewer.viewerCount === 1 && earth.viewer.cesiumCanvasCount === 1, "Earth route did not preserve the production renderer");
const externalServiceErrors = runtimeErrors.filter((error) => /Failed to fetch|ERR_CONNECTION_REFUSED/.test(error));
const unexpectedRuntimeErrors = runtimeErrors.filter((error) => !externalServiceErrors.includes(error));
assert(unexpectedRuntimeErrors.length === 0, `Unexpected JavaScript runtime errors: ${JSON.stringify(unexpectedRuntimeErrors)}`);

const report = {
  generatedAt: new Date().toISOString(),
  url: baseUrl,
  checkpoint: "3e426f7df8a49bead87b51223f0501722863ca1c",
  webgl,
  viewports: results,
  interactions: { toolbar: { pinned: pinnedViewer.viewerMode, expanded: expandedViewer.viewerMode, restored: restoredViewer.viewerMode }, literatureRelocation, modelRelocation, deepSpace, earth },
  unexpectedRuntimeErrors,
  externalServiceErrors,
  resourceErrors
};
fs.writeFileSync(path.join(outputDir, "acceptance-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, viewports: results.map(({ width, height, centerDelta, geometry }) => ({ width, height, centerDelta, overflow: geometry.overflow, workspaceWidth: geometry.workspace.width, stageWidth: geometry.stage.width, globeHeight: geometry.globe.height, canvasCount: geometry.canvasCount })), interactions: report.interactions, unexpectedRuntimeErrors: unexpectedRuntimeErrors.length, externalServiceErrors: externalServiceErrors.length, resourceErrors: resourceErrors.length }, null, 2));
socket.close();
