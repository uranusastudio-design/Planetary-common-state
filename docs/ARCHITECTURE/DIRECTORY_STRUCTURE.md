# Recommended PCS Repository Structure

The PCS repository should preserve a clear separation between scientific documentation, data, engine logic, observatory interfaces, and publication materials.

## Tree

```text
Planetary-common-state/
  PCS_VARIABLE_REGISTRY/
  PCS_CONNECTORS/
  PCS_ENGINE/
  PCS_OBSERVATORY/
  PCS_DATA/
  PAPER/
  docs/
    ARCHITECTURE/
  assets/
  README.md
  ROADMAP.md
```

## PCS_VARIABLE_REGISTRY

Stores the scientific taxonomy, schemas, templates, and future variable registry documentation.

## PCS_CONNECTORS

Stores provider documentation and future connector metadata.

## PCS_ENGINE

Stores engine modules for observation loading, projection computation, state construction, and output writing.

## PCS_OBSERVATORY

Stores user-facing observatory interfaces and display assets.

## PCS_DATA

Stores raw, processed, normalized, validation, and benchmark data artifacts.

## PAPER

Stores manuscript source, references, tables, figures, and publication reports.

## docs

Stores documentation that describes architecture, workflows, governance, and future development plans.

## assets

Stores static assets such as images, diagrams, icons, and visual resources.

## Root Files

Root documentation files such as `README.md` and `ROADMAP.md` provide project-level orientation and development planning.

