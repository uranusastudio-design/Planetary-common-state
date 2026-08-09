# Deep Space Phase 4B sources

## Extended Virgo Cluster Catalog

- Source: Kim et al. (2014), *The Extended Virgo Cluster Catalog*, ApJS 215, 22.
- VizieR catalog: `J/ApJS/215/22`, table 2.
- DOI: `10.1088/0067-0049/215/2/22`.
- Snapshot: official CDS/VizieR `ReadMe` and `table2.dat`.
- Coverage: 725 square degrees around Virgo, approximately 3.5 Virgo virial radii.
- Records: 1,589 galaxies; 1,028 `M` members and 561 `P` possible members under the source Virgo infall-model classification.

PCS retains the source RA/Dec (J2000), SDSS DR7 and/or NED heliocentric velocity, VCC/NGC identifiers, morphology, and membership class. Galactic and Supergalactic angles are deterministic coordinate transforms. The velocity summary and displayed `z≈v/c` are derived values and are never used to infer distance.

EVCC table 2 does not publish individual galaxy distances. PCS therefore keeps every individual `distanceMpc` as `null`. The runtime places catalog sky directions on a common 16.5 Mpc navigation shell only as `Representative Visualization`; the Object Card explicitly says that this is the EVCC-adopted cluster reference distance, not an individual measurement.

## Identity and duplicate handling

Canonical PCS identity priority is NGC → VCC → EVCC. Messier identifiers are aliases. The one shared NGC designation found in the snapshot, NGC 4257, maps to two spatially distinct EVCC records; PCS retains two identities qualified by EVCC ID and labels the cross-match ambiguous instead of silently merging them.

## License and use boundary

The deployed snapshot is used in a scientific/educational context with citation to the authors, publication, and CDS/VizieR. Commercial redistribution requires a separate source-specific review. The source registry records this boundary.
