# Solar System SS-02

Status: **SS-02G reopened — corrective local re-audit passed; SS-02 not frozen pending human visual confirmation**

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

SS-02F provides the periodic promotion and keep-last-valid synchronization path. SS-02A established the non-fabricating contract first.

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

## SS-02B implementation

### UTC→TDB and promoted Horizons vectors

`solar-system-core.js` now converts the one UTC Display Epoch to JDTDB with the official NAIF `naif0012.tls` DELTET constants and leap-second table. Dates before 1972 are rejected by this converter. Dates beyond the locally validated leap-second horizon are labelled `future-leap-second-unverified` and cannot select the promoted authoritative solution until the LSK is refreshed. PCS does not treat JavaScript UTC as TDB.

The reproducible `scripts/solar-system/sync-major-bodies.mjs` adapter fetched geometric position and velocity vectors from the official Horizons API for 2025-01-01 through 2028-01-01. It preserves:

- gzip raw responses and SHA-256 hashes under `data/solar-system/raw/horizons-de441/`;
- one normalized, deterministic runtime dataset under `data/solar-system/normalized/`;
- exact target, center, interval, time scale, frame, source solution, retrieval time, sample count, checksum, and promotion state in `ephemeris-manifest.json`.

All eight planets are Sun-centred. The eleven exposed major satellites are parent-centred: Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Enceladus, Titan, Titania, and Triton. Target-specific Horizons solutions are retained instead of being relabelled universally as DE441. Titania orbital positioning was updated; its deferred surface-image/projection issue was not modified.

The runtime uses cubic Hermite interpolation of the same authoritative position and velocity vectors. A planet body and its orbit samples share the promoted solution. Satellite mean-orbit positioning is disabled; outside promoted coverage a satellite position is `Unavailable`, not silently representative.

### Validation and tolerances

`scripts/solar-system/validate-major-bodies.mjs` makes independent direct Horizons VECTORS queries at epochs withheld from the cache grid. It compares the PCS interpolated state with the reference state in kilometres. Tolerances are declared per object and tied to that object's sampling cadence; there is no universal tolerance.

The first candidate failed its gate because outer-planet and fast-moon sampling was too sparse. PCS shortened the intervals and reran synchronization rather than relaxing the tolerance. The promoted candidate passed 46 comparisons: three epochs for every planet and two for every major satellite. Evidence records epoch, JDTDB, object, source solution, both positions, difference, unit, tolerance, basis, and pass/fail.

Machine-readable evidence: `test-results/solar-system-ss02b/authoritative-position-comparison.json`.

### Solid-body LOD

Every named Sun/planet/moon entity has an overlapping LOD contract:

1. distant coloured point;
2. distance-scaled intermediate point marker;
3. coloured solid ellipsoid before the point disappears.

The point and sphere distance ranges overlap, so selection never produces a label-only gap. Physical mean radius, display radius, their scale ratio, and whether the display radius is enlarged or compressed are stored separately on the entity. Scientific mode uses physical radii; exhibition mode explicitly uses adjusted display radii. No white placeholder material is used.

### SS-02B validation result

- 46/46 authoritative withheld-epoch comparisons passed.
- 117 repository Node tests passed.
- Browser acceptance confirmed one coherent authoritative eight-planet solution and all eleven parent-relative satellite states at `2026-08-08T12:41:00Z`.
- Traditional Chinese, English, Japanese, and Korean provenance labels passed.
- Ten open/close lifecycle cycles: Viewer 1, Cesium canvas 1, total canvas 2, primitive growth 0, temporary DataSource removed, Earth ownership restored.
- Required Console exceptions 0; required Network failures 0.

Machine-readable browser evidence: `test-results/solar-system-ss02b/report.json`.

Known limits after SS-02B:

- authoritative cache coverage is 2025–2028, not an all-history ephemeris;
- Horizons VECTORS supplies no covariance in this query mode; PCS reports measured interpolation difference separately from orbital-solution uncertainty;
- planet fallback remains the explicitly approximate JPL 1800–2050 model when the promoted cache is ineligible;
- small bodies, dwarf planets, belts, TNOs, comets, and meteor showers belong to SS-02C–E;
- continuous keep-last-validated synchronization policy is completed in SS-02F.

## SS-02C implementation

### Dwarf planets

Ceres, Pluto, Eris, Haumea, and Makemake are sourced from the official NASA/JPL SBDB lookup API. Each record retains SPK-ID, designation, orbit class/solution, individual JDTDB osculating-element epoch, elements, formal element sigmas where supplied, condition code, observation arc, observation count, absolute magnitude, and physical diameter only when SBDB supplies it.

Their displayed 2025–2028 positions use a separate official Horizons vector cache and cubic-Hermite interpolation at the one Solar System Display Epoch. This prevents Pluto's older SBDB element epoch from masquerading as a current precision position. Physical diameter is unavailable in the deployed SBDB record for Pluto, Eris, Haumea, and Makemake; PCS renders coloured selectable points and Object Cards say `Unavailable`. It does not invent sphere sizes. Ceres has a sourced diameter and may resolve to a sphere.

### Main Asteroid Belt

The Main Belt is not a ring. The official SBDB Query API returns the deterministic selection:

- orbit class `MBA`;
- absolute magnitude `H < 13`;
- sorted by `H,pdes`;
- full-precision output fields;
- 5,366 matching catalog records at synchronization time.

Ceres is represented once in the dwarf registry and excluded from the belt point collection, leaving 5,365 unique batched points. The UI identifies this as a `Main Belt catalog subset`, not the complete SBDB and not a density claim about unseen objects.

Every point retains its own SBDB solution epoch and is positioned by disclosed two-body propagation from its osculating elements. This is `catalog-derived propagated position`, not a numerical planetary ephemeris. The visual model difference is validated and reported separately from SBDB formal element uncertainty.

Adaptive LOD is deterministic: far 256, medium 1,024, near 5,365. One Cesium `PointPrimitiveCollection` is reused; there is no DOM node or Entity per belt object, no random sampling, and one camera `moveEnd` listener is removed on disposal.

### SS-02C pipeline and validation

`sbdb-adapter.mjs` owns official query/lookup normalization. `sync-small-bodies.mjs` writes compressed raw responses, query URLs, checksums, normalized catalog, last successful synchronization, and promotion manifest. The first candidate failed because Pluto's 10-day vector interval caused about 6,700 km interpolation error; it was regenerated at one-day cadence. The validation also respects the frozen UTC→TDB leap-second horizon rather than claiming future authoritative conversion.

The promoted candidate passed 27 direct Horizons comparisons:

- five dwarf planets × three withheld epochs;
- Vesta, Pallas, Hygiea and three deterministic belt samples × two epochs.

Dwarf tolerances are object/cadence-specific. Belt tolerances are object-specific `a × AU × 5×10⁻⁵` representative-visualization ceilings. That ceiling measures PCS two-body model error; it is not observational/orbital uncertainty and is shown in every evidence row.

Validation result:

- 27/27 authoritative comparisons passed;
- 123 repository Node tests passed;
- five dwarf Object Cards and all four runtime languages passed;
- LOD 256 → 5,365 passed without catalog duplication;
- ten open/close cycles removed the temporary DataSource, batched belt primitive, and camera listener;
- Viewer 1, Cesium canvas 1, total canvas 2, required Console 0, required Network 0, Earth ownership restored.

Evidence: `test-results/solar-system-ss02c/authoritative-position-comparison.json` and `test-results/solar-system-ss02c/report.json`.

## SS-02D implementation

### Known-catalog TNO layer

The Kuiper Belt is not rendered as a solid ring or asserted exact density model. `sync-tno.mjs` queries the official NASA/JPL SBDB Query API for orbit class `TNO`, requests full-precision orbital fields, and normalizes records into a stable ordering: defined absolute magnitude ascending, then primary designation; records without `H` follow. The synchronized snapshot contained 7,160 upstream rows.

Four named dwarf-planet SPK-IDs already owned by the SS-02C dwarf registry are excluded from the TNO primitive, and one record lacking the complete propagated-element contract is retained in the manifest exclusion list. The deployed known-catalog layer therefore contains 7,155 unique TNO points. Across the dwarf/TNO registries there are 7,160 unique SPK-IDs and no catalog duplication.

Every rendered record keeps its SBDB solution epoch in JDTDB, J2000 ecliptic heliocentric osculating elements, formal element sigmas where supplied, orbit condition code, data arc, observation count, and source provenance. Displayed positions use the disclosed two-body propagation shared with SS-02C. They are labelled `catalog-derived propagated position`, not numerical ephemerides. A representative population is explicitly `Unavailable`; PCS generates no synthetic belt or random points.

### Adaptive rendering and lifecycle

The layer uses one Cesium `PointPrimitiveCollection`. Stable LOD limits are 256 far, 1,024 medium, and 7,155 near. Ordering and membership do not change per frame. One camera `moveEnd` listener updates LOD and is removed by `dispose`; the primitive collection is removed on every Deep Space close. The existing single Viewer, Cesium clock, selection path, Unified Object Card, language state, and Solar System Display Epoch are reused.

### SS-02D pipeline and validation

`buildOrbitClassQuery` extends the existing SBDB adapter without a second source system. `sync-tno.mjs` writes the compressed raw response, normalized browser dataset, query/selection metadata, checksums, exclusion lists, last successful synchronization, and candidate manifest. `validate-tno.mjs` independently queries Horizons VECTORS for five important named TNOs plus deterministic catalog samples at two epochs and promotes only a passing candidate.

The 16 direct-Horizons comparisons passed. Each row records PCS and reference position, difference in kilometres, and an object-specific `a × AU × 5×10⁻⁵` short-window two-body visualization ceiling. This ceiling measures PCS propagation-model difference; it is not SBDB observational uncertainty and is not reused as a universal tolerance for other object classes.

Validation result:

- 16/16 authoritative comparisons passed;
- 128 repository Node tests passed;
- 7,155 known-catalog TNOs, deterministic LOD 256 → 7,155, Sedna Object Card, and four-language terminology passed;
- ten open/close cycles removed the temporary DataSource, both small-body primitive collections, and their camera listeners;
- Viewer 1, Cesium canvas 1, total canvas 2, required Console 0, required Network 0, Earth ownership restored.

Evidence: `test-results/solar-system-ss02d/authoritative-position-comparison.json` and `test-results/solar-system-ss02d/report.json`.

## SS-02E implementation

### Priority comet catalog

SS-02E deploys a deliberately bounded, deterministic subset of nine periodic or scientifically important comets: 1P/Halley, 2P/Encke, 8P/Tuttle, 21P/Giacobini–Zinner, 55P/Tempel–Tuttle, 67P/Churyumov–Gerasimenko, 96P/Machholz 1, 109P/Swift–Tuttle, and C/1861 G1 (Thatcher). The UI and manifest say this is a priority subset, not the complete comet catalog.

`sync-comets.mjs` retrieves each current JPL SBDB solution with full-precision elements, formal sigmas, orbit ID, solution date, observation arc/count, physical properties where supplied, aliases, and cometary non-gravitational model parameters. It separately requests Horizons VECTORS using closest-apparition/non-fragment selection and stores 2025–2028 heliocentric vectors. Most use three-day cadence; 21P uses one-day cadence after the first three-day candidate failed its withheld-epoch ceiling. Runtime positions use cubic-Hermite interpolation at the same Solar System Display Epoch.

No comet orbit line is drawn: the deployed position cache is not silently converted into a convenient full-period ellipse. Object Cards expose eccentricity, inclination, perihelion, meaningful aphelion, period, source perihelion passage, solution epoch, source, quality fields, and missing values. The deployed SBDB solutions do not directly provide a future calendar perihelion for these records; PCS reports `Unavailable` and does not manufacture one by adding nominal periods to historical passages. Non-gravitational parameters are preserved and disclosed even though the out-of-coverage two-body fallback does not apply them.

One batched `PointPrimitiveCollection` renders the nine comet positions. There is no Entity per comet, no extra animation loop, and no comet camera listener.

### Meteor-shower relationship layer

Meteor showers are not rendered as orbiting bodies. Nine annual events use IAU MDC identifiers, International Meteor Organization 2026 activity/radiant values, and NASA/IMO parent-body references: April Lyrids, Eta Aquariids, Southern Delta Aquariids, Perseids, Draconids, Orionids, Leonids, Geminids, and Ursids.

Each relationship card records activity window, typical peak, radiant, entry speed, parent comet/asteroid, annual Earth–meteoroid-stream intersection, sources, and confidence/status. Southern Delta Aquariids → 96P/Machholz is explicitly `proposed / uncertain`. Geminids → (3200) Phaethon is qualified because stream origin remains under study. Activity windows are calendar guidance, not exact real-time predictions.

Primary references:

- NASA/JPL SBDB API and Horizons API;
- IAU Meteor Data Center / Meteor Shower Nomenclature Working Group;
- International Meteor Organization 2026 Meteor Shower Calendar;
- NASA meteor-shower and parent-body references recorded per relationship.

### SS-02E validation result

- 18/18 independent direct-Horizons comet comparisons passed at two withheld epochs;
- object-specific 0.5–2 km interpolation ceilings were used; they measure PCS cache interpolation, not observational/orbit uncertainty;
- 134 repository Node tests passed;
- Halley cached-vector state/Object Card, the uncertain Southern Delta Aquariids parent disclosure, all nine event cards, and four-language terminology passed;
- ten open/close cycles removed the temporary DataSource and all three small-body point collections;
- Viewer 1, Cesium canvas 1, total canvas 2, required Console 0, required Network 0, Earth ownership restored.

Evidence: `test-results/solar-system-ss02e/authoritative-position-comparison.json` and `test-results/solar-system-ss02e/report.json`.

## SS-02F implementation

### Isolated synchronization and promotion

`sync-solar-system.mjs` orchestrates the existing authoritative adapters as one bounded periodic job: major bodies → dwarf planets/Main Belt → TNOs → priority comets → meteor-shower relationship validation. It builds in a temporary candidate tree and does not mutate deployed scientific artifacts during ingestion or validation. Every manifest must be `validated-promoted` with zero failures before publication.

Promotion first stages the complete candidate file set, then exchanges raw snapshots, normalized browser datasets, manifests, machine-readable comparisons, and sync-status artifacts as one rollback-capable transaction. A missing candidate, failed validation, upstream/API error, or file exchange error retains or restores the complete last validated deployed set. Failures are disclosed as `stale` with `failedAt` and a bounded error message; no replacement values are fabricated.

### Runtime status and update policy

`data/solar-system/sync-status.json` and its browser module record four promoted datasets, source, record counts, validation-comparison counts, last successful synchronization, periodic update policy, and keep-last-validated fallback. The UI and Unified Object Cards expose this timestamp in the existing four-language state. `Periodic catalog synchronization` is deliberately not described as real-time.

The successful SS-02F full run synchronized 19 major bodies, five named dwarf planets, 5,365 Main Belt points, 7,155 known-catalog TNO points, nine priority comets, and nine meteor-shower relationships. It passed 46 + 27 + 16 + 18 independent position comparisons and seven event-relationship checks before promoting 47 artifacts including 32 compressed raw snapshots.

### SS-02F validation result

- 144 repository Node tests passed, including candidate isolation, completion-time semantics, stale-state retention, exact-file atomic replacement, set-promotion rollback, and non-real-time status disclosure;
- browser acceptance exposed the validated four-dataset status, last-success timestamp, and all four runtime languages;
- ten open/close cycles preserved Viewer 1, Cesium canvas 1, total canvas 2, Earth ownership, and complete DataSource/primitive cleanup;
- required Console errors 0 and required Network failures 0.

Evidence: `test-results/solar-system-ss02f/meteor-shower-validation.json` and `test-results/solar-system-ss02f/report.json`.

## SS-02G Release Audit

The prior SS-02G completion/freeze claim was revoked after human production-equivalent visual inspection found that the Solar System camera framed the body entities off-screen and that the remaining Cesium skybox still presented streak-like star imagery. The corrective audit now independently validates mathematical ephemerides and visible rendered bodies.

Corrective local result: 154/154 Node tests and 107/107 authoritative position comparisons passed. Real-WebGL screenshots visibly contain the Sun, all eight planets, required focused moon systems, selected dwarf/small bodies, both catalog belts, and a selected comet with a source-derived orbit. Drag and wheel-zoom captures contain no streak renderer, primitive, control, setting, listener, tail, or streak-like skybox. Ten open/close cycles preserve the single Viewer/canvas contract without primitive, DataSource, or listener growth. Human visual confirmation remains open.

Full decision, evidence, limitations, and open boundaries: `docs/SOLAR_SYSTEM_SS02_RELEASE_AUDIT.md`.

## Reopened boundary

SS-02A–F scientific-data validation remains intact, but SS-02G is reopened and aggregate SS-02 is not frozen. Commit, push, and GitHub Pages deployment of the corrective work were authorized explicitly on 2026-08-09; post-deployment human visual confirmation is still required before refreezing SS-02G. v2.2.0 remains Preview, the separate Foundation physical-gesture audit remains open, Titania imagery remains deferred, and Deep Space Phase 4A remains not started.
