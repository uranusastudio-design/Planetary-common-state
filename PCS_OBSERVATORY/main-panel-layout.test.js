import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./style.css", import.meta.url), "utf8");
const layout = await readFile(new URL("./main-panel-layout.js", import.meta.url), "utf8");
const app = await readFile(new URL("./app.js", import.meta.url), "utf8");

test("WHITE centers only the header identity group", () => {
  assert.match(html, /class="nav-brand pcs-brand-area"/);
  assert.match(css, /\.pcs-brand-area\s*\{[^}]*justify-items:\s*center;[^}]*text-align:\s*center;/s);
  assert.match(css, /\.pcs-brand-area \.support-button\s*\{[^}]*width:\s*min\(100%, 320px\)/s);
  assert.match(css, /width:\s*min\(95vw, 2560px\)/);
  assert.doesNotMatch(css, /width:\s*min\(96vw, 1680px\)/);
});

test("BLUE provides honest paper, model, external-search, and queue inputs", () => {
  assert.match(html, /data-layout-zone="blue"/);
  for (const id of ["research-paper-file", "research-paper-reference", "research-model-file", "research-model-reference", "external-research-query", "compare-queue-list"]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, id);
  }
  assert.match(html, /PDF · TXT · MARKDOWN/);
  assert.match(html, /EQUATIONS · JSON · CSV · MODEL DESCRIPTION/);
  assert.match(html, /ANALYSIS PIPELINE PENDING/);
  assert.match(html, /SEARCH CONNECTOR NOT CONNECTED/);
  assert.match(layout, /scholar\.google\.com\/scholar\?q=/);
  assert.doesNotMatch(layout, /fetch\(/);
  assert.match(layout, /PCSResearchInputContract/);
});

test("RED is a neutral model mapping stage below existing controls", () => {
  assert.match(html, /data-layout-zone="red" data-mapping-state="neutral"/);
  assert.match(html, /class="neutral-sphere"/);
  assert.match(html, /No model loaded\./);
  assert.match(html, /NO VALIDATED SPATIAL MAPPING/);
  for (const control of ["VIEW", "MODE", "TIME", "LAYER", "MODEL", "RESET", "COMPARE"]) assert.match(html, new RegExp(`>${control}<`));
  assert.ok(html.indexOf("timeline-panel") < html.indexOf("data-layout-zone=\"red\""), "mapping stage must remain below current controls");
  assert.match(css, /\.model-mapping-panel\s*\{[^}]*width:\s*calc\(150% \+ 14px\)[^}]*margin-left:\s*calc\(-50% - 14px\)/s);
});

test("YELLOW reserves a large event, analysis, and explainable-alert workspace", () => {
  assert.match(html, /data-layout-zone="yellow"/);
  assert.match(css, /\.event-analysis-center\s*\{[^}]*min-height:\s*0/s);
  assert.match(html, /NO EVENT SELECTED · ANALYSIS UNAVAILABLE/);
  assert.match(html, /NO ALERT ASSERTED · INSUFFICIENT EVIDENCE/);
  for (const field of ["TIME", "CATEGORY", "EVENT", "SOURCE", "STATUS", "CONFIDENCE"]) assert.match(html, new RegExp(`>${field}<`));
  for (const field of ["WHAT HAPPENED", "WHY PCS FLAGGED IT", "OBSERVATION", "MODEL", "BASELINE", "DEVIATION", "RESIDUAL", "TREND", "PERSISTENCE", "RELATED PAPERS", "RELATED EVENTS"]) assert.match(html, new RegExp(`>${field}<`));
  for (const severity of ["INFO", "WATCH", "WARNING", "CRITICAL"]) assert.match(html, new RegExp(`>${severity}<`));
  for (const evidence of ["Trigger", "Evidence", "Source", "Timestamp", "Confidence", "Reason", "Related model", "Related observations", "Related literature"]) assert.match(html, new RegExp(`>${evidence}<`));
  assert.match(html, /No validated event feed is connected/);
  assert.match(html, /INSUFFICIENT EVIDENCE/);
});

test("existing modules remain unique and only receive independent flow wrappers", () => {
  for (const id of ["cesium-globe", "satellite-observation-panel", "pcs-daily-brief", "visitor-network-details", "total-l-status"]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, id);
  }
  assert.doesNotMatch(layout, /moveExistingModule/);
  assert.doesNotMatch(layout, /data-research-mount/);
  assert.match(layout, /existingModuleRelocation:\s*"layout-wrapper-only"/);
  assert.match(layout, /integrateIndependentPanelFlows/);
  assert.match(layout, /primaryWorkspace\.append\(domainsPanel, yellowZone, populationFeed, pipelinePanel, audioPanel\)/);
  assert.match(layout, /secondaryWorkspace\.append\(dailyBrief, evidenceLedger, animationPanel, evidenceExplorer\)/);
  assert.ok(html.indexOf("main-panel-layout.js") < html.indexOf("app.js"));
});

test("desktop retains the long-page three-column proportions through independent primary and secondary flows", () => {
  assert.match(html, /class="primary-workspace"/);
  assert.match(html, /class="upper-workspace-grid"/);
  assert.match(html, /class="secondary-workspace"/);
  assert.match(css, /\.dashboard-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0, 3fr\) minmax\(250px, 1fr\)/s);
  assert.match(css, /\.upper-workspace-grid\s*\{[^}]*grid-template-columns:\s*minmax\(250px, 1fr\) minmax\(620px, 2fr\)/s);
  assert.doesNotMatch(css, /"stage stage stage"/);
  assert.match(css, /\.primary-workspace,[\s\S]*?\.bottom-secondary-column\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column/s);
  assert.match(css, /@media \(max-width: 1100px\)/);
  assert.match(layout, /primaryWorkspace\.append\(blueZone, yellowZone\)/);
  assert.match(layout, /primaryWorkspace\.insertBefore\(yellowZone, populationFeed\)/);
  assert.match(css, /overflow-x:\s*hidden/);
});

test("visual panels scale proportionally without changing their locations", () => {
  assert.match(css, /--pcs-panel-gap:\s*14px/);
  assert.match(css, /\.cesium-globe\s*\{[^}]*height:\s*clamp\(560px, 64vh, 820px\)/s);
  assert.match(css, /\.mapping-viewport\s*\{[^}]*height:\s*clamp\(560px, 66vh, 820px\)/s);
  assert.match(css, /\.neutral-sphere\s*\{[^}]*width:\s*clamp\(430px, 83cqh, 620px\)[^}]*aspect-ratio:\s*1/s);
  assert.ok(html.indexOf('class="panel globe-panel"') < html.indexOf('class="panel timeline-panel"'));
  assert.ok(html.indexOf('class="panel timeline-panel"') < html.indexOf('class="panel model-mapping-panel"'));
});

test("population and Daily Brief panels are independent accessible information feeds", () => {
  for (const className of ["population-event-stream", "population-event-stream-header", "daily-brief-feed", "daily-brief-header"]) assert.match(html, new RegExp(`class="[^"]*${className}`));
  for (const id of ["population-region-filter", "population-time-filter", "population-source-filter", "population-scale-filter", "daily-brief-sort", "mass-gathering-count", "daily-brief-count"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const category of ["population", "gathering", "transport", "urban", "event", "anomaly"]) assert.match(html, new RegExp(`data-population-filter="${category}"`));
  for (const category of ["earth", "climate", "space", "research", "population", "alert"]) assert.match(html, new RegExp(`data-daily-brief-filter="${category}"`));
  assert.match(css, /#pcs-daily-brief,[\s\S]*?#pcs-mass-gatherings\s*\{[^}]*height:\s*auto;[^}]*min-height:\s*0/s);
  assert.match(css, /\.daily-brief-feed\s*\{[^}]*max-height:\s*clamp\(360px, 52vh, 640px\)/s);
  assert.match(css, /\.population-event-stream\s*\{[^}]*max-height:\s*clamp\(320px, 48vh, 620px\)/s);
  assert.match(css, /\.pcs-scroll-feed\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.pcs-feed-sticky-header\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0/s);
  assert.match(css, /\.pcs-scroll-feed::\-webkit-scrollbar\s*\{[^}]*width:\s*9px/s);
  assert.match(app, /function renderMassGatherings\(rows\)/);
  assert.match(app, /DATA PENDING/);
  assert.doesNotMatch(app, /Scale HIGH|Confidence 0\.82/);
});

test("zero-dead-space rules remove artificial empty capacity", () => {
  assert.match(css, /\.research-input-panel\s*\{[^}]*min-height:\s*0/s);
  assert.match(css, /\.event-stream-list\s*\{[^}]*min-height:\s*0;[^}]*max-height:\s*clamp\(320px, 48vh, 620px\)/s);
  assert.match(css, /\.event-empty-state\s*\{[^}]*min-height:\s*64px/s);
  assert.match(css, /\.feed-empty-state\s*\{[^}]*min-height:\s*64px/s);
  assert.match(css, /\.data-message:empty\s*\{\s*display:\s*none;/s);
  assert.doesNotMatch(css, /\.event-analysis-center\s*\{[^}]*min-height:\s*1320px/s);
  assert.doesNotMatch(css, /\.research-input-panel\s*\{[^}]*min-height:\s*980px/s);
});
