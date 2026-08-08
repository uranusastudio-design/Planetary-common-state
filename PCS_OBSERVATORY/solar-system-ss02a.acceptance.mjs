import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.PCS_CDP_PORT || 9343);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:18765/PCS_OBSERVATORY/?v=ss-02a";
const outputDir = process.env.PCS_SS02A_OUTPUT || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "solar-system-ss02a");
fs.mkdirSync(outputDir, { recursive: true });
const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });

let sequence = 0;
const pending = new Map(), exceptions = [], logErrors = [], failures = [], urls = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { const task = pending.get(message.id); pending.delete(message.id); return message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") logErrors.push(message.params.entry.text);
  if (message.method === "Network.requestWillBeSent") urls.set(message.params.requestId, message.params.request.url);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) failures.push({ url: urls.get(message.params.requestId) || "unknown", error: message.params.errorText });
});
function send(method, params = {}) { const id = ++sequence; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })); }
async function evaluate(expression) { const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; }
async function waitFor(expression, timeout = 120000) { const start = Date.now(); while (Date.now() - start < timeout) { if (await evaluate(`Boolean(${expression})`)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`Timeout: ${expression}`); }
function assert(value, message) { if (!value) throw new Error(message); }

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Network.enable"), send("Page.enable")]);
await send("Page.navigate", { url: baseUrl });
await waitFor("window.PCSSolarSystemCore && window.PCSDeepSpaceManager && typeof cesiumViewer !== 'undefined' && cesiumViewer?.scene");
await evaluate("PCSI18n.setLanguage('en',{persist:false});PCSDeepSpaceManager.open();document.querySelector('[data-ds-play]').click();PCSDeepSpaceManager.setEpoch('2026-08-08T12:00:00Z')");

const inspect = () => evaluate(`(()=>{const source=Array.from({length:cesiumViewer.dataSources.length},(_,index)=>cesiumViewer.dataSources.get(index)).find(item=>item.name==='pcs-deep-space-phase-1');const solution=PCSDeepSpaceManager.debug().solarSolution;const metadata=Object.fromEntries([...document.querySelectorAll('[data-solar-label]')].map(dt=>[dt.textContent,dt.nextElementSibling.textContent]));const planets=${JSON.stringify(["mercury","venus","earth","mars","jupiter","saturn","uranus","neptune"])};const entities=source?.entities?.values||[];return {solution,metadata,planetEntities:planets.map(id=>entities.find(entity=>entity.id==='deep-space-'+id)).filter(Boolean).map(entity=>({id:entity.id,show:entity.show!==false,position:entity.position.getValue(Cesium.JulianDate.now())?.toString()})),orbitEntities:entities.filter(entity=>String(entity.id).startsWith('deep-space-orbit-')&&!entity.id.includes('moon')).map(entity=>({id:entity.id,solutionId:entity.properties.solutionId?.getValue?.(),positionMode:entity.properties.positionMode?.getValue?.()})),viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length};})()`);

const normal = await inspect();
assert(normal.solution.id === "jpl-approximate-elements-1800-2050" && normal.solution.coherent, "coherent fallback solution not selected");
assert(normal.solution.displayEpoch === "2026-08-08T12:00:00.000Z" && normal.solution.displayTimeScale === "UTC", "Display Epoch contract failed");
assert(normal.solution.referenceSystem === "ICRF" && normal.solution.ephemerisTimeScale === "TDB", "frame / ephemeris time-scale contract failed");
assert(normal.planetEntities.length === 8 && normal.planetEntities.every(item => item.show && item.position), "eight planet positions were not rendered from the selected solution");
assert(normal.orbitEntities.length === 6 && normal.orbitEntities.every(item => item.solutionId === normal.solution.id && item.positionMode === normal.solution.positionMode), "orbit entities do not share the position solution");
for (const label of ["DISPLAY EPOCH", "SOURCE", "CATALOG / EPHEMERIS", "REFERENCE FRAME", "POSITION MODE", "LAST DATA UPDATE", "UNCERTAINTY / QUALITY STATUS"]) assert(normal.metadata[label], `missing metadata ${label}`);

const legacyEpoch = await evaluate("PCSDeepSpaceManager.setEpoch('2026-08-01T00:00:00Z');PCSDeepSpaceManager.debug().solarSolution");
assert(legacyEpoch.id === "jpl-approximate-elements-1800-2050" && !legacyEpoch.authoritative, "single-epoch legacy snapshot was incorrectly promoted");

await evaluate("PCSDeepSpaceManager.setEpoch('2100-01-01T00:00:00Z')");
const unavailable = await inspect();
assert(unavailable.solution.positionMode === "Unavailable", "out-of-range epoch did not become unavailable");
assert(unavailable.planetEntities.length === 0 && unavailable.orbitEntities.length === 0, "stale planet bodies or orbits remained at unavailable epoch");

const languages = {};
const expected = { en:"DISPLAY EPOCH", "zh-TW":"顯示曆元", ja:"表示元期", ko:"표시 역기점" };
for (const [language, label] of Object.entries(expected)) {
  await evaluate(`PCSI18n.setLanguage(${JSON.stringify(language)},{persist:false})`);
  languages[language] = await evaluate("[...document.querySelectorAll('[data-solar-label]')].map(item=>item.textContent)");
  assert(languages[language].includes(label) && languages[language].length === 7, `${language} metadata labels failed`);
}

await evaluate("PCSDeepSpaceManager.setEpoch('2026-08-08T12:00:00Z');PCSDeepSpaceManager.close()");
const finalState = await evaluate("({viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,active:PCSDeepSpaceManager.isOpen(),earthOwner:PCSEarthRenderOwnership.debug()})");
const requiredConsole = [...new Set([...exceptions, ...logErrors])].filter(value => /Uncaught|TypeError|ReferenceError|RangeError|solar-system|deep-space/i.test(value));
const requiredNetwork = failures.filter(item => /solar-system|deep-space|Cesium/i.test(item.url));
const report = { generatedAt:new Date().toISOString(), status:requiredConsole.length||requiredNetwork.length?"FAIL":"PASS", stage:"SS-02A", normal, legacyEpoch, unavailable, languages, finalState, console:{required:requiredConsole.length,items:requiredConsole}, network:{required:requiredNetwork.length,items:requiredNetwork} };
fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
assert(finalState.viewer === 1 && finalState.cesiumCanvas === 1 && finalState.totalCanvas === normal.totalCanvas && !finalState.active && finalState.earthOwner.active, "renderer or Earth ownership lifecycle failed");
assert(!requiredConsole.length && !requiredNetwork.length, "required Console or Network failure");
socket.close();
