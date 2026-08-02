import fs from "node:fs";
import path from "node:path";

const port = Number(process.env.PCS_CDP_PORT || 9231);
const baseUrl = process.env.PCS_TEST_URL || "http://127.0.0.1:8765/PCS_OBSERVATORY/?v=observatory-changelog";
const outputDir = process.env.PCS_SCREENSHOT_DIR || path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", "changelog");
fs.mkdirSync(outputDir, { recursive: true });
const target = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then(response => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, {once:true}); socket.addEventListener("error", reject, {once:true}); });
let sequence = 0;
const pending = new Map();
const consoleErrors = [];
const networkFailures = [];
const requestUrls = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { const promise = pending.get(message.id); pending.delete(message.id); return message.error ? promise.reject(new Error(message.error.message)) : promise.resolve(message.result); }
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") consoleErrors.push(message.params.entry.text);
  if (message.method === "Network.requestWillBeSent") requestUrls.set(message.params.requestId, message.params.request.url);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push({url:requestUrls.get(message.params.requestId) || "unknown", error:message.params.errorText});
});
function send(method, params = {}) { const id = ++sequence; socket.send(JSON.stringify({id, method, params})); return new Promise((resolve, reject) => pending.set(id, {resolve, reject})); }
async function evaluate(expression) { const result = await send("Runtime.evaluate", {expression, awaitPromise:true, returnByValue:true}); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; }
async function waitFor(expression, timeout = 60000) { const started = Date.now(); while (Date.now() - started < timeout) { if (await evaluate(`Boolean(${expression})`)) return; await new Promise(resolve => setTimeout(resolve, 200)); } throw new Error(`Timeout: ${expression}`); }
function assert(value, message) { if (!value) throw new Error(message); }
async function screenshot(name) { const result = await send("Page.captureScreenshot", {format:"png", captureBeyondViewport:false}); fs.writeFileSync(path.join(outputDir, `${name}.png`), Buffer.from(result.data, "base64")); }

await Promise.all([send("Runtime.enable"), send("Log.enable"), send("Network.enable"), send("Page.enable")]);
const blockRegistry = process.env.PCS_BLOCK_RELEASE_REGISTRY === "1";
if (blockRegistry) await send("Network.setBlockedURLs", {urls:["*data/releases.json*"]});
await send("Page.navigate", {url:baseUrl});
await waitFor("document.querySelector('[data-release-center]') && !document.querySelector('[data-release-center]').hidden");
await evaluate("document.querySelector('#intro-enter')?.click()");
await waitFor("!document.body.classList.contains('intro-active')");
if (blockRegistry) {
  const fallback = await evaluate(`({unavailable:document.querySelector('[data-release-center]').classList.contains('is-unavailable'),title:document.querySelector('#pcs-update-title').textContent,summary:document.querySelector('#pcs-update-summary').textContent,version:document.querySelector('#pcs-update-phase').textContent,toggleHidden:document.querySelector('#pcs-update-toggle').hidden,viewer:document.querySelectorAll('.cesium-viewer').length,canvas:document.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})`);
  assert(fallback.unavailable && fallback.summary && !fallback.version && fallback.toggleHidden && fallback.viewer === 1 && !fallback.overflow, "registry failure fallback");
  fs.writeFileSync(path.join(outputDir, "acceptance-report.json"), JSON.stringify({url:baseUrl,fallback,consoleErrors,networkFailures,expectedRegistryFailure:true}, null, 2));
  socket.close();
  console.log(JSON.stringify({fallback,consoleErrors,networkFailures,expectedRegistryFailure:true}, null, 2));
  process.exit(0);
}
await evaluate("PCSI18n.setLanguage('en')");
await waitFor("document.querySelector('[data-release-text=\"pcsUpdates\"]').textContent === 'PCS Updates'");
await evaluate("document.querySelector('[data-release-center]').scrollIntoView({block:'start'})");
const initial = await evaluate(`({canvas:document.querySelectorAll('canvas').length,viewer:document.querySelectorAll('.cesium-viewer').length,selected:document.querySelector('#observatory-view-title')?.textContent,deepSpace:window.PCSDeepSpaceManager?.isOpen?.()||false,collapsed:document.querySelector('[data-release-center]').classList.contains('is-collapsed'),version:document.querySelector('#pcs-update-phase').textContent})`);
assert(!initial.collapsed && initial.version === "v2.1.0", "expanded release banner default");
assert(!await evaluate("document.querySelector('[data-release-center]').classList.contains('is-release-center-open')"), "compact banner does not open full Release Center by default");
const banner = await evaluate(`({title:document.querySelector('#pcs-update-title').textContent,status:document.querySelector('#pcs-update-status').textContent,coverage:[...document.querySelectorAll('.pcs-release-banner__coverage li')].map(x=>x.textContent),next:document.querySelector('.pcs-release-banner__next').textContent,open:document.querySelector('#pcs-release-open').textContent,notes:document.querySelector('#pcs-release-notes').textContent})`);
assert(banner.title === "PCS Observatory v2.1.0" && banner.status === "Stable / Frozen", "registry-backed current release");
assert(JSON.stringify(banner.coverage) === JSON.stringify(["Earth","Solar System","Nearby Stars","Milky Way","Local Group"]), "exact English coverage");
assert(banner.next === "Next version: v2.2.0 — Planned", "planned version state");
await screenshot("01-expanded-release-banner");
await evaluate("document.querySelector('#pcs-update-toggle').click()");
await waitFor("document.querySelector('#pcs-update-toggle').getAttribute('aria-expanded') === 'false'");
assert(await evaluate("sessionStorage.getItem('pcs-release-center-expanded') === 'false'"), "session-only collapse persistence");
await screenshot("02-collapsed-release-badge");
await evaluate("document.querySelector('#pcs-update-toggle').click()");
await waitFor("document.querySelector('#pcs-update-toggle').getAttribute('aria-expanded') === 'true'");
await evaluate("document.querySelector('#pcs-release-notes').click()");
await waitFor("document.querySelector('[data-release-tab=notes]').getAttribute('aria-selected') === 'true'");
assert(await evaluate("document.querySelector('[data-release-center]').classList.contains('is-release-center-open')"), "Release Notes opens existing Release Center");
assert(await evaluate("document.activeElement === document.querySelector('[data-release-tab=notes]')"), "Release Notes focus integration");
await evaluate("document.querySelector('#pcs-release-open').click()");
assert(await evaluate("document.activeElement === document.querySelector('#page-title')"), "Open Observatory focus integration");

const tabs = {};
for (const name of ["changelog", "roadmap", "notes", "latest"]) {
  tabs[name] = await evaluate(`(()=>{document.querySelector('[data-release-tab="${name}"]').click();const view=document.querySelector('#pcs-release-view');return {selected:document.querySelector('[data-release-tab="${name}"]').getAttribute('aria-selected'),text:view.textContent,overflow:view.scrollWidth>view.clientWidth};})()`);
  assert(tabs[name].selected === "true" && !tabs[name].overflow, `${name} tab`);
  await screenshot(`tab-${name}`);
}
assert(/Phase 3/.test(tabs.roadmap.text) && /Phase 4/.test(tabs.roadmap.text) && /Titania/.test(tabs.roadmap.text), "roadmap states visible");
assert(/View Commit/.test(tabs.changelog.text) && /View Diff/.test(tabs.changelog.text), "commit and diff links visible");
const links = await evaluate(`[...document.querySelectorAll('#pcs-release-view a')].map(a=>({href:a.href,rel:a.rel,target:a.target}))`);
assert(links.every(link => link.target === "_blank" && link.rel.includes("noopener") && link.rel.includes("noreferrer")), "safe external links");

const zoomResults = {};
for (const zoom of [1, .67, .5, .33]) zoomResults[zoom] = await evaluate(`(()=>{document.body.style.zoom=${JSON.stringify(String(zoom))};return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,toggle:!!document.querySelector('#pcs-update-toggle').getClientRects().length,tabs:[...document.querySelectorAll('[data-release-tab]')].every(x=>x.getClientRects().length)};})()`);
assert(Object.values(zoomResults).every(result => !result.overflow && result.toggle && result.tabs), "desktop zoom layout");
await evaluate("document.body.style.zoom='1'");

const languages = {};
const expectedBanner = {
  en:{coverage:["Earth","Solar System","Nearby Stars","Milky Way","Local Group"],next:"Next version: v2.2.0 — Planned",open:"Open Observatory",notes:"Release Notes"},
  "zh-TW":{coverage:["地球","太陽系","太陽鄰近恆星","銀河系","本星系群"],next:"下一版本: v2.2.0 — 規劃中",open:"開啟 Observatory",notes:"版本說明"},
  ja:{coverage:["地球","太陽系","太陽近傍星","天の川銀河","局所銀河群"],next:"次期バージョン: v2.2.0 — 計画中",open:"Observatory を開く",notes:"リリースノート"},
  ko:{coverage:["지구","태양계","태양 근방 항성","은하수","국부 은하군"],next:"다음 버전: v2.2.0 — 계획됨",open:"Observatory 열기",notes:"릴리스 노트"},
};
for (const language of ["en", "zh-TW", "ja", "ko"]) {
  languages[language] = await evaluate(`(async()=>{await PCSI18n.setLanguage(${JSON.stringify(language)});await new Promise(r=>setTimeout(r,30));return {label:document.querySelector('[data-release-text="pcsUpdates"]').textContent,title:document.querySelector('#pcs-update-title').textContent,status:document.querySelector('#pcs-update-status').textContent,coverage:[...document.querySelectorAll('.pcs-release-banner__coverage li')].map(x=>x.textContent),next:document.querySelector('.pcs-release-banner__next').textContent,open:document.querySelector('#pcs-release-open').textContent,notes:document.querySelector('#pcs-release-notes').textContent,tabs:[...document.querySelectorAll('[data-release-tab]')].map(x=>x.textContent),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};})()`);
  assert(languages[language].label && languages[language].title === "PCS Observatory v2.1.0" && languages[language].status === "Stable / Frozen" && JSON.stringify(languages[language].coverage) === JSON.stringify(expectedBanner[language].coverage) && languages[language].next === expectedBanner[language].next && languages[language].open === expectedBanner[language].open && languages[language].notes === expectedBanner[language].notes && languages[language].tabs.every(Boolean) && !languages[language].overflow, `${language} exact UI`);
}

await send("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:2,mobile:true});
await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.querySelector('#pcs-update-toggle').click();document.querySelector('[data-release-center]').scrollIntoView({block:'start'})");
await screenshot("03-mobile-release-banner");
await evaluate("document.querySelector('#pcs-release-notes').click()");
await evaluate(`document.querySelector('[data-release-tab="changelog"]').click()`);
const mobile = await evaluate(`({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,panel:document.querySelector('[data-release-center]').getBoundingClientRect().width,viewport:innerWidth,toggleVisible:!!document.querySelector('#pcs-update-toggle').getClientRects().length,longHashes:[...document.querySelectorAll('.pcs-release-link-list code')].every(x=>x.scrollWidth<=x.parentElement.scrollWidth)})`);
assert(!mobile.overflow && mobile.panel <= mobile.viewport && mobile.toggleVisible && mobile.longHashes, "390x844 mobile layout");
await screenshot("04-mobile-release-center-390x844");
await send("Emulation.clearDeviceMetricsOverride");

await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
await waitFor("document.querySelector('[data-release-center]').classList.contains('is-collapsed')");
const finalState = await evaluate(`({canvas:document.querySelectorAll('canvas').length,viewer:document.querySelectorAll('.cesium-viewer').length,selected:document.querySelector('#observatory-view-title')?.textContent,deepSpace:window.PCSDeepSpaceManager?.isOpen?.()||false,githubApi:[...performance.getEntriesByType('resource')].some(x=>x.name.includes('api.github.com')),releaseLoaded:[...performance.getEntriesByType('resource')].some(x=>x.name.includes('data/releases.json'))})`);
assert(finalState.canvas === initial.canvas && finalState.viewer === initial.viewer, "canvas and Viewer counts unchanged");
assert(finalState.selected === initial.selected && finalState.deepSpace === initial.deepSpace, "Observatory and Deep Space state unchanged");
assert(!finalState.githubApi && finalState.releaseLoaded, "local registry without GitHub API");

const requireDeepSpace = process.env.PCS_REQUIRE_DEEP_SPACE === "1";
await evaluate("PCSDeepSpaceManager.open()");
let deepSpaceOpened = false;
try { await waitFor("PCSDeepSpaceManager.isOpen()", requireDeepSpace ? 90000 : 10000); deepSpaceOpened = true; } catch (error) { if (requireDeepSpace) throw error; }
const deepSpaceRegression = deepSpaceOpened ? await evaluate(`(async()=>{
  const phase1={...PCSDeepSpaceManager.debug(),bodies:document.querySelectorAll('[data-body]').length};
  const ten=await PCSDeepSpaceManager.enterNearby('10pc');
  const proxima=PCSDeepSpaceManager.searchNearby('Proxima Centauri');
  const hundred=await PCSDeepSpaceManager.enterNearby('100pc',{reduced:true});
  const phase2={...PCSDeepSpaceManager.debug(),proxima:proxima?.primaryName};
  PCSDeepSpaceManager.returnSolar();
  PCSDeepSpaceManager.close();
  return {phase1,ten,hundred,phase2,after:PCSDeepSpaceManager.debug()};
})()`) : {status:"not-initialized-in-local-acceptance"};
if (deepSpaceOpened) {
  assert(deepSpaceRegression.phase1.active && deepSpaceRegression.phase1.viewerCount === 1 && deepSpaceRegression.phase1.canvasCount === initial.canvas && deepSpaceRegression.phase1.bodies === 9, "Phase 1 browser regression");
  assert(deepSpaceRegression.ten && deepSpaceRegression.hundred && deepSpaceRegression.phase2.proxima === "Proxima Centauri" && deepSpaceRegression.phase2.nearby.points > 0, "Phase 2 browser regression");
  assert(!deepSpaceRegression.after.active && !deepSpaceRegression.after.nearbyActive && deepSpaceRegression.after.viewerCount === 1 && deepSpaceRegression.after.canvasCount === initial.canvas, "Deep Space cleanup regression");
}
const requiredFailures = networkFailures.filter(item => /releases\.json|release-center\.js|style\.css|index\.html/.test(item.url));
const relevantConsoleErrors = consoleErrors.filter(message => !message.startsWith("Failed to load resource:"));
assert(relevantConsoleErrors.length === 0, `console errors: ${relevantConsoleErrors.join(" | ")}`);
assert(requiredFailures.length === 0, `required network failures: ${JSON.stringify(requiredFailures)}`);

const report = {url:baseUrl,initial,finalState,deepSpaceRegression,tabs,links,zoomResults,languages,mobile,consoleErrors,relevantConsoleErrors,networkFailures,requiredFailures,screenshots:fs.readdirSync(outputDir).filter(file=>file.endsWith(".png"))};
fs.writeFileSync(path.join(outputDir, "acceptance-report.json"), JSON.stringify(report, null, 2));
socket.close();
console.log(JSON.stringify(report, null, 2));
