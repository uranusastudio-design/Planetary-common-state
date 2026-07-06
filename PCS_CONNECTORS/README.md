# PCS Connector Registry

The PCS Connector Registry documents external scientific data providers that may support the Planetary Common State platform.

This registry is documentation only. It does not implement APIs, write connector code, define variables, or modify the PCS Engine or dashboard.

## Purpose

The purpose of the connector registry is to record which scientific providers may supply observations for PCS variables, validation workflows, benchmark datasets, and future observatory products.

Each provider entry describes scientific role, available observation categories, update frequency, and future PCS integration potential.

## Connector Architecture

PCS connectors should eventually form a provider-independent access layer between external scientific data systems and the PCS platform.

The intended architecture is:

```text
Scientific Provider
  -> Connector Metadata
    -> Observation Access
      -> PCS Variable Registry
        -> PCS Engine
```

This v1.0 registry defines metadata only. Connector implementations are reserved for later milestones.

## Data Independence

PCS should not depend on a single provider for a scientific concept when multiple credible sources exist. Connector documentation should separate the scientific variable from the dataset, platform, or access method used to observe it.

## Open Science

The registry prioritizes open scientific data, transparent citations, documented licenses, reproducible access methods, and explicit data-quality caveats.

## Connector Lifecycle

The intended lifecycle is:

1. Provider documented.
2. Observation categories reviewed.
3. Candidate variables mapped.
4. Access method assessed.
5. Connector metadata standardized.
6. Implementation considered in a later engineering milestone.
7. Validation and provenance recorded.

