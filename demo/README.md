# Minimal PCS Demonstration

This folder contains a reproducible scaffold for a four-observable Planetary Common State (PCS) demonstration. It does not modify the manuscript.

## Observables

- \(L_T\): thermal projection from NASA GISTEMP annual global temperature anomaly.
- \(L_C\): chemical projection from NOAA GML Mauna Loa annual mean CO2.
- \(L_S\): structural projection from NASA global mean sea level / satellite altimetry.
- \(L_I\): biosphere/informational projection from MODIS MOD13C2 NDVI or an equivalent public global vegetation-index product.

## Demo State

The minimal demonstration state is

\[
S_{\mathrm{demo}}(t)=\frac{1}{4}\left[L_T(t)+L_C(t)+L_S(t)+L_I(t)\right].
\]

Each projection is normalized as

\[
L_i(t)=\frac{x_i(t)-x_i^{\mathrm{ref}}}{x_i^{\mathrm{crit}}-x_i^{\mathrm{ref}}}.
\]

The reference and critical values are placeholders in the pipeline and must be justified before any manuscript use.

## Quick Start

```bash
python -m pip install -r requirements.txt
python demo_pipeline.py
```

The script creates `data/processed/pcs_demo_state.csv` when all required input series are available.

## Manual Data

Sea level and MODIS NDVI are marked as manual-download required in this scaffold. Place manually prepared annual series in:

- `data/raw/sea_level_annual.csv` with columns `year,gmsl_mm`
- `data/raw/ndvi_annual.csv` with columns `year,ndvi`

No data are fabricated by the demo pipeline.
