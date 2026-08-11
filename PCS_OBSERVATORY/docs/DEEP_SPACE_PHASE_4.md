# Deep Space Phase 4

Status at 2026-08-09:

- Phase 4A — Nearby Galaxy Groups: completed, deployed, and production-verified.
- Phase 4B — Virgo Cluster: completed, deployed, and production-verified.
- Phase 4C — Laniakea: completed, deployed, and production-verified.
- Phase 4D — Cosmic Web: local release candidate validated; production deployment verification pending.
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

Local evidence: `test-results/deep-space-phase-4a-local/acceptance-report.json` and its screenshots.

### Production verification

- Runtime commit: `7cc2814c29a745d6139f695d6d111357a5f61823`.
- GitHub Pages run: `31306723208`; build and deploy jobs passed.
- Production `deep-space.js` SHA-256 matched the committed file.
- The production WebGL acceptance repeated the 77-group overview, M81 group/member search and visible selected marker, four-language switching, 390×844 mobile layout, ten lifecycle cycles, Viewer 1, Cesium canvas 1, primitive/DataSource growth 0, required Console 0, and required Network failures 0.

Production evidence: `test-results/deep-space-phase-4a-production-7cc2814/acceptance-report.json` and its screenshots.

## Phase advancement

Phase 4A is frozen at the deployed source, coordinate, identity, rendering, and lifecycle contract.

## Phase 4B — Virgo Cluster

### Source and membership

Phase 4B uses Kim et al. (2014), *The Extended Virgo Cluster Catalog*, VizieR `J/ApJS/215/22`, DOI `10.1088/0067-0049/215/2/22`. The frozen snapshot contains 1,589 galaxies over the published 725-square-degree EVCC footprint:

- 1,028 source-classified `M` members.
- 561 source-classified `P` possible members.
- 1,589 preferred heliocentric velocity samples, using SDSS DR7 first and NED where identified by EVCC.
- Major catalog cross-matches: M84/NGC 4374, M86/NGC 4406, M49/NGC 4472, M87/NGC 4486, and M60/NGC 4649.

Membership is the source Virgo infall-model classification, not a PCS probability. Foreground/background certainty beyond the published M/P field is not invented.

### Distance and visualization contract

EVCC table 2 publishes sky coordinates and velocities but no individual galaxy distances. PCS therefore leaves every individual `distanceMpc` null. The catalog-adopted Virgo distance of 16.5 Mpc is used only for the cluster reference marker and a common observer-centered navigation shell. Every galaxy Object Card states that the radial placement is `Representative Visualization`, not an individual measured 3D coordinate.

Catalog RA/Dec and membership are `Catalog Observation`; ICRS→Galactic→Supergalactic transforms and the velocity distribution are `Derived Measurement`; the common navigation shell and marker pixel sizes are `Representative Visualization`. No random galaxy scatter, rigid cluster boundary, synthetic filler, redshift distance, or zero-filled value is used.

### Runtime and LOD

The existing Viewer, Deep Space manager, search, selected-object store, language state and Unified Object Card are reused. Batched collections implement deterministic LOD:

- FAR: Virgo cluster reference marker.
- MID: M84, M86, M49, M87 and M60 major-member markers and labels.
- NEAR: all 1,589 EVCC catalog points, with member and possible-member style distinction.

Selected objects remain visible across LOD. The one camera-change listener is removed by `unload()`; no animation loop, DOM-per-object rendering, second Viewer or second canvas is created.

### Local validation evidence

- Node suite: 178/178 passing after Phase 4B integration.
- Raw snapshot hashes match the source contract; normalized counts are 1,589 / 1,028 / 561.
- Major-member RA/Dec values match the EVCC fixed-width source rows.
- One ambiguous shared NGC designation is retained as two qualified PCS identities and explicitly flagged.
- Real WebGL: 1,589 catalog primitives created; Virgo overview, major-member, selected M87 and cluster-card screenshots inspected.
- M87 selected representation: on-screen, 13 px.
- Ten Nearby Galaxy Groups ↔ Virgo cycles: primitive, DataSource and listener growth 0.
- Viewer 1; Cesium canvas 1; four languages; 390×844 mobile; required Console 0; required Network failures 0.

Local evidence: `test-results/deep-space-phase-4b-local/acceptance-report.json` and screenshots.

### Production verification

- Runtime commit: `86c8a7f4084875ca61fdcc4a0ac86044a869aa44`.
- GitHub Pages run: `31308276438`; build, deploy and status-report jobs passed.
- Production catalog endpoint returned 1,589 galaxies, 1,028 members and 561 possible members.
- Production WebGL repeated the Virgo overview, five major-member searches, M87 selected visibility and Object Card checks, cluster summary, four languages, mobile layout and ten lifecycle cycles.
- Viewer 1; Cesium canvas 1; primitive/DataSource/listener growth 0; required Console 0; required Network failures 0.

Production evidence: `test-results/deep-space-phase-4b-production-86c8a7f/acceptance-report.json` and screenshots.

Phase 4B is frozen at this deployed source, identity, M/P membership, coordinate, representative-shell, LOD and lifecycle contract. The active roadmap is Phase 4C Laniakea, which must remain an observation-based reconstruction rather than a rigid observed shell.

## Phase 4C — Laniakea

### Source and scientific boundary

Phase 4C uses the Cosmicflows-2 group-distance table from Tully et al. (2013), VizieR `J/AJ/146/86`, DOI `10.1088/0004-6256/146/4/86`, as its observation context. The source contains 5,224 group aggregates. PCS deploys the deterministic 2,387 rows with a published positive measured group distance at or below 80 Mpc. The 80 Mpc radius is a PCS observer-centered sampling window and is not a Laniakea boundary.

The interpretation target is Tully et al. (2014), *The Laniakea supercluster of galaxies*, DOI `10.1038/nature13674`. It is classified as `Observation-based Reconstruction`. PCS does not deploy a solid shell or rigid edge because no validated machine-readable basin geometry is present in the source snapshot.

### Visual classes and coordinate contract

- Cosmicflows-2 group locations and measured-distance metadata: `Catalog Observation`.
- Source radial peculiar velocities displayed along the observer line of sight: `Derived Measurement`.
- Laniakea basin interpretation: `Observation-based Reconstruction` information target.
- Pixel sizes and overview camera scale: `Representative Visualization`.

The runtime uses source-published Supergalactic coordinates and weighted measured group distances. It does not convert redshift to distance. The source peculiar velocity uses H0 = 74.4 km/s/Mpc; adjusted velocities use Ωm = 0.27 with flat topology. Displayed arrows are not the full three-dimensional Wiener-filter flow field.

### Runtime and local validation

The existing Viewer, Deep Space state machine, selection store, search, language state and Unified Object Card are reused. One `PointPrimitiveCollection` batches 2,387 catalog points. One `PolylineCollection` displays a deterministic 600-vector subset ranked by absolute peculiar velocity. Both collections have explicit unload/dispose paths; the derived vector layer can be independently disabled.

- Node suite: 183/183 passing after the Phase 4C source-registry assertion.
- Raw snapshot and schema: 5,224 source rows; checksums and 2,387-row deployment sample pass.
- Every deployed row has a positive measured distance, fractional distance error, finite peculiar velocity and finite Supergalactic Cartesian coordinate.
- Real WebGL: 2,387 catalog points and 600 vectors; 866 points on screen in the overview camera.
- Selected UGC00763 / CF2 Group 334: on-screen 12 px marker; measured distance 11.32 Mpc and peculiar velocity −3 km/s retained in its Object Card.
- The Laniakea card explicitly states `Observation-based Reconstruction` and that no rigid boundary is deployed.
- Ten Virgo ↔ Laniakea cycles: primitive, DataSource and listener growth 0.
- Viewer 1; Cesium canvas 1; four languages; 390×844 mobile; required Console 0; required Network failures 0.

Local evidence: `test-results/deep-space-phase-4c-local/acceptance-report.json` and screenshots.

### Production verification

- Runtime commit: `6388033e33d20fb6c03faad9bdabb3a802cf0806`.
- GitHub Pages run: `31310295320`; build, deploy and status-report jobs passed.
- Production `deep-space.js` and `laniakea-layer.js` SHA-256 values matched the committed files.
- The production catalog endpoint returned 5,224 source rows, 2,387 deployed context rows and the explicit “not a Laniakea boundary” sampling statement.
- Production WebGL repeated the 2,387-point/600-vector overview, reconstruction card, selected measured-distance group, vector-layer switch, four languages, mobile layout and ten lifecycle cycles.
- Viewer 1; Cesium canvas 1; primitive/DataSource/listener growth 0; required Console 0; required Network failures 0.

Production evidence: `test-results/deep-space-phase-4c-production-6388033/acceptance-report.json` and screenshots.

Phase 4C is frozen at this deployed Cosmicflows-2 snapshot, source-published Supergalactic coordinate contract, measured-distance/uncertainty fields, radial peculiar-velocity interpretation, no-rigid-boundary rule and lifecycle contract. The active roadmap is Phase 4D Cosmic Web.

## Phase 4D — Cosmic Web

### Sources, coverage, and scientific classes

Phase 4D uses checksum-locked public catalog snapshots rather than random points or procedurally generated structure:

- Tempel, Tago & Liivamägi (2012), SDSS DR8 groups and clusters, VizieR `J/A+A/540/A106`, DOI `10.1051/0004-6361/201118687`.
- Tempel et al. (2014), SDSS DR8 galaxies and Bisous filament spines, VizieR `J/MNRAS/438/3465`, DOI `10.1093/mnras/stt2456`.
- Mao et al. (2017), BOSS DR12 LOWZ/CMASS ZOBOV voids, VizieR `J/ApJ/835/161`, DOI `10.3847/1538-4357/835/2/161`.

The deployment retains the SDSS and BOSS angular/radial selection, survey masks, flux limits and incompleteness. Unobserved sky is left empty. There is no separately validated wall geometry, so the Walls control is disabled and reports `Unavailable`; no substitute surface is generated.

- Galaxy and redshift catalog points: `Catalog Observation`.
- Friends-of-friends groups/clusters and 20 Mpc/h density cells: `Derived Measurement`.
- Bisous filament spines and ZOBOV void centers/effective radii: `Observation-based Reconstruction`.
- Point size, line width, void ring and compressed exhibition coordinates: `Representative Visualization`.

The reconstructed structures are not described as a direct photograph of a complete cosmic web. SDSS and BOSS retain their separate source-cosmology metadata; co-rendering in one observer-centered ICRS frame is a comparative visualization, not a joint cosmological fit.

### Runtime, interaction, and continuous LOD

The existing Cesium Viewer, canvas, `PCSDeepSpaceManager`, selected-object store, search, Unified Object Card and four-language state are reused. The runtime adds batched point, polyline and billboard collections only; it does not add a Viewer, canvas, state machine, animation loop, worker, per-object DOM renderer or background Cosmic Web image.

The deterministic deployed display contains 48,041 galaxy catalog points, 2,686 rich groups/clusters, 18,054 density cells, 2,306 filament spines with 102,417 source points, and 1,228 void records. Near/Far scalars and smooth filament alpha blending provide continuous transitions from individual galaxies through group/cluster structure to survey-scale density/filament/void context. Search, selection, focus, wheel/pinch zoom, pan and rotate continue to use the existing navigation path.

### Local validation evidence

- Node suite: 191/191 passing, 0 failed, 0 skipped.
- Real WebGL: all five available visual classes rendered from deployed catalog records; wall geometry remained 0 / `Unavailable`.
- Nine ordered scale samples showed monotonic galaxy fade-out and density fade-in with multiple intermediate cross-fade states.
- Separate catalog-observation-only and reconstruction-only screenshots were inspected; the styles remain visually distinct.
- Galaxy, group/cluster, filament and void search/focus and Unified Object Card provenance assertions passed.
- Ten Laniakea ↔ Cosmic Web cycles: primitive growth 0, DataSource growth 0, listener counts stable.
- Viewer 1; Cesium canvas 1; four runtime languages; 390×844 mobile without horizontal overflow; required Console 0; required Network failures 0.
- Camera-change sensitivity is narrowed only while Phase 4D is loaded and restored on unload, preventing cross-scale LOD bleed-through.

Local evidence: `test-results/deep-space-phase-4d-local/acceptance-report.json` and eight inspected screenshots.

Production deployment and production WebGL verification remain required before Phase 4D can be marked completed or frozen.
