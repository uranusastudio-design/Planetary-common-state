# PCS Observatory Changelog

## [v2.2.0] — In Development

Stable baseline: v2.1.0 — Stable / Frozen

### Removed

- Removed the human-rejected Deep Space Motion Streak / micro-glow visualization in full.
- Removed trail primitives, previous/current projected-position rendering, density and settling logic, feature controls, feature translations, navigation listeners, controller lifecycle code, tests, and active-feature documentation.
- Restored Nearby Stars, Milky Way tracers, and Local Group point markers to their normal point-primitive rendering path.

### Preserved

- Gaia catalog rendering, colours, sizes, labels, search, and Object Cards.
- Pointer-Anchored Navigation, Orbit Precision, Deep Space Phase 1–3, Earth render ownership, and Gaia epoch metadata.
- One Cesium Viewer, one Cesium canvas, and the frozen v2.1.0 baseline.

### Validation

- 109 Node tests passed after removal.
- Browser acceptance passed at 10 / 25 / 50 / 100 pc, Milky Way, and Local Group.
- Twenty Deep Space open/close cycles ended with Viewer 1, Cesium canvas 1, total canvas 2, zero primitive growth, zero required Console errors, and zero required Network failures.

### Solar System SS-02A

- Added one authoritative Solar System Display Epoch state with explicit UTC display and TDB ephemeris time-scale contracts.
- Added coherent all-planet solution selection so body positions and orbit lines cannot mix unrelated models.
- Marked the single-epoch 2026-08-01 DE441 cache as non-promoted evidence rather than continuous ephemeris.
- Enforced the JPL approximate-element 1800–2050 validity interval; out-of-range positions and orbits become unavailable rather than extrapolated.
- Added a traceable NASA/JPL Horizons vector adapter boundary and normalized manifest.
- Added compact four-language source, ephemeris, frame, position-mode, update, and quality display.
- SS-02A browser acceptance passed with Viewer 1, Cesium canvas 1, total canvas 2, restored Earth ownership, and zero required Console or Network failures.

### Solar System SS-02B

- Added NAIF `naif0012.tls` UTC→TDB conversion with explicit pre-1972 and future leap-second quality boundaries.
- Added a reproducible official Horizons synchronization pipeline with gzip raw responses, SHA-256 provenance, normalized vectors, manifest promotion state, and keep-last-validated-ready structure.
- Promoted a 2025–2028 multi-epoch dataset for the Sun-centred eight planets and parent-centred Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Enceladus, Titan, Titania, and Triton.
- Replaced the eleven representative satellite mean-orbit positions with cached Horizons vectors and cubic-Hermite interpolation; outside promoted coverage they become unavailable.
- Added overlapping coloured point → intermediate marker → solid-sphere LOD with physical and display radii stored separately and visual scaling disclosed.
- Passed 46 independent withheld-epoch Horizons comparisons, 117 repository Node tests, four-language browser checks, and ten resource-lifecycle cycles with Viewer 1, Cesium canvas 1, total canvas 2, zero primitive growth, zero required Console exceptions, and zero required Network failures.
- Titania orbital positioning was updated; the deferred Titania surface-image/projection issue was not modified.

### Solar System SS-02C

- Added JPL SBDB source adapters, compressed raw snapshots, checksums, normalization, promotion manifest, and validation for dwarf planets and the Main Belt.
- Added Ceres, Pluto, Eris, Haumea, and Makemake with Unified Object Cards; unavailable SBDB diameters remain unavailable and are not replaced with invented sphere sizes.
- Added authoritative cached Horizons states for the five named dwarf planets at the shared Display Epoch.
- Added a non-decorative Main Belt catalog subset: 5,366 SBDB `MBA / H<13` matches, represented as 5,365 unique batched points plus Ceres once as the named dwarf object.
- Added deterministic adaptive LOD (256 / 1,024 / 5,365), stable `H,pdes` ordering, one batched point collection, and complete camera-listener cleanup.
- Passed 27 direct-Horizons comparisons, 123 repository Node tests, five dwarf Object Cards, four-language terminology, adaptive LOD, and ten lifecycle cycles with Viewer 1, Cesium canvas 1, total canvas 2, required Console 0, and required Network 0.

### Solar System SS-02D

- Added an official JPL SBDB known-catalog TNO pipeline with compressed raw snapshot, checksums, normalized deterministic ordering, promotion manifest, and keep-last-validated fallback policy.
- Added 7,155 unique known TNO points from 7,160 synchronized upstream records; four named dwarf planets remain owned once by SS-02C and one incomplete element record is explicitly excluded.
- Added deterministic adaptive LOD (256 / 1,024 / 7,155), one batched point collection, one removable camera listener, selection, Unified Object Cards, and four-language TNO/Kuiper Belt terminology.
- Explicitly reports representative Kuiper Belt population as unavailable; no synthetic points, random density, or scientifically exact solid ring are generated.
- Passed 16 direct-Horizons comparisons, 128 repository Node tests, Sedna provenance card, four-language terminology, adaptive LOD, and ten lifecycle cycles with Viewer 1, Cesium canvas 1, total canvas 2, required Console 0, and required Network 0.

### Solar System SS-02E

- Added a deterministic nine-object priority comet subset sourced from JPL SBDB, including 1P/Halley, with raw snapshots, solution provenance, formal sigmas, non-gravitational parameters, and explicit incomplete-catalog status.
- Added promoted 2025–2028 closest-apparition Horizons vectors and shared Display Epoch interpolation; 21P uses one-day cadence after the three-day candidate failed its validation gate.
- Added one batched comet point collection and relevant Unified Object Card fields without drawing convenient but unrelated full-period orbit ellipses or fabricating next-perihelion dates.
- Added nine IAU/IMO meteor-shower event relationships with activity window, typical peak, radiant, parent body, Earth-stream intersection meaning, source, and confidence; uncertain or qualified parent attributions remain explicit.
- Added compact four-language Comets and Meteor Showers controls using the existing language state.
- Passed 18 direct-Horizons comparisons, 134 repository Node tests, Halley and uncertain-parent Object Cards, four-language terminology, and ten lifecycle cycles with Viewer 1, Cesium canvas 1, total canvas 2, required Console 0, and required Network 0.

### Solar System SS-02F

- Added one periodic orchestrator for the existing Horizons/SBDB adapters, isolated candidate ingestion, validation gates, compressed raw evidence, normalized datasets, and manifests.
- Added rollback-capable set promotion: every artifact is staged before deployed files are exchanged, and any exchange failure restores the complete last validated set.
- Added machine-readable validated/stale synchronization status, last-success timestamp, bounded failure disclosure, and an explicit keep-last-validated fallback policy.
- Added four-language runtime sync status and Object Card last-update display without claiming real-time catalog updates.
- Passed 46 + 27 + 16 + 18 independent position comparisons, seven meteor-relationship checks, 144 repository Node tests, and ten browser lifecycle cycles with Viewer 1, Cesium canvas 1, total canvas 2, required Console 0, and required Network 0.

### Solar System SS-02G

- Completed and froze the Solar System SS-02 Release Audit without starting Deep Space Phase 4A or closing the separate Foundation hardware-gesture audit.
- Passed 150 repository Node tests and 107 authoritative position comparisons across major bodies, dwarf/Main Belt, TNO, and comet classes.
- Confirmed 12,534 unique small-body SPK-IDs, Gaia DR3/J2016.0 metadata, Milky Way 201 points, Local Group 102 points, Unified Object Cards, Pointer-Anchored Navigation, Earth ownership, mobile layout, and ten cross-scale lifecycle cycles.
- Final browser audit held Viewer 1, Cesium canvas 1, total canvas 2, required Console 0, required Network 0, and no DataSource/primitive growth.
- Recorded headless SwiftShader performance as environment-specific evidence; it is not presented as a physical-device guarantee.

### Solar System Playback and Analysis Correction

- Replaced fixed playback presets with a user-editable `0.01–30 days / second` control and an explicit 1800–2050 major-planet playback boundary.
- Removed daily playback-time Solar Entity teardown/recreation. Major bodies now retain stable Entity identity while positions update in place.
- Changed Main Belt and TNO epoch propagation from one blocking 12,520-object loop to bounded per-frame chunks; comet and major-body updates remain current without adding a renderer or animation loop.
- Throttled metadata/Object Card DOM refresh to four updates per second while Cesium body positions continue to update on the existing Viewer clock.
- Scientific/Exhibition scale changes now reframe the current Solar target, and body or catalog-point selection automatically focuses the selected object.
- Added a traceable Deep Space selection bridge into Scientific Analysis. Comet coordinates, orbit elements, epoch, uncertainty, sources, status, and limitations are available without claiming AI inference.
- Added real-WebGL acceptance for 30 days/second stable identities and visibility, scientific-scale focus, comet analysis context, frame pacing, Console, and Network state.

### Current Boundary

- SS-02G remains reopened pending human production visual confirmation; Solar System SS-02 is not refrozen by this correction.
- v2.2.0 remains Preview; Foundation physical gesture evidence is still open, and Deep Space Phase 4A remains not started.

## [v2.1.0] — 2026-08-01

Status: Stable

### Added

- Deep Space Phase 1 Solar System foundation.
- Deep Space Phase 2 Gaia nearby-star layers at 10, 25, 50, and 100 pc.
- Deep Space Phase 3 Milky Way reconstruction, 199 Reid et al. HMSFR tracers, and 102-row Local Group catalog visualization.
- Proper-motion analysis, local catalog search, selection, data-quality layer, and LOD.
- Eleven representative natural satellites and mission-derived imagery.
- Scientific and Exhibition Scale and four-language Deep Space UI.
- Regional Mode for Taiwan and Japan.

### Changed

- Extended Solar System and Deep Space scale navigation.
- Extended the natural-satellite hierarchy and celestial-body registry.
- Improved Deep Space resource lifecycle and data-source labeling.

### Fixed

- Corrected satellite white-sphere material failures.
- Replaced procedural satellite previews with traceable mission imagery.
- Corrected Cesium texture lifecycle and asynchronous body-overwrite behavior.
- Preserved single Viewer reuse and GitHub Pages-compatible asset paths.
- Synchronized active Phase 3 scale titles, navigation labels, information headings, and accessibility text with runtime language changes.

### Known Issues

- Titania lower-hemisphere imagery coverage / projection remains a frozen, deferred issue.
- Cold-start offline operation still depends on the Cesium CDN.
- Deep Space Phase 4 has not started.
