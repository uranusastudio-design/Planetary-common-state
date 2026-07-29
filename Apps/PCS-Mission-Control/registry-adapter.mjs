import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const REGISTRY_SOURCE_PATH = "/Users/alvin/PCS-Builds/Phase-Audit-20260728-143437/PHASE_REGISTRY.json";
export const MATRIX_SOURCE_PATH = "/Users/alvin/PCS-Builds/Phase-Audit-20260728-143437/PHASE_STATUS_MATRIX.md";
export const VALIDATION_ARTIFACT_PATH = "/Users/alvin/PCS-Builds/Phase-Audit-20260728-143437";
export const REGISTRY_SOURCE_SHA256 = "2953c43f9290dee575eef76da1a78bdebd9ab407597e459c6760154e4b187dbf";

const FUNCTION_MAP = { Y: "VALIDATED", P: "PARTIAL", N: "NOT_VALIDATED", NA: "NOT_APPLICABLE" };
const DEPLOY_MAP = { Y: "EVIDENCED", P: "PARTIAL", N: "NOT_EVIDENCED", NA: "NOT_APPLICABLE" };

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalRecordHash(record) {
  const ordered = Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key]]));
  return sha256(JSON.stringify(ordered));
}

export function parseStatusMatrix(markdown) {
  const rows = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("|") || line.startsWith("|---") || line.includes("| Phase |")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 10) continue;
    const [id, name, functional, tests, browser, commit, push, deploy, status, blocker] = cells;
    rows.set(id, { id, name, functional, tests, browser, commit, push, deploy, status, blocker });
  }
  return rows;
}

function validationStatus(row) {
  if (!row) return "UNAVAILABLE";
  if (row.tests === "Y" && ["Y", "NA"].includes(row.browser)) return "VALIDATED";
  if ([row.tests, row.browser].includes("P")) return "PARTIAL";
  return "NOT_VALIDATED";
}

export function buildRegistryPayload(registry, matrixText, sourceChecksum = REGISTRY_SOURCE_SHA256) {
  if (registry?.schema_version !== "pcs.phase-registry.v1" || !Array.isArray(registry.records)) {
    throw new Error("REGISTRY_SCHEMA_INVALID");
  }
  if (registry.records.length !== 48) throw new Error("REGISTRY_RECORD_COUNT_INVALID");
  const ids = registry.records.map((record) => record.id);
  if (new Set(ids).size !== 48) throw new Error("REGISTRY_IDS_INVALID");
  const namespaces = [...new Set(registry.records.map((record) => record.namespace))].sort();
  if (namespaces.length !== 7) throw new Error("REGISTRY_NAMESPACE_COUNT_INVALID");
  const matrix = parseStatusMatrix(matrixText);
  if (matrix.size !== 48) throw new Error("REGISTRY_MATRIX_COUNT_INVALID");

  const records = registry.records.map((record) => {
    const evidence = matrix.get(record.id);
    if (!evidence || evidence.status !== record.status) throw new Error(`REGISTRY_EVIDENCE_MISMATCH:${record.id}`);
    return {
      ...record,
      functional_status: FUNCTION_MAP[evidence.functional] || "UNAVAILABLE",
      deployment_status: DEPLOY_MAP[evidence.deploy] || "UNAVAILABLE",
      validation_status: validationStatus(evidence),
      lock_status: "UNAVAILABLE",
      last_verified_at: registry.generated_at || null,
      source_record_id: record.id,
      source_record_sha256: canonicalRecordHash(record),
      source_indicator: "MC-01_AUDIT_VERIFIED",
      source_file: REGISTRY_SOURCE_PATH,
      validation_artifact: VALIDATION_ARTIFACT_PATH,
      dependencies: [],
      locks: [],
      evidence: {
        function: evidence.functional,
        tests: evidence.tests,
        browser: evidence.browser,
        commit: evidence.commit,
        push: evidence.push,
        deploy: evidence.deploy
      }
    };
  });

  return {
    schema_version: "pcs.phase-registry.local-readonly.v1",
    source_schema_version: registry.schema_version,
    mode: "LOCAL_ADMIN_ONLY",
    access: "READ_ONLY",
    generated_at: registry.generated_at || null,
    overall_state: "DEGRADED_OR_INCOMPLETE",
    records,
    namespaces,
    status_vocabulary: registry.status_vocabulary,
    completion_rule: registry.completion_rule,
    aliases_and_conflicts: registry.aliases_and_conflicts,
    phase_7_2_gate: registry.phase_7_2_gate,
    source: {
      kind: "MC-01_AUDIT_ARTIFACT",
      registry_file: REGISTRY_SOURCE_PATH,
      matrix_file: MATRIX_SOURCE_PATH,
      validation_artifact: VALIDATION_ARTIFACT_PATH,
      registry_sha256: sourceChecksum,
      freshness: "SOURCE_VERIFIED"
    }
  };
}

export async function loadCanonicalRegistry() {
  let bytes;
  let matrixText;
  try {
    [bytes, matrixText] = await Promise.all([readFile(REGISTRY_SOURCE_PATH), readFile(MATRIX_SOURCE_PATH, "utf8")]);
  } catch {
    throw new Error("REGISTRY_UNAVAILABLE");
  }
  const checksum = sha256(bytes);
  if (checksum !== REGISTRY_SOURCE_SHA256) throw new Error("REGISTRY_CHECKSUM_INVALID");
  let registry;
  try {
    registry = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("REGISTRY_JSON_INVALID");
  }
  return buildRegistryPayload(registry, matrixText, checksum);
}
