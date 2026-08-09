import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.PCS_CDP_PORT || 9343);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:18765/PCS_OBSERVATORY/?v=ss-02g-reopen-baseline";
const outputDir = path.join(process.cwd(), "PCS_OBSERVATORY/test-results/solar-system-ss02g-reopen");
fs.mkdirSync(outputDir, { recursive: true });

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: "PUT" }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const consoleErrors = [];
const networkFailures = [];
const requestUrls = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") consoleErrors.push(message.params.entry.text);
  if (message.method === "Network.requestWillBeSent") requestUrls.set(message.params.requestId, message.params.request.url);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push({ url: requestUrls.get(message.params.requestId) || "unknown", error: message.params.errorText });
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, timeout = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout: ${expression}`);
}
async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const file = path.join(outputDir, name);
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
  return file;
}

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Network.enable"), send("Page.enable")]);
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
await send("Page.navigate", { url: baseUrl });
await waitFor("document.readyState === 'complete' && document.querySelector('#intro-enter')");
await evaluate("document.querySelector('#intro-enter').click()");
await waitFor("window.PCSDeepSpaceManager && cesiumViewer?.scene && !document.body.classList.contains('intro-active')");
await evaluate("PCSI18n.setLanguage('en',{persist:false});PCSDeepSpaceManager.open();document.querySelector('[data-ds-play]').click();PCSDeepSpaceManager.setEpoch('2026-08-08T12:41:00Z')");
await new Promise(resolve => setTimeout(resolve, 1200));

const bodyAudit = await evaluate(`(()=>{
  const now=Cesium.JulianDate.now(),scene=cesiumViewer.scene,camera=cesiumViewer.camera,canvas=scene.canvas;
  const value=property=>property?.getValue?property.getValue(now):property;
  const ids=['sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
  const inspect=id=>{
    const registry=PCSDeepSpaceRegistry.BODY_REGISTRY[id],entity=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0]?.entities?.getById('deep-space-'+id),position=value(entity?.position),cameraDistance=position?Cesium.Cartesian3.distance(camera.positionWC,position):null;
    const pointCondition=value(entity?.point?.distanceDisplayCondition),sphereCondition=value(entity?.ellipsoid?.distanceDisplayCondition),pointShow=value(entity?.point?.show)!==false,sphereShow=value(entity?.ellipsoid?.show)!==false;
    const within=(condition,distance)=>!condition||distance>=condition.near&&distance<=condition.far;
    const center=position?Cesium.SceneTransforms.worldToWindowCoordinates(scene,position):null,displayRadius=Number(value(entity?.properties?.displayRadius)),edge=position&&Number.isFinite(displayRadius)?Cesium.SceneTransforms.worldToWindowCoordinates(scene,Cesium.Cartesian3.add(position,Cesium.Cartesian3.multiplyByScalar(camera.rightWC,displayRadius,new Cesium.Cartesian3()),new Cesium.Cartesian3())):null;
    const projectedSphereRadius=center&&edge?Math.hypot(edge.x-center.x,edge.y-center.y):null,onCanvas=Boolean(center&&center.x>=0&&center.x<=canvas.clientWidth&&center.y>=0&&center.y<=canvas.clientHeight),picked=center&&onCanvas?scene.pick(center):null;
    return {id,name:registry?.name,registryType:registry?.type,computedPosition:Boolean(position),entityCreated:Boolean(entity),entityShow:entity?.show!==false,parentDataSourceShow:entity?.entityCollection?.owner?.show!==false,position:position&&{x:position.x,y:position.y,z:position.z},cameraDistance,frustum:{near:camera.frustum.near,far:camera.frustum.far},physicalRadius:Number(value(entity?.properties?.physicalRadiusKm)),displayRadius,displayRadiusScale:Number(value(entity?.properties?.displayRadiusScale)),displayScaleMode:value(entity?.properties?.visualScaleNotice),primitiveType:{point:Boolean(entity?.point),ellipsoid:Boolean(entity?.ellipsoid),billboard:Boolean(entity?.billboard)},material:value(entity?.ellipsoid?.material)?.color?.toCssColorString?.()||value(entity?.ellipsoid?.material)?.toString?.()||null,point:{show:pointShow,pixelSize:Number(value(entity?.point?.pixelSize)),condition:pointCondition&&{near:pointCondition.near,far:pointCondition.far},distanceConditionActive:within(pointCondition,cameraDistance)},sphere:{show:sphereShow,radii:value(entity?.ellipsoid?.radii),condition:sphereCondition&&{near:sphereCondition.near,far:sphereCondition.far},distanceConditionActive:within(sphereCondition,cameraDistance),projectedRadiusPx:projectedSphereRadius},labelShow:value(entity?.label?.show)!==false,window:center&&{x:center.x,y:center.y},onCanvas,pickedId:picked?.id?.id||picked?.id||null,scaleContext:PCSDeepSpaceManager.debug().scaleContext};
  };
  return {camera:{position:{x:camera.positionWC.x,y:camera.positionWC.y,z:camera.positionWC.z},direction:{x:camera.directionWC.x,y:camera.directionWC.y,z:camera.directionWC.z},canvas:{width:canvas.clientWidth,height:canvas.clientHeight}},dataSources:cesiumViewer.dataSources.length,scenePrimitives:scene.primitives.length,bodies:ids.map(inspect)};
})()`);

const motionAuditBefore = await evaluate(`(()=>({
  globals:Object.keys(window).filter(key=>/streak|trail|glow/i.test(key)),
  dom:[...document.querySelectorAll('[class*="streak"],[class*="trail"],[class*="glow"],[data-ds-motion-streaks]')].map(node=>({tag:node.tagName,className:node.className,id:node.id})),
  primitives:cesiumViewer.scene.primitives._primitives.map((item,index)=>({index,type:item?.constructor?.name||null,id:item?.id||null,show:item?.show!==false,length:item?.length??null})),
  listeners:{cameraChanged:cesiumViewer.camera.changed._listeners?.length??null,moveStart:cesiumViewer.camera.moveStart._listeners?.length??null,moveEnd:cesiumViewer.camera.moveEnd._listeners?.length??null,postRender:cesiumViewer.scene.postRender._listeners?.length??null,preRender:cesiumViewer.scene.preRender._listeners?.length??null},
  properMotionControl:Boolean(document.querySelector('[data-ds-motion]')),
  properMotionChecked:Boolean(document.querySelector('[data-ds-motion]')?.checked)
}))()`);

const screenshotPath = await screenshot("00-failed-overview-baseline.png");
const report = { generatedAt: new Date().toISOString(), url: baseUrl, screenshotPath, bodyAudit, motionAuditBefore, consoleErrors: [...new Set(consoleErrors)], networkFailures };
fs.writeFileSync(path.join(outputDir, "baseline-diagnostic.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
socket.close();
