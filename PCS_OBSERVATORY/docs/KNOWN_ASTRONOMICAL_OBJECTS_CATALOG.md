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
