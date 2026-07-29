import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadCanonicalRegistry } from "./registry-adapter.mjs";

export const MC02_VALIDATION_PATH = "/Users/alvin/PCS-Builds/MC-02-Local-Admin-Shell-Validation-20260728-232440";
export const MC03_VALIDATION_PATH = "/Users/alvin/PCS-Builds/MC-03-Phase-Registry-Validation-20260728-234333";
export const QUEUE_STATUSES = [
  "COMPLETED",
  "IN_PROGRESS",
  "READY",
  "BLOCKED",
  "LOCKED",
  "NOT_STARTED",
  "REQUIRES_REVIEW",
  "UNAVAILABLE"
];

const COMPLETED_LIFECYCLES = new Set(["DEPLOYED", "ARCHIVED"]);
const KNOWN_LIFECYCLES = new Set([
  "DEPLOYED",
  "ARCHIVED",
  "VALIDATED_LOCAL",
  "PUSHED_NOT_DEPLOYED",
  "CHECKPOINT",
  "IN_PROGRESS",
  "NOT_STARTED"
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function verifyValidationArtifact(root, expectedEntries) {
  let manifest;
  try {
    manifest = await readFile(join(root, "SHA256_MANIFEST.txt"), "utf8");
  } catch {
    throw new Error("QUEUE_UNAVAILABLE");
  }
  const lines = manifest.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== expectedEntries) throw new Error("QUEUE_VALIDATION_ARTIFACT_INVALID");
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})  ([^/].*)$/);
    if (!match) throw new Error("QUEUE_VALIDATION_ARTIFACT_INVALID");
    let bytes;
    try {
      bytes = await readFile(join(root, match[2]));
    } catch {
      throw new Error("QUEUE_UNAVAILABLE");
    }
    if (sha256(bytes) !== match[1]) throw new Error("QUEUE_VALIDATION_ARTIFACT_INVALID");
  }
  return {
    root,
    manifest_entries: lines.length,
    manifest_sha256: sha256(Buffer.from(manifest))
  };
}

function queueStatus(record) {
  if (COMPLETED_LIFECYCLES.has(record.status)) return "COMPLETED";
  if (record.status === "IN_PROGRESS") return "IN_PROGRESS";
  if ((record.locks || []).length) return "LOCKED";
  if ((record.blockers || []).length) return "BLOCKED";
  return "UNAVAILABLE";
}

function nextAllowedAction(status) {
  if (status === "COMPLETED") return "NO_ACTION_REQUIRED";
  if (status === "IN_PROGRESS") return "CONTINUE_ONLY_WITH_EXPLICIT_ALVIN_APPROVAL";
  if (status === "BLOCKED") return "RESOLVE_DOCUMENTED_BLOCKERS";
  if (status === "LOCKED") return "REQUIRES_APPROVED_UNLOCK_RECORD";
  return "REQUIRES_REVIEW";
}

function detectDependencyCycle(items) {
  const graph = new Map(items.map((item) => [item.canonical_record_id, item.dependency_ids]));
  const active = new Set();
  const visited = new Set();
  function visit(id) {
    if (active.has(id)) return true;
    if (visited.has(id)) return false;
    active.add(id);
    for (const dependency of graph.get(id) || []) {
      if (visit(dependency)) return true;
    }
    active.delete(id);
    visited.add(id);
    return false;
  }
  return [...graph.keys()].some(visit);
}

export function buildQueueProjection(registry, validationArtifacts = []) {
  if (registry?.schema_version !== "pcs.phase-registry.local-readonly.v1" || !Array.isArray(registry.records)) {
    throw new Error("QUEUE_INVALID");
  }
  if (registry.records.length !== 48 || new Set(registry.records.map((record) => record.id)).size !== 48) {
    throw new Error("QUEUE_INVALID");
  }
  const canonicalIds = new Set(registry.records.map((record) => record.id));
  const items = registry.records.map((record) => {
    if (!KNOWN_LIFECYCLES.has(record.status)) throw new Error("QUEUE_INVALID");
    const dependencyIds = Array.isArray(record.dependencies) ? [...record.dependencies] : [];
    if (dependencyIds.some((id) => !canonicalIds.has(id))) throw new Error("QUEUE_INVALID");
    const status = queueStatus(record);
    return {
      queue_item_id: `QUEUE:${record.id}`,
      canonical_record_id: record.id,
      title: `${record.phase} — ${record.name}`,
      namespace: record.namespace,
      lifecycle_status: record.status,
      queue_status: status,
      priority: "UNAVAILABLE",
      dependency_ids: dependencyIds,
      blockers: Array.isArray(record.blockers) ? [...record.blockers] : [],
      lock_status: record.lock_status || "UNAVAILABLE",
      validation_status: record.validation_status || "UNAVAILABLE",
      deployment_status: record.deployment_status || "UNAVAILABLE",
      source_evidence: {
        source_record_id: record.source_record_id,
        source_record_sha256: record.source_record_sha256,
        source_file: record.source_file,
        validation_artifact: record.validation_artifact,
        evidence: record.evidence
      },
      last_verified_at: record.last_verified_at || null,
      next_allowed_action: nextAllowedAction(status),
      action_authorization_state: status === "COMPLETED" ? "NOT_APPLICABLE" : "HUMAN_APPROVAL_REQUIRED",
      status_basis: status === "UNAVAILABLE"
        ? "Formal queue dependencies, locks or authorization are insufficient to mark READY."
        : `Derived deterministically from lifecycle ${record.status}, explicit blockers and locks.`
    };
  });
  if (new Set(items.map((item) => item.queue_item_id)).size !== items.length) throw new Error("QUEUE_INVALID");
  if (detectDependencyCycle(items)) throw new Error("QUEUE_INVALID");

  const counts = Object.fromEntries(QUEUE_STATUSES.map((status) => [status, 0]));
  items.forEach((item) => { counts[item.queue_status] += 1; });

  return {
    schema_version: "pcs.mission-queue.local-readonly.v1",
    mode: "LOCAL_ADMIN_ONLY",
    access: "READ_ONLY",
    overall_state: "DEGRADED_OR_INCOMPLETE",
    generated_at: registry.generated_at,
    items,
    namespaces: registry.namespaces,
    queue_status_vocabulary: QUEUE_STATUSES,
    counts,
    dependency_validation: {
      references_valid: true,
      cycle_detected: false,
      formal_dependency_records: items.filter((item) => item.dependency_ids.length).length
    },
    priority_policy: "UNAVAILABLE_WHEN_NOT_PRESENT_IN_CANONICAL_SOURCE",
    readiness_policy: "READY_REQUIRES_COMPLETE_DEPENDENCIES_NO_BLOCKERS_NO_LOCK_AND_EXPLICIT_AUTHORIZATION",
    next_allowed_mission: {
      id: "MC-04",
      title: "Mission Queue Read-Only Integration",
      status: "IN_PROGRESS",
      authorized_to_execute_automatically: false
    },
    mission_control_sequence: [
      { id: "MC-01", status: "COMPLETED" },
      { id: "MC-02", status: "COMPLETED" },
      { id: "MC-03", status: "COMPLETED" },
      { id: "MC-04", status: "IN_PROGRESS" },
      { id: "MC-05", status: "LOCKED" },
      ...Array.from({ length: 7 }, (_, index) => ({ id: `MC-${String(index + 6).padStart(2, "0")}`, status: "UNAVAILABLE" }))
    ],
    phase_gates: {
      phase_7_1: "CHECKPOINT",
      phase_7_2: "LOCKED_NOT_STARTED"
    },
    source: {
      registry: registry.source,
      validation_artifacts: validationArtifacts
    }
  };
}

export async function loadMissionQueue({
  registryLoader = loadCanonicalRegistry,
  artifactVerifier = verifyValidationArtifact
} = {}) {
  let registry;
  let artifacts;
  try {
    [registry, artifacts] = await Promise.all([
      registryLoader(),
      Promise.all([
        artifactVerifier(MC02_VALIDATION_PATH, 11),
        artifactVerifier(MC03_VALIDATION_PATH, 13)
      ])
    ]);
  } catch (error) {
    if (/^QUEUE_/.test(error.message)) throw error;
    throw new Error("QUEUE_UNAVAILABLE");
  }
  return buildQueueProjection(registry, artifacts);
}
