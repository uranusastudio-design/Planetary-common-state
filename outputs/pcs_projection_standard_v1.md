# PCS Projection Standard v1.0

Version: 1.0  
Date: 2026-07-04  
Scope: Minimal four-observable PCS demonstration  
Status: Reference standard for demonstration code and manuscript description

This document defines the projection standard for the minimal Planetary Common State (PCS) demonstration. It specifies observation variables, projection operators, normalization rules, reference and critical values, data provenance, and reproducibility requirements. It does not fabricate data and does not establish universal scientific thresholds.

## Revision History

| Version | Date | Description |
|---|---:|---|
| 1.0 | 2026-07-04 | Initial PCS projection standard for the four-observable demonstration. |

## 1. Observation Vector

For each calendar year \(t\), define the observation vector

\[
\mathbf{x}(t)=\left(x_T(t),x_C(t),x_S(t),x_I(t)\right).
\]

The four entries are:

| Component | Observable | Dataset | Unit |
|---|---|---|---|
| \(x_T(t)\) | Global annual temperature anomaly | NASA GISTEMP v4 | degrees C |
| \(x_C(t)\) | Annual mean atmospheric CO2 | NOAA GML Mauna Loa CO2 | ppm |
| \(x_S(t)\) | Global mean sea-level change | NASA Sea Level Change / PO.DAAC GMSL | mm |
| \(x_I(t)\) | Annual global vegetation index anomaly | MODIS MOD13C2 NDVI or equivalent | dimensionless |

The observation vector is defined only for years in which the required components are available after preprocessing. Missing values are retained as missing values and are not filled.

## 2. Projection Operators

Each raw observable is mapped to a dimensionless projection:

\[
L_i(t)=\mathcal{P}_i[x_i(t)], \qquad i\in\{T,C,S,I\}.
\]

The four projection definitions are

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

In this demonstration, \(\mathcal{P}_i\) denotes preprocessing, annual aggregation where needed, unit harmonization, normalization, and optional clipping. These projection operators are empirical preprocessing maps, not physical laws.

## 3. Normalization

For observables where larger values indicate stronger constraint, use

\[
L_i(t)=\frac{x_i(t)-x_i^{\mathrm{ref}}}{x_i^{\mathrm{crit}}-x_i^{\mathrm{ref}}}.
\]

For observables where smaller values indicate stronger constraint, use

\[
L_i(t)=\frac{x_i^{\mathrm{ref}}-x_i(t)}{x_i^{\mathrm{ref}}-x_i^{\mathrm{crit}}}.
\]

If a bounded demonstration index is required, apply

\[
L_i(t)\leftarrow \min\left(1,\max\left(0,L_i(t)\right)\right).
\]

The unclipped value should be retained for auditability whenever possible.

## 4. Projection Reference Table

The following table distinguishes the dataset, reference value, critical value, and scientific rationale for each projection. Reference and critical values are demonstration choices unless otherwise stated. They must be documented and may be replaced in sensitivity tests.

| Projection | Dataset | Reference value | Critical value | Scientific rationale |
|---|---|---|---|---|
| \(L_T\) | NASA GISTEMP v4 global annual anomaly | \(x_T^{\mathrm{ref}}=0\,^\circ\mathrm{C}\) anomaly relative to the NASA 1951--1980 baseline | \(x_T^{\mathrm{crit}}=1.5\,^\circ\mathrm{C}\) anomaly | The GISTEMP anomaly is already expressed relative to the 1951--1980 baseline. The 1.5 degrees C level is a widely used climate-policy and impacts reference level, not a UCT universal threshold. |
| \(L_C\) | NOAA GML Mauna Loa annual mean CO2 | \(x_C^{\mathrm{ref}}=315.98\,\mathrm{ppm}\), the 1959 annual mean in the Mauna Loa record | \(x_C^{\mathrm{crit}}=450\,\mathrm{ppm}\) | The reference anchors the projection to the beginning of the annual Mauna Loa record. The 450 ppm value is a demonstration high-CO2 reference level and must be tested by sensitivity analysis. |
| \(L_S\) | NASA Sea Level Change / PO.DAAC GMSL | \(x_S^{\mathrm{ref}}\): first valid annual value in the selected satellite-altimetry interval | \(x_S^{\mathrm{crit}}=x_S^{\mathrm{ref}}+100\,\mathrm{mm}\) | The reference anchors sea-level change to the selected altimetry interval. The 100 mm increment is a transparent demonstration scale, not a universal critical value. |
| \(L_I\) | MODIS MOD13C2 NDVI annual global aggregate | \(x_I^{\mathrm{ref}}\): mean NDVI over the selected valid baseline interval | \(x_I^{\mathrm{crit}}=x_I^{\mathrm{ref}}-0.05\) | Lower NDVI is treated as a stronger vegetation constraint. The 0.05 decrement is a demonstration anomaly scale and requires sensitivity testing. |

## 5. State Vector

The projected demonstration state vector is

\[
\mathbf{L}_{\mathrm{demo}}(t)=\left(L_T(t),L_C(t),L_S(t),L_I(t)\right).
\]

This is a four-component demonstration state. It is not the full PCS state vector and does not include all projections discussed in the broader PCS framework.

## 6. Demo State

The scalar demo state is the unweighted arithmetic mean

\[
S_{\mathrm{demo}}(t)=\frac{1}{4}\left[L_T(t)+L_C(t)+L_S(t)+L_I(t)\right].
\]

This scalar is a demonstration index only. It is not a validated risk index, not a universal PCS observable, and not a substitute for analysis of the individual projections.

## 7. Time Alignment

All observations are aligned on annual calendar years.

If a source provides monthly data, the annual value is

\[
x_i(t)=\frac{1}{m_t}\sum_{k=1}^{m_t}x_i(t,k),
\]

where \(m_t\) is the number of valid monthly observations in year \(t\).

For gridded vegetation data, spatial aggregation should be performed before annual aggregation. For equal-angle grids, latitude-area weighting is preferred.

The valid demonstration interval is

\[
\mathcal{T}_{\mathrm{demo}}=\mathcal{T}_T\cap\mathcal{T}_C\cap\mathcal{T}_S\cap\mathcal{T}_I.
\]

## 8. Missing Data Strategy

No missing values are fabricated.

The baseline strategy is complete-case alignment: compute \(\mathbf{L}_{\mathrm{demo}}(t)\) and \(S_{\mathrm{demo}}(t)\) only for years \(t\in\mathcal{T}_{\mathrm{demo}}\).

If source-specific monthly completeness criteria are needed, they must be documented before aggregation. No interpolation, gap filling, model-based imputation, or climatological replacement is part of the v1.0 standard.

## 9. Units

Raw units are preserved before normalization:

| Observable | Raw unit | Projected unit |
|---|---|---|
| \(x_T(t)\) | degrees C anomaly | dimensionless \(L_T\) |
| \(x_C(t)\) | ppm | dimensionless \(L_C\) |
| \(x_S(t)\) | mm | dimensionless \(L_S\) |
| \(x_I(t)\) | dimensionless vegetation index or anomaly | dimensionless \(L_I\) |

The scalar \(S_{\mathrm{demo}}\) is dimensionless.

## 10. Reproducibility Rules

1. Use official public data sources where possible.
2. Record provider, dataset name, URL, access date, variable, units, and citation.
3. Do not fabricate missing data.
4. Keep raw downloaded or manually supplied files separate from processed files.
5. Record every preprocessing step used to obtain annual values.
6. Record all reference values, critical values, and clipping choices.
7. Preserve unclipped and clipped projection values when possible.
8. Compute \(S_{\mathrm{demo}}(t)\) only after all four projections are defined for the same year.
9. Treat the demonstration as illustrative until validated against an explicit scientific task.

## 11. Dataset and Baseline References

### NASA GISTEMP

- Dataset: GISS Surface Temperature Analysis (GISTEMP), version 4.
- Provider: NASA Goddard Institute for Space Studies.
- URL: https://data.giss.nasa.gov/gistemp/
- Data table: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt
- Baseline: 1951--1980 anomaly baseline used by NASA GISTEMP.
- Citation: GISTEMP Team, 2026, GISS Surface Temperature Analysis (GISTEMP), version 4, NASA Goddard Institute for Space Studies; Lenssen et al., J. Geophys. Res. Atmos. 129, e2023JD040179 (2024), doi:10.1029/2023JD040179.

### NOAA Mauna Loa CO2

- Dataset: Mauna Loa annual mean CO2.
- Provider: NOAA Global Monitoring Laboratory.
- URL: https://gml.noaa.gov/ccgg/trends/data.html
- Data file: https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt
- Reference value: 1959 annual mean \(315.98\,\mathrm{ppm}\), from the annual Mauna Loa record.
- Citation: NOAA Global Monitoring Laboratory, Trends in Atmospheric Carbon Dioxide, Mauna Loa annual mean CO2 record.

### NASA Global Mean Sea Level

- Dataset: NASA global mean sea-level satellite altimetry indicator.
- Provider: NASA Sea Level Change / NASA JPL / PO.DAAC.
- URL: https://sealevel.nasa.gov/understanding-sea-level/key-indicators/global-mean-sea-level/
- Data access: PO.DAAC Earthdata-protected `NASA_SSH_GMSL_INDICATOR.txt`.
- Reference baseline: first valid annual value in the authenticated satellite-altimetry interval selected for the demo.
- Citation: NASA Sea Level Change Team / NASA JPL / PO.DAAC GMSL indicator; Beckley et al. (2017) as cited by the NASA GMSL portal.

### MODIS MOD13C2 NDVI

- Dataset: MODIS/Terra Vegetation Indices Monthly L3 Global 0.05Deg CMG, MOD13C2 Version 6.1.
- Provider: NASA Earthdata / LP DAAC.
- URL: https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061
- Legacy product page: https://lpdaac.usgs.gov/products/mod13c2v061/
- Reference baseline: mean annual global NDVI over the selected valid baseline interval.
- Citation: NASA LP DAAC MOD13C2 Version 6.1 product citation and DOI from the Earthdata/LP DAAC product page.

### Reference Baselines

- Temperature reference: NASA GISTEMP 1951--1980 anomaly baseline.
- Temperature critical reference: \(1.5\,^\circ\mathrm{C}\), used here as a demonstration high-temperature reference level.
- CO2 reference: 1959 Mauna Loa annual mean \(315.98\,\mathrm{ppm}\).
- CO2 critical reference: \(450\,\mathrm{ppm}\), used here as a demonstration high-CO2 reference level.
- Sea-level reference: first valid annual value in the selected satellite-altimetry interval.
- Sea-level critical reference: \(x_S^{\mathrm{ref}}+100\,\mathrm{mm}\), used here as a demonstration increment.
- NDVI reference: selected baseline-interval mean.
- NDVI critical reference: \(x_I^{\mathrm{ref}}-0.05\), used here as a demonstration vegetation-index decrement.
