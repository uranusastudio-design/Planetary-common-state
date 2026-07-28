import { STATUS_ORDER, filterRecords, moduleCard, statusBadge, summarize, validateRegistry } from "./components.js";

const REGISTRY_URL = "../../data/phase-registry.json";
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

function renderPhaseTable() {
  const state = {
    query: document.querySelector("#phase-search").value,
    namespace: document.querySelector("#namespace-filter").value,
    status: document.querySelector("#status-filter").value,
    sort: document.querySelector("#sort-select").value
  };
  const rows = filterRecords(registry.records, state);
  const body = document.querySelector("#phase-table-body");
  body.replaceChildren();
  rows.forEach((record) => {
    const tr = document.createElement("tr");
    const fields = [
      record.id,
      `${record.phase}\n${record.name}`,
      record.namespace,
      record.status,
      record.evidence?.function || "UNAVAILABLE",
      record.evidence?.tests || "UNAVAILABLE",
      record.evidence?.browser || "UNAVAILABLE",
      record.commit || record.latest_implementation_commit ? "RECORDED" : "UNAVAILABLE",
      record.push ? "PUSHED" : "NOT_PUSHED",
      record.evidence?.deployment || (record.deploy ? "RECORDED" : "NOT_DEPLOYED"),
      record.evidence?.lifecycle || record.status,
      `${record.blockers.length ? record.blockers.join(" · ") : "No unresolved blocker recorded"} · Next approved task: UNAVAILABLE`
    ];
    fields.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 3 || index === 10) cell.append(statusBadge(value));
      else {
        cell.textContent = value;
        if (index === 1) cell.className = "phase-title-cell";
      }
      tr.append(cell);
    });
    if (record.id === "OBS-7.1") tr.dataset.currentPhase = "true";
    body.append(tr);
  });
  document.querySelector("#phase-result-count").textContent = `${rows.length} of ${registry.records.length} records`;
}

function populateFilters() {
  const namespaceSelect = document.querySelector("#namespace-filter");
  [...new Set(registry.records.map((record) => record.namespace))].sort().forEach((namespace) => {
    namespaceSelect.add(new Option(namespace.replaceAll("_", " "), namespace));
  });
  const statusSelect = document.querySelector("#status-filter");
  STATUS_ORDER.forEach((status) => statusSelect.add(new Option(status, status)));
  document.querySelectorAll(".filters input, .filters select").forEach((control) => control.addEventListener("input", renderPhaseTable));
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
  try {
    const response = await fetch(UPDATE_API, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const update = payload.update || payload;
    if (!update || !update.id || !update.status) throw new Error("Malformed update");
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
    document.querySelector("#update-health").textContent = "AVAILABLE";
  } catch {
    container.className = "unavailable-state";
    container.textContent = "UPDATE_UNAVAILABLE — Mission Control remains available.";
    document.querySelector("#update-source").textContent = "LIVE API · UNAVAILABLE";
    document.querySelector("#update-health").textContent = "UNAVAILABLE";
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
  document.querySelector("#dashboard-page").hidden = !isDashboard;
  document.querySelector("#phases-page").hidden = !isPhases;
  document.querySelector("#placeholder-page").hidden = isDashboard || isPhases;
  document.querySelectorAll("[data-route]").forEach((link) => link.removeAttribute("aria-current"));
  const active = document.querySelector(`[href="#${CSS.escape(route)}"]`);
  active?.setAttribute("aria-current", "page");
  if (!isDashboard && !isPhases) document.querySelector("#placeholder-title").textContent = active?.textContent.trim() || "Module";
  closeDrawer();
  document.querySelector("#main-content").focus({ preventScroll: true });
}

async function init() {
  setClock();
  setInterval(setClock, 1000);
  renderBlockers();
  renderModules();
  try {
    const response = await fetch(REGISTRY_URL);
    if (!response.ok) throw new Error(`Registry HTTP ${response.status}`);
    registry = validateRegistry(await response.json());
    renderSummary(registry.records);
    populateFilters();
    renderPhaseTable();
    document.querySelector("#phase-gate-reason").textContent = registry.phase_7_2_gate.reason;
  } catch (error) {
    document.querySelector("#phase-summary").innerHTML = `<div class="error-state">REGISTRY_UNAVAILABLE — ${error.message}</div>`;
  }
  loadLatestUpdate();
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
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});
window.addEventListener("hashchange", setRoute);
init();
