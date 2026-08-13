import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = name => fs.readFileSync(new URL(name, import.meta.url), "utf8");
const coreContext = { window: {}, console };
coreContext.window.window = coreContext.window;
vm.createContext(coreContext);
vm.runInContext(read("solar-system-core.js"), coreContext, { filename: "solar-system-core.js" });

function fixtureContext() {
  const context = { window: { PCSSolarSystemCore: coreContext.window.PCSSolarSystemCore }, console };
  context.window.window = context.window;
  const gm = [2.959122082855911e-4, 4.9125001948893175e-11, 7.243452332644118e-10, 8.997011392947347e-10, 9.54954882972581e-11, 2.825345909524226e-7, 8.459705993376288e-8, 1.2920249167819694e-8, 1.5243589007842763e-8];
  const state = [];
  for (let index = 0; index < 9; index += 1) state.push(index === 0 ? 0 : index, 0, 0, 0, index === 0 ? 0 : Math.sqrt(gm[0] / index), 0);
  context.window.PCSSolarSystemLongHorizonDataset = Object.freeze({
    generatedAt: "2026-08-13T00:00:00Z",
    modelVersion: "test-v1",
    timeScale: "TDB",
    referenceSystem: "ICRF",
    referencePlane: "ECLIPJ2000",
    referenceFrame: "ICRF/J2000 ecliptic; barycentric integration; heliocentric display",
    gmAu3Day2: gm,
    segments: [
      { id: "de441-test", provider: "AUTHORITATIVE_EPHEMERIS", providerSubtype: "LONG_TERM_EPHEMERIS", startJdTdb: 2460676.5, endJdTdb: 2462502.75, startEpoch: "2025-01-01T00:00:00.000Z", endEpoch: "2030-01-01T00:00:00.000Z", anchors: [[2460676.5, ...state], [2462502.75, ...state]], source: "JPL DE441", catalogEphemeris: "DE441", positionMode: "Long-Term Ephemeris", orbitMode: "N-body", qualityStatus: "test", uncertainty: "test", fidelityLabel: "Authoritative Ephemeris", fidelityDetail: "test", integrator: "test", notice: "test" },
      { id: "pcs-test", provider: "PCS_NUMERICAL_ANALYSIS", providerSubtype: "LONG_TERM_DYNAMICAL_RECONSTRUCTION", startJdTdb: 2462502.75, endJdTdb: 38245309.5, startEpoch: "2030-01-01T00:00:00.000Z", endEpoch: "+100000-01-01T00:00:00.000Z", anchors: [[2462502.75, ...state], [38245309.5, ...state]], source: "PCS", catalogEphemeris: "PCS-NBODY", positionMode: "PCS Numerical Analysis", orbitMode: "N-body", qualityStatus: "model-dependent", uncertainty: "grows", fidelityLabel: "PCS Numerical Dynamical Analysis", fidelityDetail: "not a prediction", integrator: "velocity-Verlet", notice: "test" }
    ]
  });
  vm.createContext(context);
  vm.runInContext(read("solar-system-long-horizon.js"), context, { filename: "solar-system-long-horizon.js" });
  return context.window.PCSSolarSystemLongHorizon;
}

test("resolver exposes only the three approved provider classes", () => {
  const runtime = fixtureContext();
  assert.equal(runtime.resolveSolarSystemTimeProvider(new Date("2026-01-01T00:00:00Z")).provider, "AUTHORITATIVE_EPHEMERIS");
  assert.equal(runtime.resolveSolarSystemTimeProvider(runtime.epochFromYear(5000)).provider, "PCS_NUMERICAL_ANALYSIS");
  const unsupported = new Date(0); unsupported.setUTCFullYear(-13200, 0, 1); unsupported.setUTCHours(0, 0, 0, 0);
  assert.equal(runtime.resolveSolarSystemTimeProvider(unsupported).provider, "UNSUPPORTED");
  assert.deepEqual(Object.keys(runtime.PROVIDERS), ["AUTHORITATIVE_EPHEMERIS", "PCS_NUMERICAL_ANALYSIS", "UNSUPPORTED"]);
});

test("extended-year epochs reach AD 100000 without a JavaScript date clamp", () => {
  const runtime = fixtureContext();
  assert.equal(runtime.epochFromYear(20000).getUTCFullYear(), 20000);
  assert.equal(runtime.epochFromYear(100000).getUTCFullYear(), 100000);
  assert.equal(runtime.publicEpochFromYear(20000).getUTCFullYear(), 20000);
  assert.throws(() => runtime.publicEpochFromYear(20001), /through 20000/);
  assert.match(runtime.epochFromYear(100000).toISOString(), /^\+100000-/);
  assert.throws(() => runtime.epochFromYear(-13200), /-13199 \(13200 BCE\) through 100000/);
  assert.throws(() => runtime.epochFromYear(100001), /-13199 \(13200 BCE\) through 100000/);
});

test("barycentric numerical state is converted to a finite heliocentric display state", () => {
  const runtime = fixtureContext(), state = runtime.getBodyState("earth", new Date("2026-01-01T00:00:00Z"));
  assert.equal(state.provider, "AUTHORITATIVE_EPHEMERIS");
  assert.equal(state.positionAu.length, 3);
  assert.ok(state.positionAu.every(Number.isFinite));
  assert.ok(state.velocityAuPerDay.every(Number.isFinite));
  assert.ok(state.heliocentricDistanceAu > 0);
  assert.equal(state.integrator, "test");
  assert.equal(state.modelVersion, "test-v1");
  assert.match(state.validityRange, /2025.*2030/);
});

test("the browser interpolator is gravitational and not fixed-period screen animation", () => {
  const runtime = fixtureContext(), initial = Array(54).fill(0), gm = Array(9).fill(0);
  gm[0] = 2.959122082855911e-4;
  initial[6] = 1;
  initial[10] = Math.sqrt(gm[0]);
  const final = runtime.integrate(initial, 30, { gm, maxStepDays: 1 });
  assert.notEqual(final[6], initial[6]);
  assert.notEqual(final[7], initial[7]);
  assert.ok(final.every(Number.isFinite));
  assert.doesNotMatch(read("solar-system-long-horizon.js"), /constantPeriod|screen-coordinate|theta\s*=\s*theta0/);
});

test("public controls stop at AD 20000 while research diagnostics retain experimental AD 100000", () => {
  const manager = read("deep-space.js"), html = read("index.html"), ephemeris = read("deep-space-ephemeris.js");
  assert.match(manager, /\[-13199,-10000,-5000,1,1000,1800,2050,2100,2500,5000,7500,10000,15000,17000,17191,18000,19000,20000\]/);
  assert.match(manager, /\[1,10,100,1000\]/);
  assert.match(manager, /data-ds-custom-year/);
  assert.match(manager, /min=\"-13199\"/);
  assert.match(manager, /max=\"20000\"/);
  assert.match(manager, /LongHorizon\.publicEpochFromYear/);
  assert.doesNotMatch(manager, /data-ds-year=\"100000\"/);
  assert.doesNotMatch(manager, /Supported major-planet playback: 1800–2050/);
  assert.match(html, /solar-system-long-horizon\.js/);
  assert.match(ephemeris, /LongHorizon\?\.solutionMetadata/);
  const runtime = fixtureContext(), diagnostics = runtime.diagnostics(runtime.epochFromYear(100000));
  assert.equal(runtime.PUBLIC_LIMITS.maxYear, 20000);
  assert.equal(runtime.RESEARCH_LIMITS.maxYear, 100000);
  assert.equal(diagnostics.experimentalResearchLabel, "EXPERIMENTAL LONG-HORIZON RECONSTRUCTION");
});

test("release generator records orbital residuals, convergence and boundary continuity", () => {
  const generator = read("scripts/solar-system/build-long-horizon.py");
  for (const field of ["orbitalPhaseErrorDeg", "semiMajorAxisDifferenceAu", "eccentricityDifference", "inclinationDifferenceDeg", "timestepConvergence", "providerBoundaryContinuity", "boundedBrowserInterpolation"])
    assert.match(generator, new RegExp(field));
  assert.match(generator, /OFFICIAL_MD5/);
  assert.match(generator, /checksum mismatch/i);
});

test("major-planet Object Cards retain active provider and model diagnostics", () => {
  const cards = read("unified-object-card.js"), runtime = read("solar-system-long-horizon.js"), manager = read("deep-space.js");
  assert.match(cards, /state\.provider===\"AUTHORITATIVE_EPHEMERIS\"\?\"ephemeris-derived\":\"model-integrated\"/);
  assert.match(cards, /integrationMethod:state\.integrator/);
  assert.match(cards, /modelVersion:state\.modelVersion/);
  assert.match(runtime, /validityRange:/);
  assert.match(runtime, /uncertainty: segment\.uncertainty/);
  assert.match(manager, /solarSolution\.provider===LongHorizon\?\.PROVIDERS\?\.PCS_NUMERICAL_ANALYSIS/);
  assert.match(manager, /level:\"C\"/);
  assert.match(manager, /\/long-term\/i\.test\(solarSolution\.fidelityLabel\)/);
  assert.match(manager, /canonicalName:\"Authoritative Long-Term Ephemeris\"/);
  assert.match(manager, /\"PCS · N-body\"/);
  assert.match(manager, /if\(scaleContext===\"solar\"\)updateSolarMetadata\(\)/);
});
