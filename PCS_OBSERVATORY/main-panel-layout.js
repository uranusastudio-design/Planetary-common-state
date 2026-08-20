(function initializePanelLayoutCorrection(global) {
  "use strict";

  const queue = [];
  const supportedPaperExtensions = ["pdf", "txt", "md"];
  const supportedModelExtensions = ["txt", "md", "json", "csv"];

  const elements = {
    paperFile: document.querySelector("#research-paper-file"),
    modelFile: document.querySelector("#research-model-file"),
    paperReference: document.querySelector("#research-paper-reference"),
    modelReference: document.querySelector("#research-model-reference"),
    queueList: document.querySelector("#compare-queue-list"),
    queueCount: document.querySelector("#compare-queue-count"),
    queueStatus: document.querySelector("#compare-queue-status"),
    clearQueue: document.querySelector("#compare-queue-clear"),
    analyzeQueue: document.querySelector("#compare-queue-analyze"),
    searchQuery: document.querySelector("#external-research-query"),
    searchButton: document.querySelector("#external-research-search"),
    mappingReset: document.querySelector("#mapping-reset"),
    mappingView: document.querySelector("#mapping-view"),
    mappingMode: document.querySelector("#mapping-mode")
  };
  const responsiveLayout = global.matchMedia("(max-width: 1100px)");
  const dashboard = document.querySelector("[data-pcs-correction-layout]");
  const leftColumn = dashboard?.querySelector(":scope > .left-column");
  const centerColumn = dashboard?.querySelector(":scope > .center-column");
  const rightColumn = dashboard?.querySelector(":scope > .right-column");
  const blueZone = document.querySelector('[data-layout-zone="blue"]');
  const yellowZone = document.querySelector('[data-layout-zone="yellow"]');
  const bottomPrimary = document.querySelector(".bottom-primary-column");

  function extensionOf(filename) {
    return String(filename || "").split(".").pop().toLowerCase();
  }

  function setQueueStatus(message) {
    if (elements.queueStatus) elements.queueStatus.textContent = message;
  }

  function renderQueue() {
    if (!elements.queueList) return;
    elements.queueList.replaceChildren();

    if (!queue.length) {
      const empty = document.createElement("li");
      empty.className = "queue-empty";
      empty.textContent = "No research selected.";
      elements.queueList.append(empty);
    } else {
      queue.forEach((item, index) => {
        const row = document.createElement("li");
        const label = document.createElement("span");
        const remove = document.createElement("button");
        label.textContent = `${item.kind}: ${item.label}`;
        remove.type = "button";
        remove.textContent = "REMOVE";
        remove.setAttribute("aria-label", `Remove ${item.label} from compare queue`);
        remove.addEventListener("click", () => {
          queue.splice(index, 1);
          renderQueue();
          setQueueStatus(queue.length ? "INPUTS QUEUED / ANALYSIS PIPELINE PENDING" : "ANALYSIS PIPELINE PENDING");
        });
        row.append(label, remove);
        elements.queueList.append(row);
      });
    }

    if (elements.queueCount) elements.queueCount.textContent = `${queue.length} ${queue.length === 1 ? "ITEM" : "ITEMS"}`;
    if (elements.clearQueue) elements.clearQueue.disabled = queue.length === 0;
    if (elements.analyzeQueue) elements.analyzeQueue.disabled = queue.length < 2;
  }

  function addQueueItem(kind, label, source) {
    const cleaned = String(label || "").trim();
    if (!cleaned) {
      setQueueStatus(`${kind.toUpperCase()} INPUT REQUIRED`);
      return false;
    }
    queue.push(Object.freeze({ kind, label: cleaned, source }));
    renderQueue();
    setQueueStatus("INPUTS QUEUED / ANALYSIS PIPELINE PENDING");
    return true;
  }

  function queueFiles(input, kind, acceptedExtensions) {
    Array.from(input?.files || []).forEach((file) => {
      if (!acceptedExtensions.includes(extensionOf(file.name))) {
        setQueueStatus(`UNSUPPORTED ${kind.toUpperCase()} FILE TYPE`);
        return;
      }
      addQueueItem(`Uploaded ${kind}`, file.name, "local-file-selection");
    });
  }

  elements.paperFile?.addEventListener("change", () => queueFiles(elements.paperFile, "paper", supportedPaperExtensions));
  elements.modelFile?.addEventListener("change", () => queueFiles(elements.modelFile, "model", supportedModelExtensions));

  document.querySelectorAll("[data-queue-reference]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.queueReference;
      const input = type === "paper" ? elements.paperReference : elements.modelReference;
      if (addQueueItem(type === "paper" ? "Paper reference" : "Model reference", input?.value, "user-reference") && input) input.value = "";
    });
  });

  elements.clearQueue?.addEventListener("click", () => {
    queue.splice(0, queue.length);
    renderQueue();
    setQueueStatus("ANALYSIS PIPELINE PENDING");
  });

  elements.analyzeQueue?.addEventListener("click", () => {
    setQueueStatus("ANALYSIS PIPELINE PENDING — NO ANALYSIS WAS RUN");
  });

  elements.searchButton?.addEventListener("click", () => {
    const query = String(elements.searchQuery?.value || "").trim();
    if (!query) {
      setQueueStatus("EXTERNAL RESEARCH QUERY REQUIRED");
      elements.searchQuery?.focus();
      return;
    }
    global.open(`https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
  });

  elements.searchQuery?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      elements.searchButton?.click();
    }
  });

  elements.mappingReset?.addEventListener("click", () => {
    if (elements.mappingView) elements.mappingView.selectedIndex = 0;
    if (elements.mappingMode) elements.mappingMode.selectedIndex = 0;
    global.dispatchEvent(new Event("resize"));
  });

  function applyResponsiveZoneOrder() {
    if (!dashboard || !leftColumn || !centerColumn || !rightColumn || !blueZone || !yellowZone || !bottomPrimary) return;
    if (responsiveLayout.matches) {
      dashboard.insertBefore(blueZone, centerColumn);
      dashboard.insertBefore(yellowZone, leftColumn);
    } else {
      leftColumn.append(blueZone);
      bottomPrimary.append(yellowZone);
    }
    global.dispatchEvent(new Event("resize"));
  }

  responsiveLayout.addEventListener?.("change", applyResponsiveZoneOrder);
  applyResponsiveZoneOrder();

  document.querySelectorAll("#event-search, #event-category-filter, #event-severity-filter, #event-source-filter, #event-date-from, #event-date-to").forEach((control) => {
    control.addEventListener("input", () => {
      const empty = document.querySelector("#event-stream-list .event-empty-state p");
      if (empty) empty.textContent = "No validated events match because no event feed is connected to this panel.";
    });
  });

  renderQueue();

  global.PCSResearchInputContract = Object.freeze({
    version: "panel-correction-1",
    paper: Object.freeze({ files: Object.freeze([...supportedPaperExtensions]), references: Object.freeze(["doi", "arxiv-url", "paper-url"]) }),
    model: Object.freeze({ files: Object.freeze([...supportedModelExtensions]), inputs: Object.freeze(["equation", "parameters", "description", "simulation-definition", "model-url"]) }),
    comparison: Object.freeze({ acceptedKinds: Object.freeze(["pcs-paper", "uploaded-paper", "external-paper", "pcs-model", "uploaded-model", "external-model"]), backend: "NOT CONNECTED" })
  });

  global.PCSMainPanelLayoutAudit = Object.freeze({
    state: () => {
      const zone = (name) => document.querySelector(`[data-layout-zone="${name}"]`)?.getBoundingClientRect();
      const brand = document.querySelector(".pcs-brand-area")?.getBoundingClientRect();
      const title = document.querySelector(".pcs-brand-area strong")?.getBoundingClientRect();
      const support = document.querySelector(".pcs-brand-area .support-button")?.getBoundingClientRect();
      return {
        queueLength: queue.length,
        existingModuleRelocation: false,
        responsiveZoneOrder: responsiveLayout.matches,
        brandCenterDelta: brand && title && support ? {
          title: Math.abs((title.left + title.width / 2) - (brand.left + brand.width / 2)),
          support: Math.abs((support.left + support.width / 2) - (brand.left + brand.width / 2))
        } : null,
        zones: { blue: zone("blue"), red: zone("red"), yellow: zone("yellow") },
        viewportWidth: document.documentElement.clientWidth,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    }
  });
})(window);
