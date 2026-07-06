# PCS Engine Data Sources

This document records the currently connected confirmed scientific data sources used by the PCS Engine prototype.

No calculations are changed by this document. No live API calls are added. No output values are modified.

## Current Confirmed Source Count

Current confirmed source count: 2

## Confirmed Data Sources

| Source | Observable | Current PCS role |
|---|---|---|
| NASA GISTEMP | Global Temperature | Connected connector implemented; supports the Thermal Residual and Prototype PCS Estimate. |
| NOAA Mauna Loa CO2 | Atmospheric CO2 | Connected connector implemented; supports the Chemical Residual and Prototype PCS Estimate. |

## Planned Data Sources

| Dataset | Status | Candidate providers | Future domains |
|---|---|---|---|
| Global Mean Sea Level | Connector structure implemented v0.1; data access pending unless real source was successfully loaded | NASA/JPL, AVISO/CNES, Copernicus Marine Service | Ocean |
| ERA5 | Planned | Copernicus Climate Change Service (C3S) | Atmosphere, Hydrology, Energy |

Global Mean Sea Level is planned as the next Ocean data source category. The connector structure is implemented, but data access remains pending unless a real sea-level source is successfully parsed. No sea level values are inferred or added.

ERA5 is planned as a future atmospheric reanalysis connector. It is not connected to `PCS_ENGINE`, and no ERA5 values are inferred or added.

## Missing Sources

Sea Level and NDVI are not connected in the current prototype. Missing sources remain unavailable and are not fabricated.

## Current Boundary

The PCS Engine currently uses the existing benchmark/prototype data products already present in the repository. The NASA GISTEMP and NOAA Mauna Loa CO2 connectors now write standardized connector JSON to `PCS_ENGINE/input/`. The Sea Level connector writes a pending connector output when authenticated source data are unavailable. No normalization changes, PCS state calculation, prediction, new data assimilation, or `latest_state.json` update is performed in this milestone.
