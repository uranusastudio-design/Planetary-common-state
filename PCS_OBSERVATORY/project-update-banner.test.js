import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./style.css", import.meta.url), "utf8");

test("banner is below the header and above dashboard content in normal flow", () => {
  assert.ok(html.indexOf("</header>") < html.indexOf('id="pcs-update-banner"'));
  assert.ok(html.indexOf('id="pcs-update-banner"') < html.indexOf('class="dashboard-layout"'));
  assert.doesNotMatch(css.slice(css.indexOf(".pcs-update-banner {"), css.indexOf(".pcs-update-banner__heading")), /position:\s*(fixed|absolute)/);
});

test("banner exposes status, details, timestamp and accessible collapse control", () => {
  for (const id of ["pcs-update-phase", "pcs-update-status", "pcs-update-title", "pcs-update-summary", "pcs-update-time", "pcs-update-details", "pcs-update-toggle"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-controls="pcs-update-content"/);
  assert.match(css, /:focus-visible/);
});

test("runtime safely handles API failure, malformed dates and missing details", () => {
  assert.match(app, /currentProjectUpdate = null/);
  assert.ok(app.includes("selectors.updateBanner.hidden = true"));
  assert.ok(app.includes("Number.isNaN(Date.parse(value))"));
  assert.ok(app.includes("selectors.updateDetails.hidden = !detailsUrl"));
  assert.doesNotMatch(app, /Invalid Date/);
  const formatter = app.slice(app.indexOf("function formatProjectUpdateTime"), app.indexOf("function renderProjectUpdate"));
  assert.doesNotMatch(formatter, /dateStyle: "medium"/);
});

test("regional switching uses global PCS state while regional observations remain API-driven", () => {
  assert.match(app, /function stateSourceForRegion[\s\S]*return GLOBAL_STATE_SOURCE/);
  assert.match(app, /api\/regional\/observation/);
  assert.match(app, /if \(error\?\.name === "AbortError"\) return/);
});

test("language rendering falls back to English and refreshes at runtime", () => {
  assert.ok(app.includes('language === "zh-TW" ? "zh" : language'));
  assert.ok(app.includes('update?.[`${prefix}_en`]'));
  assert.match(app, /pcs:languagechange", \(\) => queueMicrotask\(renderProjectUpdate\)/);
});

test("collapse is scoped by update id and storage failures are caught", () => {
  assert.ok(app.includes("pcs-update-dismissed:${currentProjectUpdate.id}"));
  assert.match(app, /readStorageValue/);
  assert.match(app, /writeStorageValue/);
  assert.ok(app.includes('classList.toggle("is-collapsed"'));
});

test("mobile rules coexist with one Cesium Viewer and one canvas host", () => {
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.pcs-update-banner/);
  assert.equal(app.split("new Cesium.Viewer(").length - 1, 1);
  assert.equal(html.split('id="cesium-globe"').length - 1, 1);
});

test("all update states map to textual translations", () => {
  for (const status of ["DEPLOYED", "CHECKPOINT", "IN_PROGRESS", "MAINTENANCE", "DATA_UPDATE", "FIXED", "SECURITY_UPDATE", "ARCHIVED"]) assert.match(app, new RegExp(`${status}: "update_status_`));
});
