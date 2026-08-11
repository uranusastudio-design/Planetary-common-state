import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PCS_CDP_PORT || 18800);
const url = process.env.PCS_TEST_URL || "http://127.0.0.1:4173/PCS_OBSERVATORY/?v=phase-4e";
const outputDir = process.env.PCS_PHASE4E_OUTPUT || path.join(process.cwd(), "test-results", "deep-space-phase-4e-local");
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
const waitFor = async (expression, timeout = 180000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(180);
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
const layerState = () => evaluate(`(()=>{const shell={epoch:0,horizon:0},visible={epoch:0,horizon:0},catalog={count:0,visible:0};for(const collection of cesiumViewer.scene.primitives._primitives||[]){for(let index=0;index<(collection.length||0);index++){const primitive=collection.get?.(index),id=primitive?.id;if(id?.phase4eShell){shell[id.phase4eShell]=(shell[id.phase4eShell]||0)+1;if(collection.show!==false&&primitive.show!==false)visible[id.phase4eShell]=(visible[id.phase4eShell]||0)+1;}if(id?.phase4Observation==='catalog-landmark'){catalog.count++;if(collection.show!==false&&primitive.show!==false)catalog.visible++;}}}return {shell,visible,catalog};})()`);
const card = () => evaluate("({id:document.querySelector('[data-object-card]').dataset.objectId,title:document.querySelector('[data-object-card-title]').textContent,text:document.querySelector('[data-ds-info]').textContent,notice:document.querySelector('[data-ds-phase4-notice]').textContent})");

await Promise.all([send("Runtime.enable"), send("Network.enable"), send("Page.enable"), send("Performance.enable")]);
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await waitFor("window.PCSDeepSpaceManager&&window.PCSObservableUniverse&&document.querySelector('#intro-enter')", 300000);
await evaluate("document.querySelector('#intro-enter')?.click()");
await waitFor("!document.body.classList.contains('intro-active')");
await waitFor("document.querySelector('.cesium-viewer')&&typeof cesiumViewer!=='undefined'&&cesiumViewer&&!cesiumViewer.isDestroyed()");
if (!await evaluate("PCSDeepSpaceManager.debug().initialized")) await evaluate("PCSDeepSpaceManager.initialize({viewer:cesiumViewer,host:document.querySelector('#cesium-globe')})");
await evaluate("PCSI18n.setLanguage('zh-TW');PCSDeepSpaceManager.open()");
await waitFor("PCSDeepSpaceManager.isOpen()");

const initial = await evaluate("PCSDeepSpaceManager.debug()");
const primitiveInitial = await evaluate("cesiumViewer.scene.primitives.length");
const dataSourcesInitial = await evaluate("cesiumViewer.dataSources.length");
const cameraPercentageInitial = await evaluate("cesiumViewer.camera.percentageChanged");
assert(initial.viewerCount === 1, "Viewer must remain one");
assert(await evaluate("document.querySelectorAll('.cesium-widget canvas').length===1"), "Cesium canvas must remain one");

assert(await evaluate("PCSDeepSpaceManager.enterCosmicWeb()"), "enter Cosmic Web transition");
await waitFor("PCSDeepSpaceManager.debug().cosmicWeb?.galaxies===48041");
await wait(900);
await screenshot("01-cosmic-web-to-observable-universe.png");
assert(await evaluate("PCSDeepSpaceManager.enterObservableUniverse()"), "enter Observable Universe");
await waitFor("PCSDeepSpaceManager.debug().observableUniverse?.epochMarkers===6&&PCSDeepSpaceManager.debug().observableUniverse?.horizons===2&&PCSDeepSpaceManager.debug().observableUniverse?.catalogLandmarks===2");
await wait(1200);

const overview = await evaluate("PCSDeepSpaceManager.debug()");
const overviewLayers = await layerState();
const overviewCard = await card();
assert(overview.scaleContext === "observable-universe", "Observable Universe scale context active");
assert(overview.viewerCount === 1 && await evaluate("document.querySelectorAll('.cesium-widget canvas').length===1"), "one Viewer and one Cesium canvas");
assert(overview.observableUniverse.shellPolylines === 24 && overview.observableUniverse.catalogLandmarks === 2, "six epoch and two horizon triplets plus two sparse landmarks");
assert(overview.observableUniverse.listenerActive && !overview.observableUniverse.allSkyFill && !overview.observableUniverse.cmbMapLoaded, "no all-sky fill or CMB map in Phase 4E");
assert(overview.cosmicWeb.galaxies === 48041 && overview.cosmicWeb.filaments === 2306 && overview.cosmicWeb.voids === 1228, "inner incomplete SDSS/BOSS footprint remains present");
assert(overviewLayers.shell.epoch === 18 && overviewLayers.shell.horizon === 6 && overviewLayers.catalog.count === 2, "model shells and sparse catalog landmarks are separate WebGL primitives");
assert(overviewCard.id === "pcs:observable-universe:context" && /observer-dependent/i.test(overviewCard.text) && /unobserved directions are not filled/i.test(overviewCard.text) && /No CMB anisotropy image/i.test(overviewCard.text), "context card rejects whole-Universe, survey fill, and early CMB claims");
await screenshot("02-observable-universe-overview.png");

const jades = await evaluate("PCSDeepSpaceManager.searchPhase4('JADES-GS-z14-0')");
assert(jades?.id === "pcs:jades:jades-gs-z14-0" && jades.redshift === 14.1793 && /^Catalog Observation/.test(jades.observationStatus), "JADES search resolves spectroscopic catalog observation");
await wait(1100);
const jadesCard = await card();
assert(jadesCard.id === jades.id && /RA 53\.08294/.test(jadesCard.text) && /z 14\.1793/.test(jadesCard.text) && /Planck18 model-derived quantities/.test(jadesCard.text) && /not an all-sky or complete/.test(jadesCard.text), "JADES card separates observed direction/redshift from model-derived distance/age");
await screenshot("03-jades-catalog-observation-focus.png");

const epoch = await evaluate("PCSDeepSpaceManager.searchPhase4('Cosmic noon')");
assert(epoch?.id === "pcs:cosmic-epoch:z-2" && epoch.objectType === "Cosmic Epoch", "cosmic epoch search resolves model marker");
await wait(1000);
const epochCard = await card();
assert(epochCard.id === epoch.id && /representative radial guide/i.test(epochCard.text) && /not a directly observed spherical structure/i.test(epochCard.text), "cosmic epoch card states representative model shell");
await screenshot("04-model-derived-cosmic-epoch.png");

const particle = await evaluate("PCSDeepSpaceManager.searchPhase4('Particle horizon')");
assert(particle?.id === "pcs:cosmic-horizon:particle", "particle-horizon search resolves model horizon");
await wait(1000);
const particleCard = await card();
assert(/not an edge of the whole Universe/i.test(particleCard.text), "particle horizon is not presented as the whole-Universe edge");
await screenshot("05-particle-horizon-model-measurement.png");

const lastScattering = await evaluate("PCSDeepSpaceManager.searchPhase4('Last scattering')");
assert(lastScattering?.id === "pcs:cosmic-horizon:last-scattering", "last-scattering search resolves model shell");
await wait(1000);
const lastScatteringCard = await card();
assert(/No CMB temperature or polarization map is loaded/i.test(lastScatteringCard.text), "last-scattering card reserves CMB map for Phase 4F");

await evaluate(`(()=>{for(const name of ["epochs","horizons","guides"]){const input=document.querySelector('[data-ds-observable-layer="'+name+'"]');if(input.checked)input.click();}const catalog=document.querySelector('[data-ds-observable-layer="catalog"]');if(!catalog.checked)catalog.click();return true;})()`);
await evaluate("PCSDeepSpaceManager.searchPhase4('JADES-GS-z14-0')");
await wait(1000);
const catalogOnly = { debug: await evaluate("PCSDeepSpaceManager.debug().observableUniverse"), layers: await layerState() };
assert(catalogOnly.debug.flags.catalog && !catalogOnly.debug.flags.epochs && !catalogOnly.debug.flags.horizons && !catalogOnly.debug.flags.guides && catalogOnly.layers.catalog.visible === 2 && catalogOnly.layers.visible.epoch === 0 && catalogOnly.layers.visible.horizon === 0, "catalog-observation-only layer state");
await screenshot("06-catalog-observation-only.png");
await evaluate(`(()=>{const catalog=document.querySelector('[data-ds-observable-layer="catalog"]');if(catalog.checked)catalog.click();for(const name of ["epochs","horizons","guides"]){const input=document.querySelector('[data-ds-observable-layer="'+name+'"]');if(!input.checked)input.click();}return true;})()`);
await evaluate("PCSDeepSpaceManager.searchPhase4('Last scattering')");
await wait(1000);
const modelOnly = { debug: await evaluate("PCSDeepSpaceManager.debug().observableUniverse"), layers: await layerState() };
assert(!modelOnly.debug.flags.catalog && modelOnly.debug.flags.epochs && modelOnly.debug.flags.horizons && modelOnly.debug.flags.guides && modelOnly.layers.catalog.visible === 0 && modelOnly.layers.visible.epoch === 18 && modelOnly.layers.visible.horizon === 6, "model-derived-only layer state");
await screenshot("07-model-derived-shells-only.png");
await evaluate("document.querySelectorAll('[data-ds-observable-layer]').forEach(input=>{if(!input.checked)input.click()})");

const navigationBefore = await evaluate("({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],direction:[cesiumViewer.camera.directionWC.x,cesiumViewer.camera.directionWC.y,cesiumViewer.camera.directionWC.z]})");
await evaluate("cesiumViewer.camera.rotateLeft(.12);cesiumViewer.camera.moveRight(Math.max(1000,Cesium.Cartesian3.magnitude(cesiumViewer.camera.positionWC)*.01));cesiumViewer.scene.canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-120,clientX:cesiumViewer.scene.canvas.clientWidth*.5,clientY:cesiumViewer.scene.canvas.clientHeight*.5,bubbles:true,cancelable:true}));");
await wait(350);
const navigationAfter = await evaluate("({position:[cesiumViewer.camera.positionWC.x,cesiumViewer.camera.positionWC.y,cesiumViewer.camera.positionWC.z],direction:[cesiumViewer.camera.directionWC.x,cesiumViewer.camera.directionWC.y,cesiumViewer.camera.directionWC.z],zoom:PCSDeepSpaceManager.debug().lastPointerZoom,focus:PCSDeepSpaceManager.debug().lastObjectFocus})");
assert(JSON.stringify(navigationBefore.position) !== JSON.stringify(navigationAfter.position) && JSON.stringify(navigationBefore.direction) !== JSON.stringify(navigationAfter.direction), "pan and rotate change the existing Cesium camera");
assert(navigationAfter.zoom?.inputType === "mouse-wheel" && navigationAfter.focus === lastScattering.id, "zoom and search/focus share existing navigation state");

const expected = {
  "zh-TW":["可觀測宇宙","JADES 地標 — 星表觀測","視界 — 模型推導量測","返回宇宙網"],
  en:["Observable Universe","JADES landmarks — Catalog Observation","Horizons — Model-derived Measurement","Return to Cosmic Web"],
  ja:["観測可能な宇宙","JADES ランドマーク — カタログ観測","地平線 — モデル導出測定","コズミックウェブへ戻る"],
  ko:["관측 가능한 우주","JADES 랜드마크 — 카탈로그 관측","지평선 — 모델 파생 측정","우주 거미줄로 돌아가기"],
};
const languages = {};
for (const language of Object.keys(expected)) {
  await evaluate(`PCSI18n.setLanguage(${JSON.stringify(language)})`);
  await wait(100);
  languages[language] = await evaluate("[document.querySelector('[data-ds-phase4-heading]').textContent,document.querySelector('[data-p4e=catalog]').textContent,document.querySelector('[data-p4e=horizons]').textContent,document.querySelector('[data-ds-return-cosmic-web]').textContent,PCSDeepSpaceManager.debug().viewerCount,document.querySelectorAll('.cesium-widget canvas').length]");
  assert(JSON.stringify(languages[language].slice(0, 4)) === JSON.stringify(expected[language]), `${language} exact Phase 4E UI`);
  assert(languages[language][4] === 1 && languages[language][5] === 1, `${language} does not recreate Viewer or Cesium canvas`);
}
await evaluate("PCSI18n.setLanguage('zh-TW')");

const cycles = [];
for (let index = 0; index < 10; index++) {
  assert(await evaluate("PCSDeepSpaceManager.enterCosmicWeb()"), `cycle ${index} Cosmic Web`);
  const cosmic = { primitive: await evaluate("cesiumViewer.scene.primitives.length"), dataSources: await evaluate("cesiumViewer.dataSources.length"), listeners: await listenerCounts(), debug: await evaluate("PCSDeepSpaceManager.debug()") };
  assert(await evaluate("PCSDeepSpaceManager.enterObservableUniverse()"), `cycle ${index} Observable Universe`);
  const observable = { primitive: await evaluate("cesiumViewer.scene.primitives.length"), dataSources: await evaluate("cesiumViewer.dataSources.length"), listeners: await listenerCounts(), debug: await evaluate("PCSDeepSpaceManager.debug()") };
  cycles.push({ cosmic, observable });
}
assert(cycles.every(({ cosmic }) => cosmic.primitive === cycles[0].cosmic.primitive && cosmic.dataSources === cycles[0].cosmic.dataSources && JSON.stringify(cosmic.listeners) === JSON.stringify(cycles[0].cosmic.listeners) && cosmic.debug.cosmicWeb.cameraListener && !cosmic.debug.observableUniverse.loaded), "10 Cosmic Web states have no primitive, data-source, or listener growth");
assert(cycles.every(({ observable }) => observable.primitive === cycles[0].observable.primitive && observable.dataSources === cycles[0].observable.dataSources && JSON.stringify(observable.listeners) === JSON.stringify(cycles[0].observable.listeners) && observable.debug.cosmicWeb.cameraListener && observable.debug.observableUniverse.listenerActive), "10 Observable Universe states have no primitive, data-source, or listener growth");

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await wait(500);
const mobile = await evaluate("({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,viewer:document.querySelectorAll('.cesium-viewer').length,cesiumCanvas:document.querySelectorAll('.cesium-widget canvas').length,controlsWidth:document.querySelector('[data-ds-controls]').getBoundingClientRect().width,viewport:[innerWidth,innerHeight]})");
assert(!mobile.overflow && mobile.viewer === 1 && mobile.cesiumCanvas === 1 && mobile.controlsWidth <= 382, "390x844 mobile has one Viewer/canvas and no horizontal overflow");
await screenshot("08-mobile-390x844-observable-universe.png");

await evaluate("PCSDeepSpaceManager.returnSolar()");
await wait(300);
const final = await evaluate("PCSDeepSpaceManager.debug()");
const primitiveFinal = await evaluate("cesiumViewer.scene.primitives.length");
const dataSourcesFinal = await evaluate("cesiumViewer.dataSources.length");
const cameraPercentageFinal = await evaluate("cesiumViewer.camera.percentageChanged");
assert(final.scaleContext === "solar" && !final.cosmicWeb.loaded && !final.cosmicWeb.cameraListener && !final.observableUniverse.loaded && !final.observableUniverse.listenerActive, "Solar return clears both Phase 4D and Phase 4E WebGL layers/listeners");
assert(primitiveFinal === primitiveInitial && dataSourcesFinal === dataSourcesInitial, "primitive and data-source baseline restored");
assert(cameraPercentageFinal === cameraPercentageInitial, "camera sensitivity baseline restored after nested renderer lifecycle");
const requiredErrors = consoleErrors.filter((value) => /Uncaught|TypeError|ReferenceError|RangeError|phase-4e|observable-universe/i.test(value));
const requiredFailures = networkFailures.filter((value) => /phase-4e|observable-universe/i.test(value.error || ""));
assert(requiredErrors.length === 0, `required console errors zero: ${JSON.stringify(requiredErrors)}`);
assert(requiredFailures.length === 0, `required network failures zero: ${JSON.stringify(requiredFailures)}`);

const report = {
  generatedAt: new Date().toISOString(), url, initial, overview, overviewLayers, overviewCard,
  jades, jadesCard, epoch, epochCard, particle, particleCard, lastScattering, lastScatteringCard,
  catalogOnly, modelOnly, navigationBefore, navigationAfter, languages, cycles, mobile,
  primitiveInitial, primitiveFinal, dataSourcesInitial, dataSourcesFinal,
  cameraPercentageInitial, cameraPercentageFinal, final, consoleErrors, networkFailures,
  requiredErrors, requiredFailures,
  screenshots: fs.readdirSync(outputDir).filter((file) => file.endsWith(".png")).sort(),
};
fs.writeFileSync(path.join(outputDir, "acceptance-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  epochMarkers: overview.observableUniverse.epochMarkers, horizons: overview.observableUniverse.horizons,
  shellPolylines: overview.observableUniverse.shellPolylines, catalogLandmarks: overview.observableUniverse.catalogLandmarks,
  allSkyFill: overview.observableUniverse.allSkyFill, cmbMapLoaded: overview.observableUniverse.cmbMapLoaded,
  cycles: cycles.length, viewer: final.viewerCount, cesiumCanvas: mobile.cesiumCanvas,
  primitiveGrowth: primitiveFinal - primitiveInitial, dataSourceGrowth: dataSourcesFinal - dataSourcesInitial,
  cameraPercentageRestored: cameraPercentageFinal === cameraPercentageInitial,
  requiredErrors: requiredErrors.length, requiredFailures: requiredFailures.length, outputDir,
}, null, 2));
socket.close();
