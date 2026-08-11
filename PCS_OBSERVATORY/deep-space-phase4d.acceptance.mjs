import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PCS_CDP_PORT || 18800);
const url = process.env.PCS_TEST_URL || "http://127.0.0.1:8765/projects/Planetary-common-state/PCS_OBSERVATORY/?v=phase-4d";
const outputDir = process.env.PCS_PHASE4D_OUTPUT || path.join(process.cwd(), "test-results", "deep-space-phase-4d-local");
fs.mkdirSync(outputDir, { recursive: true });

const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const consoleErrors = [];
const networkFailures = [];
let sequence = 0;
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const item = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push({ requestId: message.params.requestId, error: message.params.errorText });
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const waitFor = async (expression, timeout = 120000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(160);
  }
  throw new Error(`Timeout: ${expression}`);
};
const assert = (value, message) => { if (!value) throw new Error(message); };
async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const file = path.join(outputDir, name);
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
  return file;
}
const listenerCounts = () => evaluate("({changed:cesiumViewer.camera.changed.numberOfListeners,moveStart:cesiumViewer.camera.moveStart.numberOfListeners,moveEnd:cesiumViewer.camera.moveEnd.numberOfListeners,postRender:cesiumViewer.scene.postRender.numberOfListeners,preRender:cesiumViewer.scene.preRender.numberOfListeners})");
const visibleClasses = () => evaluate(`(()=>{const canvas=cesiumViewer.scene.canvas,counts={Galaxy:0,"Galaxy Group":0,"Galaxy Cluster":0,"Survey Region":0,Filament:0,Void:0},onScreen={Galaxy:0,"Galaxy Group":0,"Galaxy Cluster":0,"Survey Region":0,Filament:0,Void:0};for(const collection of cesiumViewer.scene.primitives._primitives||[]){if(collection.show===false)continue;for(let index=0;index<(collection.length||0);index++){const primitive=collection.get?.(index),record=primitive?.id?.phase4Object;if(!record)continue;counts[record.objectType]=(counts[record.objectType]||0)+1;const position=primitive.position;if(!position)continue;const projected=Cesium.SceneTransforms.worldToWindowCoordinates(cesiumViewer.scene,position);if(projected&&projected.x>=0&&projected.x<=canvas.clientWidth&&projected.y>=0&&projected.y<=canvas.clientHeight)onScreen[record.objectType]=(onScreen[record.objectType]||0)+1;}}return {counts,onScreen,canvas:[canvas.clientWidth,canvas.clientHeight]};})()`);
const setSelectedRange = (mpc) => evaluate(`(()=>{const d=PCSDeepSpaceManager.debug(),record=window.PCSCosmicWebTestSelected;if(!record)return false;const xyz=PCSPhase4Coordinates.scenePosition(record.positionIcrsComovingHinvMpc,d.mode,"cosmic-web"),target=new Cesium.Cartesian3(...xyz),range=PCSPhase4Coordinates.sceneRadiusMpc(${Number(mpc)},d.mode,"cosmic-web"),destination=new Cesium.Cartesian3(target.x,target.y-range*.25,target.z+range),direction=Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(target,destination,new Cesium.Cartesian3()),new Cesium.Cartesian3()),right=Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(direction,Cesium.Cartesian3.UNIT_Z,new Cesium.Cartesian3()),new Cesium.Cartesian3()),up=Cesium.Cartesian3.normalize(Cesium.Cartesian3.cross(right,direction,new Cesium.Cartesian3()),new Cesium.Cartesian3());cesiumViewer.camera.cancelFlight();cesiumViewer.camera.setView({destination,orientation:{direction,up}});cesiumViewer.camera.changed.raiseEvent();cesiumViewer.scene.requestRender();return true;})()`);

await Promise.all([send("Runtime.enable"), send("Network.enable"), send("Page.enable"), send("Performance.enable")]);
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await waitFor("window.PCSDeepSpaceManager&&window.PCSCosmicWeb&&document.querySelector('#intro-enter')");
await evaluate("document.querySelector('#intro-enter')?.click()");
await waitFor("!document.body.classList.contains('intro-active')");
await waitFor("document.querySelector('.cesium-viewer')&&typeof cesiumViewer!=='undefined'&&cesiumViewer&&!cesiumViewer.isDestroyed()");
if (!await evaluate("PCSDeepSpaceManager.debug().initialized")) await evaluate("PCSDeepSpaceManager.initialize({viewer:cesiumViewer,host:document.querySelector('#cesium-globe')})");
await evaluate("PCSI18n.setLanguage('zh-TW');PCSDeepSpaceManager.open()");
await waitFor("PCSDeepSpaceManager.isOpen()");

const initial = await evaluate("PCSDeepSpaceManager.debug()");
const primitiveInitial = await evaluate("cesiumViewer.scene.primitives.length");
const dataSourcesInitial = await evaluate("cesiumViewer.dataSources.length");
assert(initial.viewerCount === 1, "Viewer must remain one");
assert(await evaluate("document.querySelectorAll('.cesium-widget canvas').length===1"), "Cesium canvas must remain one");

assert(await evaluate("PCSDeepSpaceManager.enterLaniakea()"), "enter Laniakea transition");
await wait(800);
await screenshot("01-laniakea-to-cosmic-web-transition.png");
assert(await evaluate("PCSDeepSpaceManager.enterCosmicWeb()"), "enter Cosmic Web");
await waitFor("PCSDeepSpaceManager.debug().cosmicWeb?.galaxies===48041&&PCSDeepSpaceManager.debug().cosmicWeb?.filaments===2306&&PCSDeepSpaceManager.debug().cosmicWeb?.voids===1228");
await waitFor("PCSDeepSpaceManager.debug().cosmicWeb?.lod==='survey'&&PCSDeepSpaceManager.debug().cosmicWeb?.lodBlend?.density>PCSDeepSpaceManager.debug().cosmicWeb?.lodBlend?.galaxies");
await wait(900);

const surveyDebug = await evaluate("PCSDeepSpaceManager.debug()");
const surveyVisible = await visibleClasses();
assert(surveyDebug.scaleContext === "cosmic-web", "Cosmic Web scale context active");
assert(surveyDebug.cosmicWeb.density === 18054 && surveyDebug.cosmicWeb.groups === 2686, "density and rich group/cluster batches loaded");
assert(surveyDebug.cosmicWeb.walls === 0 && /Unavailable/.test(surveyDebug.cosmicWeb.wallStatus), "wall geometry remains explicitly unavailable");
assert(surveyDebug.cosmicWeb.lod === "survey" && surveyDebug.cosmicWeb.lodBlend.density > surveyDebug.cosmicWeb.lodBlend.galaxies, "survey LOD emphasizes large-scale structure");
const contextCard = await evaluate("({id:document.querySelector('[data-object-card]').dataset.objectId,text:document.querySelector('[data-ds-info]').textContent,notice:document.querySelector('[data-ds-phase4-notice]').textContent})");
assert(contextCard.id === "pcs:survey-region:cosmic-web-context" && /unobserved sky is not filled/i.test(contextCard.text) && /不是完整宇宙網的直接照片/.test(contextCard.notice), "survey context preserves coverage and reconstruction warning");
await screenshot("02-survey-scale-cosmic-web.png");

const galaxy = await evaluate("PCSDeepSpaceManager.searchPhase4('SDSS DR8 Galaxy 60').then(value=>(window.PCSCosmicWebTestSelected=value))");
assert(galaxy?.id === "pcs:sdss-dr8-galaxy:60" && galaxy.observationStatus === "Catalog Observation", "galaxy catalog search resolves observation");
await wait(1100);
const nearDebug = await evaluate("PCSDeepSpaceManager.debug()");
assert(nearDebug.cosmicWeb.lod === "individual-galaxies" && nearDebug.cosmicWeb.lodBlend.galaxies > 0.9, "near LOD exposes individual galaxies");
const galaxyCard = await evaluate("({id:document.querySelector('[data-object-card]').dataset.objectId,text:document.querySelector('[data-ds-info]').textContent})");
assert(galaxyCard.id === galaxy.id && /Catalog Observation/.test(galaxyCard.text) && /one-in-twelve/.test(galaxyCard.text), "galaxy card states observation and deterministic displayed sample");
await screenshot("03-near-individual-galaxy-focus.png");

assert(await setSelectedRange(300), "set medium range");
await wait(350);
const mediumDebug = await evaluate("PCSDeepSpaceManager.debug()");
assert(mediumDebug.cosmicWeb.lod === "groups-clusters" && mediumDebug.cosmicWeb.lodBlend.groups > mediumDebug.cosmicWeb.lodBlend.galaxies, "medium LOD emphasizes groups and clusters");
const group = await evaluate("PCSDeepSpaceManager.searchPhase4('SDSS DR8 Group 15')");
assert(group?.id === "pcs:sdss-dr8-group:15" && /Derived Measurement/.test(group.dataStatus), "group search resolves derived catalog measurement");
await wait(850);
const groupCard = await evaluate("({id:document.querySelector('[data-object-card]').dataset.objectId,text:document.querySelector('[data-ds-info]').textContent})");
assert(groupCard.id === group.id && /Derived Measurement/.test(groupCard.text) && /friends-of-friends/.test(groupCard.text), "group card distinguishes derived measurement");
await screenshot("04-medium-groups-clusters.png");

await evaluate("PCSDeepSpaceManager.searchPhase4('SDSS DR8 Galaxy 60').then(value=>(window.PCSCosmicWebTestSelected=value))");
const continuity = [];
for (const range of [40, 70, 95, 130, 200, 350, 550, 760, 1100]) {
  assert(await setSelectedRange(range), `set continuity range ${range}`);
  await wait(120);
  continuity.push({ range, ...(await evaluate("PCSDeepSpaceManager.debug().cosmicWeb.lodBlend") ) });
}
assert(continuity.every((item, index) => index === 0 || item.galaxies <= continuity[index - 1].galaxies + 0.001), "galaxy prominence decreases continuously with scale");
assert(continuity.every((item, index) => index === 0 || item.density + 0.001 >= continuity[index - 1].density), "density prominence increases continuously with scale");
assert(continuity.filter((item) => item.galaxies > 0.05 && item.galaxies < 0.95).length >= 2 && continuity.filter((item) => item.density > 0.05 && item.density < 0.95).length >= 2, "LOD contains multiple cross-fade states rather than a background-image swap");

const filament = await evaluate("PCSDeepSpaceManager.searchPhase4('SDSS Filament 1')");
assert(filament?.id === "pcs:filament:tempel2014:1" && filament.reconstructionStatus === "Observation-based Reconstruction", "filament search resolves reconstruction");
await wait(850);
const filamentCard = await evaluate("({id:document.querySelector('[data-object-card]').dataset.objectId,text:document.querySelector('[data-ds-info]').textContent})");
assert(filamentCard.id === filament.id && /Observation-based Reconstruction/.test(filamentCard.text) && /not a directly photographed structure/.test(filamentCard.text), "filament card rejects direct-photograph claim");
await screenshot("05-filament-reconstruction-focus.png");

const voidObject = await evaluate("PCSDeepSpaceManager.searchPhase4('BOSS CMASS North Void 60')");
assert(voidObject?.objectType === "Void" && voidObject.reconstructionStatus === "Observation-based Reconstruction", "void search resolves reconstruction");
await wait(850);
const voidCard = await evaluate("({id:document.querySelector('[data-object-card]').dataset.objectId,text:document.querySelector('[data-ds-info]').textContent})");
assert(voidCard.id === voidObject.id && /effective radius/i.test(voidCard.text) && /not the physical void boundary/i.test(voidCard.text), "void card rejects physical boundary claim");

await evaluate("PCSDeepSpaceManager.searchPhase4('SDSS DR8 Galaxy 60')");
await wait(850);
await evaluate(`(()=>{for(const name of ["groups","density","filaments","voids"]){const input=document.querySelector('[data-ds-cosmic-layer="'+name+'"]');if(input.checked)input.click();}return true;})()`);
await wait(500);
let flags = await evaluate("PCSDeepSpaceManager.debug().cosmicWeb.flags");
assert(flags.galaxies && !flags.groups && !flags.density && !flags.filaments && !flags.voids && !flags.walls, "Catalog Observation-only visual layer state");
await screenshot("06-catalog-observation-only.png");
await evaluate(`(()=>{document.querySelector('[data-ds-cosmic-layer="galaxies"]').click();document.querySelector('[data-ds-cosmic-layer="filaments"]').click();document.querySelector('[data-ds-cosmic-layer="voids"]').click();return true;})()`);
await evaluate("PCSDeepSpaceManager.searchPhase4('SDSS Filament 1')");
await wait(850);
flags = await evaluate("PCSDeepSpaceManager.debug().cosmicWeb.flags");
assert(!flags.galaxies && flags.filaments && flags.voids && !flags.walls, "reconstruction-only visual layer state keeps walls unavailable");
await screenshot("07-observation-based-reconstruction-only.png");
await evaluate(`document.querySelectorAll('[data-ds-cosmic-layer]:not(:disabled)').forEach(input=>{if(!input.checked)input.click()})`);

const navigationBefore = await evaluate("({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],direction:[cesiumViewer.camera.directionWC.x,cesiumViewer.camera.directionWC.y,cesiumViewer.camera.directionWC.z]})");
await evaluate("cesiumViewer.camera.rotateLeft(.12);cesiumViewer.camera.moveRight(Math.max(1000,Cesium.Cartesian3.magnitude(cesiumViewer.camera.positionWC)*.01));cesiumViewer.scene.canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-120,clientX:cesiumViewer.scene.canvas.clientWidth*.5,clientY:cesiumViewer.scene.canvas.clientHeight*.5,bubbles:true,cancelable:true}));");
await wait(300);
const navigationAfter = await evaluate("({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],direction:[cesiumViewer.camera.directionWC.x,cesiumViewer.camera.directionWC.y,cesiumViewer.camera.directionWC.z],zoom:PCSDeepSpaceManager.debug().lastPointerZoom,focus:PCSDeepSpaceManager.debug().lastObjectFocus})");
assert(JSON.stringify(navigationBefore.position) !== JSON.stringify(navigationAfter.position) && JSON.stringify(navigationBefore.direction) !== JSON.stringify(navigationAfter.direction), "pan and rotate change the single Cesium camera");
assert(navigationAfter.zoom?.inputType === "mouse-wheel" && navigationAfter.focus === filament.id, "zoom and search/focus use existing navigation state");

const expected = {
  "zh-TW":["宇宙網","星系 — 星表觀測","牆 — 無資料（沒有已驗證幾何）","返回拉尼亞凱亞"],
  en:["Cosmic Web","Galaxies — Catalog Observation","Walls — unavailable (no validated geometry)","Return to Laniakea"],
  ja:["コズミックウェブ","銀河 — カタログ観測","ウォール — 利用不可（検証済み形状なし）","ラニアケアへ戻る"],
  ko:["우주 거미줄","은하 — 카탈로그 관측","벽 — 사용 불가(검증된 형상 없음)","라니아케아로 돌아가기"],
};
const languages = {};
for (const language of Object.keys(expected)) {
  await evaluate(`PCSI18n.setLanguage(${JSON.stringify(language)})`);
  await wait(100);
  languages[language] = await evaluate("[document.querySelector('[data-ds-phase4-heading]').textContent,document.querySelector('[data-p4d=galaxies]').textContent,document.querySelector('[data-p4d=wallsUnavailable]').textContent,document.querySelector('[data-ds-return-laniakea]').textContent,PCSDeepSpaceManager.debug().viewerCount,document.querySelectorAll('.cesium-widget canvas').length]");
  assert(JSON.stringify(languages[language].slice(0, 4)) === JSON.stringify(expected[language]), `${language} exact Phase 4D UI`);
  assert(languages[language][4] === 1 && languages[language][5] === 1, `${language} does not recreate Viewer or Cesium canvas`);
}

await evaluate("PCSI18n.setLanguage('zh-TW')");
const cycles = [];
for (let index = 0; index < 10; index++) {
  assert(await evaluate("PCSDeepSpaceManager.enterLaniakea()"), `cycle ${index} Laniakea`);
  assert(await evaluate("PCSDeepSpaceManager.enterCosmicWeb()"), `cycle ${index} Cosmic Web`);
  cycles.push({
    primitive: await evaluate("cesiumViewer.scene.primitives.length"),
    dataSources: await evaluate("cesiumViewer.dataSources.length"),
    listeners: await listenerCounts(),
    debug: await evaluate("PCSDeepSpaceManager.debug().cosmicWeb"),
  });
}
assert(cycles.every((item) => item.primitive === cycles[0].primitive && item.dataSources === cycles[0].dataSources && JSON.stringify(item.listeners) === JSON.stringify(cycles[0].listeners) && item.debug.galaxies === 48041 && item.debug.cameraListener), "10 Laniakea/Cosmic Web cycles have no primitive, data-source, or listener growth");

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await wait(450);
const mobile = await evaluate("({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,controlsWidth:document.querySelector('[data-ds-controls]').getBoundingClientRect().width,viewport:[innerWidth,innerHeight]})");
assert(!mobile.overflow && mobile.viewer === 1 && mobile.cesiumCanvas === 1 && mobile.controlsWidth <= 382, "390x844 mobile has one Viewer/canvas and no horizontal overflow");
await screenshot("08-mobile-390x844-cosmic-web.png");

await evaluate("PCSDeepSpaceManager.returnSolar()");
const final = await evaluate("PCSDeepSpaceManager.debug()");
const primitiveFinal = await evaluate("cesiumViewer.scene.primitives.length");
const dataSourcesFinal = await evaluate("cesiumViewer.dataSources.length");
assert(final.scaleContext === "solar" && final.cosmicWeb.galaxies === 0 && !final.cosmicWeb.cameraListener, "Solar return clears Cosmic Web primitives and listener");
assert(primitiveFinal === primitiveInitial && dataSourcesFinal === dataSourcesInitial, "primitive and data-source baseline restored");
const requiredErrors = consoleErrors.filter((value) => /Uncaught|TypeError|ReferenceError|RangeError|phase-4d|cosmic-web/i.test(value));
const requiredFailures = networkFailures.filter((value) => /phase-4d|cosmic-web/i.test(value.error || ""));
assert(requiredErrors.length === 0, `required console errors zero: ${JSON.stringify(requiredErrors)}`);
assert(requiredFailures.length === 0, `required network failures zero: ${JSON.stringify(requiredFailures)}`);

const report = {
  generatedAt: new Date().toISOString(), url, initial, surveyDebug, surveyVisible, contextCard,
  galaxy, nearDebug, galaxyCard, mediumDebug, group, groupCard, continuity,
  filament, filamentCard, voidObject, voidCard, navigationBefore, navigationAfter,
  languages, cycles, mobile, primitiveInitial, primitiveFinal, dataSourcesInitial, dataSourcesFinal,
  final, consoleErrors, networkFailures, requiredErrors, requiredFailures,
  screenshots: fs.readdirSync(outputDir).filter((file) => file.endsWith(".png")).sort(),
};
fs.writeFileSync(path.join(outputDir, "acceptance-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  galaxies: surveyDebug.cosmicWeb.galaxies, groups: surveyDebug.cosmicWeb.groups,
  density: surveyDebug.cosmicWeb.density, filaments: surveyDebug.cosmicWeb.filaments,
  walls: surveyDebug.cosmicWeb.walls, voids: surveyDebug.cosmicWeb.voids,
  lod: surveyDebug.cosmicWeb.lod, continuity: continuity.length, cycles: cycles.length,
  viewer: final.viewerCount, cesiumCanvas: mobile.cesiumCanvas,
  primitiveGrowth: primitiveFinal - primitiveInitial, dataSourceGrowth: dataSourcesFinal - dataSourcesInitial,
  requiredErrors: requiredErrors.length, requiredFailures: requiredFailures.length, outputDir,
}, null, 2));
socket.close();
