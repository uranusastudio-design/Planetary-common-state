import fs from "node:fs";
import path from "node:path";

const port=Number(process.env.PCS_CDP_PORT||19320);
const phase=process.env.PCS_CAMERA_PHASE||"after";
const url=process.env.PCS_TEST_URL||`http://127.0.0.1:8765/PCS_OBSERVATORY/?v=deep-space-camera-${phase}-${Date.now()}`;
const outputDir=process.env.PCS_CAMERA_OUTPUT||path.join(process.cwd(),"PCS_OBSERVATORY","test-results",`deep-space-camera-ux-${phase}`);
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
const waitFor=async(expression,timeout=240000)=>{const started=Date.now();while(Date.now()-started<timeout){if(await evaluate(`Boolean(${expression})`))return true;await wait(150);}throw new Error(`Timeout: ${expression}`);};
const assert=(value,message)=>{if(!value)throw new Error(message);};
const settle=async(milliseconds=300)=>{await waitFor("!cesiumViewer.camera._currentFlight",10000).catch(()=>{});await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");await wait(milliseconds);};
async function screenshot(name){await settle(180);const result=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});fs.writeFileSync(path.join(outputDir,name),Buffer.from(result.data,"base64"));return name;}
async function setViewport(width,height,mobile=false){await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile,screenWidth:width,screenHeight:height});await settle(120);}
async function completeFlight(){await evaluate("cesiumViewer.camera.completeFlight?.()");await wait(40);}
async function finishRestore(expectedDepth=0){await waitFor(`!cesiumViewer.camera._currentFlight&&PCSDeepSpaceManager.debug().cameraHistoryDepth===${expectedDepth}`,3000);await settle(20);}
async function blankPoint(){return evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,rect=canvas.getBoundingClientRect(),selectable=c=>{const v=c?.id||c?.primitive?.id;return Boolean(v?.nearbyStar||v?.smallBody||v?.phase3Object||v?.phase4Object||v?.phase3Reconstruction||v?.properties?.deepSpaceBodyId||v?.properties?.smallBodySpkid||v?.properties?.interstellarId);};for(const fy of [.12,.2,.3,.7,.82,.9])for(const fx of [.08,.16,.28,.72,.84,.92]){const x=rect.left+rect.width*fx,y=rect.top+rect.height*fy;if(document.elementFromPoint(x,y)!==canvas)continue;const local=new Cesium.Cartesian2(canvas.clientWidth*fx,canvas.clientHeight*fy),picks=cesiumViewer.scene.drillPick(local,12,3,3);if(!picks.some(selectable))return{x,y,localX:local.x,localY:local.y};}return null;})()`);}
async function clickBlank(){const point=await blankPoint();assert(point,"blank astronomy coordinate exists");await send("Input.dispatchMouseEvent",{type:"mouseMoved",x:point.x,y:point.y});await send("Input.dispatchMouseEvent",{type:"mousePressed",x:point.x,y:point.y,button:"left",clickCount:1});await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:point.x,y:point.y,button:"left",clickCount:1});await wait(30);return point;}
const vectorDistance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));

const runtime=()=>evaluate(`({manager:PCSDeepSpaceManager.debug(),viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,primitives:cesiumViewer.scene.primitives.length,dataSources:cesiumViewer.dataSources.length,listeners:{changed:cesiumViewer.camera.changed.numberOfListeners,moveStart:cesiumViewer.camera.moveStart.numberOfListeners,moveEnd:cesiumViewer.camera.moveEnd.numberOfListeners,postRender:cesiumViewer.scene.postRender.numberOfListeners,preRender:cesiumViewer.scene.preRender.numberOfListeners}})`);
const camera=()=>evaluate(`({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],direction:[cesiumViewer.camera.directionWC.x,cesiumViewer.camera.directionWC.y,cesiumViewer.camera.directionWC.z],up:[cesiumViewer.camera.upWC.x,cesiumViewer.camera.upWC.y,cesiumViewer.camera.upWC.z],right:[cesiumViewer.camera.rightWC.x,cesiumViewer.camera.rightWC.y,cesiumViewer.camera.rightWC.z],transform:Array.from(cesiumViewer.camera.transform),frustum:{near:cesiumViewer.camera.frustum.near,far:cesiumViewer.camera.frustum.far,fov:cesiumViewer.camera.frustum.fov??null,fovy:cesiumViewer.camera.frustum.fovy??null,aspectRatio:cesiumViewer.camera.frustum.aspectRatio??null,xOffset:cesiumViewer.camera.frustum.xOffset??null,yOffset:cesiumViewer.camera.frustum.yOffset??null}})`);
const focusEvidence=id=>evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,canvasRect=canvas.getBoundingClientRect(),viewportRect=document.querySelector('[data-ds-viewport]').getBoundingClientRect(),controlsRect=document.querySelector('[data-ds-controls]').getBoundingClientRect(),overlayRect=document.querySelector('.deep-space-overlay').getBoundingClientRect();let target=null;for(const collection of cesiumViewer.scene.primitives._primitives||[]){if(collection.show===false||typeof collection.get!=='function')continue;for(let index=0;index<(collection.length||0);index++){const primitive=collection.get(index),record=primitive?.id?.phase3Object||primitive?.id?.phase4Object,recordId=record?.id||record?.sourceId;if(recordId!==${JSON.stringify(id)}||!primitive.position)continue;const point=Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,primitive.position);if(point)target={x:point.x,y:point.y,pixelSize:primitive.pixelSize??null,show:primitive.show!==false};}}const usable=PCSDeepSpaceManager.debug().usableViewport||{left:0,top:0,width:canvas.clientWidth,height:canvas.clientHeight,centerX:canvas.clientWidth/2,centerY:canvas.clientHeight/2};return{target,usable,delta:target?{x:target.x-usable.centerX,y:target.y-usable.centerY,normalizedX:(target.x-usable.centerX)/usable.width,normalizedY:(target.y-usable.centerY)/usable.height}:null,canvas:{width:canvas.clientWidth,height:canvas.clientHeight,rect:canvasRect.toJSON()},viewport:viewportRect.toJSON(),controls:controlsRect.toJSON(),overlay:overlayRect.toJSON(),historyDepth:PCSDeepSpaceManager.debug().cameraHistoryDepth};})()`);
const wheelTiming=async(count=100)=>evaluate(`new Promise(resolve=>{const canvas=cesiumViewer.scene.canvas,rect=canvas.getBoundingClientRect(),started=performance.now(),durations=[],frames=[],cameraEvents={changed:0,moveStart:0,moveEnd:0},removers=[cesiumViewer.camera.changed.addEventListener(()=>cameraEvents.changed++),cesiumViewer.camera.moveStart.addEventListener(()=>cameraEvents.moveStart++),cesiumViewer.camera.moveEnd.addEventListener(()=>cameraEvents.moveEnd++)];let last=performance.now(),raf=0;function sample(now){frames.push(now-last);last=now;if(raf<25){raf++;requestAnimationFrame(sample);}}requestAnimationFrame(sample);for(let index=0;index<${count};index++){const before=performance.now();canvas.dispatchEvent(new WheelEvent('wheel',{clientX:rect.left+rect.width*.43,clientY:rect.top+rect.height*.47,deltaY:index%2?18:-18,bubbles:true,cancelable:true}));durations.push(performance.now()-before);}setTimeout(()=>{removers.forEach(remove=>remove());resolve({count:${count},elapsedMs:performance.now()-started,dispatchTotalMs:durations.reduce((a,b)=>a+b,0),dispatchMeanMs:durations.reduce((a,b)=>a+b,0)/durations.length,dispatchMaxMs:Math.max(...durations),frameMeanMs:frames.length?frames.reduce((a,b)=>a+b,0)/frames.length:null,frameMaxMs:frames.length?Math.max(...frames):null,cameraEvents});},550);})`);
async function focusPhase3(term,id){await evaluate(`PCSDeepSpaceManager.searchPhase3(${JSON.stringify(term)});PCSDeepSpaceManager.focusSelectedObject()`);await completeFlight();const evidence=await focusEvidence(id);assert(evidence.target&&evidence.target.show,`${term} target visible`);assert(Math.abs(evidence.delta.normalizedX)<=.05&&Math.abs(evidence.delta.normalizedY)<=.05,`${term} centered in usable viewport`);return evidence;}
async function focusReturnLoop(count,useBlank=true){let passed=0;for(let index=0;index<count;index++){const before=await camera();await evaluate(`PCSDeepSpaceManager.searchPhase3(${JSON.stringify(index%2?"M33":"M31")});PCSDeepSpaceManager.focusSelectedObject()`);await completeFlight();assert(await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth>0"),`history created ${index}`);if(useBlank)await clickBlank();else assert(await evaluate("PCSDeepSpaceManager.restoreCameraHistory()"),`Back starts ${index}`);await finishRestore();const after=await camera(),depth=await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth");assert(depth===0,`history popped after successful restore ${index}`);assert(vectorDistance(before.position,after.position)<=Math.max(1,Math.hypot(...before.position)*1e-11),`camera restored ${index}`);passed++;}return{attempts:count,passed};}

try{
  await Promise.all([send("Runtime.enable"),send("Network.enable"),send("Page.enable"),send("Performance.enable")]);
  await send("Network.setCacheDisabled",{cacheDisabled:true});
  await send("Network.setBypassServiceWorker",{bypass:true});
  await setViewport(1920,1080);
  await send("Page.navigate",{url});
  await waitFor("window.PCSDeepSpaceManager&&document.querySelector('#intro-enter')",300000);
  await evaluate("document.querySelector('#intro-enter')?.click()");
  await waitFor("!document.body.classList.contains('intro-active')&&typeof cesiumViewer!=='undefined'&&cesiumViewer&&!cesiumViewer.isDestroyed()",300000);
  if(!await evaluate("PCSDeepSpaceManager.debug().initialized"))await evaluate("PCSDeepSpaceManager.initialize({viewer:cesiumViewer,host:document.querySelector('#cesium-globe')})");
  await evaluate("PCSI18n.setLanguage('en');PCSDeepSpaceManager.open()");
  await waitFor("PCSDeepSpaceManager.isOpen()");
  const initial=await runtime();
  assert(initial.viewer===1&&initial.cesiumCanvas===1,"one existing Viewer and Cesium canvas");

  assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),"Milky Way entry");
  await settle(650);
  await evaluate("PCSDeepSpaceManager.searchPhase3('Milky Way')");
  await completeFlight();
  const milkyWay={evidence:await focusEvidence("milky-way:galaxy"),camera:await camera(),screenshot:await screenshot("01-milky-way-focus.png")};
  assert(milkyWay.evidence.target,"Milky Way target available");
  assert(Math.abs(milkyWay.evidence.delta.normalizedX)<=.05&&Math.abs(milkyWay.evidence.delta.normalizedY)<=.05,"Milky Way centered in usable viewport");

  assert(await evaluate("PCSDeepSpaceManager.enterLocalGroup()"),"Local Group entry");
  await settle(650);
  const localGroup={camera:await camera(),screenshot:await screenshot("02-local-group-overview.png")};
  const beforeM31=await camera();
  const m31Evidence=await focusPhase3("M31","mcconnachie2012:029:Andromeda");
  const m31={evidence:await focusEvidence("mcconnachie2012:029:Andromeda"),camera:await camera(),screenshot:await screenshot("03-m31-focus.png")};
  const m31History=await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth");
  const blankReturnPoint=await clickBlank();
  await finishRestore();
  const blankReturnScreenshot=await screenshot("04-blank-space-return.png");
  const m31Return=await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth");
  const blankDebug=await evaluate("PCSDeepSpaceManager.debug().cameraPerformance");
  const afterM31Return=await camera();
  assert(m31History===1&&m31Return===0,`blank-space return pops exactly once after success (${m31History} -> ${m31Return}; ${JSON.stringify(blankDebug)})`);
  assert(vectorDistance(beforeM31.position,afterM31Return.position)<=Math.max(1,Math.hypot(...beforeM31.position)*1e-11),"blank-space return restores exact camera");

  const m33Evidence=await focusPhase3("M33","mcconnachie2012:054:Triangulum");
  const m33={evidence:m33Evidence,camera:await camera(),screenshot:await screenshot("05-m33-focus.png")};
  assert(await evaluate("PCSDeepSpaceManager.restoreCameraHistory()"),"M33 Back starts");
  await finishRestore();

  const timing=await wheelTiming(100);
  assert(timing.dispatchMaxMs<16,"100 wheel inputs remain below one 60 Hz frame each");
  assert((await evaluate("PCSDeepSpaceManager.debug().cameraPerformance.scenePickCalls"))===1,"zoom hot path performs no additional scene picks");

  const desktop=[];
  for(const [width,height] of [[1920,1080],[2560,1440],[3840,2160],[5120,2160]]){
    await setViewport(width,height);
    assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),`Milky Way ${width}`);
    await settle(180);
    await evaluate("PCSDeepSpaceManager.searchPhase3('Milky Way')");await completeFlight();
    const mw=await focusEvidence("milky-way:galaxy");
    assert(Math.abs(mw.delta.normalizedX)<=.05&&Math.abs(mw.delta.normalizedY)<=.05,`Milky Way centered ${width}`);
    assert(await evaluate("PCSDeepSpaceManager.enterLocalGroup()"),`Local Group ${width}`);await settle(180);
    const m31AtSize=await focusPhase3("M31","mcconnachie2012:029:Andromeda");
    await evaluate("PCSDeepSpaceManager.restoreCameraHistory()");await finishRestore();
    const m33AtSize=await focusPhase3("M33","mcconnachie2012:054:Triangulum");
    await evaluate("PCSDeepSpaceManager.restoreCameraHistory()");await finishRestore();
    desktop.push({width,height,milkyWay:mw,m31:m31AtSize,m33:m33AtSize,localGroupCamera:await camera()});
    if(width===1920)await screenshot("06-1920x1080-local-group.png");
  }

  await setViewport(1920,1080);
  await evaluate("PCSDeepSpaceManager.enterLocalGroup()");await settle(180);
  const blankRepeat=await focusReturnLoop(50,true);
  const backRepeat=await focusReturnLoop(50,false);

  let dragInterruptPassed=0;
  for(let index=0;index<30;index++){
    await evaluate("PCSDeepSpaceManager.searchPhase3('M31');PCSDeepSpaceManager.focusSelectedObject()");
    const point=await blankPoint();
    await send("Input.dispatchMouseEvent",{type:"mousePressed",x:point.x,y:point.y,button:"left",clickCount:1});
    await send("Input.dispatchMouseEvent",{type:"mouseMoved",x:point.x+18,y:point.y+12,button:"left",buttons:1});
    await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:point.x+18,y:point.y+12,button:"left",clickCount:1});
    await wait(20);assert((await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth"))===1,`drag does not blank-return ${index}`);
    await evaluate("PCSDeepSpaceManager.restoreCameraHistory()");await finishRestore();dragInterruptPassed++;
  }

  let zoomInterruptPassed=0;
  for(let index=0;index<30;index++){
    await evaluate("PCSDeepSpaceManager.searchPhase3('M33');PCSDeepSpaceManager.focusSelectedObject()");
    await evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,rect=canvas.getBoundingClientRect();canvas.dispatchEvent(new WheelEvent('wheel',{clientX:rect.left+rect.width*.4,clientY:rect.top+rect.height*.4,deltaY:12,bubbles:true,cancelable:true}));})()`);
    await wait(20);const state=await evaluate("PCSDeepSpaceManager.debug()");assert(!state.cameraFlight&&state.cameraHistoryDepth===1,`zoom cleanly interrupts ${index}`);
    await evaluate("PCSDeepSpaceManager.restoreCameraHistory()");await finishRestore();zoomInterruptPassed++;
  }

  let scaleTransitionPassed=0;
  for(let index=0;index<30;index++){
    await evaluate("PCSDeepSpaceManager.enterMilkyWay()");await settle(30);await evaluate("PCSDeepSpaceManager.searchPhase3('Milky Way')");await completeFlight();await evaluate("PCSDeepSpaceManager.restoreCameraHistory()");await finishRestore();
    assert((await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth"))===0,`scale transition restore ${index}`);scaleTransitionPassed++;
  }

  await setViewport(390,844,true);await evaluate("PCSDeepSpaceManager.enterLocalGroup()");await settle(180);
  const mobileBefore=await camera(),mobileM31=await focusPhase3("M31","mcconnachie2012:029:Andromeda"),mobileRect=await evaluate("document.querySelector('.cesium-widget canvas').getBoundingClientRect().toJSON()");
  await send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:mobileRect.left+120,y:mobileRect.top+280,id:1},{x:mobileRect.left+260,y:mobileRect.top+280,id:2}]});
  await send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:mobileRect.left+105,y:mobileRect.top+270,id:1},{x:mobileRect.left+275,y:mobileRect.top+290,id:2}]});
  await send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await wait(450);
  assert((await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth"))===1,"mobile pinch does not trigger blank return");
  const mobileBlankPoint=await clickBlank();await finishRestore();
  assert((await evaluate("PCSDeepSpaceManager.debug().cameraHistoryDepth"))===0,"mobile blank tap returns");
  const mobileAfter=await camera();
  const mobile={m31:mobileM31,before:mobileBefore,after:mobileAfter,blankPoint:mobileBlankPoint,screenshot:await screenshot("07-390x844-mobile-return.png")};

  await setViewport(1920,1080);await evaluate("PCSDeepSpaceManager.returnSolar()");await settle(250);
  const lifecycleBeforeClose=await runtime();await evaluate("PCSDeepSpaceManager.close()");await settle(100);const closed=await runtime();await evaluate("PCSDeepSpaceManager.open()");await settle(250);const reopened=await runtime();
  assert(closed.manager.screenSpaceHandlerActive===false&&closed.manager.pointerNavigationActive===false,"handlers removed on close");
  assert(reopened.viewer===1&&reopened.cesiumCanvas===1,"one Viewer/canvas after reopen");
  assert(reopened.listeners.changed===lifecycleBeforeClose.listeners.changed&&reopened.listeners.moveStart===lifecycleBeforeClose.listeners.moveStart&&reopened.listeners.moveEnd===lifecycleBeforeClose.listeners.moveEnd&&reopened.listeners.postRender===lifecycleBeforeClose.listeners.postRender,"listener counts stable after lifecycle");

  const requiredNetworkFailures=networkFailures.filter(item=>item.url.startsWith(new URL(url).origin));
  const baselinePath=path.join(process.cwd(),"PCS_OBSERVATORY","test-results","deep-space-camera-ux-local","before","acceptance-report.json");
  const baseline=fs.existsSync(baselinePath)?JSON.parse(fs.readFileSync(baselinePath,"utf8")):null;
  const report={generatedAt:new Date().toISOString(),phase,url,initial,milkyWay,localGroup,m31,m33,m31History,m31Return,beforeM31,afterM31Return,blankReturnPoint,blankReturnScreenshot,timing,performanceComparison:{before:baseline?.timing||null,after:timing},desktop,mobile,repeatability:{blankReturn:blankRepeat,backReturn:backRepeat,dragInterrupt:{attempts:30,passed:dragInterruptPassed},zoomInterrupt:{attempts:30,passed:zoomInterruptPassed},scaleTransition:{attempts:30,passed:scaleTransitionPassed}},lifecycle:{beforeClose:lifecycleBeforeClose,closed,reopened},final:await runtime(),consoleErrors,networkFailures,requiredNetworkFailures,screenshots:fs.readdirSync(outputDir).filter(name=>name.endsWith('.png')).sort()};

  fs.writeFileSync(path.join(outputDir,"acceptance-report.json"),`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({phase,milkyWay:milkyWay.evidence,m31:m31Evidence,m33:m33Evidence,m31History,m31Return,timing,repeatability:report.repeatability,lifecycle:{before:lifecycleBeforeClose.listeners,after:reopened.listeners},consoleErrors:consoleErrors.length,networkFailures:networkFailures.length,requiredNetworkFailures:requiredNetworkFailures.length,outputDir},null,2));
}finally{
  socket.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(()=>null);
}
