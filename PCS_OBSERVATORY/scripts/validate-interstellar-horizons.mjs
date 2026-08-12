#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET_PATH = path.join(ROOT, "data/solar-system/normalized/interstellar-objects-horizons.js");
const OUTPUT_PATH = path.join(ROOT, "test-results/interstellar-objects/authoritative-position-comparison.json");
const HORIZONS = "https://ssd.jpl.nasa.gov/api/horizons.api";
const AU_KM = 149597870.7;
const TOLERANCE_KM = 100;

const CHECKS = [
  ["1I", "2017-09-09T18:00:00 TDB"],
  ["1I", "2017-10-19T12:00:00 TDB"],
  ["2I", "2019-12-08T18:00:00 TDB"],
  ["2I", "2020-01-20T12:00:00 TDB"],
  ["3I", "2025-10-29T18:00:00 TDB"],
  ["3I", "2026-01-10T12:00:00 TDB"]
];

function parseDataset(source) {
  const json = source.match(/Object\.freeze\((\{.*\})\);\}\)\(window\);/s)?.[1];
  if (!json) throw new Error("Could not parse generated interstellar dataset");
  return JSON.parse(json);
}

function jdTdb(epoch) {
  return Date.parse(epoch.replace(" TDB", "Z")) / 86400000 + 2440587.5;
}

function bracket(samples, jd) {
  let low = 0;
  let high = samples.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (samples[middle][0] <= jd) low = middle;
    else high = middle;
  }
  return [samples[low], samples[high]];
}

function interpolate(samples, jd) {
  const [left, right] = bracket(samples, jd);
  const duration = right[0] - left[0];
  const t = (jd - left[0]) / duration;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return [0, 1, 2].map(index => h00 * left[index + 1] + h10 * duration * left[index + 4] + h01 * right[index + 1] + h11 * duration * right[index + 4]);
}

function parseVector(result) {
  const line = result.match(/\$\$SOE\s*([^\n]+)\s*\$\$EOE/)?.[1];
  if (!line) throw new Error("Horizons response did not contain a vector row");
  const values = line.split(",").map(value => value.trim());
  return values.slice(2, 5).map(Number);
}

async function liveVector(record, jd) {
  const target = new URL(HORIZONS);
  const parameters = {
    format: "json", COMMAND: `'DES=${record.provisionalDesignation.replace(/^[AC]\//, "")}'`, EPHEM_TYPE: "'VECTORS'", CENTER: "'500@10'",
    TLIST: jd.toFixed(9), REF_PLANE: "'ECLIPTIC'", REF_SYSTEM: "'ICRF'", OUT_UNITS: "'AU-D'", VEC_TABLE: "'2'", CSV_FORMAT: "'YES'", OBJ_DATA: "'NO'"
  };
  for (const [key, value] of Object.entries(parameters)) target.searchParams.set(key, value);
  const response = await fetch(target);
  if (!response.ok) throw new Error(`Horizons returned ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error);
  return parseVector(payload.result);
}

const dataset = parseDataset(await fs.readFile(DATASET_PATH, "utf8"));
const comparisons = [];
for (const [id, epoch] of CHECKS) {
  const record = dataset.records.find(item => item.id === id);
  const jd = jdTdb(epoch);
  const [cached, authoritative] = await Promise.all([Promise.resolve(interpolate(record.samples, jd)), liveVector(record, jd)]);
  const errorKm = Math.hypot(...cached.map((value, index) => (value - authoritative[index]) * AU_KM));
  comparisons.push({ id, designation: record.officialDesignation, epoch, jdTdb: jd, cachedAu: cached, horizonsAu: authoritative, positionErrorKm: errorKm, toleranceKm: TOLERANCE_KM, pass: errorKm <= TOLERANCE_KM });
}

const report = {
  generatedAt: new Date().toISOString(),
  authority: "NASA/JPL Horizons API live VECTORS",
  method: "Six withheld epochs, not present as cache sample nodes; cubic-Hermite cached position compared with live Sun-centered ICRF/J2000-ecliptic Horizons vectors",
  status: comparisons.every(item => item.pass) ? "PASS" : "FAIL",
  maximumPositionErrorKm: Math.max(...comparisons.map(item => item.positionErrorKm)),
  toleranceKm: TOLERANCE_KM,
  comparisons
};
await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
