# Deep Space Phase 4

Status at 2026-08-09:

- Phase 4A — Nearby Galaxy Groups: locally validated; production deployment evidence is recorded after the matching commit.
- Phase 4B — Virgo Cluster: active next phase.
- Phase 4C — Laniakea: not yet completed.
- Phase 4D — Cosmic Web: not yet completed.
- Phase 4E — Observable Universe: not yet completed.
- Phase 4F — CMB Full Sky: not yet completed.

This document is advanced only when a phase has passed source, schema, coordinate, identity, unit, uncertainty, lifecycle and rendered-output validation. Later phases are not pre-marked complete.

## Shared coordinate hierarchy

Phase 4 uses explicit adapters rather than silent coordinate conversion. The frozen runtime identifiers are:

- ICRS/J2000 ↔ Galactic: the existing Phase 3 IAU matrix.
- Galactic ↔ Supergalactic: `pcs-supergalactic-astropy-v1`, following the Astropy/de Vaucouleurs definition (north supergalactic pole at Galactic longitude 47.37°, latitude +6.32°).
- Galactocentric: `pcs-galactocentric-reid2019-v1`; this is a documented PCS frame, not a universal standard.
- Redshift-derived distance model where explicitly requested by a later adapter: `pcs-planck18-flat-lambda-cdm-v1`, with H0 67.66 km/s/Mpc and Ωm 0.30966. Phase 4A does not use this conversion.
- Observer-centered sky: angular coordinates remain attached to the source frame and epoch; no external camera outside the Universe is implied.

Every Phase 4 adapter must provide `sourceFrame`, `sourceEpoch`, `distanceConvention`, `redshiftConvention`, `cosmologyAssumption`, and `transformVersion`. `proper`, `luminosity`, `comoving`, `angular-diameter`, and `light-travel/lookback` distances are separate data types.

Scientific mode uses a linear Mpc-to-scene mapping at Phase 4 scales. Exhibition mode is a documented logarithmic compression. Neither marker pixel size nor scene-unit scale is reported as a physical galaxy diameter.

## Phase 4A — Nearby Galaxy Groups

### Source and deployed scope

The deployed source is Kourkchi & Tully (2017), *Galaxy Groups within 3500 km/s*, VizieR `J/ApJ/843/16`, DOI `10.3847/1538-4357/aa76db`. PCS retains the official ReadMe and compressed tables 2 and 3 with SHA-256 verification.

The deterministic deployment scope is every source group with at least two members and a published group distance from 2 through 12 Mpc:

- 77 galaxy groups.
- 456 member-galaxy identity records.
- 228 galaxies with a published positive individual distance and therefore a 3D point.
- 228 galaxies without an individual distance, retained for identity/search/Object Card but not assigned a 3D position.

The 2–12 Mpc interval is a PCS phase boundary, not a physical boundary. The lower bound prevents duplicate ownership of the already deployed Local Group.

### Scientific classification

- Group reference positions, galaxy angular coordinates, velocities, distances, identifiers and catalog membership: `Catalog Observation`.
- Group distance: the source catalog's weighted aggregate of available Cosmicflows-3 member distance moduli; it is not a redshift distance.
- R2t, projected virial radius and mass estimates: source-published derived measurements displayed in metadata only.
- Point pixel sizes and label placement: `Representative Visualization`.
- No reconstructed group shell, synthetic galaxy, random scatter, or zero-filled coordinate is rendered.

The catalog does not publish a numeric per-galaxy membership probability. Object Cards therefore state “catalog group assignment; no per-member probability published” instead of inventing confidence values.

### Runtime architecture

Phase 4A extends the existing `PCSDeepSpaceManager`, language state, selected-object model and Unified Object Card. It adds one batched group `PointPrimitiveCollection`, one selected-group member collection and one label collection. It does not add a Viewer, canvas, independent state machine, permanent animation loop, worker, or per-object DOM node.

Selection and search support named group aliases and member galaxies. Group selection reveals only members with measured individual 3D distances. Search focus explicitly aims the existing camera at the selected coordinate. Returning to the Local Group or any other scale unloads the Phase 4A collections.

### Local validation evidence

- Node suite: 171/171 passing after Phase 4A integration.
- Source rows: 8,826 group rows and 15,004 galaxy rows; raw snapshot hashes match the source contract.
- Identity: 456/456 unique PGC member identities; every parent group resolves.
- Coordinate validation: Galactic-to-Supergalactic residual below 0.0001° on catalog reference rows; round-trip checks pass.
- WebGL overview: 77 group points, with 42 visible on-screen in the acceptance camera.
- M81 group: 33 member galaxies with measured distances rendered; selected group and selected M81 galaxy receive distinct visible markers.
- Ten Local Group ↔ Nearby Galaxy Groups cycles: primitive growth 0; DataSource growth 0.
- Viewer 1; Cesium canvas 1; required Console exceptions 0; required catalog Network failures 0.
- Four runtime languages and 390×844 mobile layout validated without Viewer recreation.

Local evidence: `test-results/deep-space-phase-4a-local/acceptance-report.json` and its screenshots. Production evidence is stored separately after deployment.

## Phase advancement

After Phase 4A production verification, the active roadmap advances to Phase 4B. Virgo must use actual catalog coordinates and explicit certain/possible membership; no random galaxy scatter is permitted.
