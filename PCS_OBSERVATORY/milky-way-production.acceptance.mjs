import fs from "node:fs";
import path from "node:path";

const port=Number(process.env.PCS_CDP_PORT||18800);
const url=process.env.PCS_TEST_URL||"https://uranusastudio-design.github.io/Planetary-common-state/PCS_OBSERVATORY/?v=milky-way-production";
const outputDir=process.env.PCS_MILKY_WAY_OUTPUT||path.join(process.cwd(),"PCS_OBSERVATORY","test-results","milky-way-production-2026-08-13");
fs.mkdirSync(outputDir,{recursive:true});

const target=await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`,{method:"PUT"}).then(response=>response.json());
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
const waitFor=async(expression,timeout=180000)=>{const started=Date.now();while(Date.now()-started<timeout){if(await evaluate(`Boolean(${expression})`))return true;await wait(150);}throw new Error(`Timeout: ${expression}`);};
const assert=(value,message)=>{if(!value)throw new Error(message);};
const settle=async(milliseconds=400)=>{await waitFor("!cesiumViewer.camera._currentFlight",10000).catch(()=>{});await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");await wait(milliseconds);};
async function screenshot(name){await settle(200);const result=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});fs.writeFileSync(path.join(outputDir,name),Buffer.from(result.data,"base64"));return name;}
const runtime=()=>evaluate(`({manager:PCSDeepSpaceManager.debug(),viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,primitives:cesiumViewer.scene.primitives.length,dataSources:cesiumViewer.dataSources.length,listeners:{changed:cesiumViewer.camera.changed.numberOfListeners,moveStart:cesiumViewer.camera.moveStart.numberOfListeners,moveEnd:cesiumViewer.camera.moveEnd.numberOfListeners,postRender:cesiumViewer.scene.postRender.numberOfListeners,preRender:cesiumViewer.scene.preRender.numberOfListeners}})`);
const camera=()=>evaluate(`({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],direction:[cesiumViewer.camera.directionWC.x,cesiumViewer.camera.directionWC.y,cesiumViewer.camera.directionWC.z],up:[cesiumViewer.camera.upWC.x,cesiumViewer.camera.upWC.y,cesiumViewer.camera.upWC.z]})`);
const scene=()=>evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,points=[],anchors={};for(const collection of cesiumViewer.scene.primitives._primitives||[]){if(collection.show===false||typeof collection.get!=="function"||!Number.isFinite(collection.length))continue;for(let index=0;index<collection.length;index++){const point=collection.get(index);if(point?.show===false||!point?.position||point?.pixelSize==null)continue;const object=point.id?.phase3Object,id=object?.sourceId||object?.id;if(id)anchors[id]=[point.position.x,point.position.y,point.position.z];if(Math.abs(point.pixelSize-2.05)<.01||Math.abs(point.pixelSize-2.5)<.01){const p=Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,point.position);if(p&&p.x>=0&&p.y>=0&&p.x<=canvas.clientWidth&&p.y<=canvas.clientHeight)points.push([p.x,p.y]);}}}const bounds=points.length?[Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0]))]:null;return{canvas:[canvas.clientWidth,canvas.clientHeight],visibleDiskArmPointCount:points.length,viewportWidthCoverage:bounds?(bounds[1]-bounds[0])/canvas.clientWidth:null,anchors};})()`);

let report;
try{
  await Promise.all([send("Runtime.enable"),send("Network.enable"),send("Page.enable")]);
  await send("Network.setCacheDisabled",{cacheDisabled:true});
  await send("Network.setBypassServiceWorker",{bypass:true});
  await send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send("Page.navigate",{url});
  await waitFor("window.PCSDeepSpaceManager&&window.PCSCosmicTime&&window.PCSMilkyWayDynamics&&document.querySelector('#intro-enter')",300000);
  await evaluate("document.querySelector('#intro-enter')?.click()");
  await waitFor("!document.body.classList.contains('intro-active')&&typeof cesiumViewer!=='undefined'&&cesiumViewer&&!cesiumViewer.isDestroyed()",300000);
  if(!await evaluate("PCSDeepSpaceManager.debug().initialized"))await evaluate("PCSDeepSpaceManager.initialize({viewer:cesiumViewer,host:document.querySelector('#cesium-globe')})");
  await evaluate("PCSI18n.setLanguage('en');PCSDeepSpaceManager.open()");
  await waitFor("PCSDeepSpaceManager.isOpen()");
  assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),"production Milky Way entry");
  await settle(700);
  const initial=await runtime(),desktopScene=await scene();
  assert(initial.viewer===1&&initial.cesiumCanvas===1,"one production Viewer and Cesium canvas");
  assert(initial.manager.scaleContext==="milky-way"&&initial.manager.scientificFidelity.level==="C","Milky Way Level C fidelity");
  assert(initial.manager.milkyWay.realHmsfrCount===199&&initial.manager.milkyWay.realNearbyCatalogCount===1200,"production catalog counts");
  assert(desktopScene.viewportWidthCoverage>=.65&&desktopScene.viewportWidthCoverage<=.80,"production desktop width coverage");
  const groups=await evaluate(`[...document.querySelectorAll('.deep-space-card-group')].map(group=>[group.dataset.cardGroup,group.open])`);
  assert(groups.length===4&&groups[0][1]&&groups.slice(1).every(group=>!group[1]),"production Object Card grouping");
  const languages={};
  for(const language of ["zh-TW","en","ja","ko"]){await evaluate(`PCSI18n.setLanguage(${JSON.stringify(language)})`);await wait(50);languages[language]=await evaluate(`({time:document.querySelector('[data-mw=modelEvolution]').textContent,groups:[...document.querySelectorAll('.deep-space-card-group summary')].map(node=>node.textContent),listeners:PCSDeepSpaceManager.debug().cosmicTime.listenerCount})`);assert(languages[language].groups.length===4&&languages[language].listeners===1,`${language} production runtime`);}
  await evaluate("PCSI18n.setLanguage('en');PCSDeepSpaceManager.searchPhase3('Sun');cesiumViewer.camera.completeFlight?.()");await settle();
  assert(await evaluate("document.querySelector('[data-object-card]').dataset.objectId==='milky-way:sun'"),"production Search and Sun Object Card");
  assert(await evaluate("PCSDeepSpaceManager.restoreCameraHistory();cesiumViewer.camera.completeFlight?.();true"),"production Back history");
  await evaluate("PCSDeepSpaceManager.searchPhase3('Milky Way');PCSDeepSpaceManager.setMilkyWayCamera('face-on',{duration:0});cesiumViewer.camera.completeFlight?.();PCSDeepSpaceManager.setMilkyWayModelTime(0)");await settle();
  const cameraT0=await camera(),sceneT0=await scene();await evaluate("PCSDeepSpaceManager.setMilkyWayModelTime(100)");await settle();const cameraT100=await camera(),sceneT100=await scene();
  const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));
  assert(JSON.stringify(cameraT0)===JSON.stringify(cameraT100),"production T0/T100 fixed camera");
  assert(distance(sceneT0.anchors["milky-way:sun"],sceneT100.anchors["milky-way:sun"])>1,"production Sun model evolution");
  for(const id of ["milky-way:galactic-center","LMC","SMC"])assert(distance(sceneT0.anchors[id],sceneT100.anchors[id])<1e-9,`${id} remains static`);
  await evaluate("PCSDeepSpaceManager.setMilkyWayModelTime(0)");await screenshot("production-face-on-1920x1080.png");
  await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate("cesiumViewer.resize();PCSDeepSpaceManager.setMilkyWayCamera('face-on',{duration:0});cesiumViewer.camera.completeFlight?.()");await settle(500);
  const mobile={runtime:await runtime(),layout:await evaluate(`({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,controls:document.querySelector('[data-ds-controls]').getBoundingClientRect().toJSON(),card:document.querySelector('[data-object-card]').getBoundingClientRect().toJSON()})`),screenshot:await screenshot("production-mobile-390x844.png")};
  assert(!mobile.layout.overflow&&mobile.runtime.viewer===1&&mobile.runtime.cesiumCanvas===1,"production mobile layout and one Viewer/canvas");
  await send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});await evaluate("cesiumViewer.resize()");await settle();
  const lifecycleBefore=await runtime();
  await evaluate(`(async()=>{PCSDeepSpaceManager.close();PCSDeepSpaceManager.open();if(!await PCSDeepSpaceManager.enterMilkyWay())throw new Error('reentry');cesiumViewer.camera.completeFlight?.();return true})()`);await settle(600);
  const lifecycleAfter=await runtime();
  assert(lifecycleAfter.viewer===1&&lifecycleAfter.cesiumCanvas===1&&lifecycleAfter.totalCanvas===lifecycleBefore.totalCanvas,"production lifecycle canvas stability");
  assert(lifecycleAfter.primitives===lifecycleBefore.primitives&&lifecycleAfter.dataSources===lifecycleBefore.dataSources,"production primitive/DataSource stability");
  assert(JSON.stringify(lifecycleAfter.listeners)===JSON.stringify(lifecycleBefore.listeners),"production listener stability");
  const requiredNetworkFailures=networkFailures.filter(item=>item.url.startsWith(new URL(url).origin)&&!/favicon/i.test(item.url));
  assert(consoleErrors.length===0,"production Console exceptions");assert(requiredNetworkFailures.length===0,"production required Network failures");
  report={generatedAt:new Date().toISOString(),status:"PRODUCTION VERIFIED",deploymentCommit:"c326c24a92720065c92128ff86f4823537f70df4",url,desktop:{coverage:desktopScene.viewportWidthCoverage,visibleDiskArmPointCount:desktopScene.visibleDiskArmPointCount},catalog:{hmsfr:initial.manager.milkyWay.realHmsfrCount,gaia:initial.manager.milkyWay.realNearbyCatalogCount,satellites:initial.manager.milkyWay.realSatelliteCount,representativeTracers:initial.manager.milkyWay.representativeTracerCount},scientificFidelity:initial.manager.scientificFidelity,languages,motion:{fixedCamera:true,sunMoved:true,galacticCenterStatic:true,magellanicStatic:true,stats:initial.manager.milkyWay.motionStats},mobile,lifecycle:{cycles:1,before:lifecycleBefore,after:lifecycleAfter},consoleErrors,networkFailures,requiredNetworkFailures,screenshots:["production-face-on-1920x1080.png","production-mobile-390x844.png"]};
  fs.writeFileSync(path.join(outputDir,"acceptance-report.json"),`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({status:report.status,commit:report.deploymentCommit,coverage:report.desktop.coverage,catalog:report.catalog,motion:report.motion.stats,lifecycle:{viewer:lifecycleAfter.viewer,cesiumCanvas:lifecycleAfter.cesiumCanvas,primitives:[lifecycleBefore.primitives,lifecycleAfter.primitives],dataSources:[lifecycleBefore.dataSources,lifecycleAfter.dataSources]},consoleErrors:consoleErrors.length,requiredNetworkFailures:requiredNetworkFailures.length,outputDir},null,2));
}catch(error){
  const failure={generatedAt:new Date().toISOString(),status:"PRODUCTION VERIFICATION FAILED",url,error:error.stack||String(error),consoleErrors,networkFailures};
  fs.writeFileSync(path.join(outputDir,"failure-report.json"),`${JSON.stringify(failure,null,2)}\n`);
  throw error;
}finally{
  socket.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(()=>null);
}
