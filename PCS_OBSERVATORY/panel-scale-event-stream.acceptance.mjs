import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PCS_CDP_PORT || 18800);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:8765/projects/Planetary-common-state/PCS_OBSERVATORY/?v=panel-scale-event-stream";
const outputDir = process.env.PCS_SCREENSHOT_DIR || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "panel-scale-event-stream-local", "after");
const phase = process.env.PCS_ACCEPTANCE_PHASE || "after";
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
  await new Promise((resolve) => setTimeout(resolve, 160));
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
  { width: 390, height: 844, mobile: true, screenshot: "390-mobile.png" },
];

const results = [];
for (const viewport of viewports) {
  await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: Boolean(viewport.mobile), screenWidth: viewport.width, screenHeight: viewport.height });
  await evaluate("window.scrollTo(0,0);window.dispatchEvent(new Event('resize'))");
  await new Promise((resolve) => setTimeout(resolve, 450));
  const geometry = await evaluate(`(()=>{const rect=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return r?{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};const style=s=>{const e=document.querySelector(s),c=e&&getComputedStyle(e);return c?{overflowY:c.overflowY,position:c.position,scrollbarWidth:c.scrollbarWidth}:null};const centerChildren=[...document.querySelectorAll('.center-column > .panel')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return{className:e.className,top:r.top,bottom:r.bottom}});return{
    viewport:{width:document.documentElement.clientWidth,height:document.documentElement.clientHeight},overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    globe:rect('.globe-panel'),globeViewport:rect('.cesium-globe'),mapping:rect('.model-mapping-panel'),mappingViewport:rect('.mapping-viewport'),sphere:rect('.neutral-sphere'),population:rect('#pcs-mass-gatherings'),populationFeed:rect('.population-event-stream'),daily:rect('#pcs-daily-brief'),dailyFeed:rect('.daily-brief-feed'),
    populationScroll:{clientHeight:document.querySelector('.population-event-stream')?.clientHeight||0,scrollHeight:document.querySelector('.population-event-stream')?.scrollHeight||0,style:style('.population-event-stream'),header:style('.population-event-stream-header')},
    dailyScroll:{clientHeight:document.querySelector('.daily-brief-feed')?.clientHeight||0,scrollHeight:document.querySelector('.daily-brief-feed')?.scrollHeight||0,style:style('.daily-brief-feed'),header:style('.daily-brief-header')},
    centerGaps:centerChildren.slice(1).map((item,index)=>({after:centerChildren[index].className,before:item.className,gap:item.top-centerChildren[index].bottom})),canvasCount:document.querySelectorAll('.cesium-widget canvas').length,viewerCount:document.querySelectorAll('.cesium-viewer').length
  }})()`);
  assert(!geometry.overflow, `${viewport.width}x${viewport.height}: horizontal overflow`);
  assert(geometry.canvasCount === 1 && geometry.viewerCount === 1, `${viewport.width}x${viewport.height}: renderer ownership changed`);
  if (phase === "after") {
    assert(Math.abs(geometry.sphere.width - geometry.sphere.height) <= 1, `${viewport.width}x${viewport.height}: neutral sphere distorted`);
    const sphereRatio = geometry.sphere.height / geometry.mappingViewport.height;
    assert(sphereRatio >= 0.58 && sphereRatio <= 0.78, `${viewport.width}x${viewport.height}: sphere scale ratio ${sphereRatio.toFixed(3)} outside target`);
    const expectedModelMinimum = viewport.width <= 820 ? 360 : 560;
    assert(geometry.mappingViewport.height >= expectedModelMinimum, `${viewport.width}x${viewport.height}: mapping viewport too short`);
    assert(geometry.globeViewport.height >= expectedModelMinimum, `${viewport.width}x${viewport.height}: existing visual viewport too short`);
    assert(geometry.populationFeed && geometry.dailyFeed, `${viewport.width}x${viewport.height}: feed viewport missing`);
    assert(geometry.populationScroll.style.overflowY === "auto" && geometry.dailyScroll.style.overflowY === "auto", `${viewport.width}x${viewport.height}: independent scrolling missing`);
    assert(geometry.populationScroll.header.position === "sticky" && geometry.dailyScroll.header.position === "sticky", `${viewport.width}x${viewport.height}: sticky feed controls missing`);
    assert(geometry.centerGaps.every(({ gap }) => gap >= 11 && gap <= 21), `${viewport.width}x${viewport.height}: inconsistent center panel gap ${JSON.stringify(geometry.centerGaps)}`);
  }
  results.push({ ...viewport, geometry });
  if (viewport.screenshot) await captureViewport(viewport.screenshot);
}

await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false, screenWidth: 1920, screenHeight: 1080 });
await evaluate("window.scrollTo(0,0);window.dispatchEvent(new Event('resize'))");
await new Promise((resolve) => setTimeout(resolve, 350));
await captureElement("RED-visual-panel.png", ".globe-panel");
await captureElement("YELLOW-model-mapping.png", ".model-mapping-panel");
await captureElement("BLUE-population-feed.png", "#pcs-mass-gatherings");
await captureElement("DAILY-brief.png", "#pcs-daily-brief");

let scrollInteraction = null;
if (phase === "after") {
  scrollInteraction = await evaluate(`(()=>{const test=(containerSelector,listSelector,className)=>{const container=document.querySelector(containerSelector),list=document.querySelector(listSelector);for(let i=0;i<24;i++){const row=document.createElement('article');row.className=className;row.dataset.acceptanceOnly='true';row.textContent='ACCEPTANCE ROW '+(i+1);row.style.minHeight='54px';list.append(row);}const pageBefore=scrollY;container.scrollTop=0;container.dispatchEvent(new WheelEvent('wheel',{deltaY:240,bubbles:true}));container.scrollTop=240;const result={clientHeight:container.clientHeight,scrollHeight:container.scrollHeight,scrollTop:container.scrollTop,pageBefore,pageAfter:scrollY};list.querySelectorAll('[data-acceptance-only]').forEach(e=>e.remove());return result};return{population:test('.population-event-stream','#mass-gathering-list','population-event-row'),daily:test('.daily-brief-feed','#daily-brief-list','pcs-ledger-entry')}})()`);
  assert(scrollInteraction.population.scrollHeight > scrollInteraction.population.clientHeight && scrollInteraction.population.scrollTop > 0 && scrollInteraction.population.pageBefore === scrollInteraction.population.pageAfter, "Population feed did not scroll independently");
  assert(scrollInteraction.daily.scrollHeight > scrollInteraction.daily.clientHeight && scrollInteraction.daily.scrollTop > 0 && scrollInteraction.daily.pageBefore === scrollInteraction.daily.pageAfter, "Daily Brief did not scroll independently");

  await evaluate("PCSEarthViewerAudit.setViewerMode('pinned')");
  await waitFor("PCSEarthViewerAudit.state().viewerMode === 'pinned'");
  await evaluate("PCSEarthViewerAudit.setViewerMode('expanded')");
  await waitFor("PCSEarthViewerAudit.state().viewerMode === 'expanded'");
  await evaluate("PCSEarthViewerAudit.setViewerMode('normal')");
  await waitFor("PCSEarthViewerAudit.state().viewerMode === 'normal'");
  await clickElement('[data-solar-target="deep-space"]');
  await waitFor("PCSDeepSpaceManager.isOpen() && !document.querySelector('.deep-space-overlay').hidden");
  await evaluate("PCSDeepSpaceManager.close()");
  await waitFor("!PCSDeepSpaceManager.isOpen()");
  await clickElement('[data-solar-target="mars"]');
  await waitFor("document.querySelector('#observatory-view-title').textContent.includes('Mars')");
  await clickElement('[data-solar-target="earth"]');
  await waitFor("document.querySelector('#observatory-view-title').textContent.includes('Earth')");
  const earth = await evaluate("PCSEarthViewerAudit.state()");
  assert(earth.viewerCount === 1 && earth.cesiumCanvasCount === 1, "Routing changed renderer ownership");
}

const optionalRuntimeErrors = runtimeErrors.filter((error) => /Failed to fetch|ERR_CONNECTION_REFUSED/.test(error));
const unexpectedRuntimeErrors = runtimeErrors.filter((error) => !optionalRuntimeErrors.includes(error));
const optionalResourceErrors = resourceErrors.filter((entry) => String(entry.url || "").startsWith("http://127.0.0.1:8787/"));
const unexpectedResourceErrors = resourceErrors.filter((entry) => !optionalResourceErrors.includes(entry));
assert(unexpectedRuntimeErrors.length === 0, `Unexpected runtime errors: ${JSON.stringify(unexpectedRuntimeErrors)}`);
assert(unexpectedResourceErrors.length === 0, `Unexpected resource errors: ${JSON.stringify(unexpectedResourceErrors)}`);

const report = { generatedAt: new Date().toISOString(), phase, url: baseUrl, checkpoint: "a1d0ce498589a7f79f5c8a8244c2df4afc17b0ba", webgl, viewports: results, scrollInteraction, unexpectedRuntimeErrors, optionalRuntimeErrors, optionalResourceErrors, unexpectedResourceErrors };
fs.writeFileSync(path.join(outputDir, "acceptance-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, phase, viewports: results.map(({ width, height, geometry }) => ({ width, height, overflow: geometry.overflow, globeViewport: geometry.globeViewport, mappingViewport: geometry.mappingViewport, sphere: geometry.sphere, population: geometry.population, daily: geometry.daily, centerGaps: geometry.centerGaps })), scrollInteraction, unexpectedRuntimeErrors: unexpectedRuntimeErrors.length, optionalRuntimeErrors: optionalRuntimeErrors.length, unexpectedResourceErrors: unexpectedResourceErrors.length, optionalResourceErrors: optionalResourceErrors.length }, null, 2));
socket.close();
