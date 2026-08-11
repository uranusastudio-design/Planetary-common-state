# PCS Deep Space — Milky Way Scientific Scale

Status: **local scientific, functional, WebGL, performance, stability, and visual acceptance passed; production deployment pending**

## Scope and release boundary

This layer connects the existing Nearby Stars catalogs to the existing Local Group scale without creating a second renderer, camera, search, card, or language system. It does not change the PCS core model, `L(t)`, the five residuals, Earth Viewer, Solar System SS-02, Full Orbit View, or frozen Phase 4 science products. Laniakea and Observable Universe are not part of this task.

The implementation reuses the one existing Cesium Viewer and canvas. The Milky Way is an observation-constrained reconstruction with deterministic representative density context. It is not an external photograph, a generic perfect spiral, or a catalog of billions of individual stars.

## Audit classification

| Existing or added material | Scientific class | Treatment |
| --- | --- | --- |
| 199 Reid et al. high-mass star-forming regions | Catalog observation | Real source IDs, astrometry, uncertainty, arm code, and provenance retained |
| Existing Gaia/GCNS Nearby Stars bridge | Catalog astrometry | Real Gaia identity and J2016.0 metadata retained; positions are not moved for appearance |
| Sun, Galactic Center, Sgr A* | Adopted reference / catalog observation | Navigation markers are visibility-enhanced and explicitly not physical-size renderings |
| Reid et al. Table 2 spiral-arm fits | Observation-based reconstruction | Rendered only inside published arm-segment beta ranges |
| Disk, bar, bulge, stellar halo particles | Representative density visualization | Deterministic tracers; never labeled as observed individual stars |
| LMC and SMC | Catalog observation | McConnachie sky direction, distance, uncertainty, and identity retained |
| Former 1.5 Mpc Local Group circle | Representative placeholder | Removed; PCS does not claim a rigid Local Group boundary |

## Coordinate architecture

The deployed frame is `pcs-galactocentric-gravity2019-v2`, right-handed and centered on the adopted Galactic Center / Sagittarius A* reference.

- `+x`: from the Sun toward Galactic longitude `l = 0°`; the Sun is therefore at negative x.
- `+y`: toward heliocentric Galactic longitude `l = 90°`.
- `+z`: toward the IAU North Galactic Pole.
- Sun: `[-8.178, 0, +0.0208] kpc`.
- Galactic Center and Sgr A*: `[0, 0, 0] kpc` in the adopted display frame.

The Sun–Galactic-Center distance is `R0 = 8.178 ± 0.013(stat) ± 0.022(sys) kpc`, from GRAVITY Collaboration 2019, DOI `10.1051/0004-6361/201935656`. Solar height is `zSun = 20.8 ± 0.3 pc`, from Bennett & Bovy 2019, DOI `10.1093/mnras/sty2813`.

Supported source coordinates are ICRS right ascension/declination, IAU Galactic longitude/latitude, heliocentric distance and Galactic Cartesian coordinates, and PCS Galactocentric Cartesian coordinates. The transform is:

`source ICRS/Galactic + source distance → IAU ICRS-to-Galactic rotation → heliocentric Galactic Cartesian → translation by R0 and zSun`

No source coordinate is changed to make the galaxy look attractive. Source astrometric epochs remain attached to catalog records; the structural frame itself is static.

## Galactic Center and Sagittarius A*

The Galactic Center is a reference structure anchor. Sagittarius A* is a separate searchable compact radio source / supermassive black-hole record with aliases, ICRS coordinates, Galactic coordinates, distance, mass, frame, sources, and limitations.

The deployed Sgr A* position is based on Xu et al., DOI `10.3847/1538-4357/ac98b9`; the mass field is `4,297,000 ± 40,000 M☉` from GRAVITY orbital analysis, DOI `10.1051/0004-6361/202142465`. Its rendered point is a visibility-enhanced representative marker, not a physically enormous sphere.

## Structural model

### Spiral arms and Local Arm

The arm model uses the kinked log-periodic fits in Reid et al. 2019 Table 2, DOI `10.3847/1538-4357/ab4a11`, catalog DOI `10.26093/cds/vizier.18850131`:

`ln(R / Rkink) = -(β - βkink) tan(pitch)`

Norma, Scutum–Centaurus, Sagittarius–Carina, Local, Perseus, and Outer segments preserve their published beta range, kink radius/angle, pitch angles, width, and uncertainty. No arm is extended into an unobserved sector to create visual symmetry. The source fit assumed `R0 = 8.15 kpc`; that native assumption remains explicit while the PCS display anchor uses GRAVITY 2019 `R0 = 8.178 kpc`.

The Local Arm / Orion Spur is an isolated fitted segment, not a fabricated complete major arm. Its navigation anchor is the nearest point on the published segment to the Sun and is model-derived. This creates a continuous path from real Nearby Stars to the Solar neighborhood, Local Arm, and whole Milky Way without replacing the scene with an unrelated image.

### Disk, bar, bulge, and halo

- Thin disk: radial scale `2.6 ± 0.5 kpc`, vertical scale `0.30 ± 0.05 kpc`.
- Thick disk: radial scale `2.0 ± 0.2 kpc`, vertical scale `0.9 ± 0.2 kpc`.
- Displayed stellar-disk radial extent: 18 kpc; this is an adopted display-model extent, not a sharp physical edge.
- Bar: half-length `5.0 ± 0.2 kpc`, adopted angle `30.5°` inside the cited 28–33° range.
- Bulge: representative triaxial density context aligned with the bar; its semi-axes are display-model parameters, not a sharp ellipsoid claim.
- Stellar halo: flattened broken-power-law tracer context, inner/outer slopes 2.3/4.6, break radius 27 kpc, flattening `q = 0.6`, displayed to 40 kpc.

Disk parameters follow Bland-Hawthorn & Gerhard 2016, DOI `10.1146/annurev-astro-081915-023441`; bar/bulge context follows Wegg, Gerhard & Portail 2015, DOI `10.1093/mnras/stv745`; stellar-halo context follows Deason, Belokurov & Evans 2011, DOI `10.1111/j.1365-2966.2011.19243.x`. No dark-matter-halo geometry is rendered.

## Catalogs, LMC/SMC, and provenance

- Reid HMSFR: VizieR `J/ApJ/885/131/table1`, 199 records, raw snapshot SHA-256 `9e1ed78253b93ef0471aa8e3733d5d0df3784b13eb0a0f2b96207904f674e45a`, retrieved 2026-08-01.
- Gaia bridge: existing Gaia EDR3 GCNS 10/25/100 pc snapshots at reference epoch J2016.0. Desktop displays at most 1,200 real records; mobile displays 350. Existing catalog IDs, coordinates, distance provenance, uncertainties, and Object Cards remain unchanged.
- LMC/SMC: McConnachie 2012 VizieR `J/AJ/144/4/catalog`; raw snapshot SHA-256 `15454e33f672af4f066b767607f4a4bfbeead5e2ef82bdc1444312c146478ef5a`. LMC uses `51 ± 2 kpc`; SMC uses `64 ± 4 kpc`. Both remain outside the displayed stellar disk.

The source adapter records source, catalog/release, retrieval date, coordinate system, epoch, units, transform, uncertainty fields, license/citation requirements, and limitations in `assets/deep-space/milky-way-scientific-scale/source-contract.json`. The major source families are also registered in the shared astronomical source registry.

## Deterministic LOD and rendering

Model version is `2026.08-reid2019-gravity2019`; deterministic seed is `4172019`. Same contract plus same seed produces byte-equivalent model output.

| LOD | Desktop | 390×844 mobile | Scientific meaning |
| --- | ---: | ---: | --- |
| Real HMSFR catalog | 199 | 199 | Catalog observations |
| Real Gaia/GCNS bridge | 1,200 | 350 | Catalog astrometry |
| LMC/SMC | 2 | 2 | Catalog observations |
| Disk/bar/bulge/halo density tracers | 8,850 | 3,060 | Representative density visualization |
| Spiral-arm density tracers | 2,600 | 900 | Observation-based reconstruction rendered as model-derived density bands |
| Total representative tracers | 11,450 | 3,960 | Deterministic, non-catalog context |

Cesium `NearFarScalar` transitions blend real catalog context and aggregate density without a hard scene replacement. Seven removable primitive collections cover catalog, Gaia bridge, density, arms, satellites, labels, and the optional Galactic Plane. No additional Viewer, canvas, WebGL context, RAF loop, or per-particle DOM node is created.

## Camera, orientation, and navigation

The existing Astronomical Camera Scale architecture now includes `SOLAR NEIGHBORHOOD`, `LOCAL ARM`, `GALACTIC DISK`, and `MILKY WAY`. Camera range is derived from astronomical bounding volume, current Viewer dimensions, projection FOV, aspect ratio, and margin. `setMilkyWayCamera()` first synchronizes the existing Viewer size, preventing stale ultrawide frustum state from corrupting portrait/mobile fit.

Supported views are Solar neighborhood, Local Arm, face-on, oblique, edge-on, below-plane, whole-Milky-Way fit, and Milky Way + Magellanic Clouds fit. Near/far clipping and maximum zoom range update through the shared camera system. Blank-space and Back use the existing Camera History. The optional Galactic Plane is a subtle Galactocentric reference and is explicitly distinct from the ecliptic and equatorial planes.

Search supports Milky Way, Galactic Center, Sagittarius A*, Sgr A*, Sun, Solar System, Local Arm, Orion Spur, Large Magellanic Cloud, LMC, Small Magellanic Cloud, SMC, named arms, and the deployed real catalog identities. Selection preserves spatial identity and uses Unified Object Cards. Traditional Chinese, English, Japanese, and Korean reuse the existing language state.

## Local acceptance

### Functional and lifecycle

- Full Node regression: 219/219 PASS; 0 fail, 0 skipped, 0 todo.
- Required searches and Unified Object Cards: PASS in all listed aliases.
- Four-language runtime switching: PASS without Viewer/canvas recreation.
- Blank-space Camera History Back: PASS.
- Full Orbit regression: 361-point closed Halley path remains available.
- Viewer: 1; Cesium canvas: 1.
- Stability operations: 50 Nearby Stars↔Milky Way cycles, 50 fit cycles, 30 Sun focuses, 30 Galactic Center/Sgr A* focuses, 30 LMC/SMC focuses, 30 searches, 30 Object Card selections, and 30 orientation changes.
- Stability before/after: scene primitives 11→11, DataSources 4→4, total canvases 2→2, and listener counts unchanged (`camera.changed` 5, `moveEnd` 4, `postRender` 2).
- Stability-window JS heap: 313,214,652→256,898,982 bytes. Full long-run heap delta, including five resize/load matrices and screenshot capture, was +128,195,881 bytes; this is an observation, not proof of universal leak absence.
- Console exceptions: 0. Required network failures: 0. Optional local connector failures were retained in raw diagnostics and are not production assets.

### Performance

These are observed Chrome/CDP values on this workstation, not a universal 60 FPS claim. Draw-call count is unavailable from the deployed Cesium runtime, so primitive collections and frame timing are reported instead.

| Viewport | Visible points | Avg FPS | Lowest observed FPS | Avg frame time | Milky Way primitive collections |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1920×1080 | 12,855 | 60.56 | 53.19 | 16.51 ms | 7 |
| 2560×1440 | 12,855 | 49.33 | 29.07 | 20.27 ms | 7 |
| 3840×2160 | 12,855 | 21.75 | 12.03 | 45.99 ms | 7 |
| 5120×2160 | 12,855 | 15.88 | 10.11 | 62.96 ms | 7 |
| 390×844 | 4,515 | 60.22 | 53.48 | 16.61 ms | 7 |

All five fits kept 100% of measured visible point primitives inside the viewport. The lower 4K/5K2K rates are disclosed rather than generalized away.

### Visual acceptance

The following final screenshots were opened and inspected manually:

1. `A-solar-neighborhood-inside-local-arm.png`
2. `B-sun-and-galactic-center.png`
3. `C-whole-milky-way-face-on.png`
4. `D-whole-milky-way-oblique.png`
5. `E-whole-milky-way-edge-on.png`
6. `F-milky-way-lmc-smc.png`
7. `G-milky-way-to-local-group.png`
8. `H-mobile-390x844.png`

Inspection passed for complete fit, off-center Sun, readable bounded arm segments, 3D thickness, LMC/SMC placement, no rigid Local Group boundary, no fake orbit-like spiral lines, no motion streaks, no duplicate stars, usable panels, and a visible mobile Unified Object Card. Evidence is in `test-results/deep-space-milky-way-local/` with `acceptance-report.json`.

## Known scientific and runtime limitations

- Spiral structure is constrained by young HMSFR tracers and remains incomplete, extinction-affected, and model-dependent.
- Reid arm fits are valid only over their published angular ranges and use a native `R0 = 8.15 kpc` assumption.
- Representative particles encode density only and are not individual stars.
- The 18 kpc stellar-disk and 40 kpc stellar-halo display extents are not sharp physical boundaries.
- Dust/gas volumetric context and a dark-matter halo are not rendered.
- Gaia bridge counts are bounded deployed subsets, not a complete Milky Way census.
- LMC/SMC use catalog direction/distance anchors and visibility-enhanced markers rather than resolved morphology.
- Draw-call telemetry is unavailable; high-resolution performance is materially below 60 FPS on the tested workstation.
- Browser-history integration is not part of the existing viewer contract; in-view Camera History Back is supported.

## Current gate

- [x] Scientific source, coordinate, model, uncertainty, and provenance audit.
- [x] Functional, Node, WebGL, performance, stability, and local visual acceptance.
- [ ] Commit, push, GitHub Pages deployment, production asset verification, and production WebGL/visual acceptance.
- [ ] Milky Way completed/deployed/frozen.

Production deployment must pass before the layer can be marked complete or frozen.
