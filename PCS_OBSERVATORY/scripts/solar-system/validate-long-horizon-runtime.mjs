#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const observatory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = name => fs.readFileSync(path.join(observatory, name), "utf8");
const window = {};
window.window = window;
const context = vm.createContext({ window, Date, Math, Object, Map, Number, String, Boolean, Infinity, RangeError, console });
for (const file of ["solar-system-core.js", "data/solar-system/normalized/major-bodies-long-horizon.js", "solar-system-long-horizon.js"])
  vm.runInContext(read(file), context, { filename: file });

const runtime = window.PCSSolarSystemLongHorizon;
const years = [-13199, -10000, -5000, 1, 1000, 1800, 2026, 2050, 2100, 2500, 5000, 7500, 10000, 12000, 15000, 17000, 18000, 19000, 20000, 25000, 50000, 75000, 100000];
const checkpoints = years.map(year => {
  const epoch = runtime.epochFromYear(year), resolved = runtime.resolveSolarSystemTimeProvider(epoch);
  const bodies = Object.fromEntries(runtime.BODY_IDS.map(bodyId => {
    const state = runtime.getBodyState(bodyId, epoch);
    if (!state || !state.positionAu.every(Number.isFinite) || !state.velocityAuPerDay.every(Number.isFinite))
      throw new Error(`Non-finite or missing state for ${bodyId} at AD ${year}`);
    return [bodyId, {
      positionAu: [...state.positionAu], velocityAuPerDay: [...state.velocityAuPerDay],
      heliocentricDistanceAu: state.heliocentricDistanceAu, sourceEpochTdb: state.sourceEpochTdb,
      propagationDaysFromAnchor: state.propagationDaysFromAnchor,
    }];
  }));
  return { year, displayEpoch: epoch.toISOString(), provider: resolved.provider, segmentId: resolved.segment.id,
           fidelityLabel: resolved.segment.fidelityLabel, bodies };
});

const datasetPath = path.join(observatory, "data/solar-system/normalized/major-bodies-long-horizon.js");
const result = {
  schemaVersion: 1,
  status: "CANDIDATE — HUMAN AND PRODUCTION REVIEW REQUIRED",
  datasetId: runtime.dataset.datasetId,
  modelVersion: runtime.dataset.modelVersion,
  generatedAt: new Date().toISOString(),
  datasetSha256: createHash("sha256").update(fs.readFileSync(datasetPath)).digest("hex"),
  bodyIds: runtime.BODY_IDS,
  checkpointCount: checkpoints.length,
  checkpoints,
};
const output = path.join(observatory, "data/analysis/solar-system-long-horizon-runtime-checkpoints.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ output, checkpointCount: checkpoints.length, bodyCount: runtime.BODY_IDS.length, datasetSha256: result.datasetSha256 }, null, 2));
