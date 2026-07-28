import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { filterRecords, summarize, validateRegistry } from "../components.js";

const root = new URL("../../../", import.meta.url);
const registry = JSON.parse(await readFile(new URL("data/phase-registry.json", root), "utf8"));
const html = await readFile(new URL("Apps/PCS-Mission-Control/index.html", root), "utf8");
const app = await readFile(new URL("Apps/PCS-Mission-Control/app.js", root), "utf8");
const server = await readFile(new URL("Apps/PCS-Mission-Control/server.mjs", root), "utf8");
const readme = await readFile(new URL("Apps/PCS-Mission-Control/README.md", root), "utf8");
const observatory = await readFile(new URL("PCS_OBSERVATORY/index.html", root), "utf8");
const pagesConfig = await readFile(new URL("_config.yml", root), "utf8");

test("registry loads with 48 unique canonical records", () => {
  assert.equal(validateRegistry(registry).records.length, 48);
  assert.equal(new Set(registry.records.map((record) => record.id)).size, 48);
});

test("phase summary counts are exact", () => {
  assert.deepEqual(summarize(registry.records), {
    DEPLOYED: 8,
    ARCHIVED: 2,
    VALIDATED_LOCAL: 4,
    PUSHED_NOT_DEPLOYED: 12,
    CHECKPOINT: 11,
    IN_PROGRESS: 5,
    NOT_STARTED: 6
  });
});

test("Phase 7.1 stays CHECKPOINT and Phase 7.2 stays locked", () => {
  const phase = registry.records.find((record) => record.id === "OBS-7.1");
  assert.equal(phase.status, "CHECKPOINT");
  assert.deepEqual(phase.evidence, {
    function: "VALIDATED",
    tests: "PASSED",
    browser: "PASSED",
    deployment: "VERIFIED",
    lifecycle: "CHECKPOINT"
  });
  assert.equal(registry.phase_7_2_gate.allowed, false);
});

test("system truth labels are present without fake operational claims", () => {
  assert.match(html, /DEGRADED_OR_INCOMPLETE/);
  assert.doesNotMatch(html + app, /ALL SYSTEMS ONLINE/i);
  assert.doesNotMatch(html + app, /0\\.317|0\\.500|GPT-4o|Telegram/i);
  assert.match(html, /L\(t\)<\/dt><dd>UNAVAILABLE/);
});

test("runtime is LOCAL_ADMIN_ONLY with no public mode", () => {
  assert.match(html, /LOCAL_ADMIN_ONLY/);
  assert.doesNotMatch(html + app + server, /PUBLIC_VIEW|visitor mode|public dashboard/i);
});

test("server binds only to loopback and rejects host overrides", () => {
  assert.match(server, /\.listen\(port, "127\.0\.0\.1"/);
  assert.doesNotMatch(server, /\.listen\(port, "0\.0\.0\.0"/);
  assert.doesNotMatch(server, /Access-Control-Allow-Origin|\*\s*["']/);
  assert.match(server, /allowedHosts/);
  assert.doesNotMatch(server, /process\.env\.HOST/);
});

test("README states the local-only security boundary", () => {
  assert.match(readme, /Local administration only/i);
  assert.match(readme, /Not for public deployment/i);
  assert.match(readme, /Do not bind.*0\.0\.0\.0/is);
  assert.match(readme, /tunnel[\s\S]*reverse proxy[\s\S]*public hosting/i);
  assert.match(readme, /Do not publish local telemetry/i);
});

test("Observatory has no public Mission Control navigation entry", () => {
  assert.doesNotMatch(observatory, /PCS[- ]Mission[- ]Control|Mission Control/i);
});

test("public Pages configuration excludes Mission Control and its registry", () => {
  assert.match(pagesConfig, /Apps\/PCS-Mission-Control/);
  assert.match(pagesConfig, /data\/phase-registry\.json/);
});

test("navigation links to the existing Observatory and never embeds Cesium", () => {
  assert.equal(html.includes("../../PCS_OBSERVATORY/"), true);
  assert.equal((html.match(/<canvas/gi) || []).length, 0);
  assert.equal((html.match(/Cesium\\.Viewer|cesium-globe/gi) || []).length, 0);
});

test("filter and search use canonical records", () => {
  assert.equal(filterRecords(registry.records, { query: "historical" })[0].id, "OBS-7.1");
  assert.equal(filterRecords(registry.records, { namespace: "cloudflare" }).length, 1);
  assert.equal(filterRecords(registry.records, { status: "NOT_STARTED" }).length, 6);
});

test("update API has an explicit non-blocking failure state", () => {
  assert.match(app, /UPDATE_UNAVAILABLE/);
  assert.match(app, /Mission Control remains available/);
});

test("shell exposes semantic navigation, pages and mobile drawer controls", () => {
  assert.match(html, /<header class="top-status"/);
  assert.match(html, /<aside id="sidebar"/);
  assert.match(html, /aria-controls="sidebar"/);
  assert.match(html, /id="dashboard-page"/);
  assert.match(html, /id="phases-page"/);
});

test("runtime registry contains no private paths or credentials", () => {
  const text = JSON.stringify(registry);
  assert.equal(text.includes("/Users/"), false);
  assert.doesNotMatch(text, /token|credential|private key/i);
});
