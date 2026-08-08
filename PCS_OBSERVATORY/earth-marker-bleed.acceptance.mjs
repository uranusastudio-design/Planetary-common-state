import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const port=Number(process.env.PCS_CDP_PORT||9340);
const baseUrl=process.env.PCS_TEST_URL||"http://127.0.0.1:18765/PCS_OBSERVATORY/?v=2.2.0-earth-marker-ownership";
const outputDir=process.env.PCS_EARTH_MARKER_OUTPUT||path.join(process.cwd(),"PCS_OBSERVATORY","test-results","earth-marker-bleed");
const cycleCount=Number(process.env.PCS_EARTH_MARKER_CYCLES||30);
fs.mkdirSync(outputDir,{recursive:true});
const target=await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`,{method:"PUT"}).then(response=>response.json());
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
let sequence=0;
const pending=new Map(),consoleExceptions=[],consoleErrors=[],networkFailures=[],requests=new Map();
socket.addEventListener("message",event=>{
  const message=JSON.parse(event.data);
  if(message.id&&pending.has(message.id)){const task=pending.get(message.id);pending.delete(message.id);return message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);}
  if(message.method==="Runtime.exceptionThrown")consoleExceptions.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
  if(message.method==="Log.entryAdded"&&message.params.entry.level==="error")consoleErrors.push(message.params.entry.text);
  if(message.method==="Network.requestWillBeSent")requests.set(message.params.requestId,message.params.request.url);
  if(message.method==="Network.loadingFailed"&&!message.params.canceled)networkFailures.push({url:requests.get(message.params.requestId)||"unknown",error:message.params.errorText});
});
function send(method,params={}){const id=++sequence;socket.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));}
async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
async function waitFor(expression,timeout=90000){const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error(`Timeout: ${expression}`);}
function assert(value,message){if(!value)throw new Error(message);}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

await Promise.all([send("Runtime.enable"),send("Log.enable"),send("Network.enable"),send("Page.enable")]);
await send("Page.navigate",{url:baseUrl});
await waitFor("window.PCSEarthRenderOwnership && window.PCSDeepSpaceManager && typeof visitorDataSource !== 'undefined' && document.querySelector('.cesium-viewer')");
await evaluate(`renderVisitorLocations([{countryCode:"TW",country:"Taiwan",city:"Taipei",latitude:25.033,longitude:121.5654,count:7}])`);
const identity=await evaluate(`(()=>{const source=visitorDataSource;const entity=source.entities.values[0];const marker=PCSGeographicMarkers.debugSnapshot(cesiumViewer.scene).find(item=>item.layerId==="visitor-locations");return {objectId:entity.id,collectionId:source.name,ownerModule:"app.js visitor network",creationPath:"refreshVisitorLocations -> renderVisitorLocations -> upsertGeographicEntity",graphicsType:entity.point?.constructor?.name||"PointGraphics",color:entity.point?.color?.getValue?.()?.toCssColorString?.()||null,sourceShow:source.show,entityShow:entity.show,selected:cesiumViewer.selectedEntity===entity,sceneParent:"CustomDataSource.entities -> Viewer.dataSourceDisplay",marker};})()`);
assert(identity.collectionId==="visitorDataSource"&&identity.objectId.includes("visitor-locations"),"exact blue visitor point identity was not established");
assert(identity.sourceShow&&identity.entityShow!==false,"Earth marker baseline must be visible before transition");

const scaleResults={};
const inspect=async label=>{
  const result=await evaluate(`(()=>{const source=visitorDataSource;const entities=source?.entities?.values||[];return {label:${JSON.stringify(label)},earthOwner:PCSEarthRenderOwnership.debug(),geographic:PCSGeographicMarkers.debugSnapshot(cesiumViewer.scene).filter(item=>item.layerId==="visitor-locations"),visibleEarthEntities:entities.filter(entity=>entity.show!==false&&source.show).length,viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length};})()`);
  assert(result.visibleEarthEntities===0,`${label}: Earth-owned visitor marker is visible`);
  assert(result.earthOwner.active===false&&result.earthOwner.geographicRenderingEnabled===false,`${label}: Earth ownership is not suspended`);
  assert(result.viewer===1&&result.cesiumCanvas===1,`${label}: Viewer/canvas invariant failed`);
  return result;
};

PCS_SCALE_CYCLES: for(let cycle=0;cycle<cycleCount;cycle++){
  await evaluate("PCSDeepSpaceManager.open()");
  for(const tier of ["10pc","25pc","50pc","100pc"]){
    assert(await evaluate(`PCSDeepSpaceManager.enterNearby(${JSON.stringify(tier)},{reduced:true})`),`${tier} failed in cycle ${cycle+1}`);
    scaleResults[tier]=await inspect(`${tier} cycle ${cycle+1}`);
  }
  assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay({reduced:true})"),`Milky Way failed in cycle ${cycle+1}`);
  scaleResults.milkyWay=await inspect(`Milky Way cycle ${cycle+1}`);
  assert(await evaluate("PCSDeepSpaceManager.enterLocalGroup({reduced:true})"),`Local Group failed in cycle ${cycle+1}`);
  scaleResults.localGroup=await inspect(`Local Group cycle ${cycle+1}`);
  await evaluate("PCSDeepSpaceManager.close()");
  const restored=await evaluate("({owner:PCSEarthRenderOwnership.debug(),sourceShow:visitorDataSource.show,entityShow:visitorDataSource.entities.values[0]?.show,viewer:document.querySelectorAll('.cesium-viewer').length,canvas:document.querySelectorAll('.cesium-widget canvas').length})");
  assert(restored.owner.active&&restored.sourceShow&&restored.owner.visitorDataSource?.entities===1,`Earth marker ownership/data source did not restore after cycle ${cycle+1}`);
  if(cycle===0)await delay(100);
}

const asyncRace=await evaluate(`(async()=>{const originalFetch=window.fetch;let resolveLocations;window.fetch=(input,init)=>String(input).includes("/api/visitors/locations")?new Promise(resolve=>{resolveLocations=resolve;}):originalFetch(input,init);const pendingRefresh=refreshVisitorLocations();while(!resolveLocations)await new Promise(resolve=>setTimeout(resolve,0));PCSDeepSpaceManager.open();await PCSDeepSpaceManager.enterNearby("100pc",{reduced:true});resolveLocations({ok:true,json:async()=>({locations:[{countryCode:"JP",country:"Japan",city:"Tokyo",latitude:35.6762,longitude:139.6503,count:3}]})});await pendingRefresh;await new Promise(resolve=>setTimeout(resolve,25));const result={owner:PCSEarthRenderOwnership.debug(),ids:visitorDataSource.entities.values.map(entity=>entity.id),visible:visitorDataSource.entities.values.filter(entity=>entity.show!==false&&visitorDataSource.show).length};window.fetch=originalFetch;return result;})()`);
assert(asyncRace.visible===0,"late Earth request rendered a marker in Deep Space");
assert(!asyncRace.ids.some(id=>id.includes("Tokyo")),"stale delayed response mutated the marker collection");
await evaluate("PCSDeepSpaceManager.close()");

const requiredFailures=networkFailures.filter(item=>!item.url.startsWith("http://127.0.0.1:8787/")&&!item.url.includes("fonts.googleapis.com")&&!item.url.includes("fonts.gstatic.com"));
const finalState=await evaluate("({viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,owner:PCSEarthRenderOwnership.debug()})");
const report={generatedAt:new Date().toISOString(),status:consoleExceptions.length||requiredFailures.length?"FAIL":"PASS",identity,rootCause:"Deep Space hid globe/imagery but did not deactivate Earth-owned DataSources or geographic markers; activeCelestialTargetId remained earth.",fix:"Explicit Earth render ownership suspension, saved DataSource visibility, geographic rendering gate, and async generation guards.",cycles:cycleCount,scaleResults,asyncRace,finalState,console:{exceptions:consoleExceptions.length,items:consoleExceptions,expectedLocalResourceErrors:consoleErrors.length},network:{requiredFailures:requiredFailures.length,items:requiredFailures},invariants:{viewer:finalState.viewer,cesiumCanvas:finalState.cesiumCanvas,totalCanvas:finalState.totalCanvas}};
fs.writeFileSync(path.join(outputDir,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
assert(consoleExceptions.length===0,"Console exceptions detected");
assert(requiredFailures.length===0,"Required network failures detected");
socket.close();
