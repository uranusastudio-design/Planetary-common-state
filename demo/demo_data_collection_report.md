# Demo Data Collection Report

Date: 2026-07-04

## Scope

Created a new `demo/` folder for a minimal reproducible PCS demonstration using four public Earth-observation observables. No manuscript files were edited.

## Files Created

- `README.md`
- `data_sources.md`
- `demo_data_plan.md`
- `demo_pipeline.py`
- `requirements.txt`

The scaffold also creates expected data folders:

- `data/raw/`
- `data/processed/`

## Observable Coverage

- Thermal projection \(L_T\): NASA GISTEMP global annual temperature anomaly.
- Chemical projection \(L_C\): NOAA GML Mauna Loa annual mean CO2.
- Structural projection \(L_S\): NASA global mean sea level / satellite altimetry.
- Biosphere / informational projection \(L_I\): MODIS MOD13C2 NDVI or equivalent public global vegetation index.

## Download Status

- NASA GISTEMP: automatic download planned through the NASA GISS CSV endpoint.
- NOAA Mauna Loa CO2: automatic download planned through the NOAA GML annual text endpoint.
- NASA sea level: manual-download required until a stable direct NASA/PO.DAAC annual global mean sea-level endpoint is selected.
- MODIS MOD13C2 NDVI: manual-download required because NASA Earthdata authentication and gridded global processing are expected.

## Normalization Plan

Each observable is converted to a normalized projection:

\[
L_i(t)=\frac{x_i(t)-x_i^{\mathrm{ref}}}{x_i^{\mathrm{crit}}-x_i^{\mathrm{ref}}}.
\]

For NDVI decline, the scaffold uses the inverted form:

\[
L_I(t)=\frac{x_I^{\mathrm{ref}}-x_I(t)}{x_I^{\mathrm{ref}}-x_I^{\mathrm{crit}}}.
\]

The minimal demo state is

\[
S_{\mathrm{demo}}(t)=\frac{1}{4}\left[L_T(t)+L_C(t)+L_S(t)+L_I(t)\right].
\]

## Reproducibility Notes

- No data are fabricated.
- Manual sources must be placed in `data/raw/` before the pipeline can produce a complete demo state.
- Placeholder normalization constants are included only to make the software scaffold explicit; they are not scientific claims.
- Processed output will be written to `data/processed/pcs_demo_state.csv`.
- Runtime verification was not completed in this environment because neither `python` nor `py` was available as a shell command. The pipeline remains a source skeleton for later execution in a Python environment.
