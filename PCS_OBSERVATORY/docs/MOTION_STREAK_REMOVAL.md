# Motion Streak Removal Audit

Status: **Removed / Frozen**

Decision authority: human visual review

Release boundary: **v2.2.0 In Development**

Stable baseline: **v2.1.0 Stable / Frozen — unchanged**

## Decision

The Deep Space Motion Streak / micro-glow experiment did not meet the requested visual standard. It is removed, not awaiting acceptance, and is not an active PCS Observatory feature.

## Removed scope

- the transient polyline collection and all trail material/rendering code;
- previous/current projected screen-position tracking;
- per-object streak candidate interfaces;
- density, dead-zone, starting, moving, and settling state logic;
- input-gating and navigation event listeners;
- camera-flight suppression hooks used only by the experiment;
- mode controls, stored preference, four-language experiment copy, and accessibility labels;
- trail-picking identity adapters;
- controller construction, disposal, and debug state;
- active-feature documentation and release-center entries;
- the obsolete feature unit and browser-acceptance harnesses.

Historical generated evidence remains historical only and does not make the removed experiment active.

## Preserved rendering path

Nearby Stars, Milky Way catalog tracers, and Local Group catalog markers continue to use their existing Cesium `PointPrimitiveCollection` paths. Their point colours, pixel sizes, labels, catalog identities, search paths, selection paths, and Unified Object Cards are unchanged. The optional Nearby Stars proper-motion comparison vectors are a separate scientific analysis layer and were not removed.

Earth render ownership, Gaia epoch metadata, Pointer-Anchored Navigation, Orbit Precision, solid Solar System entities, and Deep Space Phase 1–3 remain in place.

## Verification

Static and unit verification:

- 109 Node tests passed;
- removed module, control selectors, event names, controller symbols, candidate methods, and independent animation-loop calls are absent from runtime source;
- `data/releases.json` parses and contains no active Motion Streak roadmap, asset, latest-addition, or documentation entry.

Browser verification:

- 10 / 25 / 50 / 100 pc normal point fields loaded and retained stable point and primitive counts during camera movement;
- Milky Way and Local Group normal point fields loaded;
- 20 open/close cycles returned to the exact primitive baseline;
- Viewer: 1;
- Cesium canvas: 1;
- total canvas: 2, unchanged;
- orphan primitive growth: 0;
- required Console errors: 0;
- required Network failures: 0;
- independent `requestAnimationFrame` loop: absent.

Machine-readable evidence: `test-results/motion-streak-removal/report.json`.

## Freeze rule

This removal is frozen. Reintroducing any camera-motion trail visualization requires a new explicit human instruction and a new design/acceptance scope. Solar System SS-02 does not authorize reintroduction.
