import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./style.css", import.meta.url), "utf8");
const layout = await readFile(new URL("./main-panel-layout.js", import.meta.url), "utf8");

test("main workspace has one centered research grid and one production globe", () => {
  assert.equal((html.match(/class="dashboard-layout" data-pcs-research-grid/g) || []).length, 1);
  assert.equal((html.match(/id="cesium-globe"/g) || []).length, 1);
  assert.match(css, /width:\s*min\(96vw, 1680px\)/);
  assert.match(css, /grid-template-areas:\s*\n\s*"stage stage stage"\s*\n\s*"lab analysis inspector"\s*\n\s*"controls controls controls"/);
  assert.match(css, /height:\s*clamp\(520px, 58vh, 760px\)/);
});

test("research lab exposes accessible tabs and honest pending states", () => {
  for (const tab of ["pcs-model", "pcs-papers", "external-papers", "cross-comparison"]) {
    assert.match(html, new RegExp(`data-research-tab="${tab}"`));
    assert.match(html, new RegExp(`data-research-panel="${tab}"`));
  }
  assert.match(html, /COMING \/ DATA PENDING/);
  assert.match(html, /ANALYSIS PIPELINE PENDING/);
  assert.match(html, /reserved review vocabulary, not analysis results/i);
  assert.match(layout, /ArrowRight/);
  assert.match(layout, /aria-selected/);
});

test("existing modules are reclassified without duplicating their stable ids", () => {
  for (const id of ["satellite-observation-panel", "pcs-daily-brief", "visitor-network-details"]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, id);
  }
  assert.match(layout, /#satellite-observation-panel/);
  assert.match(layout, /#pcs-daily-brief/);
  assert.match(layout, /\.visitor-network-panel/);
  assert.ok(html.indexOf("main-panel-layout.js") < html.indexOf("app.js"));
});

test("analysis and alert shell names all required non-fabricated fields", () => {
  for (const component of ["T", "F", "C", "I", "S"]) assert.match(html, new RegExp(`L<sub>${component}</sub>`));
  for (const field of ["Trend", "Persistence", "Confidence", "Normalization"]) assert.match(html, new RegExp(`<dt>${field}</dt>`));
  for (const severity of ["INFO", "WATCH", "WARNING", "CRITICAL"]) assert.match(html, new RegExp(`>${severity}<`));
  for (const evidence of ["Trigger", "Evidence", "Source", "Time", "Confidence", "Reason", "Related model"]) assert.match(html, new RegExp(evidence));
  assert.match(html, /Alert evaluation: UNAVAILABLE/);
  assert.doesNotMatch(html, /Current state:\s*<span[^>]*>Normal/);
});

test("responsive order prioritizes stage, analysis, lab, then inspector", () => {
  assert.match(css, /grid-template-areas:\s*\n\s*"stage"\s*\n\s*"analysis"\s*\n\s*"lab"\s*\n\s*"inspector"\s*\n\s*"controls"/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(layout, /dashboard\.append\(stage, analysis, lab, inspector, controls\)/);
});
