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

### Current Boundary

- Solar System SS-02A–E are frozen; SS-02F is the active next sub-stage.
- Deep Space Phase 4A remains not started.

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
