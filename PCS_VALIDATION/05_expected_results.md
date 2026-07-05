# PCS Expected Results Framework v1.0

## 1. Scientific Question

What outputs should a PCS validation run produce, and how should they be interpreted without overstating the result?

## 2. H0

If the null hypothesis is not rejected, the validation report should state that the current PCS implementation does not yet demonstrate robust empirical structure beyond the selected baselines under the tested configuration.

## 3. H1

If the alternative hypothesis is supported, the validation report should state that the PCS implementation shows reproducible and interpretable representational behavior under the tested configuration. This should not be described as proof of predictive skill or as validation of a universal theory.

## 4. Validation Metrics

Expected validation outputs include:

- Projection coverage summary.
- Projection descriptive statistics.
- Aggregate state descriptive statistics.
- Correlation matrix or paired-correlation table.
- Sensitivity summary.
- Leave-one-out summary.
- Baseline comparison summary.
- Missing-data and reproducibility report.

## 5. Correlation Analysis

Correlation results should be reported with sample size, time interval, estimator, and caveats about autocorrelation and short records. Correlation should be interpreted as empirical association, not causation.

## 6. Sensitivity Analysis

Sensitivity results should identify whether the aggregate state is stable under predefined methodological perturbations. A strong dependence on normalization constants, clipping rules, or a single projection should be reported as a limitation.

## 7. Leave-One-Out Analysis

Leave-one-out results should indicate whether excluding each projection materially changes the aggregate state trajectory. If too few projections are available for a meaningful leave-one-out test, the report should state that limitation directly.

## 8. Reproducibility

The expected validation package should allow an independent reader to reproduce the processed data, normalized projections, metrics, figures, and tables from the archived inputs and scripts. Any manual-download datasets should be documented with provider, URL, access date, and reason for manual acquisition.

## 9. Future Extension

Future expected outputs may include hindcast skill tables, uncertainty intervals, early-warning indicator summaries, spatial validation products, and comparison with Earth-system model ensembles. These outputs require additional data and protocol definitions before they can be interpreted.

