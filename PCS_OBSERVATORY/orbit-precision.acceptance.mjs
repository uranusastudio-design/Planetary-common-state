import process from "node:process";

const cdpPort=Number(process.env.PCS_CDP_PORT||9224);
const baseUrl=process.env.PCS_TEST_URL||"http://127.0.0.1:8765/PCS_OBSERVATORY/?v=2.2.0-orbit-precision";
const target=await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(baseUrl)}`,{method:"PUT"}).then(response=>response.json());
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
let sequence=0;const pending=new Map(),consoleErrors=[],networkFailures=[];
socket.addEventListener("message",event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const handlers=pending.get(message.id);pending.delete(message.id);return message.error?handlers.reject(new Error(message.error.message)):handlers.resolve(message.result);}if(message.method==="Runtime.exceptionThrown")consoleErrors.push(message.params.exceptionDetails.text);if(message.method==="Log.entryAdded"&&message.params.entry.level==="error")consoleErrors.push(message.params.entry.text);if(message.method==="Network.loadingFailed"&&!message.params.canceled)networkFailures.push(message.params.errorText);});
function send(method,params={}){const id=++sequence;socket.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));}
async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text);return result.result.value;}
async function waitFor(expression,timeout=60000){const started=Date.now();while(Date.now()-started<timeout){if(await evaluate(`Boolean(${expression})`))return;await new Promise(resolve=>setTimeout(resolve,250));}throw new Error(`Timeout: ${expression}`);}
function assert(value,message){if(!value)throw new Error(message);}

await Promise.all([send("Runtime.enable"),send("Log.enable"),send("Network.enable"),send("Page.enable")]);
await waitFor("window.PCSDeepSpaceManager && typeof cesiumViewer !== 'undefined' && document.querySelector('[data-solar-target=\"deep-space\"]')");
await evaluate("PCSDeepSpaceManager.open()");
await waitFor("PCSDeepSpaceManager.debug().active");
const initial=await evaluate(`({viewer:document.querySelectorAll('.cesium-viewer').length,canvas:document.querySelectorAll('canvas').length,webgl:Boolean(cesiumViewer.scene.context),planetOrbits:cesiumViewer.dataSources.get(cesiumViewer.dataSources.length-1).entities.values.filter(entity=>entity.id.startsWith('deep-space-orbit-')).map(entity=>entity.id)})`);
assert(initial.viewer===1&&initial.webgl,"single WebGL Viewer unavailable");
assert(initial.planetOrbits.length===8,"eight planetary orbits were not rendered");

const systems={earth:["moon"],mars:["phobos","deimos"],jupiter:["io","europa","ganymede","callisto"],saturn:["titan","enceladus"],uranus:["titania"],neptune:["triton"]};
const systemResults={};
for(const [parent,satellites] of Object.entries(systems)){
  systemResults[parent]=await evaluate(`(async()=>{document.querySelector('[data-body="${parent}"]').click();await new Promise(resolve=>setTimeout(resolve,100));const source=cesiumViewer.dataSources.get(cesiumViewer.dataSources.length-1),ids=source.entities.values.map(entity=>entity.id);return {orbits:${JSON.stringify(satellites)}.map(id=>ids.includes('deep-space-orbit-'+id)),bodies:${JSON.stringify(satellites)}.map(id=>ids.includes('deep-space-'+id)),selected:PCSDeepSpaceManager.debug().selected};})()`);
  assert(systemResults[parent].orbits.every(Boolean)&&systemResults[parent].bodies.every(Boolean),`${parent} satellite orbit rendering failed`);
}

const interaction=await evaluate(`(async()=>{document.querySelector('[data-body="earth"]').click();await new Promise(resolve=>setTimeout(resolve,50));const source=cesiumViewer.dataSources.get(cesiumViewer.dataSources.length-1),earthOrbit=source.entities.getById('deep-space-orbit-earth');document.querySelector('[data-ds-step="1"]').click();await new Promise(resolve=>setTimeout(resolve,50));const stepped=PCSDeepSpaceManager.debug().epoch;document.querySelector('[data-mode="scientific"]').click();await new Promise(resolve=>setTimeout(resolve,50));const scientific=PCSDeepSpaceManager.debug().mode;document.querySelector('[data-mode="exhibition"]').click();await new Promise(resolve=>setTimeout(resolve,50));document.querySelector('[data-ds-orbits]').click();const off=source.entities.values.filter(entity=>entity.id.startsWith('deep-space-orbit-')).length;document.querySelector('[data-ds-orbits]').click();const on=source.entities.values.filter(entity=>entity.id.startsWith('deep-space-orbit-')).length;return {width:earthOrbit.polyline.width.getValue(),stepped,scientific,off,on,info:document.querySelector('[data-ds-info]').textContent};})()`);
assert(interaction.width===3,"selected orbit highlight missing");
assert(interaction.scientific==="scientific"&&interaction.off===0&&interaction.on>8,"scale or orbit-toggle lifecycle failed");
assert(/Orbital-element approximation/.test(interaction.info),"orbit precision notice missing");

await evaluate("PCSDeepSpaceManager.close()");
const finalState=await evaluate(`({viewer:document.querySelectorAll('.cesium-viewer').length,canvas:document.querySelectorAll('canvas').length,active:PCSDeepSpaceManager.debug().active})`);
assert(finalState.viewer===1&&finalState.canvas===initial.canvas&&!finalState.active,"orbit lifecycle cleanup failed");
const report={url:baseUrl,initial,systems:systemResults,interaction,finalState,consoleErrors:[...new Set(consoleErrors)],networkFailures:[...new Set(networkFailures)]};
console.log(JSON.stringify(report,null,2));
socket.close();
