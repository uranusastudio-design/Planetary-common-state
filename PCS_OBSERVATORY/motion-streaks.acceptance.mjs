import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const cdpPort=Number(process.env.PCS_CDP_PORT||9338);
const baseUrl=process.env.PCS_TEST_URL||"http://127.0.0.1:18765/PCS_OBSERVATORY/?v=2.2.0-motion-streaks";
const outputDir=process.env.PCS_MOTION_OUTPUT||path.join(process.cwd(),"PCS_OBSERVATORY","test-results","motion-streaks");
fs.mkdirSync(outputDir,{recursive:true});
const target=await fetch("http://127.0.0.1:"+cdpPort+"/json/new?"+encodeURIComponent(baseUrl),{method:"PUT"}).then(response=>response.json());
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
let sequence=0;
const pending=new Map(),consoleErrors=[],networkFailures=[],requestUrls=new Map();
socket.addEventListener("message",event=>{
  const message=JSON.parse(event.data);
  if(message.id&&pending.has(message.id)){const handlers=pending.get(message.id);pending.delete(message.id);return message.error?handlers.reject(new Error(message.error.message)):handlers.resolve(message.result);}
  if(message.method==="Runtime.exceptionThrown")consoleErrors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
  if(message.method==="Log.entryAdded"&&message.params.entry.level==="error")consoleErrors.push(message.params.entry.text);
  if(message.method==="Network.requestWillBeSent")requestUrls.set(message.params.requestId,message.params.request.url);
  if(message.method==="Network.loadingFailed"&&!message.params.canceled)networkFailures.push({error:message.params.errorText,url:requestUrls.get(message.params.requestId)||"unknown"});
});
function send(method,params={}){const id=++sequence;socket.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));}
async function evaluate(expression){const response=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;}
async function run(fn,...args){return evaluate("("+fn.toString()+")("+args.map(value=>JSON.stringify(value)).join(",")+")");}
async function waitFor(expression,timeout=60000){const started=Date.now();while(Date.now()-started<timeout){if(await evaluate("Boolean("+expression+")"))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error("Timeout: "+expression);}
function assert(value,message){if(!value)throw new Error(message);}
async function metrics(){const response=await send("Performance.getMetrics");return Object.fromEntries(response.metrics.map(item=>[item.name,item.value]));}
async function delay(ms){await new Promise(resolve=>setTimeout(resolve,ms));}

await Promise.all([send("Runtime.enable"),send("Log.enable"),send("Network.enable"),send("Performance.enable"),send("HeapProfiler.enable"),send("Page.enable")]);
await send("Page.navigate",{url:baseUrl});
await waitFor("window.PCSDeepSpaceManager && typeof cesiumViewer !== 'undefined' && document.querySelector('.cesium-viewer')",90000);
await evaluate("PCSI18n.setLanguage('en',{persist:false});PCSDeepSpaceManager.open();document.querySelector('[data-ds-motion-streaks]').value='standard';document.querySelector('[data-ds-motion-streaks]').dispatchEvent(new Event('change',{bubbles:true}))");
await delay(900);
const initial=await evaluate("({viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,canvas:document.querySelectorAll('canvas').length,heap:performance.memory?.usedJSHeapSize??null,debug:PCSDeepSpaceManager.debug()})");
assert(initial.viewer===1&&initial.cesiumCanvas===1&&initial.debug.motionStreaks?.listenerActive,"single Viewer/canvas or motion listener baseline failed");

async function waitMotionSample(){
  for(let attempt=0;attempt<50;attempt++){await delay(20);const debug=await evaluate("PCSDeepSpaceManager.debug().motionStreaks");if(debug?.visible>0)return debug;}
  return evaluate("PCSDeepSpaceManager.debug().motionStreaks");
}
async function cameraPan(direction){
  return run(async direction=>{cesiumViewer.scene.requestRender();await new Promise(resolve=>setTimeout(resolve,80));const amount=Math.max(300,Cesium.Cartesian3.magnitude(cesiumViewer.camera.positionWC)*.001),samples=[];for(let step=0;step<8;step++){if(direction==="left")cesiumViewer.camera.moveLeft(amount);else cesiumViewer.camera.moveRight(amount);cesiumViewer.scene.requestRender();await new Promise(resolve=>setTimeout(resolve,80));samples.push(PCSDeepSpaceManager.debug().motionStreaks);}return samples.sort((a,b)=>b.visible-a.visible)[0];},direction);
}
async function wheelMotion(deltaY,modifiers=0){
  const box=await evaluate("(()=>{const r=cesiumViewer.scene.canvas.getBoundingClientRect();return {x:r.left+r.width*.5,y:r.top+r.height*.5}})()"),samples=[];
  for(let step=0;step<4;step++){await send("Input.dispatchMouseEvent",{type:"mouseWheel",x:box.x,y:box.y,deltaX:0,deltaY,modifiers});await delay(90);samples.push(await evaluate("PCSDeepSpaceManager.debug().motionStreaks"));}
  return samples.sort((a,b)=>b.visible-a.visible)[0];
}
async function assertSettled(label,waitMs=330){
  await delay(waitMs);
  await evaluate("new Promise(resolve=>{const remove=cesiumViewer.scene.postRender.addEventListener(()=>{remove();resolve(true);});cesiumViewer.scene.requestRender();})");
  const debug=await evaluate("PCSDeepSpaceManager.debug().motionStreaks");
  assert(debug.state==="idle"&&debug.visible===0,label+" left stale trails");
  return debug;
}
async function waitUntilMotionIdle(label,timeout=3000){
  await delay(1200);const started=Date.now();while(Date.now()-started<timeout){const debug=await evaluate("PCSDeepSpaceManager.debug().motionStreaks");if(debug?.state==="idle"&&debug.visible===0)return debug;await delay(100);}
  throw new Error(label+" automated flight did not become idle");
}

const scales={};
for(const tier of ["10pc","25pc","50pc","100pc"]){
  assert(await evaluate("PCSDeepSpaceManager.enterNearby('"+tier+"')"),tier+" load failed");
  await waitFor("PCSDeepSpaceManager.debug().nearby?.points>0");
  await waitUntilMotionIdle(tier+" entry");
  scales[tier]={debug:await wheelMotion(-100)};
  assert(scales[tier].debug.streaks>0&&scales[tier].debug.visible>0,tier+" did not render streaks");
  scales[tier].settled=await assertSettled(tier);
}
assert(await evaluate("PCSDeepSpaceManager.enterMilkyWay()"),"Milky Way load failed");
await waitFor("PCSDeepSpaceManager.debug().milkyWay?.points>0");
await waitUntilMotionIdle("Milky Way entry");
scales["milky-way"]={debug:await wheelMotion(-100)};assert(scales["milky-way"].debug.visible>0,"Milky Way streaks missing");await assertSettled("Milky Way");
await evaluate("PCSDeepSpaceManager.searchPhase3('Sagittarius A*');document.querySelector('[data-object-card-focus]').click()");
scales["galactic-center"]={debug:await waitMotionSample()};assert(scales["galactic-center"].debug.visible>0,"Galactic Center focus streaks missing");await waitUntilMotionIdle("Galactic Center focus");
assert(await evaluate("PCSDeepSpaceManager.enterLocalGroup()"),"Local Group load failed");
await waitFor("PCSDeepSpaceManager.debug().localGroup?.points>0");
await waitUntilMotionIdle("Local Group entry");
await evaluate("PCSDeepSpaceManager.searchPhase3('LMC');document.querySelector('[data-object-card-focus]').click()");
scales["magellanic-system"]={debug:await waitMotionSample()};assert(scales["magellanic-system"].debug.visible>0,"Magellanic focus streaks missing");await waitUntilMotionIdle("Magellanic focus");
scales["local-group"]={debug:await wheelMotion(100)};assert(scales["local-group"].debug.visible>0&&scales["local-group"].debug.streaks<=360,"Local Group bounded streaks missing");await assertSettled("Local Group");

await evaluate("PCSDeepSpaceManager.enterNearby('10pc')");
await waitFor("PCSDeepSpaceManager.debug().nearby?.points>0");
await waitUntilMotionIdle("10pc direction entry");
const panLeft=await cameraPan("left");await assertSettled("pan left");
const panRight=await cameraPan("right");await assertSettled("pan right");
assert(panLeft.meanDx*panRight.meanDx<0,"left/right screen displacement did not reverse");

const canvasBox=await evaluate("(()=>{const r=cesiumViewer.scene.canvas.getBoundingClientRect();return {x:r.left+r.width*.5,y:r.top+r.height*.5,w:r.width,h:r.height}})()");
await send("Input.dispatchMouseEvent",{type:"mouseWheel",x:canvasBox.x,y:canvasBox.y,deltaX:0,deltaY:-180});
const wheelIn=await waitMotionSample();assert(wheelIn.visible>0,"wheel zoom-in streaks missing");await assertSettled("wheel in");
await send("Input.dispatchMouseEvent",{type:"mouseWheel",x:canvasBox.x,y:canvasBox.y,deltaX:0,deltaY:180});
const wheelOut=await waitMotionSample();assert(wheelOut.visible>0,"wheel zoom-out streaks missing");await assertSettled("wheel out");
await send("Input.dispatchMouseEvent",{type:"mouseWheel",x:canvasBox.x,y:canvasBox.y,deltaX:0,deltaY:-120,modifiers:2});
const trackpadPath=await waitMotionSample();assert(trackpadPath.visible>0&&await evaluate("PCSDeepSpaceManager.debug().lastPointerZoom?.inputType")==="trackpad-pinch","control-modified trackpad path failed");await assertSettled("trackpad path");
await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true,screenWidth:390,screenHeight:844});
await run(async()=>{const canvas=cesiumViewer.scene.canvas,rect=canvas.getBoundingClientRect(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),pair=distance=>[new Touch({identifier:1,target:canvas,clientX:rect.left+rect.width*.5-distance*.5,clientY:rect.top+rect.height*.5}),new Touch({identifier:2,target:canvas,clientX:rect.left+rect.width*.5+distance*.5,clientY:rect.top+rect.height*.5})],dispatch=(type,touches,changed=touches)=>canvas.dispatchEvent(new TouchEvent(type,{touches,targetTouches:touches,changedTouches:changed,bubbles:true,cancelable:true}));let touches=pair(70);dispatch("touchstart",touches);for(const distance of [90,106,122,138,154]){touches=pair(distance);dispatch("touchmove",touches);await sleep(45);}dispatch("touchend",[],touches);});
const mobilePinch=await waitMotionSample();assert(mobilePinch.visible>0&&await evaluate("PCSDeepSpaceManager.debug().lastPointerZoom?.inputType")==="mobile-pinch","mobile pinch simulation failed");await assertSettled("mobile pinch");
await send("Emulation.setDeviceMetricsOverride",{width:1280,height:720,deviceScaleFactor:1,mobile:false,screenWidth:1280,screenHeight:720});
await send("Input.dispatchMouseEvent",{type:"mousePressed",x:canvasBox.x-80,y:canvasBox.y,button:"left",buttons:1,clickCount:1});
for(let step=0;step<6;step++)await send("Input.dispatchMouseEvent",{type:"mouseMoved",x:canvasBox.x-80+step*28,y:canvasBox.y+step*3,button:"left",buttons:1});
await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:canvasBox.x+60,y:canvasBox.y+15,button:"left",buttons:0,clickCount:1});
const drag=await waitMotionSample();assert(drag.visible>0,"drag/rotate streaks missing");await waitUntilMotionIdle("drag inertia");

await evaluate("PCSDeepSpaceManager.searchNearby('Proxima Centauri')");
const previousFocus=await evaluate("PCSDeepSpaceManager.debug().lastObjectFocus");
await evaluate("document.querySelector('[data-object-card-focus]').focus()");
await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:"\r"});
await send("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
const keyboardFocus=await waitMotionSample(),keyboardFocusId=await evaluate("PCSDeepSpaceManager.debug().lastObjectFocus");assert(keyboardFocus.visible>0&&keyboardFocusId&&keyboardFocusId!==previousFocus,"keyboard object focus failed");await waitUntilMotionIdle("keyboard object focus");
const cardBefore=await evaluate("({id:PCSDeepSpaceManager.debug().objectCardId,selected:PCSDeepSpaceManager.debug().nearbySelected,text:document.querySelector('[data-ds-info]').textContent})");
await send("Input.dispatchMouseEvent",{type:"mouseWheel",x:canvasBox.x,y:canvasBox.y,deltaX:0,deltaY:-120});
await waitMotionSample();
const cardAfter=await evaluate("({id:PCSDeepSpaceManager.debug().objectCardId,selected:PCSDeepSpaceManager.debug().nearbySelected,text:document.querySelector('[data-ds-info]').textContent})");
assert(cardBefore.id===cardAfter.id&&cardBefore.selected===cardAfter.selected&&cardAfter.text.includes("Proxima Centauri"),"Object Card identity changed during motion");
await assertSettled("Object Card");

const languages={};
const expected={en:["Motion Streaks","Off","Subtle","Standard","Cinematic"],"zh-TW":["移動光軌","關閉","微弱","標準","電影感"],ja:["移動光跡","オフ","控えめ","標準","シネマティック"],ko:["이동 광궤적","끄기","은은함","표준","시네마틱"]};
for(const language of Object.keys(expected)){
  await evaluate("PCSI18n.setLanguage("+JSON.stringify(language)+",{persist:false})");
  languages[language]=await evaluate("({title:document.querySelector('[data-motion-copy=\"title\"]').textContent,options:[...document.querySelectorAll('[data-motion-option]')].map(option=>option.textContent),help:document.querySelector('[data-motion-copy=\"disclaimer\"]').textContent})");
  assert(languages[language].title===expected[language][0]&&languages[language].options.join("|")===expected[language].slice(1).join("|")&&languages[language].help,"language "+language+" failed");
}
await evaluate("PCSI18n.setLanguage('en',{persist:false})");

async function samplePerformance(tier,mobile=false){
  if(mobile)await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true,screenWidth:390,screenHeight:844});
  else await send("Emulation.setDeviceMetricsOverride",{width:1280,height:720,deviceScaleFactor:1,mobile:false,screenWidth:1280,screenHeight:720});
  assert(await evaluate("PCSDeepSpaceManager.enterNearby('"+tier+"')"),"performance "+tier+" load failed");
  await waitFor("PCSDeepSpaceManager.debug().nearby?.points>0");
  await waitUntilMotionIdle("performance "+tier+" entry");
  await send("HeapProfiler.collectGarbage");
  const before=(await metrics()).JSHeapUsedSize;
  const sample=await run(async()=>new Promise(resolve=>{
    const frames=[],started=performance.now();let previous=started,index=0;
    function frame(now){frames.push(now-previous);previous=now;const amount=Math.max(100,Cesium.Cartesian3.magnitude(cesiumViewer.camera.positionWC)*.00018);if(index++%2)cesiumViewer.camera.moveLeft(amount);else cesiumViewer.camera.moveRight(amount);if(now-started<1600)requestAnimationFrame(frame);else{const debug=PCSDeepSpaceManager.debug();resolve({elapsed:now-started,frames,objects:debug.nearby.points,streaks:debug.motionStreaks.streaks,visible:debug.motionStreaks.visible});}}
    requestAnimationFrame(frame);
  }));
  await send("HeapProfiler.collectGarbage");
  const after=(await metrics()).JSHeapUsedSize,intervals=sample.frames.slice(1),averageFrameMs=intervals.reduce((sum,value)=>sum+value,0)/Math.max(1,intervals.length),maxFrameMs=Math.max(...intervals);
  return {viewport:mobile?[390,844]:[1280,720],objects:sample.objects,streaks:sample.streaks,visible:sample.visible,averageFps:sample.frames.length/(sample.elapsed/1000),lowestObservedFps:maxFrameMs?1000/maxFrameMs:null,averageFrameMs,maxFrameMs,heapBefore:before,heapAfter:after,heapDeltaBytes:after-before};
}
const performanceResults={};
for(const tier of ["10pc","50pc","100pc"])performanceResults[tier]=await samplePerformance(tier,false);
performanceResults.mobile100pc=await samplePerformance("100pc",true);

await send("Emulation.setDeviceMetricsOverride",{width:1280,height:720,deviceScaleFactor:1,mobile:false,screenWidth:1280,screenHeight:720});
await evaluate("PCSDeepSpaceManager.enterNearby('10pc')");
await waitFor("PCSDeepSpaceManager.debug().nearby?.points>0");
await waitUntilMotionIdle("stability entry");
const stability=await run(async()=>{
  const canvas=cesiumViewer.scene.canvas,rect=canvas.getBoundingClientRect(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),baseline=PCSDeepSpaceManager.debug(),states=[];
  const nextRender=()=>new Promise(resolve=>{const remove=cesiumViewer.scene.postRender.addEventListener(()=>{remove();resolve();});cesiumViewer.scene.requestRender();});
  for(let index=0;index<100;index++){const amount=Math.max(100,Cesium.Cartesian3.magnitude(cesiumViewer.camera.positionWC)*.0005);if(index%2)cesiumViewer.camera.moveLeft(amount);else cesiumViewer.camera.moveRight(amount);await nextRender();await sleep(280);await nextRender();states.push(PCSDeepSpaceManager.debug().motionStreaks);}
  for(let index=0;index<50;index++){for(const deltaY of [-90,90]){canvas.dispatchEvent(new WheelEvent("wheel",{deltaY,clientX:rect.left+rect.width*.5,clientY:rect.top+rect.height*.5,bubbles:true,cancelable:true}));await sleep(3);}}
  for(let index=0;index<30;index++){const amount=Math.max(100,Cesium.Cartesian3.magnitude(cesiumViewer.camera.positionWC)*.0004);cesiumViewer.camera.moveLeft(amount);cesiumViewer.camera.moveRight(amount);cesiumViewer.scene.requestRender();await sleep(4);}
  const names=["Proxima Centauri","Barnard's Star","Sirius A","Vega","TRAPPIST-1"];for(let index=0;index<30;index++)PCSDeepSpaceManager.searchNearby(names[index%names.length]);await sleep(350);
  const after=PCSDeepSpaceManager.debug();
  return {startStopCycles:states.length,noVisibleTrailReturns:states.filter(state=>state.visible===0).length,idleStateReturns:states.filter(state=>state.state==="idle").length,zoomPairs:50,panPairs:30,selections:30,baseline,after};
});
assert(stability.startStopCycles===100&&stability.noVisibleTrailReturns===100&&stability.after.motionStreaks.visible===0&&stability.after.motionStreaks.streaks===stability.baseline.motionStreaks.streaks,`movement stability failed: ${JSON.stringify({noVisibleTrailReturns:stability.noVisibleTrailReturns,idleStateReturns:stability.idleStateReturns,baseline:stability.baseline.motionStreaks,after:stability.after.motionStreaks})}`);

const scaleChanges=[];
for(let index=0;index<30;index++){
  const phase=index%3;
  if(phase===0)await evaluate("PCSDeepSpaceManager.enterNearby('"+(["10pc","25pc","50pc","100pc"][index%4])+"')");
  else if(phase===1)await evaluate("PCSDeepSpaceManager.enterMilkyWay({reduced:true})");
  else await evaluate("PCSDeepSpaceManager.enterLocalGroup()");
  scaleChanges.push(await evaluate("PCSDeepSpaceManager.debug().scaleContext"));
}
assert(scaleChanges.length===30&&scaleChanges.every(Boolean),"30 scale changes failed");

const lifecycle=[];
for(let index=0;index<20;index++){
  await evaluate("PCSDeepSpaceManager.close();PCSDeepSpaceManager.open()");
  await delay(25);
  lifecycle.push(await evaluate("PCSDeepSpaceManager.debug()"));
}
assert(lifecycle.every(item=>item.viewerCount===1&&item.canvasCount===initial.canvas&&item.motionStreaks?.listenerActive),"20 open/close cycles changed Viewer, canvas, or listener");
await evaluate("PCSDeepSpaceManager.returnSolar();document.querySelector('[data-body=\"earth\"]').click()");
const solidBody=await evaluate("({context:PCSDeepSpaceManager.debug().scaleContext,motion:PCSDeepSpaceManager.debug().motionStreaks,earth:Boolean(cesiumViewer.dataSources.get(cesiumViewer.dataSources.length-1).entities.getById('deep-space-earth')?.ellipsoid),card:PCSDeepSpaceManager.debug().objectCardId})");
assert(solidBody.context==="solar"&&solidBody.motion.candidates===0&&solidBody.motion.visible===0&&solidBody.earth&&solidBody.card,"solid-body preservation failed");
await evaluate("PCSDeepSpaceManager.close()");
const finalState=await evaluate("({viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,canvas:document.querySelectorAll('canvas').length,active:PCSDeepSpaceManager.isOpen(),motion:PCSDeepSpaceManager.debug().motionStreaks,heap:performance.memory?.usedJSHeapSize??null})");
assert(finalState.viewer===1&&finalState.cesiumCanvas===1&&finalState.canvas===initial.canvas&&!finalState.active&&finalState.motion===null,"final lifecycle cleanup failed");

const requiredConsoleErrors=[...new Set(consoleErrors)].filter(value=>/Uncaught|TypeError|ReferenceError|RangeError|motion-streak|deep-space/i.test(value));
const requiredNetworkFailures=networkFailures.filter(item=>/motion-streak|deep-space-motion|nearby-stars|phase-3|Cesium/i.test(item.url));
assert(requiredConsoleErrors.length===0&&requiredNetworkFailures.length===0,"required console or network failure");
const report={generatedAt:new Date().toISOString(),url:baseUrl,browser:"Headless Chrome CDP with SwiftShader WebGL",physicalGestureEvidence:false,initial,scales,directions:{panLeft,panRight,wheelIn,wheelOut,trackpadPath,mobilePinch,drag,keyboardFocus},objectCard:{before:cardBefore,after:cardAfter},languages,performance:performanceResults,stability,scaleChanges,lifecycleCycles:lifecycle.length,solidBody,finalState,consoleErrors:[...new Set(consoleErrors)],requiredConsoleErrors,networkFailures,requiredNetworkFailures,notes:["Trackpad path is control-modified browser input, not physical Mac trackpad evidence.","Mobile pinch and 390 x 844 performance use browser emulation; they are not real-device gesture evidence.","Heap deltas are observations and do not prove either a leak or zero leakage."]};
fs.writeFileSync(path.join(outputDir,"acceptance-report.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({scales:Object.keys(scales),performance:performanceResults,stability:{startStopCycles:stability.startStopCycles,noVisibleTrailReturns:stability.noVisibleTrailReturns,idleStateReturns:stability.idleStateReturns,zoomPairs:stability.zoomPairs,panPairs:stability.panPairs,selections:stability.selections,scaleChanges:scaleChanges.length,lifecycleCycles:lifecycle.length},solidBody,finalState,requiredConsoleErrors,requiredNetworkFailures,outputDir},null,2));
socket.close();
