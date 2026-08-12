import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.PCS_CDP_PORT || 9343);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:18765/PCS_OBSERVATORY/?v=release-scale-sequence";
const output = process.env.PCS_REPORT_PATH || path.join(process.cwd(), "PCS_OBSERVATORY/test-results/release-scale-sequence/report.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method:"PUT" }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once:true }); socket.addEventListener("error", reject, { once:true }); });
let sequence = 0;
const pending = new Map(), consoleErrors = [], networkFailures = [], requestUrls = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { const task = pending.get(message.id); pending.delete(message.id); return message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") consoleErrors.push(message.params.entry.text);
  if (message.method === "Network.requestWillBeSent") requestUrls.set(message.params.requestId, message.params.request.url);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push({ url:requestUrls.get(message.params.requestId) || "unknown", error:message.params.errorText });
});
function send(method, params={}) { const id=++sequence; return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));}); }
async function evaluate(expression) { const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value; }
async function waitFor(expression, timeout=120000) { const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error(`Timeout: ${expression}`); }
const assert=(value,message)=>{if(!value)throw new Error(message);};

await Promise.all([send("Runtime.enable"),send("Log.enable"),send("Network.enable"),send("Page.enable")]);
await send("Network.setCacheDisabled",{cacheDisabled:true});
await send("Page.navigate",{url:baseUrl});
await waitFor("document.querySelector('[data-release-center]') && document.querySelector('#intro-enter')");
await evaluate("document.querySelector('#intro-enter').click();sessionStorage.removeItem('pcs-release-center-expanded')");
await waitFor("document.querySelector('[data-release-tab=roadmap]') && document.querySelector('#pcs-update-phase').textContent");
await evaluate("if(document.querySelector('[data-release-center]').classList.contains('is-collapsed'))document.querySelector('#pcs-update-toggle').click();document.querySelector('[data-release-tab=roadmap]').click()");
await waitFor("document.querySelectorAll('.pcs-roadmap > li').length >= 8");

const roadmap = await evaluate(`Object.fromEntries([...document.querySelectorAll('.pcs-roadmap > li')].map(item=>[item.querySelector('strong').textContent,{symbol:item.querySelector('.pcs-roadmap-symbol').textContent,status:item.querySelector('.pcs-release-status').textContent,detail:item.querySelector('div > span').textContent,items:[...item.querySelectorAll('.pcs-roadmap-items li')].map(node=>node.textContent)}]))`);
assert(roadmap["Full Orbit View"].symbol === "✅" && roadmap["Full Orbit View"].status === "Production / Frozen", "Full Orbit View freeze status failed");
assert(roadmap["Interstellar Objects"].symbol === "✅" && roadmap["Interstellar Objects"].status === "Production / Verified / Frozen", "Interstellar Objects freeze status failed");
assert(JSON.stringify(roadmap["Interstellar Objects"].items) === JSON.stringify(["1I/ʻOumuamua","2I/Borisov","3I/ATLAS"]), "interstellar object list failed");
assert(roadmap["Milky Way"].symbol === "✅" && roadmap["Milky Way"].status === "Production / Verified / Frozen", "Milky Way frozen status failed");
assert(roadmap.Laniakea.symbol === "⏸" && roadmap.Laniakea.status === "Waiting", "Laniakea waiting status failed");
assert(roadmap["Observable Universe"].symbol === "⏸" && roadmap["Observable Universe"].status === "Waiting", "Observable Universe waiting status failed");
assert(roadmap["CMB 360°"].symbol === "⏸" && roadmap["CMB 360°"].status === "Final observational scale", "CMB final scale status failed");

await evaluate("document.querySelector('[data-release-tab=latest]').click()");
const latest = await evaluate(`[...document.querySelectorAll('.pcs-release-checklist li')].slice(0,3).map(item=>({title:item.querySelector('strong').textContent,detail:item.querySelector('span').textContent}))`);
assert(latest[0].title === "Milky Way — Scientific Scale Anchor" && /Production \/ Verified \/ Frozen.*Scientific Fidelity Levels A–E/.test(latest[0].detail), "latest Milky Way entry failed");
assert(latest[1].title === "Full Orbit View" && /Production \/ Frozen/.test(latest[1].detail), "latest Full Orbit entry failed");
assert(latest[2].title === "Interstellar Objects" && /1I\/ʻOumuamua.*2I\/Borisov.*3I\/ATLAS/.test(latest[2].detail), "latest interstellar entry failed");

const languages = {};
for (const language of ["en","zh-TW","ja","ko"]) {
  await evaluate(`PCSI18n.setLanguage(${JSON.stringify(language)},{persist:false});document.querySelector('[data-release-tab=roadmap]').click()`);
  languages[language] = await evaluate(`(()=>{const byTitle=title=>[...document.querySelectorAll('.pcs-roadmap > li')].find(item=>item.querySelector('strong').textContent===title)?.querySelector('.pcs-release-status').textContent;return {milkyWay:byTitle('Milky Way'),laniakea:byTitle('Laniakea'),cmb:byTitle('CMB 360°')};})()`);
  assert(Object.values(languages[language]).every(Boolean), `${language} scale statuses missing`);
}

const state = await evaluate(`({viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,deepSpace:PCSDeepSpaceManager?.isOpen?.()||false})`);
const requiredConsole = [...new Set(consoleErrors)].filter(message=>/Uncaught|TypeError|ReferenceError|RangeError|release|roadmap/i.test(message));
const requiredNetwork = networkFailures.filter(item=>/releases\.json|release-center\.js|style\.css|index\.html/i.test(item.url));
assert(state.viewer===1&&state.cesiumCanvas===1,"Viewer or Cesium canvas count failed");
assert(!requiredConsole.length&&!requiredNetwork.length,"required Console or Network failure");
const report={generatedAt:new Date().toISOString(),url:baseUrl,status:"PASS",roadmap,latest,languages,state,console:{required:requiredConsole.length,items:requiredConsole},network:{required:requiredNetwork.length,items:requiredNetwork}};
fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
socket.close();
