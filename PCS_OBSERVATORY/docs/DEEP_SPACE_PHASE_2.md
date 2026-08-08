# Deep Space Phase 2 — Nearby Stars / Gaia

## Scope and frozen boundaries

Phase 2 adds a bounded, catalog-based view of the Solar neighbourhood at 10, 25, 50, and 100 pc. It extends the Phase 1 overlay and reuses the existing single Cesium Viewer, canvas, WebGL context, and Cesium render loop. Phase 1 solar-system entities, ephemeris behavior, time controls, and open/close restoration remain intact.

The Milky Way is only an unavailable Phase 3 label. This phase contains no galactic disk, spiral arms, Local Group, cosmic web, comets, asteroids, exoplanet orbits, generated stars, or civilization analysis. Titania imagery and metadata are frozen and unchanged.

## Catalogs and reproducible queries

The point-cloud source is the Gaia EDR3 Gaia Catalogue of Nearby Stars (GCNS), official Gaia Archive table `external.gaiaedr3_gcns_main_1`. The exact ADQL template is `scripts/nearby-stars-gcns.adql`; `scripts/build-nearby-stars-catalog.py` performs the bounded download and creates versioned website JSON. The browser never queries Gaia or SIMBAD.

Gaia DR3 is used independently for landmark astrometry when SIMBAD resolves a Gaia DR3 identifier. Cross-release `source_id` equality between DR3 and EDR3 is not assumed. SIMBAD supplies names, aliases, and object types only. The Hipparcos new reduction supplements bright/saturated Gaia omissions. Component records without separately usable astrometry are represented by an explicitly co-located system marker; no artificial separation or orbit is drawn.

Official Gaia terms state that Gaia data are open and free to use with ESA/Gaia/DPAC credit. Full source, paper, acknowledgement, and archive links are in `assets/deep-space/nearby-stars/SOURCES.md`.

## Snapshot and LOD

| Tier | Radius | Configured cap | Deployed records | Loading / labels |
|---|---:|---:|---:|---|
| A/B | 10 pc | 1,200 | 303 | full bounded tier; landmark labels |
| C | 25 pc | 5,000 | 4,901 | bounded tier; landmark labels |
| D | 50 pc | 8,000 | 8,000 | medium LOD; selected/landmark labels |
| E | 100 pc | 10,000 | 10,000 | far LOD; strict cap |

Each outer tier carries forward its complete deployed inner tier before it is filled from that radius query and capped. Source IDs are unique within each tier. The tier-file sum is 23,204; the nested unique union is 10,000 because the versioned outer files intentionally repeat inner sources.

Cesium `PointPrimitiveCollection` renders stars, `LabelCollection` renders configured labels, and removable `PolylineCollection` instances render distance circles/axes and optional landmark proper-motion vectors. No star is represented by a full Entity. Switching tiers unloads the prior point, label, guide, and motion collections before adding replacements. Returning to Solar System and closing Deep Space dispose them. No Web Worker is used in this bounded deployment, so there is no worker lifecycle or worker failure surface.

## Quality filters and exclusions

The build requires positive, non-null parallax and `gcns_prob >= 0.5`, applies the documented per-tier magnitude limit, validates finite coordinates, carries inner tiers forward, and applies the configured cap. Exact magnitude, invalid-coordinate, cap, and carry-forward counts are stored in `catalog-metadata.json`.

RUWE alone is not treated as proof of reliability. Classification also considers fractional parallax uncertainty and `ipd_frac_multi_peak`; GCNS probability is filtered at query time. The GCNS main table does not provide every DR3 non-single-star field, so the deployed record says that flag is unavailable instead of inventing it. Status values are `high-confidence astrometry`, `catalog astrometry`, `limited astrometry`, `incomplete 6D state`, `supplemental Hipparcos`, or `representative only`. The optional Data Quality Layer uses outlines and a neutral legend rather than safe/danger language.

## Distance and coordinate handling

GCNS distance uses posterior median `dist_50` (converted from kpc to pc) with `dist_16`–`dist_84` retained as its uncertainty interval. High-quality standalone Gaia DR3 and Hipparcos landmarks may use inverse parallax only when fractional uncertainty is at most 20%; the method is explicit on each record.

The pipeline retains ICRS RA/Dec/parallax and GCNS heliocentric Galactic Cartesian coordinates. Runtime conversion supports:

1. ICRS spherical to heliocentric Cartesian;
2. ICRS Cartesian to Galactic Cartesian with the standard J2000/ICRS rotation matrix embedded in `nearby-stars.js`;
3. parsec to light-year using `1 pc = 3.261563777 ly`;
4. Galactic Cartesian to Cesium scene coordinates.

Scientific mode preserves linear relative positions with a constant scene-unit mapping. Exhibition mode applies a documented radial display compression while preserving angular direction and spatial ordering. Neither mode changes catalog data. Marker size is photometric and visually enhanced; it is not a physical stellar-radius scale.

The marker colour is a deterministic perceptual ramp ordered by measured BP-RP, clamped to `[-0.5, 4]`: below 0.5 the blue/white branch uses `[0.65+0.3c, 0.76+0.2c, 1]`; from 0.5 to 1.5 the warm-white branch uses `[1, 0.94-0.2(c-0.5), 0.78-0.3(c-0.5)]`; above 1.5 the warm branch is capped to avoid pure red. Missing BP-RP uses a neutral blue-white. This is a visualization mapping, not calibrated sRGB, a temperature estimate, or a physical stellar surface colour. Gaia BP-RP remains the source ordering variable.

## Proper-motion analysis

The optional layer is named **Proper motion analysis** and uses bounded **linear astrometric propagation** only for the optional landmark comparison vectors. The main Nearby Stars point field currently remains at each record's catalog reference epoch; it is therefore labelled **Catalog epoch position**, not **Proper-motion propagated**. RA and Dec comparison values are advanced from the record reference epoch using catalog proper motion and clamped to ±100 years. This is not a prediction or a Galactic-orbit integration. A missing radial velocity remains null; no zero is substituted, and the information panel displays `Unavailable` and `3D velocity status: Incomplete`.

## Catalog release, reference epoch, and display epoch

These are separate metadata concepts:

- **Catalog release** is when a source catalog was published. Gaia EDR3 / GCNS v1 was released in 2020; Gaia DR3 was released in 2022. Hipparcos supplement records retain their own source identity and are not relabelled as Gaia.
- **Reference epoch** is the epoch to which the astrometric parameters refer. Gaia EDR3/DR3 astrometry uses J2016.0; Hipparcos supplement records may use J1991.25. It is not a catalog release date.
- **Display epoch** is the current selected PCS Deep Space UTC time state. It updates independently and does not mutate the catalog epoch.
- **Position mode** states whether the rendered point has actually been propagated. The current main point layer is `Catalog epoch position`; only the optional comparison vector uses bounded propagation.
- **3D velocity** is `Complete` only when RA, Dec, parallax, both proper-motion components, and radial velocity are all finite. Missing radial velocity remains null. If the five tangential astrometric components exist, the card may state `Incomplete · Tangential propagation available`.

The Object Card reports the record's real source, so a Gaia DR3 landmark shows catalog release 2022 while a GCNS point shows EDR3/GCNS release 2020. The next-catalog note is informational only: `Gaia DR4 — expected 2026 (not before mid-2026)`. DR4 is not integrated and no placeholder records exist.

## Search and information panel

Search uses only the loaded local landmark index and current deployed tier. It matches common names, Gaia source IDs, HIP/HD/GJ identifiers, and imported aliases. Selection shows a compact Astrometry group containing source, catalog release, reference epoch, display epoch, position mode, 3D velocity completeness, and next-catalog status, followed by the existing scientific fields. Nulls are shown as `Unavailable`, never hidden or converted to zero.

## Offline, reduced, and errors

Catalog files are local GitHub Pages assets and are cached by normal browser HTTP caching. Once loaded, a network loss does not remove in-memory data. A cold offline load is not claimed because the existing Cesium CDN remains a dependency. Missing/invalid catalog responses expose Retry, Use reduced catalog, Return to Solar System, and Close Deep Space actions. Reduced mode loads landmark systems only. Abort tokens prevent stale tier loads from replacing the active view. A failed Phase 2 load does not remove Phase 1 controls or prevent closing the overlay.

## Verification and measured performance

Automated tests cover data validity, nested inclusion, null radial velocities, landmark aliases/systems, coordinate transforms, bounded propagation, single-Viewer architecture, and Phase 1 regression. Browser acceptance covers four tiers, local search, selection, labels, quality, motion, guides, 20 enter/leave cycles, 30 search/focus cycles, four languages, mobile layout, console/network failures, heap, and restoration.

Local headless Google Chrome CDP acceptance at 1280×720 rendered 10,000 objects in the 100 pc tier. Final warm-cache layer timings are stored in `test-results/deep-space-phase-2/acceptance-report.json`. A two-second render sample measured 60.13 FPS. After garbage collection and the full 20-cycle / 30-focus acceptance sequence, JS heap changed from 54,601,612 to 55,495,168 bytes (+893,556 bytes).

At a 390×844 emulated mobile viewport, the configured 100 pc mobile cap rendered 5,000 objects, the two-second sample measured 60.01 FPS, and post-GC heap was 47,690,232 bytes. These are measurements of one headless browser session, not a universal 60 FPS claim. Required Nearby Stars, Deep Space, and Cesium assets had zero network failures and there were no unhandled console exceptions. Existing Observatory requests to the absent local development backend at `127.0.0.1:8787` failed as expected and were recorded separately; they are not Phase 2 resource failures.

## Known limitations

- The 50 and 100 pc tiers are bounded visualization samples, not the full GCNS.
- GCNS/EDR3 and DR3 source IDs are not cross-release joined by assumption.
- Missing GCNS non-single-star flags remain explicitly unavailable.
- Proper-motion vectors are linear, landmark-only, and limited to ±100 years.
- System markers do not resolve close binaries or animate component orbits.
- No worker is used; JSON parsing occurs on the main thread, bounded by the deployed caps.
- Cold-start offline operation is not claimed because Cesium is CDN-hosted.
