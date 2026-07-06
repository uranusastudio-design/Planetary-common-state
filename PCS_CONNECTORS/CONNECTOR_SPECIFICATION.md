# Connector Specification

This document defines the lifecycle expected for every future PCS connector.

## Connector Lifecycle

1. Provider and dataset documented.
2. Access method reviewed.
3. License and citation recorded.
4. Download behavior specified.
5. Validation behavior specified.
6. Quality-control behavior specified.
7. Cache behavior specified.
8. PCS JSON output mapped.
9. Connector status assigned.
10. Implementation considered in a later milestone.

## Download

Future connectors should download data only from official provider endpoints or documented public archives. Manual-download requirements must be recorded explicitly.

## Validation

Validation should confirm that the acquired file or response matches expected provider, dataset, timestamp, unit, format, and coverage metadata.

## Normalization

Normalization rules are not implemented in this framework. A connector may prepare standardized observation records, but PCS projection or state calculation belongs outside the connector.

## Quality Control

Each connector should record missing values, quality flags, provider warnings, version changes, and known caveats without altering scientific meaning.

## Cache

Future connectors should avoid duplicate downloads, preserve the latest valid dataset, and retain enough provenance for rollback.

## PCS JSON Output

Every connector should eventually emit records that follow `DATA_STANDARD.md`. The output standard is shared across all providers.
