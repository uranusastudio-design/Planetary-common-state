# Solar System SS-02

Status: **In Development — SS-02A validated / frozen; SS-02B–G not started**

Release: **v2.2.0**

Stable baseline: **v2.1.0 Stable / Frozen — unchanged**

Deep Space Phase 4A: **Paused / Not started**

## Scientific rule

SS-02 does not promise zero orbital error. Every position class must identify its authoritative source, requested Display Epoch, source time scale, reference frame, propagation/interpolation method, validity, provenance, and uncertainty or explicit absence of uncertainty. A representative orbit must never be labelled as precision ephemeris.

PCS-generated avoidable visualization error is recorded separately from observational, orbit-solution, model, and interpolation uncertainty.

## Controlled stages

- SS-02A — one Display Epoch; ephemeris/time/frame solution contract; source-adapter boundary.
- SS-02B — Sun, eight planets, major moons, and solid-body LOD.
- SS-02C — dwarf planets and Main Asteroid Belt.
- SS-02D — Kuiper Belt and TNOs.
- SS-02E — comets and meteor-shower relationships.
- SS-02F — synchronized update pipeline, provenance, and machine validation.
- SS-02G — full regression and Release Audit.

Completion of one stage is not completion of SS-02.

## SS-02A implementation

### One Display Epoch

`solar-system-core.js` owns `SolarSystemTimeState`. The Deep Space manager keeps one instance and no parallel mutable `epoch` variable. Playback, ±1-day steps, reset-to-now, public `setEpoch`, planet positions, satellite requests, orbit requests, Object Cards, header time, and provenance UI read this state.

The display scale is UTC. Source ephemeris time scales remain explicit. Horizons vector ingestion is fixed to TDB; PCS does not perform or claim an unimplemented UTC↔TDB precision conversion in the browser.

### Coherent solution selection

`createDisplaySolution(displayEpoch, bodyIds)` selects one solution before any major planet is evaluated:

1. A promoted authoritative cache is eligible only when every requested planet has an interpolation bracket at the epoch.
2. Otherwise, all planets use the same JPL approximate-element model if the epoch is within 1800–2050.
3. Outside validated local coverage, all planet positions and precision orbit lines become unavailable.

The old 2026-08-01 DE441 vectors remain traceable evidence, but `sampleCountPerBody: 1` and `promotionStatus: not-promoted` prevent them from entering the coherent runtime solution.

### Position/orbit identity

Rendered planet bodies use `getStateFromSolution`. Planet orbit lines use `sampleOrbit(..., { solution })`. Orbit entities store the selected `solutionId`, Display Epoch, position mode, reference frame, validity, source, and quality status.

If a complete requested orbit interval extends outside the solution validity, the orbit is not drawn. This is why Uranus and Neptune full-period fallback paths remain hidden at a 2026 center epoch until SS-02B provides adequate authoritative coverage. A convenient partial ellipse is not substituted.

### Horizons source adapter

`scripts/solar-system/horizons-adapter.mjs` builds and validates official Horizons API vector queries and normalizes the signed JSON/text response. Its fixed contract is:

- NASA/JPL Horizons API;
- VECTORS / geometric state (`VEC_CORR=NONE`);
- center `500@10` (Sun center);
- TDB;
- ICRF with J2000 ecliptic reference plane;
- AU and AU/day;
- position and velocity table;
- Gregorian calendar labels;
- at least two samples for interpolation.

Primary references:

- https://ssd-api.jpl.nasa.gov/doc/horizons.html
- https://ssd.jpl.nasa.gov/horizons/manual.html
- https://ssd.jpl.nasa.gov/planets/approx_pos.html

### Provenance display

The existing Solar System time section displays:

- DISPLAY EPOCH;
- SOURCE;
- CATALOG / EPHEMERIS;
- REFERENCE FRAME;
- POSITION MODE;
- LAST DATA UPDATE;
- UNCERTAINTY / QUALITY STATUS.

Labels use the existing four-language runtime state. Values are dataset facts and are not cosmetically translated into different scientific meanings.

### Data boundaries

- Browser runtime contract: `solar-system-core.js`.
- Source adapter: `scripts/solar-system/horizons-adapter.mjs`.
- Raw/cache evidence: currently the legacy cache in `deep-space-ephemeris-cache.js`.
- Normalized manifest: `data/solar-system/ephemeris-manifest.json`.
- Runtime selection/validation: `deep-space-ephemeris.js`.
- Rendering consumer: `deep-space.js`.
- Machine tests: `solar-system-ss02a.test.js` and adapter tests.
- Browser evidence: `test-results/solar-system-ss02a/report.json` after acceptance.

SS-02F will make promotion and keep-last-valid synchronization continuous. SS-02A establishes the non-fabricating contract first.

## Known limitations after SS-02A

- No promoted multi-epoch Horizons planet dataset yet; SS-02B must create and validate it.
- Major moons still use the pre-SS-02 representative mean-orbit path; SS-02B must replace it where authoritative data is available.
- Solid-body LOD is not yet implemented.
- Dwarf planets, small-body populations, TNOs, comets, and meteor-shower relationships are not yet implemented.
- Formal class-specific numerical comparison evidence belongs to SS-02B/F.
- Foundation physical trackpad and real-device gesture evidence remains open and is not closed by synthetic tests.

## SS-02A validation

- 118 Node tests passed across the repository, including nine SS-02A/adapter tests.
- Browser acceptance rendered all eight major planets from one coherent solution at `2026-08-08T12:00:00Z`.
- Six complete fallback orbit intervals (Mercury through Saturn) used the same solution ID as body positions.
- Uranus and Neptune fallback orbits were omitted because a complete period would exceed the 1800–2050 validity interval.
- The legacy 2026-08-01 single sample remained non-promoted.
- A 2100 Display Epoch produced no stale planet or orbit entities and displayed `Unavailable`.
- Traditional Chinese, English, Japanese, and Korean each displayed all seven provenance labels.
- Viewer 1, Cesium canvas 1, total canvas 2, Earth ownership restored, required Console errors 0, required Network failures 0.

Machine-readable evidence: `test-results/solar-system-ss02a/report.json`.

## Freeze boundary

SS-02A is frozen as the base for SS-02B. Changing its public meaning requires an explicit SS-02 architecture revision, migration notes, and rerun of SS-02A validation.
