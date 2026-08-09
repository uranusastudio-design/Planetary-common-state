# Phase 4C sources — Laniakea reconstruction context

## Cosmicflows-2 group distances

- Tully, R. B. et al. (2013), *Cosmicflows-2: The Data*, AJ 146, 86.
- DOI: `10.1088/0004-6256/146/4/86`
- Catalog: CDS/VizieR `J/AJ/146/86`, table 2.
- Source rows: 5,224 group aggregates.
- PCS observer-context sample: 2,387 rows with a published positive measured group distance not exceeding 80 Mpc.
- The 80 Mpc value is a deterministic PCS sampling window, not a Laniakea boundary.
- ReadMe SHA-256: `fc11ce364da65f506748c693f9405b7b54fac5e62c0b4306cfd576db5d7eb42d`.
- `table2.dat.gz` SHA-256: `426199ce456ed56277194bed4d10fcde8249e7e710b3b614f445a6109cd8ceb5`.

PCS preserves the source-published Galactic/Supergalactic coordinates, weighted measured group distances, fractional distance errors, named-frame velocities and radial peculiar velocities. No redshift is converted into distance. The source peculiar-velocity convention uses H0 = 74.4 km/s/Mpc; adjusted velocities use Ωm = 0.27 in a flat topology.

## Laniakea interpretation

- Tully, R. B. et al. (2014), *The Laniakea supercluster of galaxies*, Nature 513, 71–73.
- DOI: `10.1038/nature13674`.
- arXiv: `1409.0880`.

Laniakea is classified as `Observation-based Reconstruction`. PCS does not redistribute a publication figure and does not deploy a rigid basin surface because no validated machine-readable boundary artifact is present in this source snapshot. Catalog points remain `Catalog Observation`; displayed observer-line arrows are the source radial peculiar velocities and are `Derived Measurement`, not the full three-dimensional Wiener-filter flow field.

Newer Cosmicflows results can revise basin relationships. They enter staging and require a separate scientific audit before production use.
