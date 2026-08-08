import test from "node:test";
import assert from "node:assert/strict";
import { buildVectorQuery, normalizeResponse, parseVectorResult } from "./horizons-adapter.mjs";

const result = `
Target body name: Earth (399) {source: DE441}
Center body name: Sun (10) {source: DE441}
$$SOE
2461253.500000000, A.D. 2026-Aug-01 00:00:00.0000, 6.307189330803126E-01, -7.952013625186592E-01, 4.366682930385191E-05, 1.319753175635243E-02, 1.062044060527175E-02, -1.353470088421704E-06,
2461254.500000000, A.D. 2026-Aug-02 00:00:00.0000, 6.438273319302041E-01, -7.844691576697970E-01, 4.232069737825702E-05, 1.301865930892158E-02, 1.084353109930575E-02, -1.333326034461979E-06,
$$EOE`;

test("Horizons adapter fixes the authoritative vector contract", () => {
  const request = buildVectorQuery({ command: 399, start: "2026-08-01", stop: "2026-08-03" });
  assert.equal(request.endpoint, "https://ssd.jpl.nasa.gov/api/horizons.api");
  assert.equal(request.fields.EPHEM_TYPE, "'VECTORS'");
  assert.equal(request.fields.CENTER, "'500@10'");
  assert.equal(request.fields.TIME_TYPE, "'TDB'");
  assert.equal(request.fields.REF_SYSTEM, "'ICRF'");
  assert.equal(request.fields.REF_PLANE, "'ECLIPTIC'");
  assert.equal(request.fields.OUT_UNITS, "'AU-D'");
  assert.equal(request.fields.VEC_CORR, "'NONE'");
});

test("Horizons CSV vectors normalize without losing epoch, frame, or velocity", () => {
  const request = buildVectorQuery({ command: 399, start: "2026-08-01", stop: "2026-08-03" });
  const normalized = normalizeResponse({ result, signature: { source: "NASA/JPL Horizons API" } }, request, { objectId: "earth", naifId: 399, retrievedAt: "2026-08-08T13:16:05Z" });
  assert.equal(normalized.catalogEphemeris, "DE441");
  assert.equal(normalized.timeScale, "TDB");
  assert.equal(normalized.referenceSystem, "ICRF");
  assert.equal(normalized.samples.length, 2);
  assert.equal(normalized.samples[0].jdTdb, 2461253.5);
  assert.equal(normalized.samples[0].positionAu.length, 3);
  assert.equal(normalized.samples[0].velocityAuPerDay.length, 3);
});

test("adapter rejects one-sample, malformed, and unsigned responses", () => {
  assert.throws(() => parseVectorResult("$$SOE\n1, date, 1,2,3,4,5,6,\n$$EOE"), /At least two/);
  assert.throws(() => parseVectorResult("missing delimiters"), /no \$\$SOE/);
  const request = buildVectorQuery({ command: 399, start: "2026-08-01", stop: "2026-08-03" });
  assert.throws(() => normalizeResponse({ result, signature: { source: "unknown" } }, request, { objectId: "earth", naifId: 399, retrievedAt: "2026-08-08T13:16:05Z" }), /signature/);
});
