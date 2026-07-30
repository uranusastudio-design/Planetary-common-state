import { STATUS_ORDER, filterQueueItems, filterRecords, moduleCard, statusBadge, summarize, summarizeQueue } from "./components.js";
import { fetchProjectUpdateState, loadLocalAdminData } from "./data-adapter.js";

const AGENT_STATUS_API = "/local-api/agent-status";
const PCS_STATE_API = "/local-api/pcs-state";

const UPDATE_API = "https://pcs-backend.uranusastudio.workers.dev/api/project-updates/latest";
const BLOCKERS_API = "/local-api/blockers";

const MODULES = [
  { title: "Earth Observatory", status: "DEPLOYED", description: "Existing PCS Observatory. Mission Control does not create a second viewer.", href: "../../PCS_OBSERVATORY/" },
  { title: "Solar System", status: "DEPLOYED", description: "Existing Observatory solar-system controls.", href: "../../PCS_OBSERVATORY/#solar-system-title" },
  { title: "Deep Space", status: "DEPLOYED", description: "Existing Observatory Deep Space preview.", href: "../../PCS_OBSERVATORY/#solar-system-title" },
  { title: "Phase Registry", status: "ARCHIVED", description: "Canonical MC-01 audit source, exposed as a cached runtime copy.", href: "#phases" },
  { title: "Update API", status: "DEPLOYED", description: "Existing PCS project-update API; runtime health is checked separately." },
  { title: "OpenClaw", status: "NOT_CONNECTED", description: "Operational telemetry is outside MC-02." },
  { title: "WhatsApp", status: "NOT_CONNECTED", description: "WhatsApp integration begins only after explicit approval." },
  { title: "Resource Monitor", status: "NOT_CONNECTED", description: "No CPU, memory, storage or network values are synthesized." }
];

let registry;
let missionQueue;
let localStatus;

function setClock() {
  const now = new Date();
  document.querySelector("#local-clock").textContent = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Taipei"
  }).format(now);
  document.querySelector("#local-clock").dateTime = now.toISOString();
}

function renderSummary(records) {
  const counts = summarize(records);
  const container = document.querySelector("#phase-summary");
  container.replaceChildren();
  STATUS_ORDER.forEach((status) => {
    const card = document.createElement("article");
    card.className = "summary-card";
    card.append(statusBadge(status));
    const count = document.createElement("strong");
    count.textContent = counts[status];
    const label = document.createElement("span");
    label.textContent = "canonical records";
    card.append(count, label);
    container.append(card);
  });
  document.querySelector("#registry-total").textContent = `${records.length} canonical records`;
}

function renderLocalAdminStatus() {
  document.querySelector("#runtime-mode").textContent = localStatus.runtime_mode;
  document.querySelector("#refresh-state").textContent = localStatus.refresh_state;
  document.querySelector("#mc-phase-cards").replaceChildren(...localStatus.mission_control_phases.map((phase) => {
    const card = document.createElement("article");
    card.className = "summary-card";
    const label = document.createElement("span");
    label.className = "eyebrow";
    label.textContent = phase.id;
    const title = document.createElement("strong");
    title.className = "phase-card-title";
    title.textContent = phase.title;
    card.append(label, title, statusBadge(phase.status));
    return card;
  }));

  const source = localStatus.history_source;
  const values = {
    "history-source-name": source.name,
    "history-source-status": source.status,
    "history-conversations": source.conversations.toLocaleString(),
    "history-messages": source.messages.toLocaleString(),
    "history-chunks": source.chunks.toLocaleString(),
    "history-index": source.index,
    "history-boundary": `${source.scope} · ${source.access}`,
    "history-memory": source.automatic_memory_write ? "ENABLED" : "NO_AUTOMATIC_MEMORY_WRITE",
    "history-embedding": source.embedding ? "ENABLED" : "NO_EMBEDDING",
    "history-approval": source.approval,
    "history-traceability": source.traceability
  };
  Object.entries(values).forEach(([id, value]) => {
    document.querySelector(`#${id}`).textContent = value;
  });
  const notice = localStatus.new_conversations;
  document.querySelector("#new-conversations-list").replaceChildren(...[
    notice.snapshot,
    notice.policy,
    notice.required_process,
    notice.restriction
  ].map((value) => {
    const li = document.createElement("li");
    li.textContent = value;
    return li;
  }));
}

function renderPhaseTable() {
  const state = {
    query: document.querySelector("#phase-search").value,
    namespace: document.querySelector("#namespace-filter").value,
    status: document.querySelector("#status-filter").value,
    functional: document.querySelector("#functional-filter").value,
    deployment: document.querySelector("#deployment-filter").value,
    lock: document.querySelector("#lock-filter").value,
    sort: document.querySelector("#sort-select").value
  };
  const rows = filterRecords(registry.records, state);
  const body = document.querySelector("#phase-table-body");
  body.replaceChildren();
  rows.forEach((record) => {
    const tr = document.createElement("tr");
    const fields = [
      record.id,
      record.namespace,
      `${record.phase}\n${record.name}`,
      record.status,
      record.functional_status || "UNAVAILABLE",
      record.deployment_status || "UNAVAILABLE",
      record.validation_status || "UNAVAILABLE",
      record.lock_status || "UNAVAILABLE",
      formatVerifiedTime(record.last_verified_at),
      record.source_indicator || "UNAVAILABLE"
    ];
    fields.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 0) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "record-detail-button";
        button.textContent = value;
        button.setAttribute("aria-label", `View details for ${value}`);
        button.addEventListener("click", () => openRecordDetail(record));
        cell.append(button);
      } else if ([3, 4, 5, 6, 7].includes(index)) cell.append(statusBadge(value));
      else {
        cell.textContent = value;
        if (index === 2) cell.className = "phase-title-cell";
      }
      tr.append(cell);
    });
    if (record.id === "OBS-7.1") tr.dataset.currentPhase = "true";
    body.append(tr);
  });
  document.querySelector("#phase-result-count").textContent = `${rows.length} of ${registry.records.length} records`;
}

function renderQueueSummary() {
  const counts = summarizeQueue(missionQueue.items, missionQueue.queue_status_vocabulary);
  const container = document.querySelector("#queue-summary");
  container.replaceChildren();
  missionQueue.queue_status_vocabulary.forEach((status) => {
    const card = document.createElement("article");
    card.className = "summary-card";
    card.append(statusBadge(status));
    const count = document.createElement("strong");
    count.textContent = counts[status];
    const label = document.createElement("span");
    label.textContent = "queue items";
    card.append(count, label);
    container.append(card);
  });
  document.querySelector("#queue-total").textContent = `${missionQueue.items.length} projected items`;
}

function renderQueueTable() {
  const rows = filterQueueItems(missionQueue.items, {
    query: document.querySelector("#queue-search").value,
    status: document.querySelector("#queue-status-filter").value,
    namespace: document.querySelector("#queue-namespace-filter").value,
    priority: document.querySelector("#queue-priority-filter").value,
    lock: document.querySelector("#queue-lock-filter").value,
    validation: document.querySelector("#queue-validation-filter").value,
    blockers: document.querySelector("#queue-blocker-filter").value,
    sort: document.querySelector("#queue-sort-select").value
  });
  const body = document.querySelector("#queue-table-body");
  body.replaceChildren();
  rows.forEach((item) => {
    const tr = document.createElement("tr");
    const fields = [
      item.queue_item_id,
      item.title,
      item.namespace,
      item.queue_status,
      item.lifecycle_status,
      item.priority,
      item.dependency_ids.length ? item.dependency_ids.join(" · ") : "UNAVAILABLE",
      item.blockers.length ? item.blockers.join(" · ") : "NONE",
      item.validation_status,
      item.lock_status,
      formatVerifiedTime(item.last_verified_at)
    ];
    fields.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 0) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "record-detail-button queue-detail-button";
        button.textContent = value;
        button.setAttribute("aria-label", `View queue details for ${value}`);
        button.addEventListener("click", () => openQueueDetail(item));
        cell.append(button);
      } else if ([3, 4, 8, 9].includes(index)) cell.append(statusBadge(value));
      else {
        cell.textContent = value;
        if ([1, 6, 7].includes(index)) cell.className = "phase-title-cell";
      }
      tr.append(cell);
    });
    body.append(tr);
  });
  document.querySelector("#queue-result-count").textContent = `${rows.length} of ${missionQueue.items.length} queue items`;
}

function formatVerifiedTime(value) {
  if (!value) return "UNAVAILABLE";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "UNAVAILABLE" : new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei"
  }).format(date);
}

function detailValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(" · ") : "UNAVAILABLE";
  return value || "UNAVAILABLE";
}

function openRecordDetail(record) {
  const dialog = document.querySelector("#record-detail");
  const values = {
    "detail-id": record.id,
    "detail-title": record.name,
    "detail-namespace": record.namespace,
    "detail-lifecycle": record.status,
    "detail-functional": record.functional_status,
    "detail-deployment": record.deployment_status,
    "detail-dependencies": detailValue(record.dependencies),
    "detail-locks": detailValue(record.locks),
    "detail-source": record.source_file,
    "detail-artifact": record.validation_artifact,
    "detail-notes": detailValue(record.blockers),
    "detail-verified": formatVerifiedTime(record.last_verified_at),
    "detail-source-id": record.source_record_id,
    "detail-source-hash": record.source_record_sha256
  };
  Object.entries(values).forEach(([id, value]) => {
    document.querySelector(`#${id}`).textContent = value || "UNAVAILABLE";
  });
  dialog.showModal();
}

function openQueueDetail(item) {
  const dialog = document.querySelector("#queue-detail");
  const values = {
    "queue-detail-title": item.title,
    "queue-detail-id": item.queue_item_id,
    "queue-detail-record": item.canonical_record_id,
    "queue-detail-namespace": item.namespace,
    "queue-detail-status": item.queue_status,
    "queue-detail-lifecycle": item.lifecycle_status,
    "queue-detail-basis": item.status_basis,
    "queue-detail-dependencies": detailValue(item.dependency_ids),
    "queue-detail-blockers": detailValue(item.blockers),
    "queue-detail-locks": item.lock_status,
    "queue-detail-validation": `${item.validation_status} · ${item.deployment_status}`,
    "queue-detail-source": item.source_evidence.validation_artifact,
    "queue-detail-verified": formatVerifiedTime(item.last_verified_at),
    "queue-detail-next": item.next_allowed_action,
    "queue-detail-approval": item.action_authorization_state
  };
  Object.entries(values).forEach(([id, value]) => {
    document.querySelector(`#${id}`).textContent = value || "UNAVAILABLE";
  });
  dialog.showModal();
}

function populateFilters() {
  const namespaceSelect = document.querySelector("#namespace-filter");
  [...new Set(registry.records.map((record) => record.namespace))].sort().forEach((namespace) => {
    namespaceSelect.add(new Option(namespace.replaceAll("_", " "), namespace));
  });
  const statusSelect = document.querySelector("#status-filter");
  STATUS_ORDER.forEach((status) => statusSelect.add(new Option(status, status)));
  for (const [id, field] of [
    ["functional-filter", "functional_status"],
    ["deployment-filter", "deployment_status"],
    ["lock-filter", "lock_status"]
  ]) {
    const select = document.querySelector(`#${id}`);
    [...new Set(registry.records.map((record) => record[field] || "UNAVAILABLE"))].sort().forEach((value) => select.add(new Option(value, value)));
  }
  document.querySelectorAll(".filters input, .filters select").forEach((control) => control.addEventListener("input", renderPhaseTable));
}

function populateQueueFilters() {
  for (const [id, values] of [
    ["queue-status-filter", missionQueue.queue_status_vocabulary],
    ["queue-namespace-filter", missionQueue.namespaces],
    ["queue-priority-filter", [...new Set(missionQueue.items.map((item) => item.priority))]],
    ["queue-validation-filter", [...new Set(missionQueue.items.map((item) => item.validation_status))]]
  ]) {
    const select = document.querySelector(`#${id}`);
    [...values].sort().forEach((value) => select.add(new Option(value.replaceAll("_", " "), value)));
  }
  document.querySelectorAll(".queue-filters input, .queue-filters select").forEach((control) => control.addEventListener("input", renderQueueTable));
}

function formatTime(iso) {
  if (!iso) return "UNAVAILABLE";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "UNAVAILABLE" : new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei"
  }).format(d);
}

async function loadPcsStatePanel() {
  try {
    const res = await fetch(PCS_STATE_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    document.querySelector("#pcs-state-checked").textContent = formatTime(data.checked_at);

    const lVal = document.querySelector("#pcs-l-value");
    const lStatus = document.querySelector("#pcs-l-status");
    const L = data.l_value;
    lVal.textContent = L.display;
    lStatus.textContent = `${L.label} · ${L.contributor_count}/${L.total_domains} normalized · ${L.raw_available}/${L.total_domains} raw`;
    lStatus.className = `status-badge ${L.value != null ? "status-deployed" : "status-checkpoint"}`;
    lStatus.title = `${L.formula}\n\n${L.note}`;

    const residualsEl = document.querySelector("#pcs-residuals");
    residualsEl.replaceChildren(...data.residuals.map((r) => {
      const div = document.createElement("div");
      div.className = "residual-card";
      const label = document.createElement("span");
      label.className = "eyebrow";
      label.textContent = r.key;
      const name = document.createElement("strong");
      name.textContent = r.label;

      const rawRow = document.createElement("div");
      rawRow.style.cssText = "font-size:12px; margin-top:6px;";
      rawRow.innerHTML = `<span style="opacity:0.6">Raw:</span> <b>${r.raw != null ? `${r.raw} ${r.unit}` : "Waiting…"}</b>`;

      const normRow = document.createElement("div");
      normRow.style.cssText = "font-size:12px;";
      const normText = r.normalized != null ? r.normalized.toFixed(3) : `<span style="color:#f0b070">Normalization Pending</span>`;
      normRow.innerHTML = `<span style="opacity:0.6">Normalized:</span> <b>${normText}</b>`;

      const weightRow = document.createElement("div");
      weightRow.style.cssText = "font-size:12px;";
      weightRow.innerHTML = `<span style="opacity:0.6">Weight:</span> <b>${r.weight.toFixed(1)}</b>`;

      const src = document.createElement("small");
      src.style.cssText = "opacity:0.7; display:block; margin-top:6px;";
      src.textContent = r.source ? `📡 ${r.source}` : `Source: ${r.source_hint}`;

      const badge = document.createElement("span");
      badge.className = `status-badge ${r.status === "available" ? "status-deployed" : "status-not-connected"}`;
      badge.textContent = r.status === "available" ? "✓ Available" : "○ Waiting";
      badge.style.marginTop = "6px";

      div.append(label, name, rawRow, normRow, weightRow, src, badge);
      return div;
    }));

    const formulaEl = document.querySelector("#pcs-l-formula");
    if (formulaEl) formulaEl.textContent = L.formula;

    const labelEl = document.querySelector("#pcs-l-label");
    if (labelEl) {
      labelEl.textContent = L.label;
      labelEl.style.color = L.value != null ? "#6ee76e" : "#f0b070";
    }

    const feedEl = document.querySelector("#activity-feed");
    const items = [
      ...data.activity,
      { source: "Claude Agent", type: "MC_TASK", text: "MC-05 Agent Panel — deployed", time: new Date().toISOString() }
    ];
    feedEl.replaceChildren(...items.map((item) => {
      const li = document.createElement("li");
      li.className = "activity-item";
      const meta = document.createElement("span");
      meta.className = "activity-meta";
      meta.textContent = `${item.source} · ${formatTime(item.time)}`;
      const text = document.createElement("span");
      text.textContent = item.text;
      li.append(meta, text);
      return li;
    }));
  } catch {
    document.querySelector("#pcs-l-value").textContent = "—";
    document.querySelector("#pcs-l-status").textContent = "UNAVAILABLE";
    document.querySelector("#pcs-residuals").innerHTML = `<div class="error-state">PCS_STATE_UNAVAILABLE</div>`;
  }
}

function agentStatusClass(status) {
  if (status === "ONLINE") return "status-deployed";
  if (status === "DEGRADED") return "status-checkpoint";
  return "status-not-connected";
}

async function loadAgentPanel() {
  const panel = document.querySelector("#agent-panel");
  const checkedAt = document.querySelector("#agent-checked-at");
  try {
    const res = await fetch(AGENT_STATUS_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    checkedAt.textContent = new Intl.DateTimeFormat("en-GB", {
      timeStyle: "medium", timeZone: "Asia/Taipei"
    }).format(new Date(data.checked_at));
    panel.replaceChildren(...data.agents.map((agent) => {
      const card = document.createElement("article");
      card.className = "agent-card";
      const header = document.createElement("div");
      header.className = "agent-card-header";
      const nameEl = document.createElement("strong");
      nameEl.textContent = agent.name;
      const badge = document.createElement("span");
      badge.className = `status-badge ${agentStatusClass(agent.status)}`;
      badge.textContent = agent.status;
      header.append(nameEl, badge);
      const role = document.createElement("p");
      role.className = "agent-role";
      role.textContent = agent.role;
      const provider = document.createElement("p");
      provider.className = "agent-provider eyebrow";
      provider.textContent = agent.provider;
      const detail = document.createElement("p");
      detail.className = "agent-detail";
      const parts = [];
      if (agent.model) parts.push(`Model: ${agent.model}`);
      if (agent.current_task) parts.push(`Task: ${agent.current_task}`);
      if (agent.last_update) parts.push(`Latest: ${agent.last_update}${agent.title ? ` — ${agent.title}` : ""}`);
      if (parts.length === 0 && agent.detail) parts.push(agent.detail);
      detail.textContent = parts.join(" · ");
      card.append(header, role, provider, detail);
      if (agent.site_url) {
        const link = document.createElement("a");
        link.href = agent.site_url;
        link.textContent = "View research site";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
      return card;
    }));
  } catch {
    panel.innerHTML = `<div class="error-state">AGENT_STATUS_UNAVAILABLE — retry later</div>`;
    checkedAt.textContent = "UNAVAILABLE";
  }
}

function renderModules() {
  const grid = document.querySelector("#module-grid");
  MODULES.forEach((module) => grid.append(moduleCard(module)));
}

async function renderBlockers() {
  const list = document.querySelector("#blocker-list");
  list.replaceChildren();
  try {
    const res = await fetch(BLOCKERS_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    data.items.forEach((b) => {
      const li = document.createElement("li");
      li.dataset.severity = b.severity;
      const sev = document.createElement("span");
      sev.className = `status-badge severity-${b.severity.toLowerCase()}`;
      sev.textContent = b.severity;
      const text = document.createElement("span");
      text.textContent = ` ${b.text}`;
      const owner = document.createElement("small");
      owner.style.opacity = "0.6";
      owner.textContent = ` (${b.owner})`;
      li.append(sev, text, owner);
      list.append(li);
    });
    const heading = document.querySelector("#blockers-title");
    if (heading) heading.textContent = `Current blockers (${data.counts.total})`;
  } catch (e) {
    list.innerHTML = `<li class="error-state">BLOCKERS_UNAVAILABLE — ${e.message}</li>`;
  }
}

async function loadLatestUpdate() {
  const container = document.querySelector("#latest-update");
  const health = document.querySelector("#update-health");
  const retry = document.querySelector("#update-retry");
  health.textContent = "CHECKING";
  retry.disabled = true;
  container.className = "loading-state";
  container.textContent = "Checking latest update…";
  const result = await fetchProjectUpdateState({ url: UPDATE_API });
  document.querySelector("#update-last-check").textContent = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Taipei"
  }).format(new Date(result.checkedAt));
  retry.disabled = false;
  if (result.state === "AVAILABLE") {
    const update = result.update;
    container.className = "";
    container.replaceChildren();
    const meta = document.createElement("p");
    meta.className = "update-meta";
    meta.append(statusBadge(update.status));
    meta.append(document.createTextNode(` ${update.phase || "Phase unavailable"}`));
    const title = document.createElement("h3");
    title.textContent = update.title_en || update.title_zh || "PCS update";
    const summary = document.createElement("p");
    summary.textContent = update.summary_en || update.summary_zh || "Summary unavailable.";
    container.append(meta, title, summary);
    health.textContent = "AVAILABLE";
  } else {
    container.className = "unavailable-state";
    container.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = "UPDATE_UNAVAILABLE";
    const detail = document.createElement("p");
    detail.textContent = "Update service unavailable. Local Mission Control remains available.";
    container.append(title, detail);
    document.querySelector("#update-source").textContent = "LIVE API · UNAVAILABLE";
    health.textContent = "UPDATE_UNAVAILABLE";
  }
}

function closeDrawer() {
  const sidebar = document.querySelector("#sidebar");
  const toggle = document.querySelector("#nav-toggle");
  const backdrop = document.querySelector("#drawer-backdrop");
  sidebar.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation");
  backdrop.hidden = true;
}

const ROUTE_MAP = {
  "dashboard": "#dashboard-page",
  "phases": "#phases-page",
  "mission-queue": "#mission-queue-page",
  "data-sources": "#data-source-page",
  "systems": "#systems-page",
  "validation-records": "#validation-page",
  "activity-log": "#activity-log-page",
  "settings": "#settings-page"
};

function setRoute() {
  const route = window.location.hash.slice(1) || "dashboard";
  const allPages = ["#dashboard-page","#phases-page","#mission-queue-page","#data-source-page","#systems-page","#validation-page","#activity-log-page","#settings-page","#placeholder-page"];
  allPages.forEach(sel => { const el = document.querySelector(sel); if (el) el.hidden = true; });
  const target = ROUTE_MAP[route];
  if (target) {
    document.querySelector(target).hidden = false;
    if (route === "systems") loadSystemsPanel();
    if (route === "validation-records") renderValidationPage();
    if (route === "activity-log") renderActivityLogPage();
  } else {
    document.querySelector("#placeholder-page").hidden = false;
    const active = document.querySelector(`[href="#${CSS.escape(route)}"]`);
    document.querySelector("#placeholder-title").textContent = active?.textContent.trim() || "Module";
  }
  document.querySelectorAll("[data-route]").forEach((link) => link.removeAttribute("aria-current"));
  document.querySelector(`[href="#${CSS.escape(route)}"]`)?.setAttribute("aria-current", "page");
  closeDrawer();
  document.querySelector("#main-content").focus({ preventScroll: true });
}

async function loadSystemsPanel() {
  const services = document.querySelector("#systems-services");
  const resources = document.querySelector("#systems-resources");
  const checked = document.querySelector("#systems-checked");
  services.innerHTML = '<div class="loading-state">Probing services…</div>';
  try {
    const r = await fetch("/local-api/systems");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    checked.textContent = formatTime(d.checked_at);
    services.replaceChildren(...d.services.map(s => {
      const card = document.createElement("article");
      card.className = "summary-card";
      const eb = document.createElement("span"); eb.className = "eyebrow"; eb.textContent = s.name;
      const badge = document.createElement("span");
      badge.className = `status-badge ${s.status === "ONLINE" ? "status-deployed" : s.status === "DEGRADED" ? "status-checkpoint" : "status-not-connected"}`;
      badge.textContent = s.status;
      const detail = document.createElement("small");
      detail.textContent = [s.code ? `HTTP ${s.code}` : null, s.latency_ms != null ? `${s.latency_ms}ms` : null, s.error].filter(Boolean).join(" · ");
      const url = document.createElement("code"); url.style.fontSize = "10px"; url.style.opacity = "0.7"; url.textContent = s.url;
      card.append(eb, badge, detail, url);
      return card;
    }));
    const R = d.resources;
    const items = [
      { label: "CPU", value: `${R.cpu.cores} cores`, sub: `load 1m/5m/15m: ${R.cpu.load_1m} / ${R.cpu.load_5m} / ${R.cpu.load_15m}` },
      { label: "Memory", value: `${R.memory.used_pct}% used`, sub: `${R.memory.free_gb} / ${R.memory.total_gb} GB free` },
      R.disk ? { label: "Disk (/)", value: `${R.disk.used_pct}% used`, sub: `${R.disk.free_gb} / ${R.disk.total_gb} GB free` } : null,
      { label: "Host uptime", value: `${R.uptime_hours} h`, sub: "since last boot" }
    ].filter(Boolean);
    resources.replaceChildren(...items.map(i => {
      const card = document.createElement("article");
      card.className = "summary-card";
      const eb = document.createElement("span"); eb.className = "eyebrow"; eb.textContent = i.label;
      const v = document.createElement("strong"); v.textContent = i.value;
      const s = document.createElement("small"); s.textContent = i.sub;
      card.append(eb, v, s);
      return card;
    }));
  } catch (e) {
    services.innerHTML = `<div class="error-state">SYSTEMS_UNAVAILABLE — ${e.message}</div>`;
    resources.replaceChildren();
  }
}

function renderValidationPage() {
  const body = document.querySelector("#validation-body");
  const countEl = document.querySelector("#validation-count");
  const search = document.querySelector("#validation-search");
  const statusFilter = document.querySelector("#validation-status-filter");
  if (!registry) { body.innerHTML = `<tr><td colspan="5" class="error-state">Registry unavailable</td></tr>`; return; }

  if (!statusFilter.dataset.populated) {
    [...new Set(registry.records.map(r => r.validation_status || "UNAVAILABLE"))].sort().forEach(v => statusFilter.add(new Option(v, v)));
    statusFilter.dataset.populated = "1";
    search.addEventListener("input", renderValidationPage);
    statusFilter.addEventListener("change", renderValidationPage);
  }

  const q = search.value.toLowerCase().trim();
  const sf = statusFilter.value;
  const rows = registry.records.filter(r => (r.validation_artifact || r.validation_status) &&
    (!sf || (r.validation_status || "UNAVAILABLE") === sf) &&
    (!q || `${r.id} ${r.namespace} ${r.name} ${r.validation_artifact || ""}`.toLowerCase().includes(q)));

  body.replaceChildren(...rows.map(r => {
    const tr = document.createElement("tr");
    const cells = [
      `${r.id} · ${r.name}`,
      r.namespace,
      r.validation_status || "UNAVAILABLE",
      r.validation_artifact || "UNAVAILABLE",
      formatVerifiedTime(r.last_verified_at)
    ];
    cells.forEach((v, i) => {
      const td = document.createElement("td");
      if (i === 2) td.append(statusBadge(v)); else td.textContent = v;
      tr.append(td);
    });
    return tr;
  }));
  countEl.textContent = `${rows.length} of ${registry.records.length} records`;
}

async function renderActivityLogPage() {
  const list = document.querySelector("#activity-log-list");
  const countEl = document.querySelector("#activity-log-count");
  const typeFilter = document.querySelector("#activity-type-filter");
  const sourceFilter = document.querySelector("#activity-source-filter");
  list.innerHTML = '<li class="loading-state">Loading activity…</li>';
  try {
    const r = await fetch("/local-api/pcs-state");
    const d = await r.json();
    const activity = d.activity || [];
    if (!typeFilter.dataset.populated) {
      [...new Set(activity.map(a => a.type))].sort().forEach(v => typeFilter.add(new Option(v, v)));
      [...new Set(activity.map(a => a.source))].sort().forEach(v => sourceFilter.add(new Option(v, v)));
      typeFilter.dataset.populated = "1";
      typeFilter.addEventListener("change", renderActivityLogPage);
      sourceFilter.addEventListener("change", renderActivityLogPage);
    }
    const tf = typeFilter.value, sf = sourceFilter.value;
    const filtered = activity.filter(a => (!tf || a.type === tf) && (!sf || a.source === sf));
    list.replaceChildren(...filtered.map(item => {
      const li = document.createElement("li");
      li.className = "activity-item";
      const meta = document.createElement("span");
      meta.className = "activity-meta";
      meta.textContent = `${item.source} · ${item.type} · ${formatTime(item.time)}`;
      const text = document.createElement("span");
      text.textContent = item.text;
      li.append(meta, text);
      return li;
    }));
    countEl.textContent = `${filtered.length} of ${activity.length} events`;
  } catch (e) {
    list.innerHTML = `<li class="error-state">ACTIVITY_UNAVAILABLE — ${e.message}</li>`;
  }
}

function setRail(id, text, cls) {
  const el = document.querySelector(`#${id}`);
  if (!el) return;
  el.textContent = text;
  el.className = cls || "";
}

async function refreshRightRail() {
  try {
    const [sys, pcs, agents] = await Promise.allSettled([
      fetch("/local-api/systems").then(r => r.json()),
      fetch("/local-api/pcs-state").then(r => r.json()),
      fetch("/local-api/agent-status").then(r => r.json())
    ]);

    setRail("rail-registry", registry ? `LOADED · ${registry.records.length}` : "UNAVAILABLE", registry ? "status-text status-cached" : "status-text status-not-connected");

    if (sys.status === "fulfilled") {
      const s = sys.value.services;
      const find = id => s.find(x => x.id === id);
      const oc = find("openclaw"), be = find("pcs-backend"), ol = find("ollama");
      setRail("rail-openclaw", oc?.status || "OFFLINE", `status-text ${oc?.status === "ONLINE" ? "status-cached" : "status-not-connected"}`);
      setRail("rail-backend", be?.status || "OFFLINE", `status-text ${be?.status === "ONLINE" ? "status-cached" : "status-not-connected"}`);
      setRail("rail-ollama", ol?.status || "OFFLINE", `status-text ${ol?.status === "ONLINE" ? "status-cached" : "status-not-connected"}`);
      const R = sys.value.resources;
      const memPct = parseFloat(R.memory.used_pct);
      setRail("rail-ram", `${R.memory.used_pct}% · ${R.memory.free_gb}GB free`, `status-text ${memPct > 90 ? "status-not-connected" : memPct > 75 ? "status-checkpoint" : "status-cached"}`);
    } else {
      ["rail-openclaw","rail-backend","rail-ollama","rail-ram"].forEach(id => setRail(id, "PROBE_FAILED", "status-text status-not-connected"));
    }

    if (pcs.status === "fulfilled") {
      const L = pcs.value.l_value;
      setRail("rail-l", `${L.display} · ${L.contributor_count}/${L.total_domains}`, `status-text ${L.value != null ? "status-cached" : "status-not-connected"}`);
      const latest = pcs.value.activity?.[0];
      if (latest) {
        document.querySelector("#rail-event-title").textContent = latest.text.slice(0, 60);
        document.querySelector("#rail-event-time").textContent = `${latest.source} · ${formatTime(latest.time)}`;
      }
    } else {
      setRail("rail-l", "UNAVAILABLE", "status-text status-not-connected");
    }

    if (agents.status === "fulfilled") {
      const online = agents.value.agents.filter(a => a.status === "ONLINE").length;
      const total = agents.value.agents.length;
      setRail("rail-agents", `${online}/${total} ONLINE`, `status-text ${online === total ? "status-cached" : online > 0 ? "status-checkpoint" : "status-not-connected"}`);
    } else {
      setRail("rail-agents", "UNAVAILABLE", "status-text status-not-connected");
    }
  } catch (e) {
    console.error("right-rail refresh failed", e);
  }
}

function initSettings() {
  const theme = localStorage.getItem("mc-theme") || "dark";
  const refresh = localStorage.getItem("mc-refresh") || "60";
  document.querySelector(`input[name="theme"][value="${theme}"]`)?.setAttribute("checked", "");
  document.querySelector(`input[name="refresh"][value="${refresh}"]`)?.setAttribute("checked", "");
  document.body.dataset.theme = theme;
  document.querySelectorAll('input[name="theme"]').forEach(el => el.addEventListener("change", e => {
    localStorage.setItem("mc-theme", e.target.value);
    document.body.dataset.theme = e.target.value;
  }));
  document.querySelectorAll('input[name="refresh"]').forEach(el => el.addEventListener("change", e => {
    localStorage.setItem("mc-refresh", e.target.value);
  }));
}

async function init() {
  setClock();
  setInterval(setClock, 1000);
  renderBlockers();
  renderModules();
  try {
    const data = await loadLocalAdminData();
    registry = data.registry;
    missionQueue = data.queue;
    localStatus = data.localStatus;
    renderLocalAdminStatus();
    renderSummary(registry.records);
    populateFilters();
    renderPhaseTable();
    renderQueueSummary();
    populateQueueFilters();
    renderQueueTable();
    document.querySelector("#next-mission-title").textContent = `${missionQueue.next_allowed_mission.id} — ${missionQueue.next_allowed_mission.title}`;
    document.querySelector("#queue-source-path").textContent = missionQueue.source.registry.registry_file;
    document.querySelector("#queue-source-sha").textContent = missionQueue.source.registry.registry_sha256;
    document.querySelector("#phase-gate-reason").textContent = registry.phase_7_2_gate.reason;
    document.querySelector("#registry-source-path").textContent = registry.source.registry_file;
    document.querySelector("#registry-source-sha").textContent = registry.source.registry_sha256;
  } catch (error) {
    const category = error.message.includes("Registry") ? "REGISTRY_UNAVAILABLE" : "LOCAL_DATA_UNAVAILABLE";
    document.querySelector("#phase-summary").innerHTML = `<div class="error-state">${category} — ${error.message}</div>`;
    document.querySelector("#phase-table-body").replaceChildren();
    document.querySelector("#phase-result-count").textContent = "Registry data unavailable; no cached phase rows shown.";
    document.querySelector("#registry-error").hidden = false;
    document.querySelector("#registry-error").textContent = `${category} — source validation failed. Mission Control shell remains available.`;
    document.querySelector("#data-source-page").classList.add("data-unavailable");
    document.querySelector("#queue-error").hidden = false;
    document.querySelector("#queue-error").textContent = `QUEUE_UNAVAILABLE — ${error.message}. Mission Control shell remains available.`;
    document.querySelector("#queue-table-body").replaceChildren();
    document.querySelector("#queue-result-count").textContent = "Queue data unavailable; no projected rows shown.";
  }
  loadLatestUpdate();
  loadPcsStatePanel();
  setInterval(loadPcsStatePanel, 120_000);
  loadAgentPanel();
  setInterval(loadAgentPanel, 60_000);
  initSettings();
  refreshRightRail();
  setInterval(refreshRightRail, 30_000);
  setRoute();
}

document.querySelector("#nav-toggle").addEventListener("click", () => {
  const sidebar = document.querySelector("#sidebar");
  const open = sidebar.classList.toggle("is-open");
  document.querySelector("#nav-toggle").setAttribute("aria-expanded", String(open));
  document.querySelector("#nav-toggle").setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  document.querySelector("#drawer-backdrop").hidden = !open;
});
document.querySelector("#drawer-backdrop").addEventListener("click", closeDrawer);
document.querySelector("#update-retry").addEventListener("click", loadLatestUpdate);
document.querySelector("#record-detail-close").addEventListener("click", () => document.querySelector("#record-detail").close());
document.querySelector("#queue-detail-close").addEventListener("click", () => document.querySelector("#queue-detail").close());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});
window.addEventListener("hashchange", setRoute);
init();
