(function initializeMainPanelLayout(global) {
  "use strict";

  const dashboard = document.querySelector("[data-pcs-research-grid]");
  const stage = dashboard?.querySelector(":scope > .model-stage");
  const controls = dashboard?.querySelector(":scope > .model-controls-workspace");
  const analysis = dashboard?.querySelector(":scope > .analysis-alert-center");
  const lab = dashboard?.querySelector(":scope > .model-literature-lab");
  const inspector = dashboard?.querySelector(":scope > .secondary-inspector");

  if (dashboard && stage && analysis && lab && inspector && controls) {
    dashboard.append(stage, analysis, lab, inspector, controls);
  }

  function moveExistingModule(selector, mountSelector) {
    const module = document.querySelector(selector);
    const mount = document.querySelector(mountSelector);
    if (!module || !mount || module.parentElement === mount) return false;
    mount.append(module);
    return true;
  }

  const movedModules = {
    satelliteModel: moveExistingModule("#satellite-observation-panel", '[data-research-mount="pcs-model"]'),
    externalLiterature: moveExistingModule("#pcs-daily-brief", '[data-research-mount="external-papers"]'),
    visitorMetadata: moveExistingModule(".visitor-network-panel", ".secondary-inspector")
  };

  const tabs = Array.from(document.querySelectorAll("[data-research-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-research-panel]"));
  let activeTab = tabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.dataset.researchTab || "pcs-model";

  function activateTab(name, options = {}) {
    const nextTab = tabs.find((tab) => tab.dataset.researchTab === name);
    const nextPanel = panels.find((panel) => panel.dataset.researchPanel === name);
    if (!nextTab || !nextPanel) return false;

    tabs.forEach((tab) => {
      const selected = tab === nextTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => { panel.hidden = panel !== nextPanel; });
    activeTab = name;
    if (options.focus) nextTab.focus();
    global.dispatchEvent(new Event("resize"));
    return true;
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.researchTab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activateTab(tabs[nextIndex].dataset.researchTab, { focus: true });
    });
  });

  activateTab(activeTab);

  global.PCSMainPanelLayoutAudit = Object.freeze({
    activateTab,
    state: () => ({
      activeTab,
      dashboardOrder: Array.from(dashboard?.children || []).map((element) => element.className),
      movedModules: { ...movedModules },
      workspaceWidth: document.querySelector(".observatory-shell")?.getBoundingClientRect().width || 0,
      viewportWidth: document.documentElement.clientWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
  });
})(window);
