import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Temperature uses the Worker route contract and one Cesium Viewer", () => {
  assert.match(app, /temp:\s*\{[^}]*path:\s*"temperature"/);
  assert.equal((app.match(/new Cesium\.Viewer\(/g) || []).length, 1);
});

test("Domain readiness has no static WAITING or PLANNED cards", () => {
  const start = html.indexOf('id="domain-readiness-grid"');
  assert.ok(start >= 0);
  const domainSection = html.slice(Math.max(0, start - 300), start + 300);
  assert.doesNotMatch(domainSection, /Waiting|Planned|confirmed|placeholder/i);
  assert.match(app, /\/api\/domain-readiness/);
});

test("Retrospective, gathering, and Evidence Ledger panels use live APIs", () => {
  for (const id of ["daily-brief-list", "mass-gathering-list", "evidence-ledger-list"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const endpoint of ["/api/events?limit=20", "/api/evidence-ledger", "/api/mass-gatherings"]) assert.ok(app.includes(endpoint));
});

test("all Observatory dictionaries contain the PCS evidence labels", async () => {
  for (const language of ["en", "zh-TW", "ja", "ko"]) {
    const dictionary = JSON.parse(await readFile(new URL(`./i18n/${language}.json`, import.meta.url), "utf8"));
    for (const key of ["connected_datasets", "retrospective_analysis", "human_mobility", "evidence_ledger", "validation_status", "data_quality"]) assert.equal(typeof dictionary[key], "string", `${language}.${key}`);
  }
});
