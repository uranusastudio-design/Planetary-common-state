# PCS Astronomical Scale Architecture

Status: Milky Way scientific-scale anchor contract, 2026-08-12.

## One Observatory

PCS uses one Observatory, one Cesium Viewer, and one Cesium canvas. A scale change changes active datasets, level of detail, camera limits, coordinate context, labels, and scientific meaning. It does not create another simulation or WebGL universe.

The intended observation sequence is:

`Solar System → Interstellar Objects → Nearby Stars → Milky Way → Local Group → Virgo → Laniakea → Cosmic Web → Observable Universe → CMB 360°`

Local Group, nearby groups, Virgo, and Cosmic Web are scientific transition layers. They do not change the approved primary release milestones.

## Scientific fidelity levels

| Level | UI label | Meaning | Current or planned use |
| --- | --- | --- | --- |
| A | Precision Ephemeris | Position and time behavior derive from an authoritative ephemeris or validated orbital solution. | Solar System and interstellar-object trajectories. |
| B | Catalog-Derived | Position and identity derive primarily from an astronomical catalog. | Gaia/GCNS stars, Reid HMSFRs, catalog galaxies and catalog landmarks. |
| C | Observation-Derived Reconstruction | Measurements constrain a reconstructed structure; visible tracers need not be individually measured objects. | Whole Milky Way, spiral arms, disk, bar, bulge, halo and cluster-scale context. |
| D | Representative Large-Scale Visualization | Survey density, reconstructed topology, flow, or statistically constrained structure is represented without claiming exact coordinates for every point. | Laniakea, Cosmic Web and Observable Universe context. |
| E | Observational Sky Map | An observed all-sky product is projected on the celestial sphere. | Future CMB 360° boundary. |

The runtime contract is implemented in `astronomical-scientific-fidelity.js`. Each scale has a distance domain, default fidelity, datasets, visible classes, LOD policy, coordinate frame, camera domain, and precision disclaimer. A selected catalog object may use Level B while its enclosing whole-galaxy view remains Level C.

## Meaning changes with scale

- Solar System: individually selectable bodies and open or closed trajectories remain Level A where source contracts support them.
- Nearby Stars: Gaia/GCNS records retain catalog identity and Level B uncertainty metadata.
- Galactic neighborhood: catalog stars coexist with a deterministic density representation. Their categories remain distinct.
- Whole Milky Way: the default becomes Level C. Disk, arm, bar, bulge, and stellar-halo tracers describe a reconstruction; they are not billions of individually measured stars.
- Larger scales: Levels C and D explicitly replace object-level precision where observations do not support it.
- CMB: Level E will describe a sky projection, not a physical wall or known three-dimensional last-scattering surface topology.

## Coordinate frames

Source records retain their native ICRS/equatorial or Galactic coordinates and source epoch. The Milky Way transform is:

`source ICRS → IAU Galactic rotation → heliocentric Galactic Cartesian → translation by adopted R₀ and z☉ → PCS Galactocentric Cartesian`

The PCS Galactocentric frame is right-handed, centered on the adopted Galactic Center/Sagittarius A* reference. Positive x points from the Sun toward Galactic longitude `l = 0°`, so the Sun is at negative x. Positive y points toward `l = 90°`; positive z points toward the IAU North Galactic Pole. The deployed anchor is `R₀ = 8.178 kpc`, with statistical and systematic uncertainty retained separately, and `z☉ = 20.8 pc`.

Cesium scene scaling is a display transform applied after the scientific coordinate transform. It changes viewable magnitude, never source coordinates or scientific orientation. Face-on, oblique, below-plane, and edge-on camera presets rotate the camera around the same data; they do not rotate the Galaxy to improve its appearance.

## LOD, provenance, and identity

Catalog records and representative tracers use separate primitive collections. Representative samples use a versioned seed and fixed device budgets, are built once per layer load, and are not resampled each frame. Near/far alpha transitions change visibility without changing identity or scientific category.

Representative density tracers are not pickable and receive no Object Card or invented star name. Structure cards report source, reconstruction method/status, fidelity, uncertainty, and limitations. Catalog cards retain their catalog identity. The runtime layer audit is stored in `assets/deep-space/milky-way-scientific-scale/source-contract.json`.

## Uncertainty and precision

Displayed precision follows source uncertainty. Catalog epochs, distance errors, model assumptions, source coverage, and reconstruction limits remain attached to records or structure contracts. JavaScript floating-point precision is not treated as observational precision.

## Future boundaries

- Laniakea must show catalog/redshift data separately from reconstructed peculiar-velocity flow and inferred basin context. It must not be a sharply bounded solid object.
- Observable Universe must show observed, catalogued, reconstructed, representative, and unknown/unobserved status where appropriate. PCS does not claim to contain all objects in the observable Universe.
- CMB 360° must load an authoritative all-sky product and label it as a celestial projection. It is the final observational scale, not a literal surrounding shell.

These future contracts exist to prevent later scales from silently inheriting object-level precision semantics. Their release remains gated and is not completed by the Milky Way task.
