# PCS Demonstration Mathematical Specification

Date: 2026-07-04

This document specifies the minimal mathematical structure for the PCS demonstration. It is a reference specification for demonstration code and possible manuscript use. It does not fabricate data and does not define scientific thresholds.

## 1. Observation Vector

For each calendar year \(t\), define the raw observation vector

\[
\mathbf{x}(t)=\left(x_T(t),x_C(t),x_S(t),x_I(t)\right).
\]

The four entries are:

- \(x_T(t)\): global annual temperature anomaly from NASA GISTEMP.
- \(x_C(t)\): annual mean atmospheric CO2 concentration from NOAA GML / Mauna Loa.
- \(x_S(t)\): annual global mean sea-level change from NASA satellite altimetry.
- \(x_I(t)\): annual global vegetation-index anomaly or annual global NDVI-derived anomaly from MODIS MOD13C2 or an equivalent public product.

The observation vector is defined only for years in which all required components are available after preprocessing.

## 2. Projection Operators

Each raw observable is mapped to a dimensionless projection by a projection operator:

\[
L_i(t)=\mathcal{P}_i[x_i(t)], \qquad i\in\{T,C,S,I\}.
\]

The four projection operators are:

\[
L_T(t)=\mathcal{P}_T[x_T(t)],
\]

\[
L_C(t)=\mathcal{P}_C[x_C(t)],
\]

\[
L_S(t)=\mathcal{P}_S[x_S(t)],
\]

\[
L_I(t)=\mathcal{P}_I[x_I(t)].
\]

In this minimal demonstration, each \(\mathcal{P}_i\) consists of annual aggregation if needed, unit harmonization, normalization, and optional clipping to \([0,1]\). The projection operators are empirical preprocessing maps, not new physical laws.

## 3. Normalization

For observables where larger values indicate stronger constraint, use

\[
L_i(t)=\frac{x_i(t)-x_i^{\mathrm{ref}}}{x_i^{\mathrm{crit}}-x_i^{\mathrm{ref}}}.
\]

Here \(x_i^{\mathrm{ref}}\) is the reference value and \(x_i^{\mathrm{crit}}\) is the critical or high-constraint value chosen for the demonstration.

For observables where smaller values indicate stronger constraint, such as a vegetation decline metric, use the inverted form

\[
L_i(t)=\frac{x_i^{\mathrm{ref}}-x_i(t)}{x_i^{\mathrm{ref}}-x_i^{\mathrm{crit}}}.
\]

If a bounded projection is required for the minimal demonstration, apply clipping:

\[
L_i(t)\leftarrow \min\left(1,\max\left(0,L_i(t)\right)\right).
\]

Reference and critical values must be documented before use. Placeholder constants may be used for software testing only and must not be interpreted as scientific thresholds.

## 4. State Vector

The PCS demonstration state vector is

\[
\mathbf{L}_{\mathrm{demo}}(t)=\left(L_T(t),L_C(t),L_S(t),L_I(t)\right).
\]

This vector is the four-component projected state used in the minimal demonstration. It is not the full PCS representation and does not include all projections discussed in the manuscript.

## 5. Demo State

The scalar demo state is the unweighted arithmetic mean of the four projected components:

\[
S_{\mathrm{demo}}(t)=\frac{1}{4}\left[L_T(t)+L_C(t)+L_S(t)+L_I(t)\right].
\]

This scalar is a demonstration index only. It is not a universal PCS state, not a validated risk index, and not a substitute for projection-level analysis.

## 6. Time Alignment

All observables are aligned on annual calendar years.

If a source provides monthly data, define the annual value as

\[
x_i(t)=\frac{1}{m_t}\sum_{k=1}^{m_t}x_i(t,k),
\]

where \(x_i(t,k)\) is the \(k\)-th valid monthly observation in year \(t\), and \(m_t\) is the number of valid months.

For gridded vegetation data, spatial aggregation should be performed before annual aggregation. A latitude-area-weighted global mean is preferred when gridded cells represent equal angular spacing.

The final demonstration interval is the intersection of years available for all four projections:

\[
\mathcal{T}_{\mathrm{demo}}=\mathcal{T}_T\cap\mathcal{T}_C\cap\mathcal{T}_S\cap\mathcal{T}_I.
\]

## 7. Missing Data Strategy

No missing values are fabricated.

The baseline strategy is complete-case alignment: compute \(\mathbf{L}_{\mathrm{demo}}(t)\) and \(S_{\mathrm{demo}}(t)\) only for years \(t\in\mathcal{T}_{\mathrm{demo}}\).

If a source contains missing months within a year, the year may be retained only if the source-specific completeness criterion is satisfied and documented. Otherwise the year is excluded.

No interpolation, gap filling, model-based imputation, or climatological replacement should be used in the minimal demonstration unless explicitly documented as a separate sensitivity analysis.

## 8. Units

Raw units are retained before normalization:

- \(x_T(t)\): degrees C temperature anomaly.
- \(x_C(t)\): ppm CO2.
- \(x_S(t)\): mm global mean sea-level change.
- \(x_I(t)\): dimensionless NDVI or vegetation-index anomaly.

Projected variables \(L_T,L_C,L_S,L_I\) are dimensionless.

The scalar \(S_{\mathrm{demo}}\) is dimensionless.

## 9. Reproducibility Rules

- Use official public data sources where possible.
- Record provider, dataset name, URL, access date, variable, units, and citation.
- Do not fabricate missing data.
- Keep raw downloaded or manually supplied files separate from processed files.
- Record every preprocessing step needed to obtain annual values.
- Record all normalization constants and whether clipping was applied.
- Preserve both unclipped and clipped projection values when possible.
- Compute \(S_{\mathrm{demo}}(t)\) only after all four projections are defined for the same year.
- Treat the demonstration as illustrative until validated against an explicit scientific task.
