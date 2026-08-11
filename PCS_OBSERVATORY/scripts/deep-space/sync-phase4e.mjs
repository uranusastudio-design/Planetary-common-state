import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = path.join(root, "assets/deep-space/phase-4e");
const raw = path.join(base, "raw");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const round = (value) => Number(value.toFixed(6));
const cartesian = (raDeg, decDeg, radius) => {
  const ra = raDeg * Math.PI / 180;
  const dec = decDeg * Math.PI / 180;
  const cosDec = Math.cos(dec);
  return [radius * cosDec * Math.cos(ra), radius * cosDec * Math.sin(ra), radius * Math.sin(dec)].map(round);
};

function build() {
  const contract = readJson(path.join(base, "source-contract.json"));
  for (const [name, expected] of Object.entries(contract.rawChecksums)) {
    assert.equal(sha256(path.join(raw, name)), expected, `${name} checksum mismatch`);
  }
  const planck = readJson(path.join(raw, "planck18-astropy-reference.json"));
  const jades = readJson(path.join(raw, "jades-z14-landmarks.json"));
  const byRedshift = new Map(planck.distanceTable.map((row) => [row.redshift, row]));
  const deployed = readJson(path.join(base, "observable-universe.json"));
  assert.equal(deployed.model.id, contract.coordinateContract.transformVersion);
  assert.equal(deployed.model.ageGyr, planck.cosmology.ageGyr);
  assert.equal(deployed.horizons[1].comovingMpc, planck.particleHorizonComovingMpc);
  assert.equal(deployed.catalogLandmarks.length, jades.records.length);
  for (const record of jades.records) {
    const model = byRedshift.get(record.spectroscopicRedshift);
    const output = deployed.catalogLandmarks.find((item) => item.id === `pcs:jades:${record.id}`);
    assert.ok(model && output, `missing deployed landmark ${record.id}`);
    assert.deepEqual(output.positionIcrsComovingMpc, cartesian(record.raDeg, record.decDeg, model.comovingMpc));
    assert.equal(output.comovingMpc, model.comovingMpc);
    assert.equal(output.lookbackGyr, model.lookbackGyr);
    assert.equal(output.ageGyr, model.ageGyr);
  }
  return deployed;
}

const built = build();
if (process.argv.includes("--check")) {
  console.log(`Phase 4E source contract PASS: ${built.catalogLandmarks.length} catalog landmarks, ${built.epochMarkers.length} epoch markers, ${built.horizons.length} horizons`);
} else {
  console.log(JSON.stringify(built, null, 2));
}

export { build, cartesian };
