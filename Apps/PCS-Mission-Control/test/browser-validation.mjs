import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = mkdtempSync(join(tmpdir(), "pcs-mc-chrome-"));
const port = 19223;
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: "ignore" });

async function waitForJson(path, attempts = 80) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: path.startsWith("/json/new") ? "PUT" : "GET" });
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Chrome endpoint unavailable: ${path}`);
}

function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const events = [];
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else events.push(message);
  });
  return {
    events,
    ready: new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    }),
    send(method, params = {}) {
      const messageId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject });
        socket.send(JSON.stringify({ id: messageId, method, params }));
      });
    },
    close() { socket.close(); }
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(cdp, expression, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    if (await evaluate(cdp, expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Browser condition timed out: ${expression}`);
}

const results = [];
let cdp;
try {
  const page = await waitForJson(`/json/new?${encodeURIComponent("http://127.0.0.1:4173/Apps/PCS-Mission-Control/")}`);
  cdp = connect(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Log.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await waitFor(cdp, "document.querySelectorAll('#phase-summary .summary-card').length === 7");
  await waitFor(cdp, "document.querySelector('#update-health').textContent !== 'CHECKING'", 120);

  const desktop = await evaluate(cdp, `({
    title: document.title,
    state: document.querySelector('#system-state-title').textContent,
    total: document.querySelector('#registry-total').textContent,
    counts: [...document.querySelectorAll('#phase-summary .summary-card')].map(x => x.innerText),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    canvases: document.querySelectorAll('canvas').length,
    cesium: document.querySelectorAll('.cesium-viewer, #cesium-globe').length,
    update: document.querySelector('#latest-update').textContent.trim(),
    updateHealth: document.querySelector('#update-health').textContent
  })`);
  assert.equal(desktop.state, "DEGRADED_OR_INCOMPLETE");
  assert.equal(desktop.total, "48 canonical records");
  assert.equal(desktop.overflow, false);
  assert.equal(desktop.canvases, 0);
  assert.equal(desktop.cesium, 0);
  assert.match(desktop.updateHealth, /AVAILABLE|UNAVAILABLE/);
  assert.equal(await evaluate(cdp, "document.body.innerText.includes('LOCAL_ADMIN_ONLY')"), true);
  results.push({ name: "desktop_1280x720", result: "PASS", details: desktop });

  await evaluate(cdp, "location.hash='#phases'");
  await waitFor(cdp, "!document.querySelector('#phases-page').hidden && document.querySelectorAll('#phase-table-body tr').length === 48");
  const phases = await evaluate(cdp, `({
    rows: document.querySelectorAll('#phase-table-body tr').length,
    checkpoint: document.querySelector('[data-current-phase=\"true\"]')?.innerText,
    gate: document.querySelector('#gate-title').textContent
  })`);
  assert.equal(phases.rows, 48);
  assert.match(phases.checkpoint, /OBS-7\.1[\s\S]*CHECKPOINT[\s\S]*VALIDATED[\s\S]*PASSED[\s\S]*PASSED[\s\S]*VERIFIED/);
  assert.equal(phases.gate, "Phase 7.2 · LOCKED");

  await evaluate(cdp, `{
    const input=document.querySelector('#phase-search');
    input.value='Historical reconstruction';
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }`);
  assert.equal(await evaluate(cdp, "document.querySelectorAll('#phase-table-body tr').length"), 1);
  await evaluate(cdp, `{
    const input=document.querySelector('#phase-search'); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true}));
    const select=document.querySelector('#status-filter'); select.value='NOT_STARTED'; select.dispatchEvent(new Event('input',{bubbles:true}));
  }`);
  assert.equal(await evaluate(cdp, "document.querySelectorAll('#phase-table-body tr').length"), 6);
  results.push({ name: "phase_control_search_filter", result: "PASS", details: phases });

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(cdp, "location.hash='#dashboard'");
  await evaluate(cdp, "document.querySelector('#nav-toggle').click()");
  assert.equal(await evaluate(cdp, "document.querySelector('#sidebar').classList.contains('is-open')"), true);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  assert.equal(await evaluate(cdp, "document.querySelector('#sidebar').classList.contains('is-open')"), false);
  const mobile = await evaluate(cdp, `({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    toggleVisible: getComputedStyle(document.querySelector('#nav-toggle')).display !== 'none',
    summaryColumns: getComputedStyle(document.querySelector('#phase-summary')).gridTemplateColumns
  })`);
  assert.equal(mobile.overflow, false);
  assert.equal(mobile.toggleVisible, true);
  results.push({ name: "mobile_390x844_drawer", result: "PASS", details: mobile });

  await cdp.send("Page.navigate", { url: "http://localhost:4173/Apps/PCS-Mission-Control/" });
  await waitFor(cdp, "document.querySelectorAll('#phase-summary .summary-card').length === 7");
  assert.equal(await evaluate(cdp, "location.hostname"), "localhost");
  results.push({ name: "localhost_loopback", result: "PASS", details: { url: "http://localhost:4173/Apps/PCS-Mission-Control/" } });

  const errors = cdp.events.filter((event) =>
    event.method === "Runtime.exceptionThrown" ||
    (event.method === "Log.entryAdded" && ["error", "warning"].includes(event.params.entry.level))
  );
  if (errors.length) console.error(JSON.stringify(errors, null, 2));
  assert.equal(errors.length, 0);
  results.push({ name: "console", result: "PASS", details: { errors: 0, warnings: 0 } });

  console.log(JSON.stringify({ browser: "Google Chrome", results }, null, 2));
} finally {
  cdp?.close();
  chrome.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 300));
  rmSync(profile, { recursive: true, force: true });
}
