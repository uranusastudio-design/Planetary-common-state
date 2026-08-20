import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./style.css", import.meta.url), "utf8");
const layout = await readFile(new URL("./main-panel-layout.js", import.meta.url), "utf8");

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
  assert.match(css, /\.event-analysis-center\s*\{[^}]*min-height:\s*1320px/s);
  for (const field of ["TIME", "CATEGORY", "EVENT", "SOURCE", "STATUS", "CONFIDENCE"]) assert.match(html, new RegExp(`>${field}<`));
  for (const field of ["WHAT HAPPENED", "WHY PCS FLAGGED IT", "OBSERVATION", "MODEL", "BASELINE", "DEVIATION", "RESIDUAL", "TREND", "PERSISTENCE", "RELATED PAPERS", "RELATED EVENTS"]) assert.match(html, new RegExp(`>${field}<`));
  for (const severity of ["INFO", "WATCH", "WARNING", "CRITICAL"]) assert.match(html, new RegExp(`>${severity}<`));
  for (const evidence of ["Trigger", "Evidence", "Source", "Timestamp", "Confidence", "Reason", "Related model", "Related observations", "Related literature"]) assert.match(html, new RegExp(`>${evidence}<`));
  assert.match(html, /No validated event feed is connected/);
  assert.match(html, /INSUFFICIENT EVIDENCE/);
});

test("existing modules remain unique and are not relocated", () => {
  for (const id of ["cesium-globe", "satellite-observation-panel", "pcs-daily-brief", "visitor-network-details", "total-l-status"]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, id);
  }
  assert.doesNotMatch(layout, /moveExistingModule/);
  assert.doesNotMatch(layout, /data-research-mount/);
  assert.match(layout, /existingModuleRelocation:\s*false/);
  assert.ok(html.indexOf("main-panel-layout.js") < html.indexOf("app.js"));
});

test("desktop retains the long-page three-column structure and mobile reorders only new zones", () => {
  assert.match(css, /grid-template-columns:\s*minmax\(250px, 1fr\) minmax\(620px, 2fr\) minmax\(250px, 1fr\)/);
  assert.doesNotMatch(css, /"stage stage stage"/);
  assert.match(css, /\.bottom-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1\.45fr\) minmax\(0, 0\.55fr\)/s);
  assert.match(css, /@media \(max-width: 1100px\)/);
  assert.match(layout, /dashboard\.insertBefore\(blueZone, centerColumn\)/);
  assert.match(layout, /dashboard\.insertBefore\(yellowZone, leftColumn\)/);
  assert.match(css, /overflow-x:\s*hidden/);
});
