# PCS Data Flow

This document describes the conceptual PCS data lifecycle. It does not define implementation code, APIs, variables, or engine logic.

## Lifecycle

```text
Observation
  -> Connector
    -> Validation
      -> Normalization
        -> Assimilation
          -> PCS State
            -> Visualization
              -> Monitoring
                -> Archive
```

## Observation

Scientific observations originate from external measurement systems, model products, reanalysis systems, or statistical sources.

## Connector

The connector stage records provider metadata, access expectations, licensing, update frequency, and possible observation categories.

## Validation

Validation checks whether observations are scientifically usable for PCS workflows. This includes provenance, completeness, quality flags, uncertainty, and consistency checks.

## Normalization

Normalization converts heterogeneous observations into comparable PCS-compatible forms while preserving units and metadata.

## Assimilation

Assimilation is the future process by which multiple normalized observations may be combined into a coherent state estimate. This document does not implement assimilation.

## PCS State

The PCS State represents the integrated state output from available projections and documented metadata.

## Visualization

Visualization presents PCS state, coverage, data quality, and missing data status to users.

## Monitoring

Monitoring tracks current state, data freshness, source availability, coverage, and validation status.

## Archive

The archive preserves historical observations, processed state outputs, metadata, and reproducibility records.

