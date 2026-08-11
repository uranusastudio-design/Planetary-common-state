import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const port=Number(process.env.PCS_CDP_PORT||18800),base=process.env.PCS_TEST_URL||"http://127.0.0.1:18765/PCS_OBSERVATORY/",outputDir=process.env.PCS_FULL_ORBIT_OUTPUT||path.join(process.cwd(),"PCS_OBSERVATORY","test-results","deep-space-full-orbit-local");
fs.mkdirSync(outputDir,{recursive:true});
const target=await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${base}?full-orbit=${Date.now()}`)}`,{method:"PUT"}).then(response=>response.json()),socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
let sequence=0;const pending=new Map(),consoleErrors=[],networkFailures=[],requestUrls=new Map();
socket.addEventListener("message",event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const task=pending.get(message.id);pending.delete(message.id);return message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);}if(message.method==="Runtime.exceptionThrown")consoleErrors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.method==="Log.entryAdded"&&message.params.entry.level==="error")consoleErrors.push(message.params.entry.text);if(message.method==="Network.requestWillBeSent")requestUrls.set(message.params.requestId,message.params.request.url);if(message.method==="Network.loadingFailed"&&!message.params.canceled)networkFailures.push({url:requestUrls.get(message.params.requestId)||"unknown",error:message.params.errorText});});
function send(method,params={}){const id=++sequence;socket.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));}
async function evaluate(expression){const result=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
async function waitFor(expression,timeout=180000){const started=Date.now();while(Date.now()-started<timeout){if(await evaluate(`Boolean(${expression})`))return;await pause(100);}throw new Error(`Timeout: ${expression}`);}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function assert(value,message){if(!value)throw new Error(message);}
async function screenshot(name){const result=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});const file=path.join(outputDir,name);fs.writeFileSync(file,Buffer.from(result.data,"base64"));return file;}

await Promise.all([send("Runtime.enable"),send("Log.enable"),send("Network.enable"),send("Page.enable")]);
const requestedMatrix=process.env.PCS_MATRIX||"",matrices=[{label:"1920x1080",width:1920,height:1080},{label:"2560x1440",width:2560,height:1440},{label:"3840x2160",width:3840,height:2160},{label:"5120x2160",width:5120,height:2160},{label:"390x844-mobile",width:390,height:844,mobile:true}].filter(matrix=>!requestedMatrix||matrix.label===requestedMatrix),evidence=[];

for(const matrix of matrices){
  console.log(`[acceptance] ${matrix.label}: configure viewport`);
  await send("Emulation.setDeviceMetricsOverride",{width:matrix.width,height:matrix.height,deviceScaleFactor:1,mobile:Boolean(matrix.mobile),screenWidth:matrix.width,screenHeight:matrix.height});
  await send("Page.navigate",{url:`${base}?full-orbit=${matrix.label}-${Date.now()}`});
  await waitFor("document.readyState === 'complete' && document.querySelector('#intro-enter')");
  console.log(`[acceptance] ${matrix.label}: enter observatory`);
  await evaluate("document.querySelector('#intro-enter').click()");
  await waitFor("window.PCSDeepSpaceManager && cesiumViewer?.scene && !document.body.classList.contains('intro-active')");
  console.log(`[acceptance] ${matrix.label}: open Deep Space`);
  await evaluate("PCSI18n.setLanguage('en',{persist:false});PCSDeepSpaceManager.open();document.querySelector('[data-ds-play]').click();PCSDeepSpaceManager.setEpoch('2026-08-11T12:00:00Z')");
  await pause(1300);
  console.log(`[acceptance] ${matrix.label}: search and focus Halley`);
  const before=await evaluate("({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],debug:PCSDeepSpaceManager.debug()})");
  await evaluate("document.querySelector('[data-ds-solar-search-input]').value='1P/Halley';document.querySelector('[data-ds-solar-search]').requestSubmit()");
  await waitFor("PCSDeepSpaceManager.debug().smallBodySelected === '1000036'");
  await pause(1200);
  const focus=await evaluate("({debug:PCSDeepSpaceManager.debug(),fitVisible:!document.querySelector('[data-object-card-fit-orbit]').hidden,fitText:document.querySelector('[data-object-card-fit-orbit]').textContent,card:document.querySelector('[data-object-card]').dataset.objectId})");
  assert(focus.fitVisible&&focus.card==="sbdb:1000036",`${matrix.label}: Halley Object Card or FIT ORBIT is unavailable`);
  console.log(`[acceptance] ${matrix.label}: fit complete orbit`);
  await evaluate("document.querySelector('[data-object-card-fit-orbit]').click()");
  await waitFor("PCSDeepSpaceManager.debug().lastOrbitFit?.completeOrbit === true && PCSDeepSpaceManager.debug().lastOrbitFit?.settled === true");
  await pause(500);
  const fit=await evaluate(`(()=>{const now=Cesium.JulianDate.now(),source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],value=property=>property?.getValue?property.getValue(now):property,orbit=source.entities.getById('deep-space-small-orbit-1000036'),positions=value(orbit.polyline.positions)||[],windows=positions.map(position=>Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,position)).filter(Boolean),canvas=cesiumViewer.scene.canvas,width=canvas.clientWidth,height=canvas.clientHeight,minX=Math.min(...windows.map(point=>point.x)),maxX=Math.max(...windows.map(point=>point.x)),minY=Math.min(...windows.map(point=>point.y)),maxY=Math.max(...windows.map(point=>point.y)),entityWindow=id=>{const entity=source.entities.getById(id),position=value(entity?.position);return position?Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,position):null;},neptune=value(source.entities.getById('deep-space-orbit-neptune')?.polyline?.positions)||[],neptuneWindows=neptune.map(position=>Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,position)).filter(Boolean),first=positions[0],last=positions.at(-1),debug=PCSDeepSpaceManager.debug();return {debug,viewerCount:document.querySelectorAll('.cesium-viewer').length,cesiumCanvasCount:document.querySelectorAll('.cesium-widget canvas').length,canvas:{width,height},controls:document.querySelector('[data-ds-controls]').getBoundingClientRect().toJSON(),orbitPoints:positions.length,closed:first&&last?Cesium.Cartesian3.distance(first,last):Infinity,margins:{left:minX/width,right:(width-maxX)/width,top:minY/height,bottom:(height-maxY)/height},allOrbitOnScreen:windows.length===positions.length&&windows.every(point=>point.x>=0&&point.x<=width&&point.y>=0&&point.y<=height),sun:entityWindow('deep-space-sun'),halley:entityWindow('deep-space-small-1000036'),perihelion:entityWindow('deep-space-orbit-extrema-perihelion'),aphelion:entityWindow('deep-space-orbit-extrema-aphelion'),neptuneOrbitOnScreen:neptuneWindows.length===neptune.length&&neptuneWindows.every(point=>point.x>=0&&point.x<=width&&point.y>=0&&point.y<=height),logarithmicDepthBuffer:Boolean(cesiumViewer.scene.logarithmicDepthBuffer)};})()`);
  assert(fit.viewerCount===1&&fit.cesiumCanvasCount===1,`${matrix.label}: Viewer/canvas multiplicity regression`);
  assert(fit.orbitPoints===361&&fit.closed<1e-5,`${matrix.label}: Halley orbit is not a closed 361-point path`);
  assert(fit.allOrbitOnScreen,`${matrix.label}: Halley orbit leaves the viewport`);
  assert(Math.min(fit.margins.left,fit.margins.right,fit.margins.top,fit.margins.bottom)>=.075,`${matrix.label}: viewport safety margin is below 7.5%: ${JSON.stringify(fit.margins)}`);
  for(const [name,point] of [["Sun",fit.sun],["Halley",fit.halley],["perihelion",fit.perihelion],["aphelion",fit.aphelion]])assert(point&&point.x>=0&&point.x<=fit.canvas.width&&point.y>=0&&point.y<=fit.canvas.height,`${matrix.label}: ${name} is not visible`);
  assert(fit.neptuneOrbitOnScreen,`${matrix.label}: Neptune reference orbit is clipped`);
  assert(fit.debug.cameraScaleName==="COMET ORBIT"&&fit.debug.lastOrbitFit?.margin===1.28,`${matrix.label}: Camera Scale or fit margin contract failed`);
  const fitScreenshot=await screenshot(`${matrix.label}-fit-orbit.png`);
  console.log(`[acceptance] ${matrix.label}: orbit framed; test zoom and Back`);

  const zoom=await evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,rect=canvas.getBoundingClientRect(),beforePosition=[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z];let observedDelta=null;const observer=event=>{observedDelta=event.deltaY;};canvas.addEventListener('wheel',observer,{capture:true,once:true});canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-180,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,bubbles:true,cancelable:true}));return {beforePosition,afterPosition:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],pointer:PCSDeepSpaceManager.debug().lastPointerZoom,observedDelta};})()`);
  await pause(250);
  const zoomIn=await evaluate("({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],pointer:PCSDeepSpaceManager.debug().lastPointerZoom})");
  const zoomOutImmediate=await evaluate("(()=>{const canvas=cesiumViewer.scene.canvas,rect=canvas.getBoundingClientRect();let observedDelta=null;canvas.addEventListener('wheel',event=>{observedDelta=event.deltaY;},{capture:true,once:true});canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:180,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,bubbles:true,cancelable:true}));return {position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],pointer:PCSDeepSpaceManager.debug().lastPointerZoom,observedDelta};})()");
  await pause(250);
  const zoomOut=await evaluate("({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],pointer:PCSDeepSpaceManager.debug().lastPointerZoom})"),positionDelta=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));
  assert(zoom.pointer?.scale<1&&zoomOutImmediate.pointer?.scale>1&&positionDelta(zoom.beforePosition,zoom.afterPosition)>1&&positionDelta(zoom.afterPosition,zoomOutImmediate.position)>1,`${matrix.label}: zoom in/out did not update the camera through pointer-anchored navigation: ${JSON.stringify({zoom,zoomIn,zoomOutImmediate,zoomOut,inDelta:positionDelta(zoom.beforePosition,zoom.afterPosition),outDelta:positionDelta(zoom.afterPosition,zoomOutImmediate.position)})}`);

  const blank=await evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,rect=canvas.getBoundingClientRect();for(let y=80;y<canvas.clientHeight-20;y+=40)for(let x=20;x<canvas.clientWidth-20;x+=40)if(!cesiumViewer.scene.pick(new Cesium.Cartesian2(x,y)))return {x:rect.left+x,y:rect.top+y};return null;})()`);
  assert(blank,`${matrix.label}: no blank-space test coordinate found`);
  await send("Input.dispatchMouseEvent",{type:"mousePressed",x:blank.x,y:blank.y,button:"left",clickCount:1});await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:blank.x,y:blank.y,button:"left",clickCount:1});
  await waitFor("PCSDeepSpaceManager.debug().cameraHistoryDepth === 0");
  await pause(1100);
  const returned=await evaluate(`(()=>{const debug=PCSDeepSpaceManager.debug(),before=${JSON.stringify(before.position)},position=cesiumViewer.camera.positionWC,difference=Cesium.Cartesian3.distance(position,new Cesium.Cartesian3(...before)),baseline=Math.max(1,Math.hypot(...before));return {debug,difference,relativeDifference:difference/baseline};})()`);
  assert(returned.debug.selected==="sun"&&returned.relativeDifference<.02,`${matrix.label}: blank-space Back did not restore the pre-selection Solar System camera`);
  evidence.push({matrix,before,focus,fit,zoom:{before:zoom.beforePosition,zoomIn:zoom.afterPosition,zoomOut:zoomOutImmediate.position,observed:[zoom.observedDelta,zoomOutImmediate.observedDelta]},blank,returned,fitScreenshot});
  console.log(`[acceptance] ${matrix.label}: PASS`);
  await evaluate("PCSDeepSpaceManager.close()");
}

const requiredNetworkFailures=networkFailures.filter(item=>!item.url.startsWith("http://127.0.0.1:8787/")&&!item.url.includes("favicon")&&!item.url.includes("youtube")&&!item.url.includes("i.ytimg.com")),requiredConsoleErrors=consoleErrors.filter(message=>!message.startsWith("Failed to load resource: net::")),report={pass:true,generatedAt:new Date().toISOString(),base,matrices:evidence,consoleErrors,requiredConsoleErrors,networkFailures,requiredNetworkFailures};
assert(requiredConsoleErrors.length===0,`Required console errors: ${JSON.stringify(requiredConsoleErrors)}`);assert(requiredNetworkFailures.length===0,`Required network failures: ${JSON.stringify(requiredNetworkFailures)}`);
fs.writeFileSync(path.join(outputDir,"acceptance-report.json"),JSON.stringify(report,null,2));
socket.close();
await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
console.log(JSON.stringify({pass:true,outputDir,matrices:evidence.map(item=>({label:item.matrix.label,margins:item.fit.margins,orbitPoints:item.fit.orbitPoints,scale:item.fit.debug.cameraScaleName,returned:item.returned.relativeDifference,screenshot:item.fitScreenshot})),consoleErrors:consoleErrors.length,requiredNetworkFailures:requiredNetworkFailures.length},null,2));
