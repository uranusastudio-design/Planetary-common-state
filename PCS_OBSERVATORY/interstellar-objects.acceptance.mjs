import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.PCS_CDP_PORT || 9343);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:18765/PCS_OBSERVATORY/?v=interstellar-objects";
const outputDir = path.join(process.cwd(), "PCS_OBSERVATORY/test-results/interstellar-objects");
fs.mkdirSync(outputDir, { recursive: true });

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const exceptions = [];
const logErrors = [];
const failures = [];
const urls = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") logErrors.push(message.params.entry.text);
  if (message.method === "Network.requestWillBeSent") urls.set(message.params.requestId, message.params.request.url);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) failures.push({ url: urls.get(message.params.requestId) || "unknown", error: message.params.errorText });
});

function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
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
const assert = (value, message) => { if (!value) throw new Error(message); };

process.on("uncaughtException", error => {
  console.error(error.stack || error);
  try { socket.close(); } finally { process.exit(1); }
});

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Network.enable"), send("Page.enable")]);
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Page.navigate", { url: baseUrl });
await waitFor("document.readyState==='complete' && document.querySelector('#intro-enter')");
await evaluate("document.querySelector('#intro-enter').click()");
await waitFor("window.PCSInterstellarObjects && window.PCSDeepSpaceManager && cesiumViewer?.scene");
await evaluate("PCSI18n.setLanguage('en',{persist:false});PCSDeepSpaceManager.open();if(!PCSDeepSpaceManager.debug().paused)document.querySelector('[data-ds-play]').click()");
await waitFor("cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1').length===1");

const initial = await evaluate(`(()=>{const source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],entities=source.entities.values,segments=entities.filter(entity=>String(entity.id).startsWith('interstellar-trajectory-'));return {viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,dataSources:cesiumViewer.dataSources.length,primitives:cesiumViewer.scene.primitives.length,records:PCSInterstellarObjects.dataset.records.length,segments:segments.length,open:segments.every(entity=>entity.properties.closedOrbit.getValue()===false),segmentKinds:[...new Set(segments.map(entity=>entity.properties.trajectorySegment.getValue()))].sort(),arcTypes:[...new Set(segments.map(entity=>entity.polyline.arcType.getValue()))],perihelia:entities.filter(entity=>String(entity.id).startsWith('interstellar-perihelion-')).length,pointShapeClaims:entities.filter(entity=>String(entity.id).startsWith('interstellar-object-')).some(entity=>Boolean(entity.model||entity.ellipsoid||entity.box))};})()`);
assert(initial.viewer === 1 && initial.cesiumCanvas === 1, "Viewer or Cesium canvas count failed");
assert(initial.records === 3 && initial.segments === 9 && initial.perihelia === 3, "interstellar registry or trajectory segments missing");
assert(initial.open && initial.segmentKinds.join(",") === "derived,observed,reconstructed" && initial.arcTypes.every(value => value === 0), "trajectory was closed, curved as a globe arc, or missing epistemic segments");
assert(!initial.pointShapeClaims, "a physical shape was asserted for a point marker");

const expectedAliases = {
  "ʻOumuamua": "1I", Oumuamua: "1I", "1I": "1I", "1I/2017 U1": "1I",
  Borisov: "2I", "2I": "2I", "2I/Borisov": "2I",
  "3I/ATLAS": "3I", "3I": "3I", ATLAS: "3I"
};
const aliases = {};
for (const [term, expected] of Object.entries(expectedAliases)) {
  aliases[term] = await evaluate(`PCSDeepSpaceManager.searchSolar(${JSON.stringify(term)})?.id`);
  assert(aliases[term] === expected, `${term} search alias failed`);
}

const passages = {};
for (const [id, expectedClass, expectedYear] of [["1I", "Interstellar Object", 2017], ["2I", "Interstellar Comet", 2019], ["3I", "Interstellar Comet", 2025]]) {
  passages[id] = await evaluate(`(async()=>{PCSDeepSpaceManager.searchSolar(${JSON.stringify(id)});document.querySelector('[data-object-card-passage]').click();await new Promise(resolve=>setTimeout(resolve,80));const card=document.querySelector('[data-object-card]'),source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],entity=source.entities.getById(${JSON.stringify(`interstellar-object-${id}`)}),fit=PCSDeepSpaceManager.debug().lastOrbitFit;return {epoch:PCSDeepSpaceManager.debug().epoch,selected:PCSDeepSpaceManager.debug().selected,title:card.querySelector('[data-object-card-title]').textContent,text:card.textContent,pointVisible:Boolean(entity?.show&&entity?.position),fit,passageLabel:document.querySelector('[data-object-card-passage]').textContent};})()`);
  assert(passages[id].selected === `interstellar:${id}` && passages[id].title.includes(id), `${id} selection/card failed`);
  assert(new Date(passages[id].epoch).getUTCFullYear() === expectedYear && passages[id].pointVisible, `${id} historical passage failed`);
  assert(passages[id].text.includes(expectedClass) && /open hyperbola; no period/.test(passages[id].text), `${id} class or open-orbit card contract failed`);
  assert(/Origin system status/.test(passages[id].text) && /Unknown \/ unconstrained/.test(passages[id].text), `${id} origin uncertainty missing`);
  assert(/Historical (?:reconstructed path|ephemeris reconstruction)|historical-reconstructed|historical-ephemeris-reconstruction/i.test(passages[id].text + passages[id].passageLabel), `${id} historical reconstruction label missing`);
  assert(passages[id].fit?.openTrajectory === true && passages[id].fit?.completeOrbit === false, `${id} fit treated an open path as a complete orbit`);
}

const playback = await evaluate(`(async()=>{PCSDeepSpaceManager.searchSolar('1I');PCSDeepSpaceManager.setEpoch('2017-09-01T00:00:00Z');PCSDeepSpaceManager.setPlaybackDaysPerSecond(5);const source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],entity=source.entities.getById('interstellar-object-1I'),beforeEpoch=PCSDeepSpaceManager.debug().epoch,before=entity.position.getValue(Cesium.JulianDate.now());document.querySelector('[data-ds-play]').click();await new Promise(resolve=>setTimeout(resolve,500));document.querySelector('[data-ds-play]').click();const afterEpoch=PCSDeepSpaceManager.debug().epoch,after=entity.position.getValue(Cesium.JulianDate.now());return {beforeEpoch,afterEpoch,advanced:new Date(afterEpoch)>new Date(beforeEpoch),moved:Cesium.Cartesian3.distance(before,after)>1,paused:PCSDeepSpaceManager.debug().paused,sunPresent:Boolean(source.entities.getById('deep-space-sun')),planetContext:PCSDeepSpaceManager.debug().scaleContext};})()`);
assert(playback.advanced && playback.moved && playback.paused, "historical timeline playback did not advance the trajectory");
assert(playback.sunPresent && playback.planetContext === "solar", "Sun/planetary historical context missing");

const languages = {};
for (const [language, term] of Object.entries({ en: "Interstellar Objects", "zh-TW": "星際天體", ja: "恒星間天体", ko: "성간 천체" })) {
  await evaluate(`PCSI18n.setLanguage(${JSON.stringify(language)},{persist:false})`);
  languages[language] = await evaluate("document.querySelector('[data-interstellar-copy]').textContent");
  assert(languages[language] === term, `${language} interstellar layer translation failed`);
}

await evaluate("PCSI18n.setLanguage('en',{persist:false})");
const beforeLifecycle = await evaluate("({dataSources:cesiumViewer.dataSources.length,primitives:cesiumViewer.scene.primitives.length,totalCanvas:document.querySelectorAll('canvas').length})");
for (let index = 0; index < 10; index += 1) await evaluate("PCSDeepSpaceManager.close();PCSDeepSpaceManager.open()");
await evaluate("PCSDeepSpaceManager.close()");
const finalState = await evaluate("({viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,dataSources:cesiumViewer.dataSources.length,primitives:cesiumViewer.scene.primitives.length,active:PCSDeepSpaceManager.isOpen(),earthOwner:PCSEarthRenderOwnership.debug()})");

const requiredConsole = [...new Set([...exceptions, ...logErrors])].filter(item => /Uncaught|TypeError|ReferenceError|RangeError|interstellar|deep-space/i.test(item));
const requiredNetwork = failures.filter(item => /interstellar|solar-system|deep-space|Cesium/i.test(item.url));
const report = { generatedAt: new Date().toISOString(), stage: "Interstellar Objects", status: requiredConsole.length || requiredNetwork.length ? "FAIL" : "PASS", url: baseUrl, initial, aliases, passages, playback, languages, lifecycle: { cycles: 10, before: beforeLifecycle, final: finalState }, console: { required: requiredConsole.length, items: requiredConsole }, network: { required: requiredNetwork.length, items: requiredNetwork } };
fs.writeFileSync(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

assert(finalState.viewer === 1 && finalState.cesiumCanvas === 1 && finalState.totalCanvas === beforeLifecycle.totalCanvas && !finalState.active && finalState.earthOwner.active, "Viewer/canvas/Earth ownership lifecycle failed");
assert(finalState.dataSources === beforeLifecycle.dataSources - 1 && finalState.primitives === beforeLifecycle.primitives - 3, "interstellar/deep-space cleanup failed");
assert(!requiredConsole.length && !requiredNetwork.length, "required Console or Network failure");
console.log(JSON.stringify(report, null, 2));
socket.close();
