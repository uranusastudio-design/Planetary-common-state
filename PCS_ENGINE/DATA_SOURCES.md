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
| NDVI | Connector structure implemented v0.1; data access pending unless real source was successfully loaded | NASA MODIS, NASA VIIRS, ESA / Copernicus vegetation products | Biosphere |
| ERA5 | Planned | Copernicus Climate Change Service (C3S) | Atmosphere, Hydrology, Energy |

Global Mean Sea Level is planned as the next Ocean data source category. The connector structure is implemented, but data access remains pending unless a real sea-level source is successfully parsed. No sea level values are inferred or added.

ERA5 is planned as a future atmospheric reanalysis connector. It is not connected to `PCS_ENGINE`, and no ERA5 values are inferred or added.

NDVI is planned as the first Biosphere connector. The connector structure is implemented, but data access remains pending unless a real NDVI source is successfully parsed. No NDVI values are inferred or added.

## Missing Sources

Sea Level and NDVI are not connected in the current prototype. Missing sources remain unavailable and are not fabricated.

## Fallback Policy

PCS must never fabricate missing scientific data.

If a primary source is unavailable, the connector may use an approved fallback source listed in `PCS_CONNECTORS/DATA_SOURCE_PRIORITY.md`.

If no approved fallback source is available, accessible, parsed, and validated, the variable remains `Waiting`, `Data Access Pending`, or `Disabled`.

Fallback use must preserve source provenance, quality flags, provider identity, dataset identity, license or access terms, and connector notes.

## Connector Validation

Connector outputs must pass validation before they are used by `PCS_ENGINE`.

The validation layer checks required fields, timestamp presence, provider identity, dataset identity, variable identity, value/quality consistency, and source provenance. Invalid data must not enter PCS Engine calculations. Missing connector files are reported as missing, and pending connector outputs remain pending rather than being repaired or filled.

Validation reports are written to `PCS_ENGINE/input/connector_validation_report.json`.

## Current Boundary

The PCS Engine currently uses the existing benchmark/prototype data products already present in the repository. The NASA GISTEMP and NOAA Mauna Loa CO2 connectors now write standardized connector JSON to `PCS_ENGINE/input/`. The Sea Level and NDVI connectors write pending connector outputs when authenticated or preprocessed source data are unavailable. No normalization changes, PCS state calculation, prediction, new data assimilation, or `latest_state.json` update is performed in this milestone.
