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
  const page = await waitForJson(`/json/new?${encodeURIComponent("about:blank")}`);
  cdp = connect(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Log.enable");
  await cdp.send("Network.enable");
  await cdp.send("Network.setBlockedURLs", { urls: ["https://pcs-backend.uranusastudio.workers.dev/*"] });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:4173/Apps/PCS-Mission-Control/" });
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
  assert.equal(desktop.updateHealth, "UPDATE_UNAVAILABLE");
  assert.match(desktop.update, /Update service unavailable[\s\S]*Local Mission Control remains available/);
  assert.equal(await evaluate(cdp, "document.body.innerText.includes('LOCAL_ADMIN_ONLY')"), true);
  assert.equal(await evaluate(cdp, "document.body.innerText.includes('MC-01') && document.body.innerText.includes('COMPLETED')"), true);
  assert.equal(await evaluate(cdp, "document.body.innerText.includes('MC-03') && document.body.innerText.includes('COMPLETED')"), true);
  assert.equal(await evaluate(cdp, "document.body.innerText.includes('MC-04') && document.body.innerText.includes('IN_PROGRESS')"), true);
  results.push({ name: "desktop_1280x720", result: "PASS", details: desktop });

  await evaluate(cdp, "location.hash='#phases'");
  await waitFor(cdp, "!document.querySelector('#phases-page').hidden && document.querySelectorAll('#phase-table-body tr').length === 48");
  const phases = await evaluate(cdp, `({
    rows: document.querySelectorAll('#phase-table-body tr').length,
    checkpoint: document.querySelector('[data-current-phase=\"true\"]')?.innerText,
    gate: document.querySelector('#gate-title').textContent,
    source: document.querySelector('#registry-source-path').textContent,
    sourceHash: document.querySelector('#registry-source-sha').textContent
  })`);
  assert.equal(phases.rows, 48);
  assert.match(phases.checkpoint, /OBS-7\.1[\s\S]*CHECKPOINT[\s\S]*VALIDATED[\s\S]*EVIDENCED[\s\S]*VALIDATED/);
  assert.equal(phases.gate, "Phase 7.2 · LOCKED");
  assert.match(phases.source, /Phase-Audit-20260728-143437\/PHASE_REGISTRY\.json$/);
  assert.match(phases.sourceHash, /^[a-f0-9]{64}$/);

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

  await evaluate(cdp, `{
    const select=document.querySelector('#status-filter'); select.value=''; select.dispatchEvent(new Event('input',{bubbles:true}));
    const functional=document.querySelector('#functional-filter'); functional.value='VALIDATED'; functional.dispatchEvent(new Event('input',{bubbles:true}));
  }`);
  assert.equal(await evaluate(cdp, "document.querySelectorAll('#phase-table-body tr').length > 0"), true);
  await evaluate(cdp, `{
    const functional=document.querySelector('#functional-filter'); functional.value=''; functional.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('[data-current-phase=\"true\"] .record-detail-button').click();
  }`);
  await waitFor(cdp, "document.querySelector('#record-detail').open");
  const detail = await evaluate(cdp, `({
    id: document.querySelector('#detail-id').textContent,
    lifecycle: document.querySelector('#detail-lifecycle').textContent,
    source: document.querySelector('#detail-source').textContent,
    artifact: document.querySelector('#detail-artifact').textContent,
    mutationButtons: [...document.querySelectorAll('#record-detail button')].filter(x => /Edit|Save|Delete|Deploy|Approve/i.test(x.textContent)).length
  })`);
  assert.equal(detail.id, "OBS-7.1");
  assert.equal(detail.lifecycle, "CHECKPOINT");
  assert.match(detail.source, /PHASE_REGISTRY\.json$/);
  assert.match(detail.artifact, /Phase-Audit-20260728-143437$/);
  assert.equal(detail.mutationButtons, 0);
  await evaluate(cdp, "document.querySelector('#record-detail-close').click()");
  assert.equal(await evaluate(cdp, "document.querySelector('#record-detail').open"), false);
  results.push({ name: "phase_control_search_filter", result: "PASS", details: phases });

  await evaluate(cdp, "location.hash='#mission-queue'");
  await waitFor(cdp, "!document.querySelector('#mission-queue-page').hidden && document.querySelectorAll('#queue-table-body tr').length === 48");
  const queue = await evaluate(cdp, `({
    rows: document.querySelectorAll('#queue-table-body tr').length,
    total: document.querySelector('#queue-total').textContent,
    next: document.querySelector('#next-mission-title').textContent,
    summary: [...document.querySelectorAll('#queue-summary .summary-card')].map(x => x.innerText),
    source: document.querySelector('#queue-source-path').textContent,
    sourceHash: document.querySelector('#queue-source-sha').textContent,
    mutationButtons: [...document.querySelectorAll('#mission-queue-page button')].filter(x => /Start|Run|Execute|Retry|Cancel|Delete|Deploy|Approve|Unlock|Change priority/i.test(x.textContent)).length
  })`);
  assert.equal(queue.rows, 48);
  assert.equal(queue.total, "48 projected items");
  assert.equal(queue.next, "MC-04 — Mission Queue Read-Only Integration");
  assert.equal(queue.mutationButtons, 0);
  assert.match(queue.source, /Phase-Audit-20260728-143437\/PHASE_REGISTRY\.json$/);
  assert.match(queue.sourceHash, /^[a-f0-9]{64}$/);

  await evaluate(cdp, `{
    const input=document.querySelector('#queue-search');
    input.value='Historical reconstruction';
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }`);
  assert.equal(await evaluate(cdp, "document.querySelectorAll('#queue-table-body tr').length"), 1);
  await evaluate(cdp, `{
    const input=document.querySelector('#queue-search'); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true}));
    const select=document.querySelector('#queue-status-filter'); select.value='BLOCKED'; select.dispatchEvent(new Event('input',{bubbles:true}));
  }`);
  assert.equal(await evaluate(cdp, "document.querySelectorAll('#queue-table-body tr').length"), 33);
  await evaluate(cdp, `{
    const status=document.querySelector('#queue-status-filter'); status.value=''; status.dispatchEvent(new Event('input',{bubbles:true}));
    const namespace=document.querySelector('#queue-namespace-filter'); namespace.value='observatory'; namespace.dispatchEvent(new Event('input',{bubbles:true}));
  }`);
  assert.equal(await evaluate(cdp, "document.querySelectorAll('#queue-table-body tr').length"), 8);
  await evaluate(cdp, `{
    const namespace=document.querySelector('#queue-namespace-filter'); namespace.value=''; namespace.dispatchEvent(new Event('input',{bubbles:true}));
    for (const [id,value] of [['queue-priority-filter','UNAVAILABLE'],['queue-lock-filter','UNAVAILABLE']]) {
      const select=document.querySelector('#'+id); select.value=value; select.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }`);
  assert.equal(await evaluate(cdp, "document.querySelectorAll('#queue-table-body tr').length"), 48);
  await evaluate(cdp, `{
    const priority=document.querySelector('#queue-priority-filter'); priority.value=''; priority.dispatchEvent(new Event('input',{bubbles:true}));
    const lock=document.querySelector('#queue-lock-filter'); lock.value=''; lock.dispatchEvent(new Event('input',{bubbles:true}));
    const validation=document.querySelector('#queue-validation-filter'); validation.value='VALIDATED'; validation.dispatchEvent(new Event('input',{bubbles:true}));
  }`);
  assert.equal(await evaluate(cdp, "document.querySelectorAll('#queue-table-body tr').length > 0"), true);
  await evaluate(cdp, `{
    const validation=document.querySelector('#queue-validation-filter'); validation.value=''; validation.dispatchEvent(new Event('input',{bubbles:true}));
    const blockers=document.querySelector('#queue-blocker-filter'); blockers.value='HAS_BLOCKERS'; blockers.dispatchEvent(new Event('input',{bubbles:true}));
  }`);
  assert.equal(await evaluate(cdp, "document.querySelectorAll('#queue-table-body tr').length"), 38);
  await evaluate(cdp, `{
    const blockers=document.querySelector('#queue-blocker-filter'); blockers.value=''; blockers.dispatchEvent(new Event('input',{bubbles:true}));
    const sorts=['priority','queue_item_id','queue_status','namespace','last_verified_at'];
    const select=document.querySelector('#queue-sort-select');
    for (const value of sorts) { select.value=value; select.dispatchEvent(new Event('input',{bubbles:true})); }
    document.querySelector('#queue-table-body .queue-detail-button').click();
  }`);
  await waitFor(cdp, "document.querySelector('#queue-detail').open");
  const queueDetail = await evaluate(cdp, `({
    queueId: document.querySelector('#queue-detail-id').textContent,
    recordId: document.querySelector('#queue-detail-record').textContent,
    source: document.querySelector('#queue-detail-source').textContent,
    approval: document.querySelector('#queue-detail-approval').textContent,
    mutationButtons: [...document.querySelectorAll('#queue-detail button')].filter(x => /Start|Run|Execute|Retry|Cancel|Delete|Deploy|Approve|Unlock|Change priority/i.test(x.textContent)).length
  })`);
  assert.match(queueDetail.queueId, /^QUEUE:/);
  assert.notEqual(queueDetail.recordId, "");
  assert.match(queueDetail.source, /Phase-Audit-20260728-143437$/);
  assert.equal(queueDetail.mutationButtons, 0);
  await evaluate(cdp, "document.querySelector('#queue-detail-close').click()");
  assert.equal(await evaluate(cdp, "document.querySelector('#queue-detail').open"), false);
  results.push({ name: "mission_queue_search_filters_sort_detail", result: "PASS", details: { ...queue, detail: queueDetail } });

  await evaluate(cdp, "location.hash='#data-sources'");
  await waitFor(cdp, "!document.querySelector('#data-source-page').hidden && document.querySelector('#history-source-name').textContent === 'chatgpt-pcs-history'");
  const source = await evaluate(cdp, `({
    name: document.querySelector('#history-source-name').textContent,
    status: document.querySelector('#history-source-status').textContent,
    boundary: document.querySelector('#history-boundary').textContent,
    conversations: document.querySelector('#history-conversations').textContent,
    messages: document.querySelector('#history-messages').textContent,
    chunks: document.querySelector('#history-chunks').textContent,
    notice: document.querySelector('#new-conversations-list').innerText,
    privateText: document.body.innerText.includes('text_content')
  })`);
  assert.deepEqual(source, {
    name: "chatgpt-pcs-history",
    status: "ENABLED",
    boundary: "LOCAL_ONLY · READ_ONLY",
    conversations: "83",
    messages: "2,384",
    chunks: "3,013",
    notice: [
      "Current index is a validated snapshot.",
      "New ChatGPT conversations are not imported automatically.",
      "New conversations require export, metadata review, Alvin approval, incremental indexing and validation.",
      "Automatic unrestricted ingestion is disabled."
    ].join("\n"),
    privateText: false
  });
  results.push({ name: "local_history_source_status", result: "PASS", details: source });

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
  await evaluate(cdp, "location.hash='#phases'");
  await waitFor(cdp, "!document.querySelector('#phases-page').hidden");
  assert.equal(await evaluate(cdp, "document.documentElement.scrollWidth > document.documentElement.clientWidth"), false);
  results.push({ name: "laptop_1024x768", result: "PASS", details: { overflow: false } });

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

  await cdp.send("Network.setBlockedURLs", {
    urls: [
      "https://pcs-backend.uranusastudio.workers.dev/*",
      "http://127.0.0.1:4173/local-api/mission-queue"
    ]
  });
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:4173/Apps/PCS-Mission-Control/#mission-queue" });
  await waitFor(cdp, "!document.querySelector('#queue-error').hidden");
  const failure = await evaluate(cdp, `({
    error: document.querySelector('#queue-error').textContent,
    shellVisible: !!document.querySelector('#sidebar') && !!document.querySelector('#main-content'),
    queueRows: document.querySelectorAll('#queue-table-body tr').length,
    bodyState: document.querySelector('#system-state-title').textContent
  })`);
  assert.match(failure.error, /QUEUE_UNAVAILABLE/);
  assert.equal(failure.shellVisible, true);
  assert.equal(failure.queueRows, 0);
  assert.equal(failure.bodyState, "DEGRADED_OR_INCOMPLETE");
  results.push({ name: "mission_queue_failure_state", result: "PASS", details: failure });

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
