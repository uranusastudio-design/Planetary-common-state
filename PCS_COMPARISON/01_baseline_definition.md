# PCS Benchmark Comparison v1.0

## Baseline Definition

## Purpose

This document defines the benchmark comparison objects used to evaluate representational scope in the PCS benchmark study. The comparison does not compute prediction accuracy and does not treat PCS as a forecasting model.

## Comparison Objects

### Baseline A: Temperature Only

Baseline A uses only the thermal observable:

\[
B_A(t) = L_T(t).
\]

This baseline represents the simplest single-observable summary. It is reproducible when the NASA GISTEMP annual temperature anomaly and the PCS thermal projection rule are available.

### Baseline B: Temperature + CO2

Baseline B uses the two available benchmark projections:

\[
B_B(t) = \frac{1}{2}\left[L_T(t)+L_C(t)\right].
\]

This baseline represents a two-observable climate-state summary using the thermal and chemical projections only.

### PCS Benchmark v1

PCS Benchmark v1 is the four-projection demonstration state defined by the PCS projection standard:

\[
S_{\mathrm{demo}}(t)=\frac{1}{4}\left[L_T(t)+L_C(t)+L_S(t)+L_I(t)\right].
\]

In the current benchmark dataset, \(L_S\) and \(L_I\) are unavailable and remain missing. Therefore, the operational PCS benchmark should report both the ideal four-projection definition and the available-projection estimate:

\[
S_{\mathrm{available}}(t)=\frac{1}{N(t)}\sum_{i\in A(t)}L_i(t),
\]

where \(A(t)\) is the set of available projections and \(N(t)=|A(t)|\).

## Metric Scope

The comparison uses only representation metrics:

- Information Coverage
- Projection Coverage
- Missing Projection Ratio
- Representation Completeness
- Reproducibility
- Future Extension

No forecast skill, prediction accuracy, causal attribution, or decision performance is evaluated in this comparison framework.

