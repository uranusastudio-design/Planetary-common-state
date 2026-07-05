# PCS Validation Protocol v1.0

## 1. Scientific Question

How should PCS validation be conducted so that results are reproducible, statistically interpretable, and clearly separated from theory development?

## 2. H0

The protocol tests the null hypothesis that PCS projections and the aggregate demo state do not provide robust empirical structure beyond simple baselines.

## 3. H1

The protocol tests the alternative hypothesis that PCS projections and the aggregate demo state provide a reproducible and interpretable macroscopic state representation under predefined rules.

## 4. Validation Metrics

Before computation, the validation run must specify the metrics to be used, the datasets included, the analysis interval, the missing-data rule, and the baseline comparisons. Metrics should be selected from the validation metrics document.

## 5. Correlation Analysis

1. Freeze the processed dataset and normalized projection dataset.
2. Identify all available projections over the common analysis interval.
3. Select benchmark variables and simple baselines before computation.
4. Compute correlations only on years with valid paired observations.
5. Report estimator, sample size, time interval, missing-data treatment, and uncertainty method where applicable.

## 6. Sensitivity Analysis

1. Define perturbation cases before computation.
2. Vary reference values and critical values within documented ranges.
3. Compare clipping and non-clipping behavior only if both are scientifically justified.
4. Recompute projections and the aggregate state for each perturbation case.
5. Report whether qualitative conclusions are stable across perturbations.

## 7. Leave-One-Out Analysis

1. For each available projection, remove that projection from the aggregate state calculation.
2. Recompute the aggregate state using the same averaging rule and the remaining available projections.
3. Compare the leave-one-out trajectory with the baseline aggregate trajectory.
4. Report whether any single projection dominates the aggregate behavior.

## 8. Reproducibility

The validation run should preserve:

- Raw data files or acquisition notes.
- Processed annual dataset.
- Normalized projection dataset.
- Projection constants and equations.
- Analysis scripts.
- Software environment.
- Generated tables and figures.
- A run report listing unavailable datasets and missing values.

No missing observations should be fabricated. Any imputation, if tested later, must be labeled as a sensitivity experiment.

## 9. Future Extension

Future validation protocols may add independent hindcast experiments, uncertainty propagation, early-warning diagnostics, model-output comparison, and multi-resolution spatial analysis. These extensions should be versioned separately from this initial validation methodology.

