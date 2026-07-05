# PCS Validation Summary v1.0

## Scope

This validation run analyzes only the existing benchmark dataset. Temperature and CO2 are available for 2000--2024. Sea level and NDVI remain missing and are not inferred.

No prediction accuracy is claimed. The analysis evaluates statistical association, projection variance, and leave-one-out sensitivity for the available PCS components.

## Input Files

- `PCS_DATA/processed/demo_annual_dataset.csv`
- `PCS_DATA/normalized/demo_projection_dataset.csv`

## Correlation Results

| Comparison | Pearson | Spearman | Paired years |
|---|---:|---:|---:|
| Temperature vs PCS | 0.977851 | 0.956120 | 25 |
| CO2 vs PCS | 0.970891 | 0.975385 | 25 |

## Variance Results

Sample variance is reported with `ddof=1`.

| Quantity | Sample variance | Valid years |
|---|---:|---:|
| L_T | 0.020325 | 25 |
| L_C | 0.015520 | 25 |
| L_S | NaN | 0 |
| L_I | NaN | 0 |
| S_demo | 0.016947 | 25 |

## Leave-One-Out Results

Because only `L_T` and `L_C` are available, removing Temperature leaves the CO2 projection alone, and removing CO2 leaves the Temperature projection alone. This is a two-component sensitivity check, not a full multi-projection robustness test.

| Removed projection | Mean change | Mean absolute change | Maximum absolute change | Valid years |
|---|---:|---:|---:|---:|
| Temperature | 0.040948 | 0.043200 | 0.091350 | 25 |
| CO2 | -0.040948 | 0.043200 | 0.091349 | 25 |

## Interpretation

The validation run is restricted to available benchmark data. Sea level and NDVI are not used because they are missing in the current benchmark file. The results therefore assess the statistical behavior of the two available projections and the derived two-component `S_demo` only.

## Generated Outputs

- `validation_results.csv`
- `fig13_correlation_matrix.png`
- `fig14_leave_one_out.png`
- `table08_validation_statistics.tex`
