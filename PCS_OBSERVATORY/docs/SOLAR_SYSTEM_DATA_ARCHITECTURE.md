# Solar System Data Architecture

Status: **SS-01 baseline frozen; SS-02A–D validated and frozen**

Audit date: 2026-08-08

This document records the current Solar System implementation before scientific completion work begins. It is an evidence-based baseline, not a claim that the Solar System layer is complete. SS-01 changes no orbit, catalog, texture, or rendering data.

## SS-02B current architecture delta

The SS-01 inventory below remains as a frozen historical baseline. The current runtime has superseded its single-epoch/mean-orbit behaviour for 2025–2028:

`official Horizons API → gzip raw response + SHA-256 → normalized compact vectors → independent withheld-epoch validation → promoted manifest → cubic-Hermite runtime → solution-bound entities/orbits`

- `solar-system-core.js`: UTC Display Epoch, NAIF `naif0012.tls` UTC→JDTDB conversion, leap-second quality boundary.
- `scripts/solar-system/horizons-adapter.mjs`: fixed official vector-query and normalization contract.
- `scripts/solar-system/sync-major-bodies.mjs`: deterministic raw/cache/normalization producer for eight planets and eleven major satellites.
- `scripts/solar-system/validate-major-bodies.mjs`: independent Horizons comparison and promotion gate.
- `data/solar-system/raw/horizons-de441/`: compressed source responses; no browser dependency.
- `data/solar-system/normalized/major-bodies-horizons-de441.js`: deployed vector dataset.
- `data/solar-system/ephemeris-manifest.json`: source queries, hashes, times, coverage, counts, promotion and validation state.
- `deep-space-ephemeris.js`: coherent solution selection, binary bracket lookup, cubic Hermite interpolation, explicit fallback/unavailability.
- `deep-space.js`: one-Viewer consumer with overlapping point/intermediate/sphere LOD and separate physical/display radii.

The promoted data cover 2025-01-01 through 2028-01-01. Eight planet states are Sun-centred. Moon states are parent-centred with the exact Horizons center recorded. The UI never substitutes the former representative satellite mean orbit outside coverage. Planet fallback remains the published JPL 1800–2050 approximate-element model and is labelled as such.

The browser dataset retains position and velocity in AU/AU-day and source time in TDB. UTC is converted through NAIF DELTET; dates before 1972 are unsupported by this converter, and dates beyond the declared leap-second validation horizon cannot promote an authoritative state without an LSK refresh.

SS-02B's promotion gate passed 46 object/epoch comparisons against independent direct Horizons output. Evidence and class/object-specific tolerances are in `test-results/solar-system-ss02b/authoritative-position-comparison.json`. The browser lifecycle evidence is `test-results/solar-system-ss02b/report.json`.

Titania's parent-relative ephemeris is included. No Titania surface image, projection, texture, or coverage change was made.

## SS-02C current architecture delta

Small bodies now use a separate source boundary:

`JPL SBDB lookup/query → gzip raw + SHA-256 → normalized unique catalog → direct-Horizons/model validation → promoted small-body manifest → dwarf entities + batched belt primitive`

- `scripts/solar-system/sbdb-adapter.mjs`: strict SBDB lookup/query URL and normalization contract.
- `scripts/solar-system/sync-small-bodies.mjs`: dwarf lookup, Main Belt `MBA / H<13` query, raw/cache/checksum generation, and dwarf Horizons vectors.
- `data/solar-system/small-body-manifest.json`: candidate/promotion state, last successful synchronization, selection, counts, source URLs, hashes, and keep-last-validated fallback policy.
- `small-body-catalog.js`: dwarf cached-vector interpolation, belt element propagation, deterministic LOD, one batched point collection, and listener lifecycle.
- `unified-object-card.js`: dwarf planet and asteroid provenance without invented physical properties.

The normalized registry contains five named dwarf planets plus 5,365 belt points. Ceres belongs scientifically to both categories but has one SPK-ID and one rendered object; it is excluded from the batched belt point list. No catalog duplication is permitted.

The belt selection is a catalog subset, not a complete belt and not a representative solid ring. Far/medium/near LOD shows the first 256/1,024/5,365 records in the stable `H,pdes` ordering. Sampling does not change per frame.

Dwarf positions use cached Horizons vectors inside validated coverage. Belt points use two-body propagation from each SBDB JDTDB element epoch and carry explicit model-status text. Direct-Horizons evidence separates the resulting PCS model difference from the formal sigmas stored on the catalog record.

## SS-02D current architecture delta

Known trans-Neptunian objects use the same separated source architecture:

`JPL SBDB TNO query → gzip raw + SHA-256 → normalized unique catalog → direct-Horizons model validation → promoted TNO manifest → one batched adaptive primitive`

- `buildOrbitClassQuery("TNO")` fixes the official SBDB query and stable sort contract.
- `sync-tno.mjs` records source selection, raw response, hashes, exclusions, last successful synchronization, normalized output, and keep-last-validated fallback policy.
- `validate-tno.mjs` performs independent Horizons comparisons and owns the promotion gate.
- `tno-catalog.js` reuses SS-02C two-body state propagation and owns one point collection plus one removable camera listener.
- `data/solar-system/tno-manifest.json` exposes 7,160 upstream rows, 7,155 rendered unique rows, four named-dwarf exclusions, one invalid-element exclusion, and validation evidence.

The TNO layer is explicitly a known catalog, not an exact solid ring and not a representative population. No synthetic population exists. Stable far/medium/near LOD renders the first 256/1,024/7,155 records from the deterministic normalized ordering. SS-02C dwarf objects and SS-02D TNO points remain unique by SPK-ID.

TNO positions use each SBDB JDTDB solution epoch and J2000 ecliptic heliocentric osculating elements. The runtime discloses two-body propagation and preserves source uncertainty fields; direct-Horizons model differences remain separate from observational/orbit uncertainty. Sixteen object/epoch comparisons and browser lifecycle evidence are stored under `test-results/solar-system-ss02d/`.

## SS-02A architecture delta

SS-02A introduces one `SolarSystemTimeState` as the mutable source of the Deep Space Solar System Display Epoch. Its public display time scale is UTC. Ephemeris datasets retain their source time scale explicitly; the Horizons vector contract uses TDB. PCS does not relabel JavaScript UTC as TDB or claim a runtime TDB conversion that is not performed.

Before evaluating a planet, `deep-space-ephemeris.js` now resolves one coherent solution for all eight eligible major planets at the requested Display Epoch. Body states and orbit samples receive the same `solutionId`, source, reference frame, position mode, validity, and quality contract. A planet can no longer independently select the one cached Horizons vector while its orbit uses approximate elements.

The legacy 2026-08-01 DE441 sample remains provenance evidence but is marked `not-promoted`: one sample per body cannot support interpolation or a continuous orbit. Until SS-02B deploys a validated multi-epoch dataset, all eight planets use the JPL 1800–2050 approximate-element model together. Outside that published validity interval, position and orbit mode become `Unavailable`; PCS does not silently extrapolate.

The fixed vector adapter contract is:

- authoritative endpoint: `https://ssd.jpl.nasa.gov/api/horizons.api`;
- `EPHEM_TYPE=VECTORS`;
- heliocentric center `500@10`;
- `TIME_TYPE=TDB`;
- `REF_SYSTEM=ICRF`;
- `REF_PLANE=ECLIPTIC` (Earth mean ecliptic at J2000.0, IAU76/80);
- `OUT_UNITS=AU-D`;
- `VEC_TABLE=2`;
- `VEC_CORR=NONE` (geometric state);
- CSV normalization with position and velocity retained.

Source, catalog/ephemeris, reference frame, position mode, last data update, and uncertainty/quality are displayed in the existing compact control column in Traditional Chinese, English, Japanese, and Korean. The runtime reuses the existing language state.

## Current rendering roots

PCS has two related but separate Solar System paths inside one shared Cesium Viewer:

1. `deep-space.js` owns the Deep Space Solar System overview. It creates one removable `CustomDataSource` named `pcs-deep-space-phase-1` and renders the Sun, eight planets, focused satellites, labels, and orbit polylines.
2. `app.js` owns the Observatory's individual Earth, planet, Moon, Sun, and satellite views. Its Cloudflare astronomy adapter supplies current observer quantities and imagery metadata. Those observer responses do not drive the Deep Space overview positions.

There is one `Cesium.Viewer`, one Cesium canvas, and no Solar System-specific permanent animation loop. Deep Space uses the existing Cesium clock listener.

## SS-01 historical source inventory (superseded where noted above)

| Use | Current source | Runtime behavior | Provenance completeness |
| --- | --- | --- | --- |
| Planet fallback positions and orbit paths | JPL approximate planetary elements and secular rates for 1800–2050 | Bundled in `deep-space-registry.js`; solved in the browser | Source URL and validity range recorded; no snapshot checksum |
| Planet preferred position sample | NASA/JPL Horizons DE441 | One bundled vector per planet at 2026-08-01 00:00 TDB; accepted only within 12 hours | Source, frame, units, and DE441 comment recorded; exact query, retrieval timestamp, response checksum, and per-record data version are absent |
| Current planet observation panel | NASA/JPL Horizons `OBSERVER` query through the Cloudflare Worker | Current UTC only; cached with last-known stale fallback | Query parameters and retrieval time are generated at runtime; not connected to Deep Space positions |
| Satellite positions and paths | Existing PCS registry mean radius, period, inclination, and eccentricity | Parent-relative periodic circular position with inclination; eccentricity is not used in the state calculation | Broad NASA/JPL attribution only; no authoritative state-vector snapshot or validity interval |
| Radii / display metadata | Existing PCS registry and NASA Solar System Exploration attribution | Used by colored ellipsoids and Object Cards | Per-field provenance is incomplete |
| Small bodies | None | Provider returns an explicit unavailable/empty result | No JPL SBDB or MPC adapter |
| Comets | None | Provider returns an explicit unavailable result | No solution registry |

NASA/JPL SBDB and MPC are not currently integrated. The browser does not fetch a Solar System catalog or ephemeris dataset for the overview.

## SS-01 historical position and orbit algorithms

### Planets

`getBodyState` chooses the closest bundled Horizons vector only when it is within 12 hours of the selected epoch. Every other epoch uses JPL's approximate Keplerian elements and rates. The fallback advances the elements by Julian centuries from J2000, solves Kepler's equation, and rotates the orbital-plane coordinates by argument of perihelion, ascending node, and inclination.

The Deep Space time state controls the evaluated epoch. It is currently an independent overlay UTC state, not a shared Observatory-wide time registry. The fallback validity contract is 1800–2050. No warning is currently displayed when the selected time lies outside that range.

Orbit polylines sample `getBodyState` around the selected epoch. Near 2026-08-01 this can mix one cached Horizons sample with surrounding approximate-element samples in the same path. The cached velocity is displayed in an Object Card but is not used for interpolation.

### Satellites

`getSatelliteRelativeState` calculates a parent-relative periodic position from mean orbital radius and period. Retrograde motion is inferred from negative rotation period or inclination above 90 degrees. The result is then added directly to the parent scene position.

This is a representative mean-orbit model, not an authoritative satellite ephemeris. It does not use longitude of ascending node, argument of periapsis, mean anomaly, solution epoch, frame orientation, or eccentric anomaly; the registry's satellite eccentricity does not affect the rendered state. Parent-centered coordinates are added in the scene axes without a documented physical frame transform.

## SS-01 historical frame and time contracts

- Planet overview frame: Sun-centered ecliptic coordinates, J2000 reference.
- Bundled Horizons sample: geometric vector, DE441, AU and AU/day, source epoch stated as TDB.
- Browser cache matching: the sample also carries an ISO serialization parsed as JavaScript UTC; the TDB/UTC distinction is documented but not converted by a time-scale library.
- Planet fallback epoch: JavaScript UTC converted to Julian centuries from J2000.
- Satellite frame labels: parent-centered mean orbital plane, J2000 reference; the implementation does not perform a complete parent-frame orientation transform.
- Exhibition mode: logarithmic distance and enlarged display radius.
- Scientific mode: AU-to-kilometre position mapping and physical mean radius for ellipsoids.

## SS-01 historical object hierarchy

Implemented overview bodies:

- Sun
- Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune
- Earth: Moon
- Mars: Phobos, Deimos
- Jupiter: Io, Europa, Ganymede, Callisto
- Saturn: Titan, Enceladus
- Uranus: Titania
- Neptune: Triton

The overview has exactly eleven satellites. Satellites appear only while their parent planet is focused.

Not implemented:

- Rhea, Dione, Tethys, Iapetus
- Oberon, Ariel, Umbriel, Miranda
- other scientifically useful major satellites
- Ceres, Pluto, Eris, Haumea, Makemake, or any dwarf-planet/TNO classification
- Vesta, Pallas, Hygiea, asteroid belt, NEOs, Trojans, or Centaurs
- Kuiper Belt population layers
- periodic comets

Titania's orbit metadata is present. Its deferred texture issue is untouched.

## SS-01 historical rendering and LOD

- Sun, planets, and displayed satellites are Cesium Entity ellipsoids, not catalog point primitives.
- Orbit paths are Entity polylines.
- Overview bodies always retain an ellipsoid object, but there is no formal point → resolved disc → sphere LOD state contract.
- Exhibition mode enlarges radii and compresses distances; Scientific mode uses physical radii and linear kilometre distances.
- Satellites are omitted from the Solar System overview until the parent is focused.
- No asteroid/comet DOM or Entity-per-object implementation exists.

The known “label/position without an obvious body” concern is therefore a visibility/LOD and scale problem, not evidence that authoritative solid-body LOD has been completed.

## SS-01 historical update and fallback behavior

There is no continuous source → raw snapshot → validation → normalized registry pipeline for the Deep Space Solar System overview. The Horizons vector file is manually bundled and contains a single epoch. There is no scheduled JPL/SBDB/MPC retrieval, raw snapshot directory, validation manifest, checksum registry, last-success record, dataset-age indicator, or automatic keep-last-known-valid promotion process.

The separate Cloudflare current-observation adapter does preserve cached/stored stale responses when Horizons is temporarily unavailable, but it serves the individual body information panels. It does not update the overview position registry.

## Exact scientific gaps to address after SS-01

1. No multi-epoch authoritative planet ephemeris dataset or interpolation contract.
2. No numerical validation fixtures against Horizons at historical, current, and future epochs.
3. No documented tolerances by object/source.
4. One cached epoch can be mixed with approximate samples in a displayed orbit.
5. TDB and UTC are labelled but not rigorously converted.
6. Approximate-element validity is not enforced or warned in the UI.
7. Satellite positions are representative circular mean-orbit states, not source-backed ephemerides.
8. Satellite frame orientation and parent-to-scene transforms are incomplete.
9. Satellite eccentricity and full orbital elements are not used.
10. Major satellite coverage is incomplete.
11. No dwarf planets, asteroid belt, Kuiper/TNO populations, NEOs, Trojans, Centaurs, or comets.
12. No JPL SBDB or MPC adapter.
13. No continuous validated update pipeline or source snapshot provenance manifest.
14. No formal solid-body point/disc/sphere LOD contract.
15. Object Cards lack complete position/orbit provenance, retrieval time, frame/time-scale detail, and uncertainty.
16. The Deep Space Solar System epoch is not yet the common PCS time state.
17. No compact filters for the requested object classes.
18. No catalog-size, rendered-count, frame-time, heap, or primitive-count measurements for small-body layers because those layers do not exist.

## SS-01 checkpoint decision

- [x] Current sources, algorithms, epoch handling, frames, bodies, rendering types, update behavior, and gaps audited.
- [x] Existing tests confirm the registry contains the Sun, eight planets, and exactly eleven satellites; cached/fallback states and parent-relative orbit sampling remain operational.
- [x] Viewer/canvas architecture remains unchanged.
- [x] Titania texture, Gaia data, the then-existing Motion Streak rendering, Phase 4A–4F, and SITE were not modified by SS-01. Motion Streak was subsequently rejected by human visual review and removed before SS-02.
- [x] Planet and major-satellite authoritative multi-epoch ephemeris validation — SS-02B validated and frozen.
- [x] Solid-body point/intermediate/sphere LOD — SS-02B validated and frozen.
- [x] Five dwarf planets and catalog-derived adaptive Main Belt — SS-02C validated and frozen.
- [x] Known-catalog Kuiper Belt / TNO layer — SS-02D validated and frozen.
- [ ] Comets and meteor-shower relationships — SS-02E, not started.
- [ ] Any later Solar System checkpoint — not started.

SS-02A browser evidence passed with one Viewer, one Cesium canvas, unchanged total canvas count, eight coherent planet states, same-solution orbit metadata, honest out-of-range unavailability, four runtime languages, restored Earth ownership, zero required Console errors, and zero required Network failures. SS-02A is frozen as the contract consumed by SS-02B.

This SS-01 audit baseline is frozen as a record of the pre-completion implementation. Freezing the audit does not freeze or approve the current scientific behavior.
