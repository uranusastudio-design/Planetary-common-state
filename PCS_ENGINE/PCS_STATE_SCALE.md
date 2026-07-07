# PCS State Scale v1.0

This document defines how Planetary Common State (PCS) numeric values should be displayed and interpreted.

PCS values are normalized state estimates. They are not scores, percentages, rankings, final Earth health grades, or absolute truth claims.

## Numeric Range

PCS normalized values use the range:

```text
0.00000 to 1.00000
```

Interpretation:

- `0.00000` means the reference low-residual state defined by the relevant normalization rule.
- `1.00000` means the normalization upper bound defined by the relevant projection or model version.
- `1.00000` does not mean apocalypse, final collapse, or a complete planetary failure state.

PCS values depend on:

- connected data sources;
- normalization definitions;
- validation status;
- model version;
- connector coverage;
- provenance and quality controls.

Prototype values must not be interpreted as a complete planetary assessment. They represent the current normalized prototype state using only the connected and validated data available to the engine.

## Display Precision

Prototype display:

```text
3 decimals allowed
Example: 0.832
```

Scientific mode:

```text
5 decimals recommended
Example: 0.83214
```

User interfaces may use prototype precision for readability, but scientific exports, validation reports, and registry documentation should prefer five decimal places where appropriate.

## Provisional Interpretation Bands

The following bands provide provisional display language for normalized PCS values:

| Range | Interpretation Band |
|---|---|
| `0.00000 - 0.20000` | Reference / Low Residual |
| `0.20000 - 0.40000` | Stable |
| `0.40000 - 0.60000` | Notice |
| `0.60000 - 0.80000` | Attention |
| `0.80000 - 0.90000` | Warning |
| `0.90000 - 1.00000` | Near Critical |

These bands are provisional until empirically calibrated.

They should be used as display guidance only. They must not be treated as validated alert thresholds, policy triggers, prediction outcomes, or complete Earth-system risk classifications.

## Prototype Interpretation Rule

For prototype PCS outputs:

- display values as normalized state estimates;
- preserve missing values as missing;
- avoid percentage language;
- avoid final health-score language;
- state the connected data sources;
- state the model or prototype version where possible;
- keep all interpretation conditional on validation and data coverage.
