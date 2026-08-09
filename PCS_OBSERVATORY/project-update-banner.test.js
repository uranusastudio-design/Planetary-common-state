import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

const root = new URL("./", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const css = await readFile(new URL("style.css", root), "utf8");
const app = await readFile(new URL("app.js", root), "utf8");
const center = await readFile(new URL("release-center.js", root), "utf8");
const registry = JSON.parse(await readFile(new URL("data/releases.json", root), "utf8"));
const validRoadmapStatuses = new Set(["completed", "in-progress", "planned", "blocked", "deferred"]);

test("release center stays in the existing normal-flow update location", () => {
  assert.ok(html.indexOf("</header>") < html.indexOf('id="pcs-update-banner"'));
  assert.ok(html.indexOf('id="pcs-update-banner"') < html.indexOf('class="dashboard-layout"'));
  assert.match(html, /data-release-center/);
  assert.doesNotMatch(css.slice(css.indexOf(".pcs-update-banner {"), css.indexOf(".pcs-update-banner__heading")), /position:\s*(fixed|absolute)/);
});

test("registry schema, version, date, statuses and ordering are valid", () => {
  assert.equal(registry.schemaVersion, 1);
  const versions = registry.releases.map(release => release.version);
  assert.equal(new Set(versions).size, versions.length);
  assert.ok(versions.includes(registry.currentVersion));
  assert.equal(registry.stableVersion, "v2.1.0");
  assert.equal(registry.plannedVersion, "v2.2.0");
  assert.equal(registry.currentVersion, "v2.2.0");
  assert.equal(registry.currentStatus, "preview");
  assert.equal(registry.currentPhase, "v2.2.0-foundation");
  for (const release of registry.releases) {
    assert.match(release.version, /^v\d+\.\d+\.\d+$/);
    assert.equal(new Date(`${release.date}T00:00:00Z`).toISOString().slice(0, 10), release.date);
    assert.ok(["stable", "preview", "archived"].includes(release.status));
  }
  assert.deepEqual(registry.roadmap.slice(0, 5).map(item => item.id), ["deep-space-phase-1", "deep-space-phase-2", "deep-space-phase-3", "v2.2.0-foundation", "deep-space-phase-4"]);
  assert.deepEqual(registry.roadmap.filter(item => item.status === "in-progress").map(item=>item.id), ["v2.2.0-foundation", "deep-space-phase-4"]);
  assert.ok(registry.roadmap.every(item => validRoadmapStatuses.has(item.status)));
});

test("commits, compare URLs and documentation are verifiable and deployable", async () => {
  const repoPattern = /^https:\/\/github\.com\/uranusastudio-design\/Planetary-common-state$/;
  assert.match(registry.repository, repoPattern);
  for (const release of registry.releases) {
    for (const commit of release.commits) {
      assert.match(commit.hash, /^[0-9a-f]{40}$/);
      assert.match(commit.previous, /^[0-9a-f]{7,40}$/);
    }
    for (const document of release.documentation) await access(resolve(new URL(root).pathname, document.path));
  }
  assert.match(center, /\/compare\/\$\{previous\}\.\.\.\$\{hash\}/);
  assert.match(center, /rel=\"noopener noreferrer\"/);
});

test("honest milestone boundaries and known issues are preserved", () => {
  const phase3 = registry.roadmap.find(item => item.id === "deep-space-phase-3");
  const foundation = registry.roadmap.find(item => item.id === "v2.2.0-foundation");
  const phase4 = registry.roadmap.find(item => item.id === "deep-space-phase-4");
  const titania = registry.roadmap.find(item => item.id === "titania-texture");
  assert.equal(phase3.status, "completed");
  assert.equal(foundation.status, "in-progress");
  assert.equal(phase4.status, "in-progress");
  assert.equal(titania.status, "deferred");
  assert.ok(registry.releases[0].knownIssues.some(issue => issue.includes("Titania")));
  assert.doesNotMatch(JSON.stringify(registry), /48%|Gaia DR4/i);
});

test("tabs, session-only persistence, keyboard and focus behavior are accessible", () => {
  for (const tab of ["latest", "changelog", "roadmap", "notes"]) assert.match(html, new RegExp(`data-release-tab="${tab}"`));
  assert.match(html, /role="tablist"/);
  assert.match(center, /sessionStorage/);
  assert.match(center, /event\.key === "Escape"/);
  assert.match(center, /ArrowLeft/);
  assert.match(center, /focusBeforeExpand/);
  assert.match(center, /aria-selected/);
  assert.match(html, /id="pcs-release-open"/);
  assert.match(html, /id="pcs-release-notes"/);
  assert.match(center, /scrollIntoView/);
  assert.match(center, /prefers-reduced-motion: reduce/);
  assert.match(center, /stored === null \? true/);
});

test("four languages contain every release-center interface term", () => {
  for (const language of ["en", "zh-TW", "ja", "ko"]) assert.ok(center.includes(language === "zh-TW" ? '"zh-TW":' : `${language}:`));
  for (const key of ["pcsUpdates","latestUpdate","version","date","status","stable","inProgress","planned","deferred","added","changed","fixed","knownIssues","roadmap","releaseNotes","documentation","viewCommit","viewDiff","viewDeployment","expand","collapse","currentDevelopment","next","milestone","assets","knownLimitations","baseline","stableFrozen","scientificCoverage","earth","solarSystem","nearbyStars","milkyWay","localGroup","openObservatory","plannedVersion","restoreBanner"]) assert.match(center, new RegExp(`${key}:`));
});

test("release banner derives version, status, coverage, and next state from the release registry", () => {
  assert.match(center, /registry\.currentStatus === "stable"/);
  assert.match(center, /status === "in-progress" \|\| status === "preview"/);
  assert.match(center, /registry\.plannedVersion/);
  assert.match(center, /item\.id === "deep-space-phase-4"/);
  assert.match(center, /coverageLabels/);
  assert.doesNotMatch(center, /v2\.1\.0|v2\.2\.0/);
  assert.doesNotMatch(center, /Phase 4A[^\n]*(?:In Development|in-progress)/i);
});

test("feature does not add Cesium, canvas, WebGL, animation loops, or live GitHub API", () => {
  assert.equal(app.split("new Cesium.Viewer(").length - 1, 1);
  assert.equal(html.split('id="cesium-globe"').length - 1, 1);
  assert.doesNotMatch(center, /new Cesium\.Viewer|createElement\(["']canvas|requestAnimationFrame|api\.github\.com/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.pcs-release-banner__actions[\s\S]*\.pcs-release-tabs/);
});

test("registry and production files contain no local absolute paths", () => {
  const source = `${JSON.stringify(registry)}\n${center}\n${html}`;
  assert.doesNotMatch(source, /(?:\/Users\/|[A-Za-z]:\\\\|\.openclaw)/);
});
