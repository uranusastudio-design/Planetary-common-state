# Deep Space Phase 3 Sources

Phase 3 separates `catalog-observation`, `observation-based-reconstruction`, and `representative-visualization`. It does not describe the external Milky Way view as a photograph and does not generate random tracers or galaxies.

## Catalog observations

- Reid et al. (2019), *Trigonometric Parallaxes of High-mass Star-forming Regions: Our View of the Milky Way*, ApJ 885:131, [paper DOI](https://doi.org/10.3847/1538-4357/ab4a11), [VizieR catalog DOI](https://doi.org/10.26093/cds/vizier.18850131). Deployed: all 199 published HMSFR measurement rows.
- McConnachie (2012), *The Observed Properties of Dwarf Galaxies in and around the Local Group*, AJ 144:4, [VizieR catalog DOI](https://doi.org/10.26093/cds/vizier.51440004). Deployed: all 102 catalog rows; 101 have catalog-derived 3D positions. The Milky Way row has no adopted heliocentric distance and is not assigned an invented catalog position.
- Sagittarius A* uses the source contract's SIMBAD name and ICRS J2000 radio-position reference (2011AJ....142...35P).

## Reconstruction and representative context

- Spiral-arm membership and tracer geometry are reconstructed only from Reid catalog rows and published arm codes.
- Galactic disk and bar are observation-based scale context using the fixed `R0 = 8.15 kpc` frame documented in `source-contract.json`.
- Marker pixels, Local Group boundary context, and the observer-origin Milky Way reference are representative visualization, not physical diameters or a claimed Local Group barycenter.

## Reproducibility

Queries are stored in `scripts/phase3-reid2019.query.txt` and `scripts/phase3-local-group.query.txt`. Run `scripts/build-phase3-catalogs.py` to rebuild and `scripts/validate-phase3-catalogs.py` to validate counts, checksums, coordinates and registries. Raw TSV checksums and query timestamps are recorded in `catalog-metadata.json`.
