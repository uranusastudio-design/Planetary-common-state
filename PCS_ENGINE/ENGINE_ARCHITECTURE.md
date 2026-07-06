# PCS Engine Architecture

The PCS Engine architecture defines the responsibilities of the core processing layers.

## Architecture Flow

```text
Connector Layer
  -> Validation Layer
    -> Normalization Layer
      -> Assimilation Layer
        -> PCS State Generator
          -> Output Layer
```

## Connector Layer

The Connector Layer receives standardized records from external scientific data connectors. It is responsible for input availability, source provenance, and connector output handoff.

The Connector Layer does not compute PCS state.

## Validation Layer

The Validation Layer checks connector output structure, required fields, provenance, timestamp availability, quality flags, and missing-data consistency.

Invalid connector output must not be used downstream.

## Normalization Layer

The Normalization Layer will eventually prepare validated variables for common state assembly. This milestone defines the layer only and does not implement scientific normalization equations.

## Assimilation Layer

The Assimilation Layer is reserved for future integration of validated observations across sources, domains, and update cycles.

No assimilation algorithm is implemented in this milestone.

## PCS State Generator

The PCS State Generator will assemble domain availability, quality, confidence, and future state estimates into structured PCS state outputs.

This milestone does not add new state calculations.

## Output Layer

The Output Layer writes structured Engine outputs such as `latest_state.json`, validation reports, logs, and future state artifacts.

The Output Layer must not invent missing data.
