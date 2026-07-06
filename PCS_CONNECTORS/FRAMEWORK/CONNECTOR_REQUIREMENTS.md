# Connector Requirements

Every PCS connector must define the scientific and operational requirements listed below before it is treated as connected.

## Required Fields

- Provider
- Dataset
- Scientific variables
- Temporal resolution
- Spatial resolution
- Units
- License
- Source URL
- Version
- Quality metadata

## Scientific Requirements

The connector must preserve the scientific meaning of the source dataset. Units, timestamps, spatial coverage, temporal coverage, and source limitations must remain visible.

## Provenance Requirements

The connector must record where the data came from, when it was accessed, what version was used, and what license or citation applies.

## Quality Requirements

Missing values, invalid records, stale timestamps, unit mismatches, and validation failures must be reported explicitly.

## No-Fabrication Requirement

No connector may invent missing observations, silently repair invalid values, or mark a source as connected before real data are parsed.
