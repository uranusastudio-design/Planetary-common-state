import fs from "node:fs";
import path from "node:path";

const port=Number(process.env.PCS_CDP_PORT||18800);
const url=process.env.PCS_TEST_URL||`http://127.0.0.1:8767/PCS_OBSERVATORY/?v=milky-way-human-review-${Date.now()}`;
const outputDir=process.env.PCS_MILKY_WAY_OUTPUT||path.join(process.cwd(),"PCS_OBSERVATORY","test-results","milky-way-human-review-2026-08-13");
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
const settle=async(milliseconds=450)=>{await waitFor("!cesiumViewer.camera._currentFlight",10000).catch(()=>{});await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");await wait(milliseconds);};
async function screenshot(name){await settle(250);const result=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});fs.writeFileSync(path.join(outputDir,name),Buffer.from(result.data,"base64"));return name;}

const runtime=()=>evaluate(`({manager:PCSDeepSpaceManager.debug(),viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,primitives:cesiumViewer.scene.primitives.length,dataSources:cesiumViewer.dataSources.length,entities:cesiumViewer.entities.values.length,heap:performance.memory?.usedJSHeapSize??null,raf:{requested:window.__pcsRafAudit?.requested??null,active:window.__pcsRafAudit?.active?.size??null},listeners:{changed:cesiumViewer.camera.changed.numberOfListeners,moveStart:cesiumViewer.camera.moveStart.numberOfListeners,moveEnd:cesiumViewer.camera.moveEnd.numberOfListeners,postRender:cesiumViewer.scene.postRender.numberOfListeners,preRender:cesiumViewer.scene.preRender.numberOfListeners}})`);
const camera=()=>evaluate(`({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],direction:[cesiumViewer.camera.directionWC.x,cesiumViewer.camera.directionWC.y,cesiumViewer.camera.directionWC.z],up:[cesiumViewer.camera.upWC.x,cesiumViewer.camera.upWC.y,cesiumViewer.camera.upWC.z]})`);
const sceneEvidence=()=>evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,points=[],anchors={};for(const collection of cesiumViewer.scene.primitives._primitives||[]){if(collection.show===false||typeof collection.get!=="function"||!Number.isFinite(collection.length))continue;for(let index=0;index<collection.length;index++){const point=collection.get(index);if(point?.show===false||!point?.position||point?.pixelSize==null)continue;const object=point.id?.phase3Object,id=object?.sourceId||object?.id;if(id)anchors[id]={world:[point.position.x,point.position.y,point.position.z],screen:(()=>{const p=Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,point.position);return p?[p.x,p.y]:null;})()};if(Math.abs(point.pixelSize-2.05)<.01||Math.abs(point.pixelSize-2.5)<.01){const p=Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,point.position);if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))points.push([p.x,p.y,point.position.x,point.position.y,point.position.z,point.pixelSize]);}}}const visible=points.filter(p=>p[0]>=0&&p[1]>=0&&p[0]<=canvas.clientWidth&&p[1]<=canvas.clientHeight),bounds=visible.length?[Math.min(...visible.map(p=>p[0])),Math.min(...visible.map(p=>p[1])),Math.max(...visible.map(p=>p[0])),Math.max(...visible.map(p=>p[1]))]:null;return{canvas:[canvas.clientWidth,canvas.clientHeight],diskArmPointCount:points.length,visibleDiskArmPointCount:visible.length,bounds,viewportWidthCoverage:bounds?(bounds[2]-bounds[0])/canvas.clientWidth:null,anchors,samples:points.slice(0,200)};})()`);
const framePerformance=()=>evaluate(`new Promise(resolve=>{let frames=0,started=performance.now(),last=started,worst=0;function sample(now){frames++;worst=Math.max(worst,now-last);last=now;if(now-started>=1500)return resolve({frames,durationMs:now-started,averageFps:frames*1000/(now-started),lowestObservedFps:worst?1000/worst:null,averageFrameTimeMs:(now-started)/frames,worstFrameTimeMs:worst});requestAnimationFrame(sample);}requestAnimationFrame(sample);})`);
const cardLayout=()=>evaluate(`(()=>{const section=document.querySelector('[data-object-card]'),groups=[...section.querySelectorAll('.deep-space-card-group')].map(group=>({name:group.dataset.cardGroup,open:group.open,text:group.textContent}));return{hidden:section.hidden,id:section.dataset.objectId,title:section.querySelector('[data-object-card-title]').textContent,groups,rect:section.getBoundingClientRect().toJSON(),controls:document.querySelector('[data-ds-controls]').getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};})()`);

try{
  await Promise.all([send("Runtime.enable"),send("Network.enable"),send("Page.enable"),send("Performance.enable")]);
  await send("Network.setCacheDisabled",{cacheDisabled:true});
  await send("Network.setBypassServiceWorker",{bypass:true});
  await send("Page.addScriptToEvaluateOnNewDocument",{source:`(()=>{const original=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),active=new Set();window.__pcsRafAudit={requested:0,cancelled:0,active};window.requestAnimationFrame=callback=>{let id;id=original(time=>{active.delete(id);callback(time)});active.add(id);window.__pcsRafAudit.requested++;return id};window.cancelAnimationFrame=id=>{active.delete(id);window.__pcsRafAudit.cancelled++;return cancel(id)}})();`});
  await send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send("Page.navigate",{url});
  await waitFor("window.PCSDeepSpaceManager&&window.PCSCosmicTime&&window.PCSMilkyWayDynamics&&document.querySelector('#intro-enter')",300000);
  await evaluate("document.querySelector('#intro-enter')?.click()");
  await waitFor("!document.body.classList.contains('intro-active')&&typeof cesiumViewer!=='undefined'&&cesiumViewer&&!cesiumViewer.isDestroyed()",300000);
  if(!await evaluate("PCSDeepSpaceManager.debug().initialized"))await evaluate("PCSDeepSpaceManager.initialize({viewer:cesiumViewer,host:document.querySelector('#cesium-globe')})");
  await evaluate("PCSI18n.setLanguage('en');PCSDeepSpaceManager.open()");
  await waitFor("PCSDeepSpaceManager.isOpen()");
  const before=await runtime();
  assert(before.viewer===1&&before.cesiumCanvas===1,"one existing Viewer and Cesium canvas before Milky Way");
  const entered=await evaluate("PCSDeepSpaceManager.enterMilkyWay()");
  if(!entered){const failure=await evaluate("({message:document.querySelector('[data-ds-error-message]')?.textContent,status:document.querySelector('[data-ds-status]')?.textContent,debug:PCSDeepSpaceManager.debug()})");throw new Error(`Milky Way entry: ${JSON.stringify(failure)}`);}
  await settle(700);
  const initial=await runtime(),debug=initial.manager.milkyWay;
  assert(initial.manager.scaleContext==="milky-way","Milky Way is current scale");
  assert(debug.realHmsfrCount===199&&debug.realNearbyCatalogCount===1200&&debug.realSatelliteCount===2,"catalog counts");
  assert(debug.dynamicsModelId==="pcs-mw-differential-rotation-eilers2019-v1","dynamics model loaded");
  assert(initial.manager.cosmicTime.listenerCount===1,"one Cosmic Time subscriber");
  const card=await cardLayout();
  assert(card.groups.length===4&&card.groups[0].open&&card.groups.slice(1).every(group=>!group.open),"only PRIMARY Object Card group is open by default");
  const languages={};
  const expected={en:["Model Evolution","Observation Epoch","PRIMARY","SCIENTIFIC","PROVENANCE","LIMITATIONS"],"zh-TW":["模型演化","觀測曆元","主要資訊","科學資料","資料溯源","限制"],ja:["モデル進化","観測元期","主要情報","科学データ","来歴","制限"],ko:["모델 진화","관측 역기점","주요 정보","과학 데이터","출처","한계"]};
  for(const language of Object.keys(expected)){
    await evaluate(`PCSI18n.setLanguage(${JSON.stringify(language)})`);await wait(60);
    const values=await evaluate(`(()=>{const groups=[...document.querySelectorAll('.deep-space-card-group summary')].map(node=>node.textContent);return[document.querySelector('[data-mw=modelEvolution]').textContent,document.querySelector('[data-ds-mw-time-preset="0"]').textContent,...groups,PCSDeepSpaceManager.debug().cosmicTime.listenerCount]})()`);
    assert(JSON.stringify(values.slice(0,6))===JSON.stringify(expected[language]),`${language} Milky Way time and card groups`);
    assert(values[6]===1,`${language} keeps one Cosmic Time state`);languages[language]=values;
  }
  await evaluate("PCSI18n.setLanguage('en')");
  const playCamera=await camera();await evaluate("document.querySelector('[data-ds-mw-time-play]').click()");await wait(350);await evaluate("document.querySelector('[data-ds-mw-time-play]').click()");const played=await evaluate("PCSDeepSpaceManager.debug().cosmicTime");
  assert(played.offsetMyr>0&&!played.playing,"play/pause advances scientific model time");assert(JSON.stringify(await camera())===JSON.stringify(playCamera),"model play never moves the camera");await evaluate("PCSDeepSpaceManager.setMilkyWayModelTime(0)");

  const views={};
  for(const [view,file] of [["face-on","01-face-on-1920x1080.png"],["oblique","02-oblique-1920x1080.png"],["edge-on","03-edge-on-1920x1080.png"]]){
    await evaluate(`PCSDeepSpaceManager.setMilkyWayCamera(${JSON.stringify(view)},{history:true,duration:0});cesiumViewer.camera.completeFlight?.()`);await settle();
    views[view]={camera:await camera(),scene:await sceneEvidence(),screenshot:await screenshot(file),historyDepth:await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth")};
  }
  assert(views["face-on"].scene.viewportWidthCoverage>=.65&&views["face-on"].scene.viewportWidthCoverage<=.80,`face-on disk width coverage ${views["face-on"].scene.viewportWidthCoverage}`);
  assert(Object.values(views).every(value=>value.historyDepth>0),"all overview presets preserve Back history");

  await evaluate("PCSDeepSpaceManager.searchPhase3('Sun');cesiumViewer.camera.completeFlight?.()");await settle();
  const sunFocus={camera:await camera(),card:await cardLayout(),screenshot:await screenshot("04-sun-focus-1920x1080.png")};
  assert(sunFocus.card.id==="milky-way:sun","Sun focus preserves identity");
  assert(await evaluate("PCSDeepSpaceManager.restoreCameraHistory();cesiumViewer.camera.completeFlight?.();true"),"Sun focus Back");

  await evaluate("PCSDeepSpaceManager.searchPhase3('Milky Way');PCSDeepSpaceManager.setMilkyWayModelTime(0);PCSDeepSpaceManager.setMilkyWayCamera('face-on',{duration:0});cesiumViewer.camera.completeFlight?.()");await settle();
  const timeFrames={};
  for(const offset of [0,1,10,50,100]){
    await evaluate(`PCSDeepSpaceManager.setMilkyWayModelTime(${offset})`);await settle();
    timeFrames[offset]={camera:await camera(),scene:await sceneEvidence(),debug:(await runtime()).manager.milkyWay,screenshot:await screenshot(`MW-${offset===0?"T0":`${offset}Myr`}.png`)};
  }
  const cameraSignature=value=>JSON.stringify(value.camera),fixedCamera=cameraSignature(timeFrames[0]);
  assert(Object.values(timeFrames).every(value=>cameraSignature(value)===fixedCamera),"T0/T1/T10/T50/T100 use exactly the same camera");
  const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));
  const anchor=(frame,id)=>frame.scene.anchors[id]?.world;
  assert(distance(anchor(timeFrames[0],"milky-way:sun"),anchor(timeFrames[100],"milky-way:sun"))>1,"Sun moves under model state");
  assert(distance(anchor(timeFrames[0],"milky-way:galactic-center"),anchor(timeFrames[100],"milky-way:galactic-center"))<1e-9,"Galactic Center remains fixed");
  assert(distance(anchor(timeFrames[0],"LMC"),anchor(timeFrames[100],"LMC"))<1e-9&&distance(anchor(timeFrames[0],"SMC"),anchor(timeFrames[100],"SMC"))<1e-9,"LMC and SMC do not inherit disk rotation");
  const tracerMovements=timeFrames[0].scene.samples.map((sample,index)=>distance(sample.slice(2,5),timeFrames[100].scene.samples[index].slice(2,5)));
  assert(Math.max(...tracerMovements)>1,"disk model tracers move where the adopted 5–25 kpc curve applies");

  const anchorVisibility={};
  await evaluate("PCSDeepSpaceManager.setMilkyWayModelTime(0);PCSDeepSpaceManager.setMilkyWayCamera('face-on',{duration:0});cesiumViewer.camera.completeFlight?.()");await settle();
  const anchors=(await sceneEvidence()).anchors;
  for(const id of ["milky-way:sun","milky-way:galactic-center","LMC","SMC"]){const value=anchors[id],canvas=(await sceneEvidence()).canvas;anchorVisibility[id]={...value,visible:Boolean(value?.screen&&value.screen[0]>=0&&value.screen[1]>=0&&value.screen[0]<=canvas[0]&&value.screen[1]<=canvas[1])};}
  assert(anchorVisibility["milky-way:sun"].visible&&anchorVisibility["milky-way:galactic-center"].visible,"Sun and Galactic Center visible in overview");
  assert(anchorVisibility.LMC.visible&&anchorVisibility.SMC.visible,"LMC and SMC visible in overview");

  const resolutions={};
  for(const [width,height,mobile,file] of [[2560,1440,false,"05-face-on-2560x1440.png"],[390,844,true,"06-mobile-390x844.png"],[3840,2160,false,"07-face-on-3840x2160.png"],[5120,2160,false,"08-face-on-5120x2160.png"]]){
    await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile});
    assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),`${width}x${height} Milky Way load`);
    await evaluate("PCSDeepSpaceManager.setMilkyWayModelTime(0);PCSDeepSpaceManager.setMilkyWayCamera('face-on',{duration:0});cesiumViewer.camera.completeFlight?.()");await settle(650);
    const state=await runtime(),scene=await sceneEvidence(),layout=await cardLayout(),performance=await framePerformance();
    assert(state.viewer===1&&state.cesiumCanvas===1,`${width}x${height} one Viewer/canvas`);
    assert(!layout.overflow,`${width}x${height} no horizontal overflow`);
    resolutions[`${width}x${height}`]={state,scene,layout,performance,screenshot:await screenshot(file)};
  }

  await send("Emulation.setDeviceMetricsOverride",{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),"desktop reload before lifecycle test");await settle();
  const lifecycleBefore=await runtime();
  await evaluate(`(async()=>{for(let index=0;index<30;index++){PCSDeepSpaceManager.setMilkyWayModelTime(index%2?100:0);PCSDeepSpaceManager.setMilkyWayCamera(index%3===0?'face-on':index%3===1?'oblique':'edge-on',{duration:0});cesiumViewer.camera.completeFlight?.();}for(let index=0;index<20;index++){PCSDeepSpaceManager.close();PCSDeepSpaceManager.open();await PCSDeepSpaceManager.enterMilkyWay();cesiumViewer.camera.completeFlight?.();}return true})()`);
  await settle(700);
  const lifecycleAfter=await runtime();
  assert(lifecycleAfter.viewer===1&&lifecycleAfter.cesiumCanvas===1&&lifecycleAfter.totalCanvas===lifecycleBefore.totalCanvas,"no viewer/canvas growth");
  assert(lifecycleAfter.primitives===lifecycleBefore.primitives&&lifecycleAfter.dataSources===lifecycleBefore.dataSources,"no primitive/DataSource growth");
  assert(JSON.stringify(lifecycleAfter.listeners)===JSON.stringify(lifecycleBefore.listeners),"no Cesium listener growth");
  assert(lifecycleAfter.raf.active===lifecycleBefore.raf.active,"no active RAF growth");
  assert(lifecycleAfter.manager.cosmicTime.listenerCount===1,"one Cosmic Time subscriber after open/close cycles");
  const performance=await framePerformance();
  const requiredNetworkFailures=networkFailures.filter(item=>item.url.startsWith(new URL(url).origin)&&!/favicon/i.test(item.url));
  assert(consoleErrors.length===0,"Console exceptions must equal zero");
  assert(requiredNetworkFailures.length===0,"Required local network failures must equal zero");
  const report={generatedAt:new Date().toISOString(),status:"READY FOR HUMAN VISUAL REVIEW",url,browser:"Google Chrome via CDP",before,initial,languages,played,views,sunFocus,timeFrames,anchorVisibility,resolutions,lifecycle:{cycles:{timeAndView:30,deepSpaceOpenClose:20},before:lifecycleBefore,after:lifecycleAfter},performance,consoleErrors,networkFailures,requiredNetworkFailures,scientificBoundary:{model:"Eilers et al. 2019 bounded axisymmetric circular-velocity curve",radialRangeKpc:[5,25],gaiaLinearPropagationCapMyr:1,notExactFuture:true,barBulgeHaloStatic:true,magellanicStatic:true,spiralGeometryStatic:true},screenshots:fs.readdirSync(outputDir).filter(name=>name.endsWith(".png")).sort()};
  fs.writeFileSync(path.join(outputDir,"acceptance-report.json"),`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({status:report.status,coverage:views["face-on"].scene.viewportWidthCoverage,catalog:{hmsfr:debug.realHmsfrCount,gaia:debug.realNearbyCatalogCount,satellites:debug.realSatelliteCount},representativeTracers:debug.representativeTracerCount,motion:timeFrames[100].debug.motionStats,resolutions:Object.fromEntries(Object.entries(resolutions).map(([key,value])=>[key,{fps:value.performance.averageFps,lowestFps:value.performance.lowestObservedFps,coverage:value.scene.viewportWidthCoverage}])),lifecycle:{viewer:lifecycleAfter.viewer,cesiumCanvas:lifecycleAfter.cesiumCanvas,primitives:[lifecycleBefore.primitives,lifecycleAfter.primitives],dataSources:[lifecycleBefore.dataSources,lifecycleAfter.dataSources],listeners:lifecycleAfter.listeners,rafActive:[lifecycleBefore.raf.active,lifecycleAfter.raf.active]},consoleErrors:consoleErrors.length,requiredNetworkFailures:requiredNetworkFailures.length,outputDir},null,2));
}finally{
  socket.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(()=>null);
}
