import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PCS_CDP_PORT || 18800);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:8765/projects/Planetary-common-state/PCS_OBSERVATORY/?v=panel-correction-2";
const outputDir = process.env.PCS_SCREENSHOT_DIR || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "panel-layout-correction");
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

async function captureViewport(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(outputDir, name), Buffer.from(result.data, "base64"));
}

async function captureElement(name, selector, padding = 12) {
  const clip = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect();return{x:Math.max(0,r.left+scrollX-${padding}),y:Math.max(0,r.top+scrollY-${padding}),width:Math.min(document.documentElement.scrollWidth,r.width+${padding * 2}),height:r.height+${padding * 2},scale:1}})()`);
  assert(clip, `Missing screenshot target: ${selector}`);
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
  fs.writeFileSync(path.join(outputDir, name), Buffer.from(result.data, "base64"));
}

async function clickElement(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'center'})`);
  await new Promise((resolve) => setTimeout(resolve, 180));
  const rect = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}})()`);
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Page.enable")]);
await waitFor("window.PCSMainPanelLayoutAudit && window.PCSEarthViewerAudit && document.querySelector('.cesium-widget canvas') && document.querySelector('[data-solar-target=\"deep-space\"][aria-pressed]')");
await evaluate("document.querySelector('#intro-enter')?.click()");
await waitFor("!document.body.classList.contains('intro-active')");

const webgl = await evaluate("({canvas:Boolean(document.querySelector('.cesium-widget canvas')),context:Boolean(document.querySelector('.cesium-widget canvas')?.getContext('webgl2')),errorPanel:Boolean(document.querySelector('.cesium-widget-errorPanel'))})");
assert(webgl.canvas && webgl.context && !webgl.errorPanel, "Cesium WebGL renderer is not operational");

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
  await evaluate("window.scrollTo(0,0);window.dispatchEvent(new Event('resize'))");
  await new Promise((resolve) => setTimeout(resolve, 450));
  const geometry = await evaluate(`(()=>{const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};return{
    viewport:{width:document.documentElement.clientWidth,height:document.documentElement.clientHeight},
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    dashboard:rect('.dashboard-layout'),left:rect('.left-column'),center:rect('.center-column'),right:rect('.right-column'),
    blue:rect('[data-layout-zone="blue"]'),red:rect('[data-layout-zone="red"]'),yellow:rect('[data-layout-zone="yellow"]'),
    redStyle:(()=>{const s=getComputedStyle(document.querySelector('[data-layout-zone="red"]'));return{width:s.width,maxWidth:s.maxWidth,marginLeft:s.marginLeft}})(),
    timeline:rect('.timeline-panel'),domains:rect('.domains-panel'),daily:rect('#pcs-daily-brief'),brand:rect('.pcs-brand-area'),
    canvasCount:document.querySelectorAll('.cesium-widget canvas').length,viewerCount:document.querySelectorAll('.cesium-viewer').length,
    audit:PCSMainPanelLayoutAudit.state(),
    parents:{satellite:document.querySelector('#satellite-observation-panel')?.parentElement?.className,daily:document.querySelector('#pcs-daily-brief')?.parentElement?.className,visitor:document.querySelector('.visitor-network-panel')?.parentElement?.className}
  }})()`);

  assert(!geometry.overflow, `${viewport.width}x${viewport.height}: horizontal overflow`);
  assert(geometry.canvasCount === 1 && geometry.viewerCount === 1, `${viewport.width}x${viewport.height}: renderer ownership changed`);
  assert(geometry.audit.brandCenterDelta.title <= 2 && geometry.audit.brandCenterDelta.support <= 2, `${viewport.width}x${viewport.height}: WHITE identity center lines differ`);
  assert(/right-column/.test(geometry.parents.satellite) && /right-column/.test(geometry.parents.visitor), `${viewport.width}x${viewport.height}: existing right modules were relocated`);
  assert(geometry.parents.daily === "bottom-grid", `${viewport.width}x${viewport.height}: Daily Brief was relocated`);

  if (viewport.width > 1320) {
    assert(Math.abs(geometry.blue.left - geometry.left.left) <= 2 && Math.abs(geometry.blue.right - geometry.left.right) <= 2, `${viewport.width}x${viewport.height}: BLUE left-column placement mismatch`);
    assert(geometry.red.left <= geometry.left.left + 3 && Math.abs(geometry.red.right - geometry.center.right) <= 3, `${viewport.width}x${viewport.height}: RED does not occupy the annotated left+center void (${JSON.stringify({ left: geometry.left, center: geometry.center, red: geometry.red, style: geometry.redStyle })})`);
    assert(geometry.red.top >= geometry.timeline.bottom, `${viewport.width}x${viewport.height}: RED moved above existing controls`);
    assert(Math.abs(geometry.yellow.left - geometry.domains.left) <= 2 && Math.abs(geometry.yellow.right - geometry.domains.right) <= 2, `${viewport.width}x${viewport.height}: YELLOW does not occupy the lower primary area`);
    assert(geometry.yellow.top >= geometry.domains.bottom && geometry.yellow.right < geometry.daily.right, `${viewport.width}x${viewport.height}: YELLOW placement mismatch`);
  }
  if (viewport.width <= 1100) {
    assert(geometry.blue.top <= geometry.center.top && geometry.center.top <= geometry.yellow.top && geometry.yellow.top <= geometry.left.top && geometry.left.top <= geometry.right.top, `${viewport.width}x${viewport.height}: mobile/tablet zone order mismatch`);
  }
  results.push({ ...viewport, geometry });
  if (viewport.screenshot) {
    if (viewport.mobile) {
      await evaluate("document.querySelector('[data-layout-zone=\"blue\"]').scrollIntoView({block:'start'})");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await captureViewport(viewport.screenshot);
  }
}

await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false, screenWidth: 1920, screenHeight: 1080 });
await evaluate("window.scrollTo(0,0);window.dispatchEvent(new Event('resize'))");
await new Promise((resolve) => setTimeout(resolve, 350));
await captureElement("WHITE-header.png", ".global-nav", 0);
await captureElement("BLUE-research-input.png", "[data-layout-zone=\"blue\"]");
await captureElement("RED-model-mapping.png", "[data-layout-zone=\"red\"]");
await captureElement("YELLOW-analysis-alert.png", "[data-layout-zone=\"yellow\"]");

await evaluate("document.querySelector('#research-paper-reference').value='10.0000/example';document.querySelector('[data-queue-reference=\"paper\"]').click();document.querySelector('#research-model-reference').value='L(t) comparison input';document.querySelector('[data-queue-reference=\"model\"]').click()");
const queue = await evaluate("({length:PCSMainPanelLayoutAudit.state().queueLength,analyzeDisabled:document.querySelector('#compare-queue-analyze').disabled,status:document.querySelector('#compare-queue-status').textContent})");
assert(queue.length === 2 && !queue.analyzeDisabled && /PIPELINE PENDING/.test(queue.status), "Compare queue shell does not preserve pending state");
await evaluate("document.querySelector('#compare-queue-analyze').click()");
assert(await evaluate("document.querySelector('#compare-queue-status').textContent.includes('NO ANALYSIS WAS RUN')"), "Analyze shell asserted a result");

await evaluate("PCSEarthViewerAudit.setViewerMode('pinned')");
await waitFor("PCSEarthViewerAudit.state().viewerMode === 'pinned'");
await evaluate("PCSEarthViewerAudit.setViewerMode('expanded')");
await waitFor("PCSEarthViewerAudit.state().viewerMode === 'expanded'");
await evaluate("PCSEarthViewerAudit.setViewerMode('normal')");
await waitFor("PCSEarthViewerAudit.state().viewerMode === 'normal'");
const toolbar = await evaluate("PCSEarthViewerAudit.state()");
assert(toolbar.viewerCount === 1 && toolbar.cesiumCanvasCount === 1, "Earth toolbar changed renderer count");

await clickElement('[data-solar-target="deep-space"]');
await waitFor("PCSDeepSpaceManager.isOpen() && !document.querySelector('.deep-space-overlay').hidden");
const deepSpace = await evaluate("({open:PCSDeepSpaceManager.isOpen(),canvasCount:document.querySelectorAll('.cesium-widget canvas').length})");
assert(deepSpace.open && deepSpace.canvasCount === 1, "Deep Space routing failed");
await evaluate("PCSDeepSpaceManager.close()");
await waitFor("!PCSDeepSpaceManager.isOpen()");
await clickElement('[data-solar-target="mars"]');
await waitFor("document.querySelector('#observatory-view-title').textContent.includes('Mars')");
await clickElement('[data-solar-target="earth"]');
await waitFor("document.querySelector('#observatory-view-title').textContent.includes('Earth')");
const earth = await evaluate("PCSEarthViewerAudit.state()");
assert(earth.viewerCount === 1 && earth.cesiumCanvasCount === 1, "Earth route did not restore renderer ownership");

const optionalRuntimeErrors = runtimeErrors.filter((error) => /Failed to fetch|ERR_CONNECTION_REFUSED/.test(error));
const unexpectedRuntimeErrors = runtimeErrors.filter((error) => !optionalRuntimeErrors.includes(error));
const optionalResourceErrors = resourceErrors.filter((entry) => String(entry.url || "").startsWith("http://127.0.0.1:8787/"));
const unexpectedResourceErrors = resourceErrors.filter((entry) => !optionalResourceErrors.includes(entry));
assert(unexpectedRuntimeErrors.length === 0, `Unexpected runtime errors: ${JSON.stringify(unexpectedRuntimeErrors)}`);
assert(unexpectedResourceErrors.length === 0, `Unexpected resource errors: ${JSON.stringify(unexpectedResourceErrors)}`);

const report = {
  generatedAt: new Date().toISOString(),
  url: baseUrl,
  correctionCheckpoint: "0bcda38e9aca414d555bcdc4d55fb207366b6a4f",
  webgl,
  viewports: results,
  interactions: { queue, toolbar, deepSpace, earth },
  unexpectedRuntimeErrors,
  optionalRuntimeErrors,
  optionalResourceErrors,
  unexpectedResourceErrors
};
fs.writeFileSync(path.join(outputDir, "acceptance-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, viewports: results.map(({ width, height, geometry }) => ({ width, height, overflow: geometry.overflow, blue: geometry.blue, red: geometry.red, yellow: geometry.yellow, order: geometry.audit.responsiveZoneOrder })), interactions: report.interactions, unexpectedRuntimeErrors: unexpectedRuntimeErrors.length, optionalRuntimeErrors: optionalRuntimeErrors.length, unexpectedResourceErrors: unexpectedResourceErrors.length, optionalResourceErrors: optionalResourceErrors.length }, null, 2));
socket.close();
