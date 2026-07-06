# Add an Observatory Panel

This document describes how future PCS Observatory UI panels should be added.

## Requirements

### Read from PCS output only

Observatory panels should read from PCS output artifacts and metadata. They should not directly query raw scientific data sources unless a future architecture explicitly permits it.

### Do not compute values in UI

The UI should not compute scientific values, projections, or state estimates. Computation belongs in the PCS Engine or validated preprocessing layers.

### Show missing data clearly

Missing values should be displayed plainly, using labels such as `Waiting for data`.

### Avoid alert fatigue

Panels should avoid excessive warnings, unsupported severity levels, and attention-grabbing states that are not supported by validated thresholds.

### Respect human factors principles

Panels should be readable, calm, accessible, and clear about uncertainty, coverage, and provenance.

### No unsupported prediction claims

Panels must not present forecasts, risk claims, or early-warning claims unless those modules have been validated and explicitly enabled.

## Rules

- No dashboard changes are made in this document.
- No prediction module is introduced here.
- No engine logic is implemented here.

