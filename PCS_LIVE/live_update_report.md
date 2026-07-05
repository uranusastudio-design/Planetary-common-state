# PCS Live Update Report v1.0

## Scope

This prototype tests live ingestion of public annual observations for the PCS demonstration. It uses only NASA GISTEMP and NOAA GML Mauna Loa CO2. No prediction, interpolation, or fabricated values are used.

## Sources

| Observable | Provider | URL | Latest complete annual value used |
|---|---|---|---|
| Temperature | NASA GISTEMP v4 | https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt | 2025 annual anomaly = 1.19 deg C |
| CO2 | NOAA GML Mauna Loa | https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt | 2025 annual mean = 427.35 ppm |

The NASA source lists 2026 monthly values through May 2026, but the 2026 annual mean is incomplete and is not used. The NOAA annual file lists 2025 as the latest annual mean in the accessed source snapshot.

## Local Download Status

The local execution environment attempted to download both source files into `PCS_LIVE/raw/`. Both direct PowerShell download attempts failed with a connection receive error. The prototype script `live_update.py` is designed to retry these downloads and to use local cached raw files if available.

For this run, `latest_state.json` and `latest_state.csv` were generated from the official public source snapshots accessed during the session on 2026-07-05.

## Projection Update

The live prototype applies the PCS projection standard:

\[
L_T = \frac{x_T - 0.0}{1.5 - 0.0},
\]

\[
L_C = \frac{x_C - 315.98}{450.0 - 315.98}.
\]

Both values are clipped to \([0,1]\). The resulting live projections are:

| Projection | Value |
|---|---:|
| \(L_T\) | 0.7933333333 |
| \(L_C\) | 0.8309953738 |

The live demo state is computed as the mean of available projections:

\[
S_{\mathrm{demo}} = 0.8121643536.
\]

The coverage count is 2.

## Generated Files

- `PCS_LIVE/live_update.py`
- `PCS_LIVE/latest_state.json`
- `PCS_LIVE/latest_state.csv`
- `PCS_LIVE/live_update_report.md`

## Limitations

This prototype verifies ingestion logic for two public annual feeds only. It does not validate prediction skill, does not infer unavailable observables, and does not replace the benchmark validation workflow.

