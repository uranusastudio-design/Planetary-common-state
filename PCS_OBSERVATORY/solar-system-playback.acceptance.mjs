import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.PCS_CDP_PORT || 9343);
const baseUrl = process.env.PCS_TEST_URL || `http://127.0.0.1:18765/PCS_OBSERVATORY/?v=solar-playback-${Date.now()}`;
const outputDir = process.env.PCS_PLAYBACK_OUTPUT || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "solar-system-playback-fix");
fs.mkdirSync(outputDir, { recursive: true });

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const consoleErrors = [];
const networkFailures = [];
const requestUrls = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") consoleErrors.push(message.params.entry.text);
  if (message.method === "Network.requestWillBeSent") requestUrls.set(message.params.requestId, message.params.request.url);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push({ url: requestUrls.get(message.params.requestId) || "unknown", error: message.params.errorText });
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
async function waitFor(expression, timeout = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout: ${expression}`);
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const file = path.join(outputDir, name);
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
  return file;
}
function assert(value, message) { if (!value) throw new Error(message); }

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Network.enable"), send("Page.enable")]);
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
await send("Page.navigate", { url: baseUrl });
await waitFor("document.readyState === 'complete' && document.querySelector('#intro-enter')");
await evaluate("document.querySelector('#intro-enter').click()");
await waitFor("window.PCSDeepSpaceManager && cesiumViewer?.scene && !document.body.classList.contains('intro-active')");
await evaluate("PCSI18n.setLanguage('zh-TW',{persist:false});PCSDeepSpaceManager.open();document.querySelector('[data-ds-play]').click();PCSDeepSpaceManager.setEpoch('2026-08-09T00:00:00Z')");
await pause(1200);

const evidence = {};
evidence.control = await evaluate(`(()=>{const input=document.querySelector('[data-ds-speed]');input.value='45';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return {type:input.type,min:Number(input.min),max:Number(input.max),value:Number(input.value),debug:PCSDeepSpaceManager.debug().playbackDaysPerSecond,unit:document.querySelector('[data-ds-speed-unit]').textContent};})()`);
assert(evidence.control.type === "number" && evidence.control.min === .01 && evidence.control.max === 30 && evidence.control.value === 30 && evidence.control.debug === 30, "custom playback control did not clamp to 30 days/second");

await evaluate(`(()=>{const source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],ids=['sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];window.__pcsPlaybackRefs=Object.fromEntries(ids.map(id=>[id,source.entities.getById('deep-space-'+id)]));window.__pcsPlaybackRemoveAll=0;const original=source.entities.removeAll.bind(source.entities);source.entities.removeAll=function(){window.__pcsPlaybackRemoveAll+=1;return original();};window.__pcsPlaybackStart=Date.parse(PCSDeepSpaceManager.debug().epoch);window.__pcsFrameDeltas=[];window.__pcsFrameLast=0;window.__pcsSampleFrames=true;const sample=stamp=>{if(window.__pcsFrameLast)window.__pcsFrameDeltas.push(stamp-window.__pcsFrameLast);window.__pcsFrameLast=stamp;if(window.__pcsSampleFrames)requestAnimationFrame(sample);};requestAnimationFrame(sample);document.querySelector('[data-ds-play]').click();})()`);
await pause(1250);
await evaluate("document.querySelector('[data-ds-play]').click()");
evidence.playback30 = await evaluate(`(()=>{window.__pcsSampleFrames=false;const source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],now=Cesium.JulianDate.now(),ids=Object.keys(window.__pcsPlaybackRefs),debug=PCSDeepSpaceManager.debug(),frames=[...window.__pcsFrameDeltas].sort((a,b)=>a-b);return {elapsedDays:(Date.parse(debug.epoch)-window.__pcsPlaybackStart)/86400000,removeAll:window.__pcsPlaybackRemoveAll,stableEntities:ids.every(id=>source.entities.getById('deep-space-'+id)===window.__pcsPlaybackRefs[id]),visibleBodies:ids.every(id=>{const entity=source.entities.getById('deep-space-'+id),position=entity?.position?.getValue(now);return Boolean(entity&&entity.show!==false&&position&&[position.x,position.y,position.z].every(Number.isFinite));}),framePacing:{samples:frames.length,p95Ms:frames[Math.floor(frames.length*.95)]||null,maxMs:frames.at(-1)||null},mainBelt:debug.mainBelt,tno:debug.tno,epoch:debug.epoch};})()`);
assert(evidence.playback30.elapsedDays >= 25 && evidence.playback30.elapsedDays <= 45, `30 days/second advanced an unexpected amount: ${evidence.playback30.elapsedDays}`);
assert(evidence.playback30.removeAll === 0 && evidence.playback30.stableEntities && evidence.playback30.visibleBodies, "30 days/second rebuilt or hid major bodies");
assert(evidence.playback30.framePacing.samples >= 10 && evidence.playback30.framePacing.p95Ms < 200, `playback frame pacing regressed: ${JSON.stringify(evidence.playback30.framePacing)}`);
evidence.playbackScreenshot = await screenshot("01-30-days-per-second-stable-bodies.png");

await evaluate("document.querySelector('[data-mode=scientific]').click()");
await pause(1000);
await evaluate("document.querySelector('[data-body=earth]').click()");
await pause(2200);
evidence.scientificEarth = await evaluate(`(()=>{const source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],entity=source.entities.getById('deep-space-earth'),position=entity.position.getValue(Cesium.JulianDate.now()),point=Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,position),canvas=cesiumViewer.scene.canvas;return {mode:PCSDeepSpaceManager.debug().mode,entityShow:entity.show!==false,onScreen:Boolean(point&&point.x>=0&&point.x<canvas.clientWidth&&point.y>=0&&point.y<canvas.clientHeight),window:point&&{x:point.x,y:point.y},objectCard:PCSDeepSpaceManager.debug().objectCardId};})()`);
assert(evidence.scientificEarth.mode === "scientific" && evidence.scientificEarth.entityShow && evidence.scientificEarth.onScreen && evidence.scientificEarth.objectCard === "earth", "scientific scale did not automatically frame the selected planet");
evidence.scientificScreenshot = await screenshot("02-scientific-scale-earth-visible.png");

const cometSpkid = await evaluate("PCSSolarSystemCometDataset.records.find(item=>item.designation==='1P').spkid");
await evaluate("document.querySelector('[data-mode=exhibition]').click()");
await pause(1000);
await evaluate(`document.querySelector('[data-small-body=${JSON.stringify(cometSpkid)}]').click()`);
await pause(1600);
await evaluate("document.querySelector('[data-object-card-analysis]').click()");
evidence.cometAnalysis = await evaluate(`(()=>{const context=document.querySelector('#scientific-analysis-context'),card=document.querySelector('[data-object-card]');return {selected:PCSDeepSpaceManager.debug().smallBodySelected,analysisMode:document.querySelector('#ai-mode-selector').value,contextVisible:!context.hidden,contextText:context.textContent,cardText:card.textContent,status:document.querySelector('[data-analysis-status]').textContent};})()`);
assert(evidence.cometAnalysis.selected === cometSpkid && evidence.cometAnalysis.analysisMode === "scientific_analysis" && evidence.cometAnalysis.contextVisible, "selected comet was not loaded into Scientific Analysis");
assert(/Halley/.test(evidence.cometAnalysis.contextText) && /a 17\.927|period 27535\.86|JPL SBDB/.test(evidence.cometAnalysis.contextText), "comet analysis context lacks orbital/provenance data");
await evaluate("document.querySelector('[data-object-card]').scrollIntoView({block:'start'})");
await pause(300);
evidence.cometScreenshot = await screenshot("03-comet-analysis-context-linked.png");

await evaluate("PCSDeepSpaceManager.returnSolar();PCSDeepSpaceManager.setEpoch('2050-12-31T12:00:00Z');document.querySelector('[data-ds-play]').click()");
await pause(250);
evidence.playbackBoundary = await evaluate(`(()=>{const debug=PCSDeepSpaceManager.debug(),source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],ids=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];return {epoch:debug.epoch,paused:debug.paused,boundaryVisible:!document.querySelector('[data-ds-time-boundary]').hidden,visibleBodies:ids.every(id=>source.entities.getById('deep-space-'+id)?.show!==false)};})()`);
assert(evidence.playbackBoundary.epoch === "2050-12-31T23:59:59.999Z" && evidence.playbackBoundary.paused && evidence.playbackBoundary.boundaryVisible && evidence.playbackBoundary.visibleBodies, "supported playback boundary did not pause without hiding major bodies");

const requiredConsole = [...new Set(consoleErrors)].filter(value => /Uncaught|TypeError|ReferenceError|RangeError|deep-space/i.test(value));
const requiredNetwork = networkFailures.filter(item => /deep-space|solar-system|Cesium|i18n/i.test(item.url));
const report = { generatedAt: new Date().toISOString(), status: requiredConsole.length || requiredNetwork.length ? "FAIL" : "PASS", url: baseUrl, evidence, console: { required: requiredConsole.length, items: requiredConsole }, network: { required: requiredNetwork.length, items: requiredNetwork } };
fs.writeFileSync(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
assert(requiredConsole.length === 0, "required Console errors detected");
assert(requiredNetwork.length === 0, "required Network failures detected");
socket.close();
