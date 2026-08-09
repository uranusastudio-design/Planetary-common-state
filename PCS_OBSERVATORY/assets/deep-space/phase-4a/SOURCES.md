# Deep Space Phase 4A sources

## Production catalog

- Kourkchi, E. & Tully, R. B. (2017), *Galaxy Groups within 3500 km/s*, ApJ 843, 16, DOI `10.3847/1538-4357/aa76db`.
- CDS/VizieR catalog `J/ApJ/843/16`, tables 2 and 3.
- VizieR service DOI `10.26093/cds/vizier`.
- PCS retrieval date: 2026-08-09.
- The raw ReadMe and compressed source tables are retained under `raw/`; SHA-256 values are locked in `source-contract.json`.

VizieR states that retrieved data are free to use in a scientific context, while the original authors, publication, publisher and VizieR service must be cited. Commercial use requires a separate source-specific review. PCS uses the catalog for scientific visualization and retains all required provenance.

## Deployment scope

Phase 4A includes all catalog groups with at least two members and a published group distance from 2 through 12 Mpc. This is a deterministic PCS deployment scope, not a claimed physical boundary. It excludes the already implemented Local Group and includes 77 groups and 456 member-galaxy records.

Only galaxies with a published positive individual distance receive a 3D point. Records without an individual distance remain available to identity, search and Object Cards, with distance shown as `Unavailable`; PCS does not substitute the group distance.

Group distance is the source catalog's weighted aggregate of available Cosmicflows-3 member distance moduli. It is not redshift-derived. Membership is the catalog assignment; no numeric per-member membership probability is published.

## Coordinate and distance contract

- Equatorial member positions: ICRS/J2000.
- Galactic and Supergalactic coordinates: published catalog values.
- 3D placement: published Supergalactic longitude/latitude plus the actual published group or individual distance.
- Transform identifier: `pcs-supergalactic-astropy-v1`.
- Cosmology: none for Phase 4A catalog distances.
- Radial velocities: published heliocentric and Local Sheet values; PCS does not silently convert either velocity to a distance.

Catalog objects use the `Catalog Observation` visual grammar. Marker pixel size is a representative navigation aid and is not a physical galaxy or group diameter.
