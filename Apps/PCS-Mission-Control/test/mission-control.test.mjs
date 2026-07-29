import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { filterQueueItems, filterRecords, summarize, summarizeQueue, validateLocalAdminStatus, validateRegistry } from "../components.js";
import { fetchProjectUpdateState, UPDATE_API_TIMEOUT_MS } from "../data-adapter.js";
import { buildQueueProjection, loadMissionQueue, QUEUE_STATUSES } from "../queue-adapter.mjs";
import { buildRegistryPayload, loadCanonicalRegistry, REGISTRY_SOURCE_SHA256 } from "../registry-adapter.mjs";

const root = new URL("../../../", import.meta.url);
const registry = JSON.parse(await readFile(new URL("data/phase-registry.json", root), "utf8"));
const html = await readFile(new URL("Apps/PCS-Mission-Control/index.html", root), "utf8");
const app = await readFile(new URL("Apps/PCS-Mission-Control/app.js", root), "utf8");
const server = await readFile(new URL("Apps/PCS-Mission-Control/server.mjs", root), "utf8");
const readme = await readFile(new URL("Apps/PCS-Mission-Control/README.md", root), "utf8");
const observatory = await readFile(new URL("PCS_OBSERVATORY/index.html", root), "utf8");
const pagesConfig = await readFile(new URL("_config.yml", root), "utf8");
const localStatus = JSON.parse(await readFile(new URL("Apps/PCS-Mission-Control/local-admin-status.json", root), "utf8"));
const adapter = await readFile(new URL("Apps/PCS-Mission-Control/data-adapter.js", root), "utf8");
const queueAdapter = await readFile(new URL("Apps/PCS-Mission-Control/queue-adapter.mjs", root), "utf8");

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

test("single local adapter validates MC and history-source status", () => {
  assert.equal(validateLocalAdminStatus(localStatus).runtime_mode, "LOCAL_ADMIN_ONLY");
  assert.deepEqual(localStatus.mission_control_phases.map(({ id, status }) => ({ id, status })), [
    { id: "MC-01", status: "COMPLETED" },
    { id: "MC-02", status: "COMPLETED" },
    { id: "MC-03", status: "COMPLETED" },
    { id: "MC-04", status: "IN_PROGRESS" },
    { id: "MC-05", status: "LOCKED" }
  ]);
  assert.deepEqual(localStatus.history_source, {
    name: "chatgpt-pcs-history",
    status: "ENABLED",
    scope: "LOCAL_ONLY",
    access: "READ_ONLY",
    conversations: 83,
    messages: 2384,
    chunks: 3013,
    index: "FTS5",
    embedding: false,
    automatic_memory_write: false,
    approval: "APPROVED_WHITELIST",
    traceability: "SOURCE_TRACEABLE"
  });
  assert.match(adapter, /loadLocalAdminData/);
});

test("MC-01 source adapter reads and verifies 48 canonical records", async () => {
  const source = await loadCanonicalRegistry();
  assert.equal(source.records.length, 48);
  assert.equal(source.namespaces.length, 7);
  assert.equal(new Set(source.records.map((record) => record.id)).size, 48);
  assert.equal(source.source.registry_sha256, REGISTRY_SOURCE_SHA256);
  assert.deepEqual(summarize(source.records), {
    DEPLOYED: 8,
    ARCHIVED: 2,
    VALIDATED_LOCAL: 4,
    PUSHED_NOT_DEPLOYED: 12,
    CHECKPOINT: 11,
    IN_PROGRESS: 5,
    NOT_STARTED: 6
  });
});

test("registry records include read-only source traceability and derived evidence", async () => {
  const source = await loadCanonicalRegistry();
  const phase = source.records.find((record) => record.id === "OBS-7.1");
  assert.equal(phase.status, "CHECKPOINT");
  assert.equal(phase.functional_status, "VALIDATED");
  assert.equal(phase.deployment_status, "EVIDENCED");
  assert.equal(phase.validation_status, "VALIDATED");
  assert.equal(phase.source_record_id, "OBS-7.1");
  assert.match(phase.source_record_sha256, /^[a-f0-9]{64}$/);
  assert.match(phase.source_file, /Phase-Audit-20260728-143437\/PHASE_REGISTRY\.json$/);
});

test("registry schema, count, namespace and evidence failures reject without fake data", async () => {
  const source = await loadCanonicalRegistry();
  const base = {
    schema_version: "pcs.phase-registry.v1",
    records: source.records.map(({ functional_status, deployment_status, validation_status, lock_status, last_verified_at, source_record_id, source_record_sha256, source_indicator, source_file, validation_artifact, dependencies, locks, evidence, ...record }) => record),
    status_vocabulary: source.status_vocabulary,
    generated_at: source.generated_at
  };
  assert.throws(() => buildRegistryPayload({ ...base, schema_version: "wrong" }, ""), /REGISTRY_SCHEMA_INVALID/);
  assert.throws(() => buildRegistryPayload({ ...base, records: base.records.slice(1) }, ""), /REGISTRY_RECORD_COUNT_INVALID/);
  assert.throws(() => buildRegistryPayload(base, "| Phase | Name | Function | Tests | Browser | Commit | Push | Deploy | Status | Blocker |"), /REGISTRY_MATRIX_COUNT_INVALID/);
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
  const results = filterRecords(registry.records, { query: "historical" });
  assert.equal(results.some((record) => record.id === "OBS-7.1"), true);
  assert.equal(results.every((record) => [
    record.id,
    record.phase,
    record.name,
    record.namespace,
    record.status,
    record.functional_status,
    record.deployment_status,
    ...(record.blockers || [])
  ].some((value) => String(value ?? "").toLowerCase().includes("historical"))), true);
  assert.equal(filterRecords(registry.records, { namespace: "cloudflare" }).length, 1);
  assert.equal(filterRecords(registry.records, { status: "NOT_STARTED" }).length, 6);
});

test("MC-03 registry filters and sorts source-derived fields", async () => {
  const records = (await loadCanonicalRegistry()).records;
  assert.equal(filterRecords(records, { functional: "VALIDATED" }).length > 0, true);
  assert.equal(filterRecords(records, { deployment: "EVIDENCED" }).length, 12);
  assert.equal(filterRecords(records, { lock: "UNAVAILABLE" }).length, 48);
  assert.equal(filterRecords(records, { query: "CHECKPOINT" }).length, 11);
  assert.equal(filterRecords(records, { sort: "last_verified_at" }).length, 48);
});

test("MC-04 queue projection deterministically maps all canonical records", async () => {
  const queue = await loadMissionQueue();
  assert.equal(queue.items.length, 48);
  assert.equal(new Set(queue.items.map((item) => item.queue_item_id)).size, 48);
  assert.equal(new Set(queue.items.map((item) => item.canonical_record_id)).size, 48);
  assert.deepEqual(summarizeQueue(queue.items, QUEUE_STATUSES), {
    COMPLETED: 10,
    IN_PROGRESS: 5,
    READY: 0,
    BLOCKED: 33,
    LOCKED: 0,
    NOT_STARTED: 0,
    REQUIRES_REVIEW: 0,
    UNAVAILABLE: 0
  });
  assert.deepEqual(queue.dependency_validation, {
    references_valid: true,
    cycle_detected: false,
    formal_dependency_records: 0
  });
  assert.equal(queue.source.validation_artifacts[0].manifest_entries, 11);
  assert.equal(queue.source.validation_artifacts[1].manifest_entries, 13);
});

test("MC-04 queue model preserves required fields and never guesses READY", async () => {
  const queue = await loadMissionQueue();
  const required = [
    "queue_item_id",
    "canonical_record_id",
    "title",
    "namespace",
    "lifecycle_status",
    "queue_status",
    "priority",
    "dependency_ids",
    "blockers",
    "lock_status",
    "validation_status",
    "deployment_status",
    "source_evidence",
    "last_verified_at",
    "next_allowed_action",
    "action_authorization_state"
  ];
  queue.items.forEach((item) => required.forEach((field) => assert.equal(Object.hasOwn(item, field), true)));
  assert.equal(queue.items.some((item) => item.queue_status === "READY"), false);
  assert.equal(queue.items.every((item) => item.priority === "UNAVAILABLE"), true);
});

test("MC-04 queue search, six filters and five sorts are available", async () => {
  const items = (await loadMissionQueue()).items;
  assert.equal(filterQueueItems(items, { query: "Historical reconstruction" }).some((item) => item.canonical_record_id === "OBS-7.1"), true);
  assert.equal(filterQueueItems(items, { status: "BLOCKED" }).length, 33);
  assert.equal(filterQueueItems(items, { namespace: "observatory" }).length, 8);
  assert.equal(filterQueueItems(items, { priority: "UNAVAILABLE" }).length, 48);
  assert.equal(filterQueueItems(items, { lock: "UNAVAILABLE" }).length, 48);
  assert.equal(filterQueueItems(items, { validation: "VALIDATED" }).length > 0, true);
  assert.equal(filterQueueItems(items, { blockers: "HAS_BLOCKERS" }).length, 38);
  for (const sort of ["priority", "queue_item_id", "queue_status", "namespace", "last_verified_at"]) {
    assert.equal(filterQueueItems(items, { sort }).length, 48);
  }
});

test("MC-04 reports invalid dependency references and dependency cycles", async () => {
  const registrySource = await loadCanonicalRegistry();
  const missing = structuredClone(registrySource);
  missing.records[0].dependencies = ["MISSING-RECORD"];
  assert.throws(() => buildQueueProjection(missing), /QUEUE_INVALID/);
  const cycle = structuredClone(registrySource);
  cycle.records[0].dependencies = [cycle.records[1].id];
  cycle.records[1].dependencies = [cycle.records[0].id];
  assert.throws(() => buildQueueProjection(cycle), /QUEUE_INVALID/);
});

test("MC-04 reports unavailable sources without cached queue data", async () => {
  await assert.rejects(() => loadMissionQueue({
    registryLoader: async () => { throw new Error("missing"); },
    artifactVerifier: async () => ({})
  }), /QUEUE_UNAVAILABLE/);
});

test("MC-04 sequence and next allowed mission remain approval bounded", async () => {
  const queue = await loadMissionQueue();
  assert.deepEqual(queue.mission_control_sequence.slice(0, 5), [
    { id: "MC-01", status: "COMPLETED" },
    { id: "MC-02", status: "COMPLETED" },
    { id: "MC-03", status: "COMPLETED" },
    { id: "MC-04", status: "IN_PROGRESS" },
    { id: "MC-05", status: "LOCKED" }
  ]);
  assert.equal(queue.mission_control_sequence.slice(5).every((item) => item.status === "UNAVAILABLE"), true);
  assert.deepEqual(queue.next_allowed_mission, {
    id: "MC-04",
    title: "Mission Queue Read-Only Integration",
    status: "IN_PROGRESS",
    authorized_to_execute_automatically: false
  });
  assert.equal(queue.phase_gates.phase_7_1, "CHECKPOINT");
  assert.equal(queue.phase_gates.phase_7_2, "LOCKED_NOT_STARTED");
});

test("Mission Queue UI and endpoint expose no executable controls", () => {
  assert.match(html, /id="mission-queue-page"/);
  assert.match(html, /id="queue-detail"/);
  assert.match(server, /pathname === "\/local-api\/mission-queue"/);
  assert.match(server, /request\.method !== "GET"/);
  assert.doesNotMatch(html, /<button[^>]*>\s*(Start|Run|Execute|Retry|Cancel|Delete|Deploy|Approve|Unlock|Change priority)\s*<\/button>/i);
  assert.doesNotMatch(queueAdapter + server, /child_process|execFile|spawn\(|exec\(|git add|git commit|git push/);
});

test("update API has an explicit non-blocking failure state", () => {
  assert.match(app, /UPDATE_UNAVAILABLE/);
  assert.match(app, /Mission Control remains available/);
  assert.equal(UPDATE_API_TIMEOUT_MS, 5000);
});

test("update API success validates payload and clears its timer", async () => {
  let cleared = 0;
  const result = await fetchProjectUpdateState({
    url: "https://example.invalid/update",
    fetcher: async () => ({ ok: true, json: async () => ({ id: "u1", status: "CHECKPOINT" }) }),
    now: () => new Date("2026-07-28T12:00:00Z"),
    schedule: () => 7,
    cancel: (timer) => { assert.equal(timer, 7); cleared += 1; }
  });
  assert.equal(result.state, "AVAILABLE");
  assert.equal(result.update.id, "u1");
  assert.equal(cleared, 1);
});

for (const [name, fetcher] of [
  ["HTTP error", async () => ({ ok: false, status: 503 })],
  ["network rejection", async () => { throw new TypeError("network unavailable"); }],
  ["invalid JSON", async () => ({ ok: true, json: async () => { throw new SyntaxError("invalid json"); } })],
  ["malformed payload", async () => ({ ok: true, json: async () => ({ status: "CHECKPOINT" }) })]
]) {
  test(`update API ${name} leaves CHECKING as UPDATE_UNAVAILABLE`, async () => {
    let cleared = 0;
    const result = await fetchProjectUpdateState({
      url: "https://example.invalid/update",
      fetcher,
      schedule: () => 3,
      cancel: () => { cleared += 1; }
    });
    assert.equal(result.state, "UPDATE_UNAVAILABLE");
    assert.equal(result.update, null);
    assert.equal(cleared, 1);
  });
}

test("update API timeout aborts, resolves safely and clears timer", async () => {
  let cleared = 0;
  const controller = new AbortController();
  const result = await fetchProjectUpdateState({
    url: "https://example.invalid/update",
    controller,
    fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }),
    schedule: (callback) => { queueMicrotask(callback); return 11; },
    cancel: (timer) => { assert.equal(timer, 11); cleared += 1; }
  });
  assert.equal(result.state, "UPDATE_UNAVAILABLE");
  assert.equal(controller.signal.aborted, true);
  assert.equal(cleared, 1);
});

test("shell exposes semantic navigation, pages and mobile drawer controls", () => {
  assert.match(html, /<header class="top-status"/);
  assert.match(html, /<aside id="sidebar"/);
  assert.match(html, /aria-controls="sidebar"/);
  assert.match(html, /id="dashboard-page"/);
  assert.match(html, /id="phases-page"/);
  assert.match(html, /id="data-source-page"/);
  for (const label of ["Overview", "Phase Registry", "Mission Queue", "Systems", "Data Sources", "Validation Records", "Activity Log", "Settings"]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
});

test("new conversation policy prohibits automatic unrestricted ingestion", () => {
  assert.equal(localStatus.new_conversations.automatic_import, false);
  assert.match(localStatus.new_conversations.required_process, /metadata review, Alvin approval, incremental indexing and validation/);
  assert.match(localStatus.new_conversations.restriction, /Automatic unrestricted ingestion is disabled/);
  assert.doesNotMatch(JSON.stringify(localStatus), /text_content|message_body|prompt|assistant_response/);
});

test("MC-02 contains no MC-03 implementation or private conversation rendering", () => {
  assert.doesNotMatch(html + app + adapter, /resource-monitor|execute-task|write-memory/i);
  assert.match(readme, /never renders private conversation text/i);
});

test("Phase Registry UI is read-only and exposes no mutation controls", () => {
  assert.match(html, /<dialog id="record-detail"[^>]*aria-labelledby="detail-title"[^>]*>/);
  assert.match(html, /id="record-detail-close"/);
  assert.doesNotMatch(html, />\s*(Edit|Save|Delete|Deploy|Approve)\s*</i);
  assert.match(server, /request\.method !== "GET"/);
  assert.match(server, /READ_ONLY_ENDPOINT/);
});

test("runtime registry contains no private paths or credentials", () => {
  const text = JSON.stringify(registry);
  assert.equal(text.includes("/Users/"), false);
  assert.doesNotMatch(text, /token|credential|private key/i);
});
