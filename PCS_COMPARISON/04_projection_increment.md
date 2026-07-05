# PCS Benchmark Comparison v1.0

## Projection Increment

## Purpose

This document defines how projection increments should be described when moving from a simpler baseline to a broader PCS representation.

## Projection Sets

Let the projection sets be:

\[
P_A=\{L_T\},
\]

\[
P_B=\{L_T,L_C\},
\]

\[
P_{PCS}=\{L_T,L_C,L_S,L_I\}.
\]

These sets describe intended projection content. Operational availability must be reported separately.

## Increment from Baseline A to Baseline B

\[
P_B\setminus P_A=\{L_C\}.
\]

This increment adds atmospheric CO2 as a chemical projection. It should be described as an added observable domain, not as a guaranteed improvement in prediction or explanation.

## Increment from Baseline B to PCS Benchmark v1

\[
P_{PCS}\setminus P_B=\{L_S,L_I\}.
\]

This increment adds structural and biosphere/informational projections in the intended PCS benchmark design. In the current benchmark dataset, both projections are unavailable and therefore do not contribute to the realized state estimate.

## Missing Projection Ratio

For a comparison object \(M\), define:

\[
R_{\mathrm{missing}}(M,t)=1-\frac{N_{\mathrm{available}}(M,t)}{N_{\mathrm{intended}}(M)}.
\]

This ratio measures data availability within the intended representation. It is not a model error metric.

## Representation Completeness

Representation completeness is:

\[
C_{\mathrm{rep}}(M,t)=\frac{N_{\mathrm{available}}(M,t)}{N_{\mathrm{intended}}(M)}.
\]

For PCS Benchmark v1, completeness equals 1 only when all intended projections are available for a given year.

## Interpretation Rules

- Projection increments should be reported as representational scope changes.
- Missing projections must remain missing.
- Projection increments do not imply predictive skill.
- A broader intended projection set may have lower operational completeness if data are unavailable.

