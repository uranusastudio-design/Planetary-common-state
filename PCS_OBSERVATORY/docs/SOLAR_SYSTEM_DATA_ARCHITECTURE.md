# Solar System Data Architecture

Status: **SS-01 audit only — implementation checkpoints SS-02 through SS-11 have not started**

Audit date: 2026-08-08

This document records the current Solar System implementation before scientific completion work begins. It is an evidence-based baseline, not a claim that the Solar System layer is complete. SS-01 changes no orbit, catalog, texture, or rendering data.

## Current rendering roots

PCS has two related but separate Solar System paths inside one shared Cesium Viewer:

1. `deep-space.js` owns the Deep Space Solar System overview. It creates one removable `CustomDataSource` named `pcs-deep-space-phase-1` and renders the Sun, eight planets, focused satellites, labels, and orbit polylines.
2. `app.js` owns the Observatory's individual Earth, planet, Moon, Sun, and satellite views. Its Cloudflare astronomy adapter supplies current observer quantities and imagery metadata. Those observer responses do not drive the Deep Space overview positions.

There is one `Cesium.Viewer`, one Cesium canvas, and no Solar System-specific permanent animation loop. Deep Space uses the existing Cesium clock listener.

## Current source inventory

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

## Current position and orbit algorithms

### Planets

`getBodyState` chooses the closest bundled Horizons vector only when it is within 12 hours of the selected epoch. Every other epoch uses JPL's approximate Keplerian elements and rates. The fallback advances the elements by Julian centuries from J2000, solves Kepler's equation, and rotates the orbital-plane coordinates by argument of perihelion, ascending node, and inclination.

The Deep Space time state controls the evaluated epoch. It is currently an independent overlay UTC state, not a shared Observatory-wide time registry. The fallback validity contract is 1800–2050. No warning is currently displayed when the selected time lies outside that range.

Orbit polylines sample `getBodyState` around the selected epoch. Near 2026-08-01 this can mix one cached Horizons sample with surrounding approximate-element samples in the same path. The cached velocity is displayed in an Object Card but is not used for interpolation.

### Satellites

`getSatelliteRelativeState` calculates a parent-relative periodic position from mean orbital radius and period. Retrograde motion is inferred from negative rotation period or inclination above 90 degrees. The result is then added directly to the parent scene position.

This is a representative mean-orbit model, not an authoritative satellite ephemeris. It does not use longitude of ascending node, argument of periapsis, mean anomaly, solution epoch, frame orientation, or eccentric anomaly; the registry's satellite eccentricity does not affect the rendered state. Parent-centered coordinates are added in the scene axes without a documented physical frame transform.

## Current frame and time contracts

- Planet overview frame: Sun-centered ecliptic coordinates, J2000 reference.
- Bundled Horizons sample: geometric vector, DE441, AU and AU/day, source epoch stated as TDB.
- Browser cache matching: the sample also carries an ISO serialization parsed as JavaScript UTC; the TDB/UTC distinction is documented but not converted by a time-scale library.
- Planet fallback epoch: JavaScript UTC converted to Julian centuries from J2000.
- Satellite frame labels: parent-centered mean orbital plane, J2000 reference; the implementation does not perform a complete parent-frame orientation transform.
- Exhibition mode: logarithmic distance and enlarged display radius.
- Scientific mode: AU-to-kilometre position mapping and physical mean radius for ellipsoids.

## Current object hierarchy

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

## Current rendering and LOD

- Sun, planets, and displayed satellites are Cesium Entity ellipsoids, not catalog point primitives.
- Orbit paths are Entity polylines.
- Overview bodies always retain an ellipsoid object, but there is no formal point → resolved disc → sphere LOD state contract.
- Exhibition mode enlarges radii and compresses distances; Scientific mode uses physical radii and linear kilometre distances.
- Satellites are omitted from the Solar System overview until the parent is focused.
- No asteroid/comet DOM or Entity-per-object implementation exists.

The known “label/position without an obvious body” concern is therefore a visibility/LOD and scale problem, not evidence that authoritative solid-body LOD has been completed.

## Current update and fallback behavior

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
- [x] Titania texture, Gaia data, Motion Streak rendering, Phase 4A–4F, and SITE were not modified by SS-01.
- [ ] Planet ephemeris validation — SS-02, not started.
- [ ] Any later Solar System checkpoint — not started.

This SS-01 audit baseline is frozen as a record of the pre-completion implementation. Freezing the audit does not freeze or approve the current scientific behavior.
