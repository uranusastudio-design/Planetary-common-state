const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const root = __dirname;
const read = name => fs.readFileSync(`${root}/${name}`, "utf8");

function runtime() {
  const window = {};
  const context = vm.createContext({ window, console, Date, Math, Object, RangeError, Number, String, Boolean, Infinity });
  for (const name of ["deep-space-registry.js", "solar-system-core.js", "deep-space-ephemeris-cache.js", "deep-space-ephemeris.js"]) vm.runInContext(read(name), context);
  return window;
}

test("SS-02A owns one mutable UTC Display Epoch state", () => {
  const { PCSSolarSystemCore: core } = runtime();
  const state = new core.SolarSystemTimeState("2026-08-08T00:00:00Z");
  const initial = state.snapshot();
  state.advance(core.DAY_MS, "test-step");
  const next = state.snapshot();
  assert.equal(initial.displayTimeScale, "UTC");
  assert.equal(initial.ephemerisTimeScale, "TDB");
  assert.equal(next.displayEpoch, "2026-08-09T00:00:00.000Z");
  assert.equal(next.revision, 1);
  assert.equal(next.reason, "test-step");
  assert.throws(() => state.set("not-a-date"), /Invalid Solar System display epoch/);
});

test("all eight planets resolve through one coherent solution for one requested epoch", () => {
  const { PCSDeepSpaceRegistry: registry, PCSDeepSpaceEphemeris: ephemeris } = runtime();
  const epoch = "2026-08-08T12:00:00Z";
  const solution = ephemeris.createDisplaySolution(epoch, registry.PLANET_IDS);
  const states = registry.PLANET_IDS.map(id => ephemeris.getStateFromSolution(solution, id, epoch));
  assert.equal(solution.coherent, true);
  assert.equal(solution.id, "jpl-approximate-elements-1800-2050");
  assert.equal(solution.positionMode, "Approximate elements · propagated");
  assert.equal(solution.referenceSystem, "ICRF");
  assert.equal(solution.displayTimeScale, "UTC");
  assert.equal(solution.ephemerisTimeScale, "TDB");
  assert.deepEqual([...solution.bodyIds], [...registry.PLANET_IDS]);
  assert.equal(new Set(states.map(state => state.solutionId)).size, 1);
  assert.ok(states.every(state => state.epoch === "2026-08-08T12:00:00.000Z"));
  assert.ok(states.every(state => state.positionAu.every(Number.isFinite)));
});

test("single-epoch Horizons evidence is not promoted or mixed into body/orbit state", () => {
  const { PCSDeepSpaceRegistry: registry, PCSDeepSpaceEphemerisCache: cache, PCSDeepSpaceEphemeris: ephemeris } = runtime();
  const epoch = "2026-08-01T00:00:00Z";
  const directEvidence = ephemeris.getCachedEphemeris("earth", epoch);
  const solution = ephemeris.createDisplaySolution(epoch, registry.PLANET_IDS);
  const earth = ephemeris.getStateFromSolution(solution, "earth", epoch);
  const orbit = ephemeris.sampleOrbit("earth", epoch, { solution, sampleDensity: 48 });
  assert.equal(cache.manifest.promotionStatus, "not-promoted");
  assert.equal(cache.manifest.sampleCountPerBody, 1);
  assert.equal(directEvidence.dataStatus, "ephemeris-derived");
  assert.equal(solution.authoritative, false);
  assert.equal(earth.dataStatus, "approximate");
  assert.ok(orbit.length > 24);
  assert.ok(orbit.every(sample => sample.solutionId === solution.id));
  assert.ok(orbit.every(sample => sample.dataStatus === "approximate"));
});

test("epochs outside validated local coverage become unavailable instead of extrapolated", () => {
  const { PCSDeepSpaceRegistry: registry, PCSDeepSpaceEphemeris: ephemeris } = runtime();
  for (const epoch of ["1750-01-01T00:00:00Z", "2100-01-01T00:00:00Z"]) {
    const solution = ephemeris.createDisplaySolution(epoch, registry.PLANET_IDS);
    assert.equal(solution.positionMode, "Unavailable");
    assert.equal(solution.qualityStatus, "Requested epoch is outside validated local coverage");
    assert.equal(ephemeris.getStateFromSolution(solution, "earth", epoch), null);
    assert.deepEqual([...ephemeris.sampleOrbit("earth", epoch, { solution, sampleDensity: 48 })], []);
  }
});

test("precision orbit samples use the same solution as rendered body positions", () => {
  const { PCSDeepSpaceRegistry: registry, PCSDeepSpaceEphemeris: ephemeris } = runtime();
  const epoch = "2026-08-08T00:00:00Z";
  const solution = ephemeris.createDisplaySolution(epoch, registry.PLANET_IDS);
  for (const id of ["mercury", "venus", "earth", "mars", "jupiter", "saturn"]) {
    const state = ephemeris.getStateFromSolution(solution, id, epoch);
    const orbit = ephemeris.sampleOrbit(id, epoch, { solution, sampleDensity: 36 });
    assert.equal(state.solutionId, solution.id);
    assert.ok(orbit.length > 24, `${id} orbit unavailable inside solution validity`);
    assert.ok(orbit.every(sample => sample.solutionId === solution.id));
  }
  for (const id of ["uranus", "neptune"]) {
    assert.deepEqual([...ephemeris.sampleOrbit(id, epoch, { solution, sampleDensity: 36 })], [], `${id} must not draw a partial orbit outside fallback validity`);
  }
});

test("Solar System provenance UI exposes all required fields in four languages", () => {
  const manager = read("deep-space.js");
  for (const key of ["displayEpoch", "source", "catalogEphemeris", "referenceFrame", "positionMode", "lastDataUpdate", "qualityStatus"]) {
    assert.equal((manager.match(new RegExp(`${key}:`, "g")) || []).length >= 4, true, `${key} missing four-language labels`);
  }
  assert.match(manager, /data-solar-field="\$\{key\}"/);
  assert.match(manager, /new SolarCore\.SolarSystemTimeState/);
  assert.match(manager, /Eph\.createDisplaySolution\(epoch,PLANETS\)/);
  assert.match(manager, /Eph\.sampleOrbit\(id,epoch,\{solution:solarSolution/);
  assert.doesNotMatch(manager, /let [^;]*\bepoch=/);
});
