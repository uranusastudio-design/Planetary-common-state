import { STATUS_ORDER, filterQueueItems, filterRecords, moduleCard, statusBadge, summarize, summarizeQueue } from "./components.js";
import { fetchProjectUpdateState, loadLocalAdminData } from "./data-adapter.js";

const AGENT_STATUS_API = "/local-api/agent-status";

const UPDATE_API = "https://pcs-backend.uranusastudio.workers.dev/api/project-updates/latest";
const BLOCKER_SUMMARY = [
  "Phase 7.1 needs an authenticated final DEPLOYED lifecycle record.",
  "Connector production API verification remains incomplete.",
  "Variable Registry targets remain incomplete.",
  "AI Copilot runtime is not connected.",
  "PWA and Apple client work has not started.",
  "PCS-Lab retains protected research changes.",
  "Mission Control telemetry is not connected."
];

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
      if (agent.id === "claude") {
        detail.textContent = agent.current_task ? `Task: ${agent.current_task}` : agent.detail;
      } else {
        detail.textContent = agent.last_update
          ? `Latest: ${agent.last_update}${agent.title ? ` — ${agent.title}` : ""}`
          : agent.detail;
      }
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

function renderBlockers() {
  const list = document.querySelector("#blocker-list");
  BLOCKER_SUMMARY.forEach((blocker) => {
    const li = document.createElement("li");
    li.textContent = blocker;
    list.append(li);
  });
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

function setRoute() {
  const route = window.location.hash.slice(1) || "dashboard";
  const isDashboard = route === "dashboard";
  const isPhases = route === "phases";
  const isMissionQueue = route === "mission-queue";
  const isDataSources = route === "data-sources";
  document.querySelector("#dashboard-page").hidden = !isDashboard;
  document.querySelector("#phases-page").hidden = !isPhases;
  document.querySelector("#mission-queue-page").hidden = !isMissionQueue;
  document.querySelector("#data-source-page").hidden = !isDataSources;
  document.querySelector("#placeholder-page").hidden = isDashboard || isPhases || isMissionQueue || isDataSources;
  document.querySelectorAll("[data-route]").forEach((link) => link.removeAttribute("aria-current"));
  const active = document.querySelector(`[href="#${CSS.escape(route)}"]`);
  active?.setAttribute("aria-current", "page");
  if (!isDashboard && !isPhases && !isMissionQueue && !isDataSources) document.querySelector("#placeholder-title").textContent = active?.textContent.trim() || "Module";
  closeDrawer();
  document.querySelector("#main-content").focus({ preventScroll: true });
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
  loadAgentPanel();
  setInterval(loadAgentPanel, 60_000);
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
