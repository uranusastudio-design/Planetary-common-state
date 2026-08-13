# PCS Known Astronomical Objects Catalog

Status: **PHASE A — VALIDATED / NOT FROZEN**

## Scope boundary

Phase A establishes reusable catalog ingestion, normalization, identity, relationship, provenance, diff, review, and promotion contracts. It imports **zero production astronomical objects** and renders **zero objects**. Nebulae, black holes, clusters, Kepler/TESS systems, and runtime integration belong to separately validated Phases B–G.

Database completeness and render count are separate metrics. A later production catalog may contain substantially more records than a scale-aware renderer displays.

## Existing-solution preflight

PCS reuses IVOA TAP rather than inventing a query protocol. Registered authoritative services are:

- CDS [SIMBAD TAP](https://simbad.cds.unistra.fr/simbad/sim-tap);
- CDS [VizieR TAP](https://tapvizier.cds.unistra.fr/TAPVizieR/tap);
- NASA/IPAC [NED TAP](https://ned.ipac.caltech.edu/tap);
- NASA [HEASARC TAP](https://heasarc.gsfc.nasa.gov/xamin/vo/tap);
- NASA [Exoplanet Archive TAP](https://exoplanetarchive.ipac.caltech.edu/TAP);
- STScI [MAST API](https://mast.stsci.edu/api/v0/).

The browser runtime has no package manager and the repository has no Observatory JSON-schema dependency. Phase A therefore records a standard JSON Schema artifact and provides deterministic native validation without adding another runtime dependency or viewer.

## Pipeline

`FETCHED → NORMALIZED → CROSS_MATCHED → VALIDATED → REVIEW_PENDING → APPROVED → PUBLISHED`

The production promotion command requires a checksum-bound human review receipt covering the candidate catalog, validation report, and diff report. Upstream updates cannot silently replace production.

Raw source measurements remain separate from normalized PCS fields. Unknown values become `null`, never numeric zero. Zero remains a valid measurement. Coordinate frame/epoch, distance method/unit, scientific fidelity, evidence class, geometry status, sources, references, and limitations are mandatory parts of the normalized contract.

## Identity and aliases

Cross-matching first uses catalog identifier pairs. Alias lookup uses Unicode-normalized deterministic keys. A shared alias claimed by distinct physical records is quarantined as an unresolved conflict; it is never resolved by load order. Representative records cannot claim real catalog identifiers.

One physical object owns one `pcsObjectId`. Multiple Messier, NGC, IC, Barnard, Gaia, KIC, Kepler, TESS, mission, and common-name identities remain aliases or catalog identifiers on that object.

## Relationships

The graph stores explicit `from`, `predicate`, `to`, evidence class, and source IDs. Missing source or target objects remain unresolved. No parent/host/association relationship is inferred from visual proximity.

## Geometry and scientific fidelity

Measured sky position, observed angular extent, reconstructed 3D geometry, and representative visualization are distinct `geometryStatus` values. A representative nebula volume cannot masquerade as measured 3D structure.

Evidence classes are `MEASURED`, `CATALOG-DERIVED`, `RECONSTRUCTED`, and `REPRESENTATIVE`. Scientific-fidelity levels remain LA–LE and are per object.

## Phase A counts

- Production imported: 0
- Production rejected: 0
- Production unresolved: 0
- Production rendered: 0
- Registered authoritative service capabilities: 6

The validation fixture is explicitly non-production. It exercises four input rows, producing two cross-matched objects, one rejected invalid row, and one unresolved relationship. Those fixture counts are test coverage and must not be reported as catalog content.

Validation result: 265/265 Observatory tests passed, including six Phase A contract tests. All six registered official service capability endpoints returned HTTP 200. Machine-readable evidence is stored at `test-results/known-astronomical-objects-phase-a/validation-report.json`.

## Freeze boundaries

The Solar System Long-Horizon numerical engine and frozen Milky Way architecture are not dependencies of Phase A and are not modified. Later scale routing will consume the catalog through adapters without rewriting those frozen systems.

Phase A status: `[x] Catalog architecture / adapters / normalization / provenance`

## Phase B — Nebulae

Status: **VALIDATED / NOT PUBLISHED / NOT FROZEN**

Phase B validates 18 database objects and three explicit structural relationships. Runtime rendering remains zero until Phases F–G.

Counts:

- Input: 18
- Imported: 18
- Rejected: 0
- Unresolved: 0
- Relationships: 3
- With a source-published preferred distance: 12
- Distance unavailable: 6
- Rendered: 0

Evidence classes are 1 `MEASURED` observed substructure and 17 `CATALOG-DERIVED` objects; no record is classified as reconstructed or representative. All physical sizes and exact 3D geometry remain unavailable.

Authoritative inputs:

- 17 SIMBAD TAP identity/ICRS-coordinate/preferred-distance snapshots retrieved 2026-08-14, raw SHA-256 `5cccc03fedf8bbf93df45c4bba9902c111f9addf0e4477de596022febfe8beb8`;
- Hester et al. 1996, AJ 111, 2349 (`1996AJ....111.2349H`, DOI `10.1086/117985`) for the observed Pillars of Creation substructure, with no independent coordinate or 3D geometry adopted.

The graph records Pillars of Creation → Eagle Nebula, Horsehead Nebula → IC 434, and Western Veil → Cygnus Loop. M16/IC 4703, M8/NGC 6523, M17/NGC 6618, NGC 7000, Rosette component names, and 30 Doradus/NGC 2070 naming ambiguities are explicitly documented rather than hidden by alias merging.

Validation: 271/271 Observatory tests passed, including 6/6 Phase B tests. Machine evidence: `test-results/known-astronomical-objects-phase-b/validation-report.json`.

Phase B status: `[x] Nebulae — VALIDATED / NOT FROZEN`

## Phase C — Black holes and compact objects

Status: **VALIDATED / NOT PUBLISHED / NOT FROZEN**

Phase C contains 13 records: 11 dynamically supported black holes and two non-black-hole compact remnants. Imported 13, rejected 0, unresolved 0, relationships 1, rendered 0. All 11 black holes retain a paper-specific mass, mass method, status source, and limitations; all are conservatively classified `DYNAMICALLY_SUPPORTED`. No X-ray identity alone is promoted to black-hole confirmation.

SIMBAD supplies ten identity/coordinate rows. Gaia BH1/BH2/BH3 use VizieR Gaia DR3 `I/355/gaiadr3` astrometry and preserve parallax/proper motion/radial velocity without naive parallax inversion. Classification/mass references are retained per record. The source snapshot SHA-256 is `222cca66faa58911deedf8159c6d654fa27008821f5f0163c8cf36575e4ef3f4`.

Crab Pulsar is linked to the Phase B Crab Nebula and remains a neutron-star/pulsar record. PSR J1745-2900 remains a magnetar/pulsar. Neither receives `blackHoleStatus`.

Phase C status: `[x] Black holes + compact objects — VALIDATED / NOT FROZEN`
