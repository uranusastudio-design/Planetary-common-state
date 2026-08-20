import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PCS_CDP_PORT || 18800);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:8765/projects/Planetary-common-state/PCS_OBSERVATORY/?v=zero-dead-space";
const outputDir = process.env.PCS_SCREENSHOT_DIR || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "zero-dead-space-local", "after");
const phase = process.env.PCS_ACCEPTANCE_PHASE || "after";
const skipScreenshots = process.env.PCS_SKIP_SCREENSHOTS === "1";
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

async function captureFullPage(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
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
  { width: 1920, height: 1080 },
  { width: 1728, height: 1117 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 390, height: 844, mobile: true }
];

const results = [];
for (const viewport of viewports) {
  await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: Boolean(viewport.mobile), screenWidth: viewport.width, screenHeight: viewport.height });
  await evaluate("window.scrollTo(0,0);window.dispatchEvent(new Event('resize'))");
  await new Promise((resolve) => setTimeout(resolve, 500));
  const audit = await evaluate(`(()=>{
    const rect=(selector)=>{const element=document.querySelector(selector),r=element?.getBoundingClientRect();return r?{left:r.left+scrollX,right:r.right+scrollX,top:r.top+scrollY,bottom:r.bottom+scrollY,width:r.width,height:r.height}:null};
    const directGaps=(selector)=>{const parent=document.querySelector(selector);if(!parent)return[];const children=[...parent.children].filter((element)=>{const style=getComputedStyle(element),r=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&r.height>0}).map((element)=>{const r=element.getBoundingClientRect();return{label:element.id||element.className||element.tagName,top:r.top+scrollY,bottom:r.bottom+scrollY}}).sort((a,b)=>a.top-b.top);return children.slice(1).map((item,index)=>({after:children[index].label,before:item.label,gap:item.top-children[index].bottom}));};
    const sampleGaps=(ratio)=>{const x=document.documentElement.clientWidth*ratio;const panels=[...document.querySelectorAll('.panel,.data-message')].filter((element)=>!element.parentElement?.closest('.panel')).map((element)=>{const style=getComputedStyle(element),r=element.getBoundingClientRect();return{label:element.id||element.className,left:r.left,right:r.right,top:r.top+scrollY,bottom:r.bottom+scrollY,height:r.height,visible:style.display!=='none'&&style.visibility!=='hidden'}}).filter((item)=>item.visible&&item.height>0&&item.left<=x&&item.right>=x).sort((a,b)=>a.top-b.top);const merged=[];for(const item of panels){const previous=merged.at(-1);if(previous&&item.top<=previous.bottom){previous.bottom=Math.max(previous.bottom,item.bottom);previous.labels.push(item.label);}else{merged.push({top:item.top,bottom:item.bottom,labels:[item.label]});}}return merged.slice(1).map((item,index)=>({after:merged[index].labels.at(-1),before:item.labels[0],gap:item.top-merged[index].bottom}));};
    const style=(selector)=>{const element=document.querySelector(selector),computed=element&&getComputedStyle(element);return computed?{height:computed.height,minHeight:computed.minHeight,maxHeight:computed.maxHeight,overflowY:computed.overflowY,position:computed.position}:null};
    return{
      documentHeight:document.documentElement.scrollHeight,
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
      canvasCount:document.querySelectorAll('.cesium-widget canvas').length,
      viewerCount:document.querySelectorAll('.cesium-viewer').length,
      sphere:rect('.neutral-sphere'),mappingViewport:rect('.mapping-viewport'),
      emptyStates:[...document.querySelectorAll('.event-empty-state,.feed-empty-state,.research-empty-state,.queue-empty,.compact-empty-state')].filter((element)=>getComputedStyle(element).display!=='none').map((element)=>({label:element.className,height:element.getBoundingClientRect().height,text:element.textContent.trim().replace(/\\s+/g,' ')})),
      stackGaps:{left:directGaps('.left-column'),center:directGaps('.center-column'),right:directGaps('.right-column'),primary:directGaps('.primary-workspace'),secondary:directGaps('.secondary-workspace')},
      sampledGaps:{left:sampleGaps(.14),center:sampleGaps(.5),right:sampleGaps(.86)},
      population:{panel:rect('#pcs-mass-gatherings'),feed:rect('.population-event-stream'),style:style('.population-event-stream')},
      daily:{panel:rect('#pcs-daily-brief'),feed:rect('.daily-brief-feed'),style:style('.daily-brief-feed')},
      analysis:{panel:rect('.event-analysis-center'),stream:rect('.event-stream-list'),empty:rect('.event-empty-state')}
    };
  })()`);
  assert(!audit.overflow, `${viewport.width}x${viewport.height}: horizontal overflow`);
  assert(audit.canvasCount === 1 && audit.viewerCount === 1, `${viewport.width}x${viewport.height}: renderer ownership changed`);
  assert(Math.abs(audit.sphere.width - audit.sphere.height) <= 1, `${viewport.width}x${viewport.height}: neutral sphere distorted`);
  if (phase === "after") {
    const stackGaps = Object.values(audit.stackGaps).flat();
    const sampledGaps = Object.values(audit.sampledGaps).flat();
    if (viewport.width > 1100) assert(stackGaps.every(({ gap }) => gap <= 24), `${viewport.width}x${viewport.height}: stack gap exceeds 24px ${JSON.stringify(stackGaps.filter(({ gap }) => gap > 24))}`);
    else assert(sampledGaps.every(({ gap }) => gap <= 24), `${viewport.width}x${viewport.height}: continuous mobile flow gap exceeds 24px ${JSON.stringify(sampledGaps.filter(({ gap }) => gap > 24))}`);
    assert(audit.emptyStates.every(({ height }) => height <= 100), `${viewport.width}x${viewport.height}: oversized empty state ${JSON.stringify(audit.emptyStates)}`);
    assert(audit.analysis.empty.height <= 100 && audit.analysis.stream.height <= 100, `${viewport.width}x${viewport.height}: analysis empty stream reserves dead space`);
    assert(audit.population.style.height === "auto" || audit.population.feed.height < 620.5, `${viewport.width}x${viewport.height}: sparse population feed is fixed-height`);
    assert(audit.daily.style.height === "auto" || audit.daily.feed.height < 640.5, `${viewport.width}x${viewport.height}: sparse Daily Brief is fixed-height`);
  }
  results.push({ ...viewport, audit });
}

if (!skipScreenshots) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false, screenWidth: 1920, screenHeight: 1080 });
  await evaluate("window.scrollTo(0,0);window.dispatchEvent(new Event('resize'))");
  await new Promise((resolve) => setTimeout(resolve, 400));
  await captureViewport("01-page-top.png");
  await evaluate("window.scrollTo(0,Math.round(document.documentElement.scrollHeight*.28))");
  await captureViewport("02-upper-middle.png");
  await captureElement("03-generic-model-space.png", ".model-mapping-panel");
  await captureElement("04-population-events.png", "#pcs-mass-gatherings");
  await captureElement("05-daily-brief.png", "#pcs-daily-brief");
  await captureElement("06-analysis-alert.png", ".event-analysis-center");
  await evaluate("window.scrollTo(0,Math.round(document.documentElement.scrollHeight*.72))");
  await captureViewport("07-lower-middle.png");
  await evaluate("window.scrollTo(0,document.documentElement.scrollHeight)");
  await captureViewport("08-page-bottom.png");
  await evaluate("window.scrollTo(0,0)");
  await captureFullPage("09-1920-full-page.png");

  for (const viewport of [{ width: 1440, height: 900, name: "10-1440-full-page.png", fullPage: true }, { width: 390, height: 844, mobile: true, name: "11-390-mobile.png", fullPage: false }]) {
    await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: Boolean(viewport.mobile), screenWidth: viewport.width, screenHeight: viewport.height });
    await evaluate("window.scrollTo(0,0);window.dispatchEvent(new Event('resize'))");
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (viewport.fullPage) await captureFullPage(viewport.name);
    else await captureViewport(viewport.name);
  }
}

let scrollInteraction = null;
if (phase === "after") {
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false, screenWidth: 1920, screenHeight: 1080 });
  scrollInteraction = await evaluate(`(()=>{const test=(containerSelector,listSelector,className)=>{const container=document.querySelector(containerSelector),list=document.querySelector(listSelector);for(let i=0;i<30;i++){const row=document.createElement('article');row.className=className;row.dataset.acceptanceOnly='true';row.textContent='ACCEPTANCE ROW '+(i+1);row.style.minHeight='54px';list.append(row);}const pageBefore=scrollY;container.scrollTop=0;container.dispatchEvent(new WheelEvent('wheel',{deltaY:240,bubbles:true}));container.scrollTop=240;const result={clientHeight:container.clientHeight,scrollHeight:container.scrollHeight,scrollTop:container.scrollTop,pageBefore,pageAfter:scrollY};list.querySelectorAll('[data-acceptance-only]').forEach((element)=>element.remove());return result};return{population:test('.population-event-stream','#mass-gathering-list','population-event-row'),daily:test('.daily-brief-feed','#daily-brief-list','pcs-ledger-entry')}})()`);
  assert(scrollInteraction.population.scrollHeight > scrollInteraction.population.clientHeight && scrollInteraction.population.scrollTop > 0 && scrollInteraction.population.pageBefore === scrollInteraction.population.pageAfter, "Population feed did not scroll independently");
  assert(scrollInteraction.daily.scrollHeight > scrollInteraction.daily.clientHeight && scrollInteraction.daily.scrollTop > 0 && scrollInteraction.daily.pageBefore === scrollInteraction.daily.pageAfter, "Daily Brief did not scroll independently");

  await evaluate("PCSEarthViewerAudit.setViewerMode('pinned')");
  await waitFor("PCSEarthViewerAudit.state().viewerMode === 'pinned'");
  await evaluate("PCSEarthViewerAudit.setViewerMode('expanded')");
  await waitFor("PCSEarthViewerAudit.state().viewerMode === 'expanded'");
  await evaluate("PCSEarthViewerAudit.setViewerMode('normal')");
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

const report = { generatedAt: new Date().toISOString(), phase, url: baseUrl, checkpoint: "ffee5e9241fa6a8c7217a45ce3c9fc4b537669dc", webgl, viewports: results, scrollInteraction, unexpectedRuntimeErrors, optionalRuntimeErrors, optionalResourceErrors, unexpectedResourceErrors };
fs.writeFileSync(path.join(outputDir, "acceptance-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputDir, phase, viewports: results.map(({ width, height, audit }) => ({ width, height, documentHeight: audit.documentHeight, overflow: audit.overflow, emptyStates: audit.emptyStates, stackGaps: audit.stackGaps, sampledGaps: audit.sampledGaps, population: audit.population, daily: audit.daily, analysis: audit.analysis })), scrollInteraction, unexpectedRuntimeErrors: unexpectedRuntimeErrors.length, optionalRuntimeErrors: optionalRuntimeErrors.length, unexpectedResourceErrors: unexpectedResourceErrors.length, optionalResourceErrors: optionalResourceErrors.length }, null, 2));
socket.close();
