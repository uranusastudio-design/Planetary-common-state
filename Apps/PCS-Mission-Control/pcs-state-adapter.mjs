import { exec } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { readFile } from "node:fs/promises";
import { NORMALIZERS } from "./normalization.mjs";

const WEIGHTS_PATH = fileURLToPath(new URL("./weights.json", import.meta.url));
async function loadWeights() {
  try {
    const text = await readFile(WEIGHTS_PATH, "utf-8");
    return JSON.parse(text).weights || {};
  } catch { return {}; }
}

const execp = promisify(exec);
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

const PCS_LATEST = "https://pcs-backend.uranusastudio.workers.dev/latest";
const PCS_UPDATE = "https://pcs-backend.uranusastudio.workers.dev/api/project-updates/latest";
const TIMEOUT_MS = 5000;

async function recentGitEvents(limit = 5) {
  try {
    const { stdout } = await execp(
      `git -C "${REPO_ROOT}" log -${limit} --pretty=format:'%h|%s|%aI|%an'`,
      { timeout: 3000 }
    );
    return stdout.trim().split("\n").filter(Boolean).map(line => {
      const [sha, subject, time, author] = line.split("|");
      return {
        source: `Git · ${author || "unknown"}`,
        type: "GIT_COMMIT",
        text: `${sha} — ${subject}`,
        time
      };
    });
  } catch {
    return [];
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadPcsState() {
  const [latest, update, gitEvents] = await Promise.allSettled([
    fetchWithTimeout(PCS_LATEST),
    fetchWithTimeout(PCS_UPDATE),
    recentGitEvents(5)
  ]);

  const latestData = latest.status === "fulfilled" ? latest.value : null;
  const updateData = update.status === "fulfilled" ? update.value?.update : null;

  const pcsState = latestData?.pcs_state ?? null;
  const projections = latestData?.projections ?? {};
  const observations = latestData?.observations ?? [];

  const weights = await loadWeights();
  const residuals = [
    { key: "L_T", label: "Thermal",       unit: "°C anomaly", source_hint: "NASA CERES · ERA5 · NOAA" },
    { key: "L_F", label: "Flow",          unit: "Sv",         source_hint: "ERA5 Wind · Argo · Copernicus" },
    { key: "L_C", label: "Chemical",      unit: "ppm CO₂",    source_hint: "NOAA GML CO₂ · CH₄" },
    { key: "L_I", label: "Informational", unit: "Index",      source_hint: "MODIS NDVI · GBIF · Land Cover" },
    { key: "L_S", label: "Structural",    unit: "%",          source_hint: "GRACE · ICESat-2 · NSIDC" }
  ].map(({ key, label, unit, source_hint }) => {
    const value = projections[key] ?? null;
    const obs = observations.find((o) => o.residual_group?.toLowerCase() === label.toLowerCase());
    const raw = value !== null ? value : (obs?.value ?? null);
    const normalizer = NORMALIZERS[key];
    const normalized = normalizer ? normalizer(raw) : null;
    return {
      id: key,
      key,
      label,
      unit,
      raw,
      value: raw,
      normalized,
      weight: weights[key] ?? 1.0,
      source: obs?.source_name ?? null,
      source_hint,
      updated_at: obs?.timestamp ?? null,
      timestamp: obs?.timestamp ?? null,
      status: raw != null ? "available" : "waiting"
    };
  });

  const normalizedContributors = residuals.filter(r => typeof r.normalized === "number");
  const weightedSum = normalizedContributors.reduce((a, r) => a + (r.normalized * r.weight), 0);
  const weightSum   = normalizedContributors.reduce((a, r) => a + r.weight, 0);
  const computedL = weightSum > 0 ? weightedSum / weightSum : null;

  const availableRawCount = residuals.filter(r => r.raw != null).length;
  const isDevelopment = computedL == null && availableRawCount > 0;

  const formula = "L(t) = Σ(normalized_i · weight_i) / Σ available weights";

  return {
    schema_version: "pcs.mission-control.pcs-state.v3",
    checked_at: new Date().toISOString(),
    l_value: {
      value: computedL,
      status: computedL != null ? "OFFICIAL" : (isDevelopment ? "NORMALIZATION_PENDING" : "NO_DATA"),
      display: computedL != null ? computedL.toFixed(3) : "Normalization Pending",
      formula,
      contributors: normalizedContributors.map(r => r.key),
      contributor_count: normalizedContributors.length,
      total_domains: residuals.length,
      raw_available: availableRawCount,
      label: computedL != null ? "PCS Unified Constraint Index" : "Development Value",
      note: computedL != null
        ? "Official PCS Unified Constraint Index."
        : "Normalization functions return null pending Alvin's approved physical mappings per residual (see normalization.mjs). Raw values shown for reference only — never averaged."
    },
    residuals,
    activity: [
      updateData ? {
        source: "GPT Agent",
        type: "PCS_UPDATE",
        text: `${updateData.phase ?? ""} · ${updateData.status ?? ""} — ${updateData.title_zh ?? updateData.title_en ?? ""}`.replace(/^·\s*/, ""),
        time: updateData.published_at ?? null
      } : null,
      ...(gitEvents.status === "fulfilled" ? gitEvents.value : [])
    ].filter(Boolean).sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 12),
    source_status: latestData ? "AVAILABLE" : "UNAVAILABLE"
  };
}
