import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const port = Number(process.env.PCS_CDP_PORT || 9343);
const baseUrl = process.env.PCS_TEST_URL || `http://127.0.0.1:18765/PCS_OBSERVATORY/?v=ss-02g-body-acceptance-${Date.now()}`;
const outputDir = process.env.PCS_BODY_RENDER_OUTPUT || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "solar-system-ss02g-reopen");
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
async function pause(ms = 1000) { await new Promise(resolve => setTimeout(resolve, ms)); }
async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const file = path.join(outputDir, name);
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
  return file;
}
function assert(value, message) { if (!value) throw new Error(message); }

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Network.enable"), send("Page.enable")]);
await send("Page.addScriptToEvaluateOnNewDocument", { source: `(()=>{const add=EventTarget.prototype.addEventListener;window.__pcsListenerRegistrations=[];EventTarget.prototype.addEventListener=function(type,listener,options){window.__pcsListenerRegistrations.push({type,target:this?.constructor?.name||"unknown",source:String(listener).slice(0,300)});return add.call(this,type,listener,options);};})()` });
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
await send("Page.navigate", { url: baseUrl });
await waitFor("document.readyState === 'complete' && document.querySelector('#intro-enter')");
await evaluate("document.querySelector('#intro-enter').click()");
await waitFor("window.PCSDeepSpaceManager && cesiumViewer?.scene && !document.body.classList.contains('intro-active')");
await evaluate("PCSI18n.setLanguage('en',{persist:false});PCSDeepSpaceManager.open();document.querySelector('[data-ds-play]').click();PCSDeepSpaceManager.setEpoch('2026-08-08T12:41:00Z')");
await pause(1200);

await evaluate(`(()=>{
  const value=property=>property?.getValue?property.getValue(Cesium.JulianDate.now()):property;
  window.__pcsFramePoints=(positions,multiplier=2.7)=>{const points=positions.filter(Boolean),sphere=Cesium.BoundingSphere.fromPoints(points),range=Math.max(sphere.radius*multiplier,120000),target=sphere.center,destination=new Cesium.Cartesian3(target.x,target.y-range*.55,target.z+range),direction=Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(target,destination,new Cesium.Cartesian3()),new Cesium.Cartesian3()),right=Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(direction,Cesium.Cartesian3.UNIT_Z,new Cesium.Cartesian3()),new Cesium.Cartesian3()),up=Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(right,direction,new Cesium.Cartesian3()),new Cesium.Cartesian3());cesiumViewer.camera.setView({destination,orientation:{direction,up}});cesiumViewer.scene.requestRender();return {center:target,radius:sphere.radius,range};};
  window.__pcsFrameEntities=(ids,multiplier)=>__pcsFramePoints(ids.map(id=>value(cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0]?.entities.getById('deep-space-'+id)?.position)),multiplier);
  window.__pcsFrameLayer=(name,multiplier)=>{const positions=[];for(const collection of cesiumViewer.scene.primitives._primitives){if(typeof collection?.get!=="function")continue;for(let i=0;i<(collection.length||0);i++){const item=collection.get(i);if(item?.show!==false&&item?.id?.smallBodyLayer===name&&item.position)positions.push(item.position);}}return __pcsFramePoints(positions,multiplier);};
  window.__pcsFrameSmallOrbit=spkid=>{const source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],entity=source.entities.getById('deep-space-small-'+spkid),orbit=source.entities.getById('deep-space-small-orbit-'+spkid),positions=[value(entity?.position),...(value(orbit?.polyline?.positions)||[])];return __pcsFramePoints(positions,2.2);};
})()`);

const inspectBodies = async ids => evaluate(`(()=>{
  const ids=${JSON.stringify(ids)},now=Cesium.JulianDate.now(),scene=cesiumViewer.scene,camera=cesiumViewer.camera,canvas=scene.canvas,source=cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0],controls=document.querySelector('[data-ds-controls]'),safeRight=controls?.classList.contains('is-collapsed')?canvas.clientWidth:Math.min(canvas.clientWidth,controls?.getBoundingClientRect().left||canvas.clientWidth);
  const value=property=>property?.getValue?property.getValue(now):property,active=(condition,distance)=>!condition||distance>=condition.near&&distance<=condition.far;
  return ids.map(id=>{const entity=source?.entities.getById('deep-space-'+id)||source?.entities.getById('deep-space-small-'+id),position=value(entity?.position),distance=position?Cesium.Cartesian3.distance(camera.positionWC,position):Infinity,center=position?Cesium.SceneTransforms.worldToWindowCoordinates(scene,position):null,pointCondition=value(entity?.point?.distanceDisplayCondition),discCondition=value(entity?.billboard?.distanceDisplayCondition),sphereCondition=value(entity?.ellipsoid?.distanceDisplayCondition),pointActive=Boolean(entity?.point)&&value(entity.point.show)!==false&&active(pointCondition,distance),discActive=Boolean(entity?.billboard)&&value(entity.billboard.show)!==false&&active(discCondition,distance),sphereActive=Boolean(entity?.ellipsoid)&&value(entity.ellipsoid.show)!==false&&active(sphereCondition,distance),radius=Number(value(entity?.properties?.displayRadius)),edge=position&&radius?Cesium.SceneTransforms.worldToWindowCoordinates(scene,Cesium.Cartesian3.add(position,Cesium.Cartesian3.multiplyByScalar(camera.rightWC,radius,new Cesium.Cartesian3()),new Cesium.Cartesian3())):null,spherePixels=center&&edge?Math.hypot(edge.x-center.x,edge.y-center.y):0,pointPixels=pointActive?Number(value(entity.point.pixelSize))||0:0,discPixels=discActive?Number(value(entity.billboard.width))||0:0,visiblePixels=Math.max(pointPixels,discPixels,sphereActive?spherePixels:0),onScreen=Boolean(center&&center.x>=0&&center.x<safeRight&&center.y>=0&&center.y<canvas.clientHeight);return {id,created:Boolean(entity),entityShow:entity?.show!==false,parentShow:source?.show!==false,pointActive,discActive,sphereActive,visiblePixels,onScreen,window:center&&{x:center.x,y:center.y},safeRight,physicalRadius:Number(value(entity?.properties?.physicalRadius)),displayRadius:radius,displayScaleMode:value(entity?.properties?.displayScaleMode),lodContract:value(entity?.properties?.lodContract)};});
})()`);

const evidence = {};
const overviewIds = ["sun","mercury","venus","earth","mars","jupiter","saturn","uranus","neptune"];
evidence.overview = await inspectBodies(overviewIds);
assert(evidence.overview.every(item => item.created && item.entityShow && item.parentShow && item.onScreen && item.visiblePixels >= 8), "overview does not visibly render Sun and all eight planets");
evidence.overviewScreenshot = await screenshot("01-whole-solar-system.png");

await evaluate("__pcsFrameEntities(['sun','mercury','venus','earth','mars'],3.2)");
await pause(350);
evidence.inner = await inspectBodies(["mercury","venus","earth","mars"]);
assert(evidence.inner.every(item => item.onScreen && item.visiblePixels >= 8), "inner planets are not visibly rendered");
evidence.innerScreenshot = await screenshot("02-inner-solar-system.png");

async function focusSystem(bodyId, moonIds, screenshotName) {
  await evaluate(`document.querySelector('[data-body=${JSON.stringify(bodyId)}]').click();document.querySelector('[data-object-card-focus]').click()`);
  await pause(1300);
  const rows = await inspectBodies([bodyId, ...moonIds]);
  assert(rows.every(item => item.created && item.entityShow && item.parentShow && item.onScreen && item.visiblePixels >= 6), `${bodyId} focus does not visibly render its supported moons: ${JSON.stringify(rows)}`);
  return { rows, screenshot: screenshotName ? await screenshot(screenshotName) : null };
}
evidence.earthSystem = await focusSystem("earth", ["moon"], null);
evidence.marsSystem = await focusSystem("mars", ["phobos","deimos"], null);
evidence.jupiter = await focusSystem("jupiter", ["io","europa","ganymede","callisto"], "03-jupiter-galilean-moons.png");
evidence.saturn = await focusSystem("saturn", ["titan","enceladus"], "04-saturn-major-moons.png");
evidence.uranus = await focusSystem("uranus", ["titania"], "05-uranus-supported-moons.png");
evidence.neptune = await focusSystem("neptune", ["triton"], "06-neptune-triton.png");

evidence.selectedMoons = [];
for (const moonId of ["moon","phobos","deimos","io","europa","ganymede","callisto","titan","enceladus","titania","triton"]) {
  await evaluate(`document.querySelector('[data-body=${JSON.stringify(moonId)}]').click();document.querySelector('[data-object-card-focus]').click()`);
  await pause(1800);
  const row = (await inspectBodies([moonId]))[0];
  assert(row.created && row.entityShow && row.parentShow && row.onScreen && row.visiblePixels >= 6, `${moonId} selected-focus body is not visibly rendered: ${JSON.stringify(row)}`);
  evidence.selectedMoons.push(row);
}

const plutoSpkid = await evaluate("PCSSolarSystemSmallBodyDataset.dwarfPlanets.find(item=>item.name==='Pluto').spkid");
await evaluate(`PCSDeepSpaceManager.selectSmallBody(${JSON.stringify(plutoSpkid)});document.querySelector('[data-object-card-focus]').click()`);
await pause(1000);
evidence.pluto = await inspectBodies([plutoSpkid]);
assert(evidence.pluto[0].created && evidence.pluto[0].onScreen && evidence.pluto[0].visiblePixels >= 8, "Pluto/TNO selected body disappeared");
evidence.plutoScreenshot = await screenshot("07-pluto-tno-focus.png");

await evaluate("__pcsFrameLayer('main-belt',2.7)");
await pause(350);
evidence.asteroidBelt = await evaluate("PCSDeepSpaceManager.debug().mainBelt");
assert(evidence.asteroidBelt.visibleCount > 0, "asteroid belt has no visible catalog points");
evidence.asteroidBeltScreenshot = await screenshot("08-asteroid-belt.png");

await evaluate("__pcsFrameLayer('tno-known-catalog',2.7)");
await pause(350);
evidence.kuiperBelt = await evaluate("PCSDeepSpaceManager.debug().tno");
assert(evidence.kuiperBelt.visibleCount > 0, "Kuiper/TNO layer has no visible catalog points");
evidence.kuiperBeltScreenshot = await screenshot("09-kuiper-belt.png");

const cometSpkid = await evaluate("PCSSolarSystemCometDataset.records.find(item=>item.designation==='1P').spkid");
await evaluate(`PCSDeepSpaceManager.selectSmallBody(${JSON.stringify(cometSpkid)});__pcsFrameSmallOrbit(${JSON.stringify(cometSpkid)})`);
await pause(500);
evidence.comet = await inspectBodies([cometSpkid]);
evidence.cometOrbit = await evaluate(`Boolean(cesiumViewer.dataSources.getByName('pcs-deep-space-phase-1')[0].entities.getById('deep-space-small-orbit-${cometSpkid}')?.polyline)`);
assert(evidence.comet[0].created && evidence.comet[0].onScreen && evidence.comet[0].visiblePixels >= 8 && evidence.cometOrbit, "selected comet marker/body or source-derived orbit arc is not visible");
evidence.cometScreenshot = await screenshot("10-comet-orbit-selected-body.png");

await evaluate("PCSDeepSpaceManager.enterNearby('10pc',{reduced:false})");
await waitFor("PCSDeepSpaceManager.debug().nearby?.points > 0");
await pause(700);
const motionState = () => evaluate(`(()=>{const primitives=cesiumViewer.scene.primitives._primitives,all=[];for(const collection of primitives){const type=collection?.constructor?.name||"",length=collection?.length||0;for(let i=0;i<length;i++){const item=collection.get?.(i),id=JSON.stringify(item?.id||null);if(/motion.?streak|micro.?glow|camera.?trail/i.test(id))all.push({type,id,show:item?.show!==false});}}return {activeStreakPrimitives:all.filter(item=>item.show).length,streakPrimitives:all,primitiveCount:primitives.length,pointCount:PCSDeepSpaceManager.debug().nearby.points,listeners:{cameraChanged:cesiumViewer.camera.changed._listeners?.length??null,moveStart:cesiumViewer.camera.moveStart._listeners?.length??null,moveEnd:cesiumViewer.camera.moveEnd._listeners?.length??null,postRender:cesiumViewer.scene.postRender._listeners?.length??null,preRender:cesiumViewer.scene.preRender._listeners?.length??null},streakGlobals:Object.keys(window).filter(key=>/motion.?streak|micro.?glow|camera.?trail/i.test(key)),streakControls:document.querySelectorAll('[data-ds-motion-streaks],[class*="motion-streak"],[class*="micro-glow"]').length,streakSettings:Object.keys(localStorage).filter(key=>/motion.?streak|micro.?glow|camera.?trail/i.test(key)),streakListeners:(window.__pcsListenerRegistrations||[]).filter(item=>/motion.?streak|micro.?glow|camera.?trail|pcs:deep-space-navigation/i.test(item.source+' '+item.type))};})()`);
evidence.motionBefore = await motionState();
evidence.motionStationaryScreenshot = await screenshot("11-point-stars-stationary.png");
await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 430, y: 420, button: "left", buttons: 1, clickCount: 1 });
for (let step = 1; step <= 8; step++) await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 430 + step * 32, y: 420 + step * 8, button: "left", buttons: 1 });
evidence.motionDuring = await motionState();
evidence.motionDragScreenshot = await screenshot("12-point-stars-during-drag.png");
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 686, y: 484, button: "left", buttons: 0, clickCount: 1 });
await pause(400);
evidence.motionAfter = await motionState();
evidence.motionAfterScreenshot = await screenshot("13-point-stars-after-drag.png");
await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 520, y: 430, deltaX: 0, deltaY: -260 });
await pause(500);
evidence.motionAfterWheel = await motionState();
evidence.motionAfterWheelScreenshot = await screenshot("14-point-stars-after-wheel.png");
for (const state of [evidence.motionBefore,evidence.motionDuring,evidence.motionAfter,evidence.motionAfterWheel]) assert(state.activeStreakPrimitives===0&&state.streakGlobals.length===0&&state.streakControls===0&&state.streakSettings.length===0&&state.streakListeners.length===0,"motion-streak runtime remnant became active");
assert(evidence.motionBefore.primitiveCount===evidence.motionDuring.primitiveCount&&evidence.motionBefore.primitiveCount===evidence.motionAfter.primitiveCount,"drag created a primitive");
assert(JSON.stringify(evidence.motionBefore.listeners)===JSON.stringify(evidence.motionAfter.listeners),"drag left persistent listeners");
assert(evidence.motionBefore.primitiveCount===evidence.motionAfterWheel.primitiveCount,"wheel zoom created a primitive");
assert(JSON.stringify(evidence.motionBefore.listeners)===JSON.stringify(evidence.motionAfterWheel.listeners),"wheel zoom left persistent listeners");

const lifecycleState = () => evaluate(`({viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,totalCanvas:document.querySelectorAll('canvas').length,dataSources:cesiumViewer.dataSources.length,primitives:cesiumViewer.scene.primitives.length,active:PCSDeepSpaceManager.isOpen(),earthOwner:PCSEarthRenderOwnership.debug(),listeners:{cameraChanged:cesiumViewer.camera.changed._listeners?.length??null,moveStart:cesiumViewer.camera.moveStart._listeners?.length??null,moveEnd:cesiumViewer.camera.moveEnd._listeners?.length??null,postRender:cesiumViewer.scene.postRender._listeners?.length??null,preRender:cesiumViewer.scene.preRender._listeners?.length??null}})`);
await evaluate("PCSDeepSpaceManager.close()");
await pause(150);
evidence.lifecycle = { cycles: 10, before: await lifecycleState(), states: [] };
for (let cycle = 1; cycle <= evidence.lifecycle.cycles; cycle += 1) {
  await evaluate("PCSDeepSpaceManager.open();PCSDeepSpaceManager.close()");
  await pause(100);
  evidence.lifecycle.states.push({ cycle, ...(await lifecycleState()) });
}
evidence.lifecycle.after = evidence.lifecycle.states.at(-1);
for (const state of [evidence.lifecycle.before,...evidence.lifecycle.states]) {
  assert(state.viewer===1&&state.cesiumCanvas===1&&state.totalCanvas===evidence.lifecycle.before.totalCanvas,"Viewer/canvas lifecycle contract failed");
  assert(!state.active&&state.earthOwner.active,"Deep Space close did not restore Earth ownership");
  assert(state.dataSources===evidence.lifecycle.before.dataSources&&state.primitives===evidence.lifecycle.before.primitives,"primitive/DataSource growth detected");
  assert(JSON.stringify(state.listeners)===JSON.stringify(evidence.lifecycle.before.listeners),"Cesium listener growth detected");
}

const requiredConsole = [...new Set(consoleErrors)].filter(value => /Uncaught|TypeError|ReferenceError|RangeError|deep-space/i.test(value));
const requiredNetwork = networkFailures.filter(item => /deep-space|solar-system|nearby-stars|milky-way|local-group|Cesium/i.test(item.url));
const report = { generatedAt:new Date().toISOString(), status:requiredConsole.length||requiredNetwork.length?"FAIL":"PASS", url:baseUrl, evidence, console:{required:requiredConsole.length,items:requiredConsole}, network:{required:requiredNetwork.length,items:requiredNetwork} };
fs.writeFileSync(path.join(outputDir,"body-rendering-acceptance.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
assert(requiredConsole.length===0,"required Console errors detected");
assert(requiredNetwork.length===0,"required Network failures detected");
socket.close();
