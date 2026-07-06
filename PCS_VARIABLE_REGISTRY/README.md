# PCS Variable Registry

The PCS Variable Registry is the official scientific knowledge structure for all variables used by the Planetary Common State (PCS) platform.

It is the common reference for:

- PCS_ENGINE
- PCS_OBSERVATORY
- PCS_CONNECTORS
- future AI modules
- future scientific publications

The registry defines what a PCS variable means before that variable is used in software, dashboards, validation workflows, or publications. It is documentation and architecture only; it does not perform computation.

## Required Variable Metadata

Every PCS variable must have:

- unique identifier
- scientific definition
- physical unit
- data source
- update frequency
- spatial scale
- temporal scale
- quality flag
- confidence
- references

## Design Principles

### Modular

The registry is organized by scientific domain so that domains can grow independently while preserving a common schema.

### Extensible

The registry is expected to grow from approximately one hundred variables to several hundred variables without requiring architectural redesign.

### Scientific

Each variable must be grounded in a clear scientific definition, physical unit, observation source, and reference trail.

### Transparent

Variable definitions, data provenance, quality flags, and confidence levels must be visible to users and downstream systems.

### Data-source independent

The registry defines variables independently from any single data provider or connector implementation. Multiple datasets may later support the same scientific variable.

### Version controlled

Registry entries should be tracked through explicit versions so that scientific definitions, source choices, and normalization rules remain auditable.

## Growth Model

The registry begins with top-level domains and metadata standards. It will then expand into a curated set of 100+ core scientific variables, followed by several hundred extended variables. The PCS architecture should remain stable as this expansion occurs.

## Registry Hierarchy

The PCS Variable Registry follows a hierarchical scientific structure:

```text
Domain
  -> Subdomain
    -> Variable
      -> Observation
        -> PCS
```

A domain defines the broad scientific area. A subdomain defines a more specific category within that area. A variable defines the measurable scientific quantity. An observation identifies the data source or measurement product used to estimate that variable. PCS integration maps the registered variable into the broader Planetary Common State representation.
