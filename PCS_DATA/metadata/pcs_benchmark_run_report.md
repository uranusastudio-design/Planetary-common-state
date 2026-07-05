# PCS Benchmark Run Report

Run date: 2026-07-05  
Run name: PCS Benchmark Dataset Run v1.0  
Scope: Tier 1 operational demonstration only

## Summary

Created the first PCS benchmark dataset package under `PCS_DATA/`. The run uses available Tier 1 public data for NASA GISTEMP and NOAA Mauna Loa CO2, documents unavailable direct access for NASA global mean sea level and MODIS NDVI, preserves missing values as `NaN`, and computes normalized projections for the available variables only.

No manuscript files were modified.

## Directory Structure

- `PCS_DATA/raw/`
- `PCS_DATA/processed/`
- `PCS_DATA/normalized/`
- `PCS_DATA/figures/`
- `PCS_DATA/metadata/`

## Data Acquisition Status

| Dataset | Status | Notes |
|---|---|---|
| NASA GISTEMP | Available | Official annual source excerpt stored under `raw/`; annual 2000--2024 values converted to degrees C. |
| NOAA Mauna Loa CO2 | Available | Official annual source excerpt stored under `raw/`; annual 2000--2024 values preserved in ppm. |
| NASA Global Mean Sea Level | Unavailable in automated run | NASA/PO.DAAC access requires manual/authenticated Earthdata path; `SeaLevel` retained as `NaN`. |
| MODIS NDVI | Unavailable in automated run | MOD13C2 requires Earthdata/LP DAAC access and gridded global aggregation; `NDVI` retained as `NaN`. |

## Processed Dataset

File:

- `PCS_DATA/processed/demo_annual_dataset.csv`

Columns:

- `Year`
- `Temperature`
- `CO2`
- `SeaLevel`
- `NDVI`

The dataset spans 2000--2024. `SeaLevel` and `NDVI` are literal `NaN` for all years in this first operational run.

## Normalized Projection Dataset

File:

- `PCS_DATA/normalized/demo_projection_dataset.csv`

Columns:

- `Year`
- `L_T`
- `L_C`
- `L_S`
- `L_I`
- `S_demo`
- `coverage_count`

Normalization follows `demo/pcs_projection_standard_v1.md`:

\[
L_i(t)=\frac{x_i(t)-x_i^{\mathrm{ref}}}{x_i^{\mathrm{crit}}-x_i^{\mathrm{ref}}}.
\]

Applied constants:

- \(L_T\): \(x_T^{\mathrm{ref}}=0.0\,^\circ\mathrm{C}\), \(x_T^{\mathrm{crit}}=1.5\,^\circ\mathrm{C}\).
- \(L_C\): \(x_C^{\mathrm{ref}}=315.98\,\mathrm{ppm}\), \(x_C^{\mathrm{crit}}=450.0\,\mathrm{ppm}\).

\(L_S\) and \(L_I\) remain `NaN` because the corresponding data are unavailable in this run.

The demo state is computed as

\[
S_{\mathrm{demo}}(t)=\mathrm{mean}\{L_i(t): L_i(t)\ \mathrm{is\ available}\}.
\]

For this run, `coverage_count=2` for all years.

## Figures

Generated:

- `PCS_DATA/figures/fig09_demo_projection_components.png`
- `PCS_DATA/figures/fig10_demo_state_trajectory.png`

These figures are descriptive diagnostics only. They do not imply prediction accuracy.

## Non-Fabrication Statement

No missing values were fabricated. Sea-level and NDVI values remain `NaN` until authenticated/manual data acquisition and preprocessing are completed.

## Operational Limitations

- The local shell could not use escalated network download tooling in this session.
- GISTEMP and CO2 values were populated from official source text already verified through source access.
- The sea-level and NDVI sources require authenticated/manual data workflows.
- This run is not a validation study and makes no claim of predictive skill.

## Final Status

PASS with documented missing sources. The first PCS benchmark dataset package was created for an operational demonstration using available Tier 1 public data.
