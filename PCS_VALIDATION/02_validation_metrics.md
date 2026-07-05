# PCS Validation Metrics v1.0

## 1. Scientific Question

Which quantitative diagnostics are appropriate for evaluating whether PCS projections and the aggregate demo state are internally consistent, reproducible, and empirically interpretable?

## 2. H0

Under the null hypothesis, the selected metrics will not show robust or interpretable structure beyond what is expected from individual observables or simple baselines.

## 3. H1

Under the alternative hypothesis, the selected metrics will show reproducible structure that is consistent with the predefined PCS projection rules and the physical interpretation of the available observables.

## 4. Validation Metrics

The primary methodology will use the following metric classes.

### Coverage Metrics

- Number of available projections per year.
- Fraction of missing values by projection.
- Common analysis interval.
- Dataset-specific temporal coverage.

### Descriptive Statistics

- Minimum, maximum, mean, and standard deviation for each available projection.
- Total change over the analysis interval.
- Annual trend estimate, with the estimator specified before computation.

### Correlation Metrics

- Pearson correlation for approximately linear relationships.
- Spearman correlation for monotonic relationships.
- Lagged correlation where a lagged physical or observational response is plausible and predefined.

### Robustness Metrics

- Change in the aggregate state under reference-value perturbations.
- Change in the aggregate state under critical-value perturbations.
- Change in the aggregate state under leave-one-out projection removal.

### Future Forecast Metrics

RMSE, MAE, Brier score, ROC AUC, and related forecast-verification metrics should be used only when the validation task includes an explicit forecast, hindcast, or binary event-detection problem. They should not be reported for a purely descriptive operational demonstration.

## 5. Correlation Analysis

Correlation analysis should report the variables compared, the analysis interval, the treatment of missing values, the sample size, and the correlation estimator. Statistical significance should be interpreted cautiously for short annual records and autocorrelated series.

## 6. Sensitivity Analysis

Sensitivity metrics should compare the reference PCS run with predefined perturbation cases. Perturbations may include alternative reference values, alternative critical values, clipping versus non-clipping, and exclusion of individual projections.

## 7. Leave-One-Out Analysis

For each available projection \(L_i\), define a leave-one-out aggregate \(S_{\mathrm{demo}}^{(-i)}(t)\) using the same averaging rule as the baseline demo state but excluding \(L_i\). The reported metric is the difference between \(S_{\mathrm{demo}}(t)\) and \(S_{\mathrm{demo}}^{(-i)}(t)\), summarized over the analysis interval.

## 8. Reproducibility

Each metric must be computed from archived input files and a documented script or workflow. The report should identify the exact columns used, the time interval, and any filtering or transformation applied before computation.

## 9. Future Extension

Future metric sets may include uncertainty propagation, bootstrap confidence intervals, early-warning indicators, benchmark comparisons against PCA or EOF composites, and formal hindcast skill scores. These extensions require a separate validation design before results are computed.

