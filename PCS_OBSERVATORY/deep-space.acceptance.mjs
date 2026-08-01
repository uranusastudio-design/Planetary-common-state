import process from "node:process";

const cdpPort = Number(process.env.PCS_CDP_PORT || 9224);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:8765/PCS_OBSERVATORY/?v=deep-space-phase-1";
const target = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(baseUrl)}`, { method:"PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once:true }); socket.addEventListener("error", reject, { once:true }); });
let sequence = 0;
const pending = new Map();
const consoleErrors = [];
const networkFailures = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { const {resolve,reject}=pending.get(message.id);pending.delete(message.id);return message.error?reject(new Error(message.error.message)):resolve(message.result); }
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") consoleErrors.push(message.params.entry.text);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push(message.params.errorText);
});
function send(method, params={}) { const id=++sequence;socket.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>pending.set(id,{resolve,reject})); }
async function evaluate(expression) { const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value; }
async function waitFor(expression, timeout=45000) { const started=Date.now();while(Date.now()-started<timeout){if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,250));}throw new Error(`Timeout: ${expression}`); }
function assert(value, message) { if(!value) throw new Error(message); }

await Promise.all([send("Runtime.enable"),send("Log.enable"),send("Network.enable"),send("Performance.enable"),send("HeapProfiler.enable"),send("Page.enable")]);
await waitFor("window.PCSDeepSpaceManager && document.querySelector('[data-solar-target=\"deep-space\"]')");
const initial = await evaluate(`({canvas:document.querySelectorAll('canvas').length,viewer:document.querySelectorAll('.cesium-viewer').length,errors:document.querySelectorAll('.startup-error').length})`);
assert(initial.viewer===1,"Expected one Cesium Viewer before Deep Space");

await evaluate(`(async()=>{PCSDeepSpaceManager.open();for(const id of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']){document.querySelector('[data-body="'+id+'"]').click();await new Promise(r=>setTimeout(r,20));}PCSDeepSpaceManager.close();await new Promise(r=>setTimeout(r,50));})()`);
await send("HeapProfiler.collectGarbage");
const heapBefore = (await send("Performance.getMetrics")).metrics.find((item)=>item.name==="JSHeapUsedSize")?.value;
const cycles = await evaluate(`(async()=>{const out=[];for(let i=0;i<20;i++){PCSDeepSpaceManager.open();await new Promise(r=>setTimeout(r,30));out.push(PCSDeepSpaceManager.debug());PCSDeepSpaceManager.close();await new Promise(r=>setTimeout(r,20));}return out;})()`);
assert(cycles.every((item)=>item.viewerCount===1 && item.canvasCount===initial.canvas && item.tickListenerActive),"Open/close cycle duplicated Viewer, canvas, or lost tick listener");
assert(!(await evaluate("PCSDeepSpaceManager.isOpen()")),"Deep Space remained open after cycles");

const switchResult = await evaluate(`(async()=>{PCSDeepSpaceManager.open();const ids=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];for(let i=0;i<30;i++){document.querySelector('[data-body="'+ids[i%ids.length]+'"]').click();await new Promise(r=>setTimeout(r,25));}return {debug:PCSDeepSpaceManager.debug(),bodies:document.querySelectorAll('[data-body]').length,info:document.querySelector('[data-ds-info]').textContent};})()`);
assert(switchResult.bodies===9 && /Saturn/.test(switchResult.info),"Thirty-body switch sequence ended with incorrect state");
const modeResult = await evaluate(`(()=>{document.querySelector('[data-mode="scientific"]').click();const sci=document.querySelector('[data-ds-scale-notice]').textContent;document.querySelector('[data-mode="exhibition"]').click();const ex=document.querySelector('[data-ds-scale-notice]').textContent;return {sci,ex};})()`);
assert(/kilometre|公里|km/.test(modeResult.sci) && /compressed|壓縮|圧縮|압축/.test(modeResult.ex),"Scale notices missing");
const fps = await evaluate(`new Promise(resolve=>{let frames=0;const start=performance.now();function count(now){frames+=1;if(now-start>=2000)return resolve(frames/((now-start)/1000));requestAnimationFrame(count);}requestAnimationFrame(count);})`);

const languages = await evaluate(`(async()=>{const result={};for(const lang of ['en','zh-TW','ja','ko']){await PCSI18n.setLanguage(lang,{persist:false});result[lang]=document.querySelector('#deep-space-title').textContent;}return result;})()`);
assert(Object.values(languages).every(Boolean),"A supported language did not render");
await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true,screenWidth:390,screenHeight:844});
const mobile = await evaluate(`({overflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth,zoom:document.querySelector('.deep-space-viewport').style.touchAction||getComputedStyle(document.querySelector('.deep-space-viewport')).touchAction,closeVisible:Boolean(document.querySelector('[data-ds-close]').offsetParent),collapsible:Boolean(document.querySelector('[data-ds-collapse]'))})`);
assert(mobile.overflow && mobile.closeVisible && mobile.collapsible && switchResult.debug.zoomEnabled,"Mobile overlay acceptance failed");
await send("Network.emulateNetworkConditions",{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
await evaluate("window.dispatchEvent(new Event('offline'))");
const offline = await evaluate(`({status:document.querySelector('[data-ds-connectivity]')?.textContent||'missing',bodies:document.querySelectorAll('[data-body]').length,selected:window.PCSDeepSpaceManager?.debug?.().selected||'missing'})`);
assert(offline.bodies===9 && /Offline|離線|オフライン|오프라인/.test(offline.status),`Offline cache/fallback mode failed: ${JSON.stringify(offline)}`);
await send("Network.emulateNetworkConditions",{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
await evaluate("PCSDeepSpaceManager.close()");
await send("HeapProfiler.collectGarbage");
const heapAfter = (await send("Performance.getMetrics")).metrics.find((item)=>item.name==="JSHeapUsedSize")?.value;
await evaluate(`(async()=>{for(let i=0;i<20;i++){PCSDeepSpaceManager.open();await new Promise(r=>setTimeout(r,20));PCSDeepSpaceManager.close();await new Promise(r=>setTimeout(r,15));}})()`);
await send("HeapProfiler.collectGarbage");
const heapSecond = (await send("Performance.getMetrics")).metrics.find((item)=>item.name==="JSHeapUsedSize")?.value;
const finalState = await evaluate(`({canvas:document.querySelectorAll('canvas').length,viewer:document.querySelectorAll('.cesium-viewer').length,deep:PCSDeepSpaceManager.debug(),earthHost:Boolean(document.querySelector('#cesium-globe').closest('.observatory-stage,.observatory-globe,.celestial-viewer,.globe-shell'))})`);
assert(finalState.viewer===1 && finalState.canvas===initial.canvas && !finalState.deep.active,"Cleanup acceptance failed");

const report={url:baseUrl,initial,openCloseCycles:cycles.length,stabilityCycles:20,bodySwitches:30,viewerCount:finalState.viewer,canvasCount:finalState.canvas,tickListenerAfterClose:finalState.deep.tickListenerActive,fpsHeadlessChrome:fps,languages,mobile,offline,heapBefore,heapAfter,heapDeltaBytes:heapAfter-heapBefore,heapSecond,continuedHeapDeltaBytes:heapSecond-heapAfter,consoleErrors:[...new Set(consoleErrors)],networkFailures:[...new Set(networkFailures)]};
console.log(JSON.stringify(report,null,2));
socket.close();
