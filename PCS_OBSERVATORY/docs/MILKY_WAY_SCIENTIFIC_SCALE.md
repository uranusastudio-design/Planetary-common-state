# Milky Way Scientific Scale

Status: scientific-scale anchor implementation contract, 2026-08-12.

## Purpose

The Milky Way view is the first explicit transition from object-level precision to catalog observation and observation-derived reconstruction. It reuses the existing PCS Deep Space manager, Cesium Viewer, canvas, camera history, Object Card, search, navigation, and language event system.

The view is not a photograph of the Galaxy and does not imply that each particle is an observed star.

## Deployed data and visible layers

| Layer | Deployed content | Scientific category | Selectable |
| --- | --- | --- | --- |
| Gaia bridge | Up to 1,200 desktop or 350 mobile Gaia EDR3/GCNS nearby-star records | Catalog-derived, Level B | Yes |
| HMSFR catalog | 199 Reid et al. (2019) high-mass star-forming-region records | Catalog-derived, Level B | Yes |
| Sun and Sagittarius A* | Measured/adopted reference anchors with enhanced marker size | Catalog-derived/reference, Level B | Yes |
| Galactic Center | Adopted structural origin | Observation-derived reconstruction, Level C | Yes |
| Disk | Deterministic thin/thick disk density sampling constrained by published structural parameters | Representative visualization within Level C | No tracer identity |
| Bar and bulge | Deterministic density sampling from observation-derived structural parameters | Representative visualization within Level C | Structures only |
| Spiral arms | Reid et al. (2019) source-bounded reconstructed arm segments | Observation-derived reconstruction, Level C | Structures only |
| Stellar halo | Deterministic stellar-density context from a published tracer model | Representative visualization within Level C | No tracer identity |
| LMC and SMC | Catalog sky direction and distance anchors | Catalog-derived, Level B | Yes |
| Plane/grid | Galactocentric axes and reference rings | Representative coordinate guide, Level C | No |

No additional globular-cluster, open-cluster, nebula, or three-dimensional molecular-cloud catalog is packaged in this release. PCS leaves these layers absent instead of synthesizing identities or arbitrary volumes. The synthetic/decorative visible-object count is zero.

## Coordinate contract and Sun continuity

The scientific frame is `pcs-galactocentric-gravity2019-v2`. It retains source ICRS/Galactic coordinates and translates validated heliocentric positions using the adopted Galactic Center distance and Sun height. The Sun is located at `[-8.178, 0, 0.0208] kpc`; the Galactic Center is the origin.

The outward continuity is:

`Sun → Gaia nearby neighborhood → Local Interstellar Neighborhood → Local Arm / Orion Spur → Galactic disk → whole Milky Way`

The Sun marker reads “You Are Here / Sun” in the active PCS language. Its point size is visibility-enhanced and is not a physical stellar diameter. The Local Arm is the isolated source-constrained Reid segment nearest the adopted Sun position; PCS does not extend it into a decorative symmetric arm.

Camera orientation presets are view transformations only. They do not alter coordinates, rotate source data, or move the Sun to an artistic location.

## Structure reconstruction

- Disk: exponential radial and vertical density parameters produce deterministic thin- and thick-disk tracers inside an explicitly displayed, non-sharp extent.
- Bar/bulge: observation-derived orientation and scale constraints drive representative ellipsoidal sampling. Display semi-axes are model parameters, not claimed sharp physical boundaries.
- Spiral arms: six fitted Reid arm/segment definitions are sampled only over their published azimuth ranges. The model traces high-mass star-forming regions and is not a unique full stellar-mass map.
- Stellar halo: a broken, flattened stellar-tracer density model provides context to 40 kpc. It is not a dark-matter halo.

## Deterministic LOD budgets

The seed is `4172019`. Representative tracers are regenerated deterministically only when the layer loads and never every frame.

| Profile | Gaia | Thin disk | Thick disk | Bar | Bulge | Arms | Stellar halo | Representative total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | 1,200 | 5,200 | 1,200 | 900 | 1,100 | 2,600 | 450 | 11,450 |
| Mobile | 350 | 1,800 | 420 | 300 | 380 | 900 | 160 | 3,960 |

Catalog, reconstruction, density, halo, labels, and coordinate plane can be controlled separately. Cesium near/far visibility functions provide cross-scale fades. Representative tracers are non-pickable, preventing false Object Cards.

## Search and Object Cards

Milky Way search covers structure aliases, LMC/SMC, all deployed HMSFR records, and the loaded Gaia bridge. `Sun`, `Sirius`, `Sagittarius A*`, `Orion Spur`, `Perseus Arm`, `Galactic Center`, and `Milky Way` resolve to their distinct catalog or structure types.

Every Object Card shows the effective scientific fidelity and data category. Catalog records retain measured identity. Reconstruction records show structure identity, provenance, reconstruction status, uncertainty where supplied, and limitations. Representative density tracers cannot produce a card or fake star identity.

## Sources

- Gaia Collaboration, Gaia EDR3 Gaia Catalogue of Nearby Stars, A&A 649, A6 (2021), DOI `10.1051/0004-6361/202039498`; deployed GCNS snapshot and Gaia documentation.
- Reid et al., *Trigonometric Parallaxes of High-mass Star-forming Regions: Our View of the Milky Way*, ApJ 885, 131 (2019), DOI `10.3847/1538-4357/ab4a11`; VizieR catalog DOI `10.26093/cds/vizier.18850131`.
- GRAVITY Collaboration, Galactic Center distance, A&A 625, L10 (2019), DOI `10.1051/0004-6361/201935656`.
- Wegg, Gerhard, and Portail, Milky Way bar structure, MNRAS 450 (2015), DOI `10.1093/mnras/stv745`.
- Bland-Hawthorn and Gerhard, Galactic structure review, ARA&A 54 (2016), DOI `10.1146/annurev-astro-081915-023441`.
- Deason, Belokurov, and Evans, stellar-halo tracer model, MNRAS 416 (2011), DOI `10.1111/j.1365-2966.2011.19243.x`.

## Deliberate limitations

PCS does not claim an external photograph, a complete census of Galactic stars, exact coordinates for representative particles, sharp disk/arm/halo boundaries, a uniquely known spiral morphology, complete dust correction, a dark-matter-halo geometry, or universal 60 FPS. Source selection effects, extinction, incomplete VLBI coverage, distance uncertainty, and arm-assignment ambiguity remain material.
