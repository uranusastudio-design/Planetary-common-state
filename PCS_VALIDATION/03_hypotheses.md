# PCS Validation Hypotheses v1.0

## 1. Scientific Question

What hypotheses can be tested to evaluate PCS as an empirical state representation without treating it as a predictive model or a new physical law?

## 2. H0

The null hypothesis is:

\[
H_0: \text{PCS projections and } S_{\mathrm{demo}}(t) \text{ do not exhibit robust empirical structure beyond simple baselines.}
\]

Operationally, \(H_0\) is supported if correlations are unstable, sensitivity tests materially change qualitative conclusions, leave-one-out tests show domination by a single projection, or the aggregate state cannot be reproduced from the documented projection rules.

## 3. H1

The alternative hypothesis is:

\[
H_1: \text{PCS projections and } S_{\mathrm{demo}}(t) \text{ provide a reproducible and interpretable macroscopic state representation.}
\]

Operationally, \(H_1\) is supported if projection trajectories are reproducible, their behavior is consistent with their source observables, the aggregate state follows the defined construction rule, and sensitivity and leave-one-out tests do not overturn the main representational interpretation.

## 4. Validation Metrics

The hypotheses will be evaluated using coverage metrics, descriptive statistics, correlation analysis, sensitivity analysis, leave-one-out analysis, and comparison with simple baselines. Forecast-verification metrics are outside the primary scope unless a future hindcast experiment is defined.

## 5. Correlation Analysis

Correlation hypotheses should be stated before computation. For example, an available thermal projection may be expected to correlate with independent temperature-related indicators over the common interval, while a chemical projection may be expected to track atmospheric concentration benchmarks. Exact benchmark pairings must be specified in the validation run.

## 6. Sensitivity Analysis

Sensitivity hypotheses should test whether qualitative conclusions persist under reasonable perturbations of reference values, critical values, and projection inclusion. Sensitivity analysis should not be used to select favorable parameters after observing results.

## 7. Leave-One-Out Analysis

The leave-one-out hypothesis is that the aggregate demo state should not be entirely determined by any single projection when multiple projections are available. If only two projections are available, this limitation must be stated explicitly and interpreted conservatively.

## 8. Reproducibility

Each hypothesis should be linked to a reproducible computation or documented qualitative check. A validation claim is not admissible unless the relevant data sources, preprocessing steps, projection rules, and analysis scripts are archived.

## 9. Future Extension

Future hypotheses may test forecast skill, early-warning behavior, structural breaks, comparison with Earth-system model ensembles, and robustness across alternative projection sets. These should be added only after the present methodology has been reproduced on the benchmark dataset.

