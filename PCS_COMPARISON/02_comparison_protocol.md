# PCS Benchmark Comparison v1.0

## Comparison Protocol

## Purpose

This protocol defines how Baseline A, Baseline B, and PCS Benchmark v1 should be compared using the existing benchmark dataset. The comparison is methodological and representational; it does not compute prediction accuracy.

## Inputs

Required inputs are:

- `PCS_DATA/processed/demo_annual_dataset.csv`
- `PCS_DATA/normalized/demo_projection_dataset.csv`
- `demo/pcs_projection_standard_v1.md`

No missing values should be inferred. Missing projections must remain missing in all comparison outputs.

## Step 1: Freeze the Analysis Interval

Use only years available in the processed benchmark dataset. The current benchmark interval is 2000--2024, but any future run must record the exact interval used.

## Step 2: Construct Baselines

Construct:

\[
B_A(t)=L_T(t),
\]

\[
B_B(t)=\frac{1}{2}\left[L_T(t)+L_C(t)\right],
\]

and the PCS available-projection estimate:

\[
S_{\mathrm{available}}(t)=\frac{1}{N(t)}\sum_{i\in A(t)}L_i(t).
\]

For the current benchmark, \(S_{\mathrm{available}}(t)\) is equivalent to Baseline B because only \(L_T\) and \(L_C\) are available. This equivalence must be stated rather than hidden.

## Step 3: Compute Representation Metrics

For each comparison object, report:

- Number of intended projections.
- Number of available projections.
- Projection Coverage.
- Missing Projection Ratio.
- Representation Completeness.
- Reproducibility status.

## Step 4: Compare Without Ranking Claims

The comparison should describe scope differences rather than claim superiority. For example, PCS Benchmark v1 may define a broader intended representation than Baseline A or Baseline B, while its current operational completeness remains limited by unavailable \(L_S\) and \(L_I\).

## Step 5: Report Limitations

The report must identify:

- Missing projections.
- Dataset access constraints.
- Normalization choices.
- Whether PCS Benchmark v1 reduces to a lower-dimensional available-projection estimate.
- That no predictive validation is performed.

## Output

The comparison output should include a matrix or table summarizing all baselines and metrics. Any numerical values should be computed only from existing benchmark files.

