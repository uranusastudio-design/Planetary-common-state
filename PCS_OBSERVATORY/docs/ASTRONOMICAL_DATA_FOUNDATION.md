# Astronomical Data Foundation

## Purpose

The foundation separates source acquisition, scientific review and production rendering. A newly published table may enter staging, but it does not become production truth without schema, coordinate, unit, identity, duplicate, uncertainty, classification and rendered-output validation.

## Source registry

The shared machine-readable registry is `assets/deep-space/astronomical-source-registry.json`. Each entry records:

```text
sourceId, agency, mission, survey, catalog, release, releaseDate,
referenceEpoch, coordinateFrame, skyCoverage, redshiftRange,
distanceType, objectCount, DOI, citation, license, retrievedAt,
checksum, updatePolicy, qualityStatus
```

Source metadata is not copied independently into each rendering module. Phase adapters refer to one `sourceId` and preserve their own transformation contract.

## Update pipeline

```text
UPSTREAM SOURCE
→ FETCH / INGEST
→ RAW SNAPSHOT
→ SCHEMA VALIDATION
→ COORDINATE VALIDATION
→ CROSS-MATCH
→ DUPLICATE DETECTION
→ UNCERTAINTY CHECK
→ NORMALIZATION
→ PCS STAGING CATALOG
→ SCIENTIFIC REVIEW
→ RELEASE AUDIT
→ PRODUCTION CATALOG
```

Raw snapshots are immutable release evidence. Adapters must verify upstream checksums or explicitly stage a changed snapshot for review. A synchronization failure keeps the last validated production catalog.

## Coordinate contract

Every adapter declares:

```text
sourceFrame
sourceEpoch
distanceConvention
redshiftConvention
cosmologyAssumption
transformVersion
```

No field named only `distance` may combine measured, proper, luminosity, comoving, angular-diameter or lookback distance. Missing values stay `null`/`Unavailable`; zero is accepted only when zero is the actual scientific value (for example, an observer-origin reference), never as a missing-data substitute.

The Phase 4 transform runtime is `phase4-coordinates.js`. Its Supergalactic matrix is validated against published catalog coordinates. Its Planck18 distance functions are available only to adapters that explicitly declare that cosmology; Phase 4A measured distances do not use them.

## Persistent identity

Production objects use a canonical PCS identity plus source aliases. Phase 4A examples:

- Group: `pcs:galaxy-group:kt17:<PGC1>`
- Galaxy: `pcs:galaxy:pgc:<PGC>`

PGC is the source catalog's stable cross-catalog anchor in Phase 4A. Multiple names such as Messier, NGC and PGC are aliases on one PCS object, not duplicate objects. Later SDSS, DESI, NED or SIMBAD identifiers must be cross-matched into the same identity before production promotion.

Phase 4B uses NGC → VCC → EVCC identity priority. A repeated catalog designation is not automatically proof of one physical object: the EVCC snapshot contains two distinct positions sharing `NGC 4257`. PCS retains both as EVCC-qualified canonical IDs and records the cross-match as ambiguous rather than silently merging or discarding a record.

## Scientific visual classes

Each rendered element has one class:

1. Catalog Observation
2. Derived Measurement
3. Observation-based Reconstruction
4. Representative Visualization

The class affects marker shape/line grammar and is exposed in the legend and Object Card. Reconstruction geometry cannot share the same visual treatment as catalog points, and representative connective geometry cannot be described as observed structure.

## Runtime constraints

- One existing Cesium Viewer and one Cesium canvas.
- One Deep Space state machine, selected-object store and language store.
- Batched GPU primitives for catalogs; no per-object DOM.
- Hierarchical deterministic LOD, spatial indexing/tiling and lazy loading as catalog scale grows.
- Every layer implements load/show/hide/unload/dispose and exposes collection counts for lifecycle audit.
- A phase is not complete from data tests alone; real rendered screenshots and production network/console evidence are also required.

## Phase 4A registered source

`vizier-j-apj-843-16` is validated for the documented 2–12 Mpc multi-member-group deployment scope. VizieR permits scientific-context use with explicit citation of authors, publication, publisher and service. Commercial use requires separate source-specific review.

## Phase 4B registered source

`vizier-j-apjs-215-22` is validated for the EVCC 725-square-degree footprint and its published M/P infall-model membership classification. It contains 1,589 catalog galaxies. The source adopts 16.5 Mpc for Virgo, but its table 2 does not supply individual galaxy distances; PCS keeps those distances unavailable and classifies the common-shell 3D placement as representative visualization. Catalog coordinates and membership remain observation records, coordinate transforms and velocity summaries are derived measurements, and pixel markers are representative.
