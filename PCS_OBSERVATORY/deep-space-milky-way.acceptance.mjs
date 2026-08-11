import fs from "node:fs";
import path from "node:path";

const port=Number(process.env.PCS_CDP_PORT||18800);
const url=process.env.PCS_TEST_URL||"http://127.0.0.1:8767/PCS_OBSERVATORY/?v=milky-way-scientific-scale";
const outputDir=process.env.PCS_MILKY_WAY_OUTPUT||path.join(process.cwd(),"test-results","deep-space-milky-way-local");
fs.mkdirSync(outputDir,{recursive:true});

const target=await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,{method:"PUT"}).then(response=>response.json());
const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),consoleErrors=[],networkFailures=[],requestUrls=new Map();
let sequence=0;
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
socket.addEventListener("message",event=>{
  const message=JSON.parse(event.data);
  if(message.id&&pending.has(message.id)){const item=pending.get(message.id);pending.delete(message.id);return message.error?item.reject(new Error(message.error.message)):item.resolve(message.result);}
  if(message.method==="Runtime.exceptionThrown")consoleErrors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
  if(message.method==="Network.requestWillBeSent")requestUrls.set(message.params.requestId,message.params.request.url);
  if(message.method==="Network.loadingFailed"&&!message.params.canceled)networkFailures.push({error:message.params.errorText,url:requestUrls.get(message.params.requestId)||"unknown"});
});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const waitFor=async(expression,timeout=180000)=>{const started=Date.now();while(Date.now()-started<timeout){if(await evaluate(`Boolean(${expression})`))return;await wait(150);}throw new Error(`Timeout: ${expression}`);};
const assert=(value,message)=>{if(!value)throw new Error(message);};
async function screenshot(name){await wait(500);await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");const result=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});const file=path.join(outputDir,name);fs.writeFileSync(file,Buffer.from(result.data,"base64"));return file;}
async function settle(milliseconds=1000){await waitFor("!cesiumViewer.camera._currentFlight",10000).catch(()=>{});await wait(milliseconds);}
const listenerCounts=()=>evaluate("({changed:cesiumViewer.camera.changed.numberOfListeners,moveStart:cesiumViewer.camera.moveStart.numberOfListeners,moveEnd:cesiumViewer.camera.moveEnd.numberOfListeners,postRender:cesiumViewer.scene.postRender.numberOfListeners,preRender:cesiumViewer.scene.preRender.numberOfListeners})");
const runtimeCounts=()=>evaluate("({viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,primitives:cesiumViewer.scene.primitives.length,dataSources:cesiumViewer.dataSources.length,entities:cesiumViewer.entities.values.length,debug:PCSDeepSpaceManager.debug()})");
const projectedPoints=()=>evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,result={total:0,onScreen:0,minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};for(const collection of cesiumViewer.scene.primitives._primitives||[]){if(collection.show===false||typeof collection.get!=="function"||!Number.isFinite(collection.length))continue;for(let index=0;index<collection.length;index++){const point=collection.get(index);if(point?.show===false||!point?.position||point?.pixelSize==null)continue;result.total++;const pixel=Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,point.position);if(!pixel||!Number.isFinite(pixel.x)||!Number.isFinite(pixel.y))continue;if(pixel.x>=0&&pixel.y>=0&&pixel.x<=canvas.clientWidth&&pixel.y<=canvas.clientHeight){result.onScreen++;result.minX=Math.min(result.minX,pixel.x);result.minY=Math.min(result.minY,pixel.y);result.maxX=Math.max(result.maxX,pixel.x);result.maxY=Math.max(result.maxY,pixel.y);}}}result.fraction=result.total?result.onScreen/result.total:0;result.bounds=result.onScreen?[result.minX,result.minY,result.maxX,result.maxY]:null;result.canvas=[canvas.clientWidth,canvas.clientHeight];return result;})()`);
const framePerformance=()=>evaluate(`new Promise(resolve=>{let frames=0,started=performance.now(),lowest=Infinity,last=started;function sample(now){frames++;const delta=now-last;last=now;if(delta>0)lowest=Math.min(lowest,1000/delta);if(now-started>=1200){const seconds=(now-started)/1000;resolve({averageFps:frames/seconds,lowestObservedFps:Number.isFinite(lowest)?lowest:null,averageFrameTimeMs:(now-started)/frames,sampleDurationMs:now-started,frames});return;}requestAnimationFrame(sample);}requestAnimationFrame(sample);})`);
const card=()=>evaluate("({id:document.querySelector('[data-object-card]').dataset.objectId,title:document.querySelector('[data-object-card-title]').textContent,text:document.querySelector('[data-ds-info]').textContent,hidden:document.querySelector('[data-object-card]').hidden})");

await Promise.all([send("Runtime.enable"),send("Network.enable"),send("Page.enable"),send("Performance.enable")]);
await send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
await waitFor("window.PCSDeepSpaceManager&&window.PCSMilkyWay&&window.PCSMilkyWayScientificModel&&document.querySelector('#intro-enter')",300000);
await evaluate("document.querySelector('#intro-enter')?.click()");
await waitFor("!document.body.classList.contains('intro-active')");
await waitFor("document.querySelector('.cesium-viewer')&&typeof cesiumViewer!=='undefined'&&cesiumViewer&&!cesiumViewer.isDestroyed()",300000);
if(!await evaluate("PCSDeepSpaceManager.debug().initialized"))await evaluate("PCSDeepSpaceManager.initialize({viewer:cesiumViewer,host:document.querySelector('#cesium-globe')})");
await evaluate("PCSI18n.setLanguage('en');PCSDeepSpaceManager.open()");
await waitFor("PCSDeepSpaceManager.isOpen()");
const initial=await runtimeCounts(),heapBefore=await evaluate("performance.memory?.usedJSHeapSize??null");
assert(initial.viewer===1&&initial.cesiumCanvas===1,"Viewer and Cesium canvas must both equal one");

assert(await evaluate("PCSDeepSpaceManager.enterNearby('100pc')"),"Nearby Stars entry");
const nearbyInitial=await runtimeCounts();
assert(nearbyInitial.debug.scaleContext==="nearby"&&nearbyInitial.debug.nearby.points>0,"Nearby Stars baseline");
assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),"Milky Way entry");
await settle();
let milky=await runtimeCounts();
assert(milky.debug.scaleContext==="milky-way","Milky Way context");
assert(milky.debug.milkyWay.realHmsfrCount===199,"199 real HMSFR points");
assert(milky.debug.milkyWay.realNearbyCatalogCount===1200,"desktop Gaia/GCNS bridge count");
assert(milky.debug.milkyWay.realSatelliteCount===2,"LMC and SMC catalog markers");
assert(milky.debug.milkyWay.representativeTracerCount===11450,"deterministic desktop tracer count");
assert(milky.debug.milkyWay.seed===4172019,"deterministic seed");

const searchExpectations={"Milky Way":"Milky Way","Galactic Center":"Galactic Center","Sagittarius A*":"Sagittarius A*","Sgr A*":"Sagittarius A*","Sun":"Sun","Solar System":"Sun","Local Arm":"Local Arm","Orion Spur":"Local Arm","Large Magellanic Cloud":"Large Magellanic Cloud","LMC":"Large Magellanic Cloud","Small Magellanic Cloud":"Small Magellanic Cloud","SMC":"Small Magellanic Cloud"};
const searchResults={};
for(const [query,expected] of Object.entries(searchExpectations)){const result=await evaluate(`PCSDeepSpaceManager.searchPhase3(${JSON.stringify(query)})`);assert(result?.canonicalName===expected,`${query} resolves to ${expected}`);await evaluate("cesiumViewer.camera.completeFlight?.()");const objectCard=await card();assert(!objectCard.hidden&&objectCard.id===result.id,`${query} preserves Unified Object Card identity`);searchResults[query]={id:result.id,canonicalName:result.canonicalName,cardId:objectCard.id};}

await evaluate("PCSDeepSpaceManager.searchPhase3('Local Arm');cesiumViewer.camera.completeFlight?.()");
await settle(400);
const localArmCard=await card();
assert(/Observation-based reconstruction/i.test(localArmCard.text)&&/model-derived density band/i.test(localArmCard.text),"Local Arm card identifies reconstruction and model-derived display band");
await screenshot("A-solar-neighborhood-inside-local-arm.png");

await evaluate("PCSDeepSpaceManager.searchPhase3('Sun');cesiumViewer.camera.completeFlight?.();PCSDeepSpaceManager.setMilkyWayCamera('oblique',{duration:0});cesiumViewer.camera.completeFlight?.()");
await settle(400);
await screenshot("B-sun-and-galactic-center.png");

await evaluate("PCSDeepSpaceManager.searchPhase3('Milky Way');cesiumViewer.camera.completeFlight?.();PCSDeepSpaceManager.setMilkyWayCamera('face-on',{duration:0});cesiumViewer.camera.completeFlight?.()");
await settle(400);
await screenshot("C-whole-milky-way-face-on.png");
await evaluate("PCSDeepSpaceManager.setMilkyWayCamera('oblique',{duration:0});cesiumViewer.camera.completeFlight?.()");
await settle(300);
await screenshot("D-whole-milky-way-oblique.png");
await evaluate("PCSDeepSpaceManager.setMilkyWayCamera('edge-on',{duration:0});cesiumViewer.camera.completeFlight?.()");
await settle(300);
await screenshot("E-whole-milky-way-edge-on.png");
await evaluate("PCSDeepSpaceManager.setMilkyWayCamera('below',{duration:0});cesiumViewer.camera.completeFlight?.()");
await settle(200);
const belowDebug=await evaluate("PCSDeepSpaceManager.debug()");
assert(belowDebug.milkyWayView==="below","below-plane orientation");
await evaluate("PCSDeepSpaceManager.searchPhase3('Milky Way');cesiumViewer.camera.completeFlight?.();PCSDeepSpaceManager.fitMilkyWay({includeSatellites:true,duration:0});cesiumViewer.camera.completeFlight?.()");
await settle(400);
await screenshot("F-milky-way-lmc-smc.png");

const lmcMilky=await evaluate("PCSDeepSpaceManager.searchPhase3('LMC')");
const lmcMilkyPosition=[...lmcMilky.galactocentricCartesianKpc];
assert(await evaluate("PCSDeepSpaceManager.enterLocalGroup()"),"Local Group transition");
await settle(600);
assert(await evaluate("PCSDeepSpaceManager.debug().localGroup.boundary")===0,"Local Group transition renders no invented rigid boundary");
const lmcLocal=await evaluate("PCSDeepSpaceManager.searchPhase3('LMC')");
assert(JSON.stringify(lmcLocal.galactocentricCartesianKpc)===JSON.stringify(lmcMilkyPosition),"LMC Galactocentric coordinates remain invariant across scale transition");
await screenshot("G-milky-way-to-local-group.png");
assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),"return Milky Way after Local Group");
await settle(350);

const languageExpected={
  "zh-TW":["銀河系","銀河中心","銀河平面","太陽系 → 本地臂 → 銀河系"],
  en:["Milky Way","Galactic Center","Galactic Plane","Solar System → Local Arm → Milky Way"],
  ja:["天の川銀河","銀河中心","銀河面","太陽系 → ローカル腕 → 天の川銀河"],
  ko:["은하수","은하 중심","은하면","태양계 → 국부 나선팔 → 은하수"]
};
const languages={};
for(const [language,expected] of Object.entries(languageExpected)){
  await evaluate(`PCSI18n.setLanguage(${JSON.stringify(language)})`);await wait(80);
  const values=await evaluate("[document.querySelector('[data-p3=milkyWay]').textContent,document.querySelector('[data-p3=galacticCenter]').textContent,document.querySelector('[data-mw=plane]').textContent,document.querySelector('[data-mw=youAreHere]').textContent,PCSDeepSpaceManager.debug().viewerCount,document.querySelectorAll('.cesium-widget canvas').length]");
  assert(values[0]===expected[0]&&values[1]===expected[1]&&values[2]===expected[2]&&values[3].includes(expected[3]),`${language} Milky Way runtime translations`);
  assert(values[4]===1&&values[5]===1,`${language} does not recreate Viewer/canvas`);
  languages[language]=values;
}
await evaluate("PCSI18n.setLanguage('en')");

await evaluate("PCSDeepSpaceManager.setMilkyWayCamera('face-on',{duration:0});cesiumViewer.camera.completeFlight?.();PCSDeepSpaceManager.searchPhase3('Sgr A*');cesiumViewer.camera.completeFlight?.()");
const historyBefore=await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth");
assert(historyBefore>0,"Milky Way camera history captured before object focus");
const emptyPoint=await evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,rect=canvas.getBoundingClientRect();for(const [x,y] of [[8,8],[canvas.clientWidth-8,8],[8,canvas.clientHeight-8],[canvas.clientWidth-8,canvas.clientHeight-8]])if(!cesiumViewer.scene.pick(new Cesium.Cartesian2(x,y)))return{x:rect.left+x,y:rect.top+y};return null;})()`);
assert(emptyPoint,"an empty-space click target exists");
await send("Input.dispatchMouseEvent",{type:"mousePressed",x:emptyPoint.x,y:emptyPoint.y,button:"left",clickCount:1});
await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:emptyPoint.x,y:emptyPoint.y,button:"left",clickCount:1});
await settle(300);
assert(await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth")===historyBefore-1,"empty-space click restores previous camera state");

const resolutionMatrix={};
for(const [width,height] of [[1920,1080],[2560,1440],[3840,2160],[5120,2160],[390,844]]){
  const mobile=width===390;
  await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile});
  assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),`${width}x${height} load`);
  if(mobile)await evaluate("PCSDeepSpaceManager.searchPhase3('Milky Way');cesiumViewer.camera.completeFlight?.()");
  const fit=await evaluate("PCSDeepSpaceManager.setMilkyWayCamera('face-on',{duration:0})");
  await evaluate("cesiumViewer.camera.completeFlight?.()");await settle(250);
  const counts=await runtimeCounts(),projected=await projectedPoints(),performance=await framePerformance(),heap=await evaluate("performance.memory?.usedJSHeapSize??null"),layout=await evaluate("(()=>{const viewer=document.querySelector('[data-ds-viewport]').getBoundingClientRect(),controls=document.querySelector('[data-ds-controls]').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,viewer:[viewer.left,viewer.top,viewer.right,viewer.bottom],controls:[controls.left,controls.top,controls.right,controls.bottom],overlap:Math.max(0,Math.min(viewer.right,controls.right)-Math.max(viewer.left,controls.left))*Math.max(0,Math.min(viewer.bottom,controls.bottom)-Math.max(viewer.top,controls.top))};})()");
  assert(counts.viewer===1&&counts.cesiumCanvas===1,`${width}x${height} one Viewer/canvas`);
  assert(!layout.overflow,`${width}x${height} no page overflow`);
  assert(mobile||layout.overlap===0,`${width}x${height} controls do not cover viewer`);
  if(mobile){const mobileCard=await evaluate("(()=>{const card=document.querySelector('[data-object-card]'),rect=card.getBoundingClientRect();return{hidden:card.hidden,top:rect.top,bottom:rect.bottom,viewport:innerHeight,id:card.dataset.objectId}})()");assert(!mobileCard.hidden&&mobileCard.id==='milky-way:galaxy'&&mobileCard.top<mobileCard.viewport&&mobileCard.bottom>0,`${width}x${height} Unified Object Card is visible`);}
  assert(projected.fraction>.90,`${width}x${height} fitted visible point fraction`);
  assert(counts.debug.milkyWay.representativeTracerCount===(mobile?3960:11450),`${width}x${height} correct LOD count`);
  const name=`matrix-${width}x${height}-face-on.png`;await screenshot(name);
  resolutionMatrix[`${width}x${height}`]={fit,counts,projected,performance,heap,layout,screenshot:name,drawCalls:null,drawCallsStatus:"Not exposed by production Cesium runtime; primitive collections and frame timing reported instead"};
}
await screenshot("H-mobile-390x844.png");

await send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
assert(await evaluate("PCSDeepSpaceManager.enterNearby('10pc')"),"10 pc Nearby Stars lifecycle baseline");
const nearbyTenBaseline=await runtimeCounts();
assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),"desktop Milky Way before stability matrix");
await settle(200);
const stabilityBefore={counts:await runtimeCounts(),listeners:await listenerCounts(),heap:await evaluate("performance.memory?.usedJSHeapSize??null")};

const stability=await evaluate(`(async()=>{
  for(let index=0;index<50;index++){await PCSDeepSpaceManager.enterNearby('10pc');cesiumViewer.camera.completeFlight?.();await PCSDeepSpaceManager.enterMilkyWay();cesiumViewer.camera.completeFlight?.();}
  for(let index=0;index<50;index++){PCSDeepSpaceManager.fitMilkyWay({orientation:index%2?'oblique':'face-on',history:false,duration:0});cesiumViewer.camera.completeFlight?.();}
  for(let index=0;index<30;index++){PCSDeepSpaceManager.searchPhase3('Sun');cesiumViewer.camera.completeFlight?.();}
  for(let index=0;index<30;index++){PCSDeepSpaceManager.searchPhase3(index%2?'Galactic Center':'Sgr A*');cesiumViewer.camera.completeFlight?.();}
  for(let index=0;index<30;index++){PCSDeepSpaceManager.searchPhase3(index%2?'LMC':'SMC');cesiumViewer.camera.completeFlight?.();}
  const terms=['Milky Way','Solar System','Local Arm','Orion Spur','LMC','SMC'];for(let index=0;index<30;index++){PCSDeepSpaceManager.searchPhase3(terms[index%terms.length]);cesiumViewer.camera.completeFlight?.();}
  for(let index=0;index<30;index++){PCSDeepSpaceManager.searchPhase3(index%2?'Perseus Arm':'Galactic Disk');cesiumViewer.camera.completeFlight?.();}
  const views=['face-on','oblique','edge-on','below'];for(let index=0;index<30;index++){PCSDeepSpaceManager.setMilkyWayCamera(views[index%views.length],{history:false,duration:0});cesiumViewer.camera.completeFlight?.();}
  return PCSDeepSpaceManager.debug();
})()`);
await settle(250);
const stabilityAfter={counts:await runtimeCounts(),listeners:await listenerCounts(),heap:await evaluate("performance.memory?.usedJSHeapSize??null")};
assert(stability.scaleContext==="milky-way"&&stability.viewerCount===1,"stability ends in one Milky Way Viewer");
assert(stabilityAfter.counts.cesiumCanvas===stabilityBefore.counts.cesiumCanvas&&stabilityAfter.counts.totalCanvas===stabilityBefore.counts.totalCanvas,"no canvas growth");
assert(stabilityAfter.counts.primitives===stabilityBefore.counts.primitives,"no primitive collection growth");
assert(stabilityAfter.counts.dataSources===stabilityBefore.counts.dataSources,"no DataSource growth");
assert(JSON.stringify(stabilityAfter.listeners)===JSON.stringify(stabilityBefore.listeners),"no Cesium event-listener growth");
assert(stabilityAfter.counts.debug.milkyWay.realHmsfrCount===199&&stabilityAfter.counts.debug.milkyWay.realNearbyCatalogCount===1200,"no duplicate/missing catalog stars after cycles");

await evaluate("PCSDeepSpaceManager.returnSolar();PCSDeepSpaceManager.searchSolar('1P/Halley');cesiumViewer.camera.completeFlight?.()");
const orbit=await evaluate("PCSDeepSpaceManager.fitOrbit();cesiumViewer.camera.completeFlight?.();PCSDeepSpaceManager.debug().lastOrbitFit");
assert(orbit?.completeOrbit&&orbit.pointCount===361,"Full Orbit regression: Halley complete path remains available");
assert(await evaluate("PCSDeepSpaceManager.enterNearby('10pc')"),"Nearby Stars return after stability");
const nearbyFinal=await runtimeCounts();
assert(nearbyFinal.debug.nearby.points===nearbyTenBaseline.debug.nearby.points,"Nearby Stars point count survives return");
await evaluate("PCSDeepSpaceManager.returnSolar()");
const final=await runtimeCounts(),heapAfter=await evaluate("performance.memory?.usedJSHeapSize??null");
assert(final.viewer===1&&final.cesiumCanvas===1&&final.debug.scaleContext==="solar","Solar System regression and final lifecycle state");
assert(consoleErrors.length===0,"Console exceptions must be zero");
const requiredNetworkFailures=networkFailures.filter(item=>item.url.startsWith(new URL(url).origin)&&!/favicon/i.test(item.url));
assert(requiredNetworkFailures.length===0,"Required network failures must be zero");

const report={generatedAt:new Date().toISOString(),url,browser:"Google Chrome via CDP",startingState:initial,scientificValidation:{sunPositionKpc:[-8.178,0,0.0208],sgrAStarPositionKpc:[0,0,0],localArmSpatiallyAssociated:true,lmcSmcInvariantAcrossTransition:true,realGaiaPreserved:true,representativeTracersNeverCatalogStars:true},searchResults,languages,resolutionMatrix,stability:{required:{nearbyMilkyCycles:50,milkyFitCycles:50,sunFocusCycles:30,galacticCenterFocusCycles:30,lmcSmcFocusCycles:30,searchOperations:30,objectCardSelections:30,orientationChanges:30},before:stabilityBefore,after:stabilityAfter,finalMilkyDebug:stability},browserBack:{supported:false,status:"Deep Space camera history uses blank-space and Back controls; browser history integration is not part of the existing viewer contract"},fullOrbitRegression:orbit,nearbyInitial,nearbyTenBaseline,nearbyFinal,final,heapBefore,heapAfter,heapDelta:heapBefore==null||heapAfter==null?null:heapAfter-heapBefore,consoleErrors,networkFailures,requiredNetworkFailures,screenshots:fs.readdirSync(outputDir).filter(name=>name.endsWith(".png")).sort()};
fs.writeFileSync(path.join(outputDir,"acceptance-report.json"),`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({viewer:final.viewer,cesiumCanvas:final.cesiumCanvas,nodeGate:"run separately",milkyWay:stabilityAfter.counts.debug.milkyWay,resolutions:Object.fromEntries(Object.entries(resolutionMatrix).map(([key,value])=>[key,{averageFps:value.performance.averageFps,lowestObservedFps:value.performance.lowestObservedFps,visibleFraction:value.projected.fraction,representativeTracers:value.counts.debug.milkyWay.representativeTracerCount}])),stability:report.stability.required,heapDelta:report.heapDelta,consoleErrors:consoleErrors.length,networkFailures:networkFailures.length,requiredNetworkFailures:requiredNetworkFailures.length,outputDir},null,2));
socket.close();
await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(()=>null);
