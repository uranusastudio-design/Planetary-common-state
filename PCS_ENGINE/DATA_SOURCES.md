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
| NSIDC Sea Ice | Connector implemented v1.0; data access pending unless real source was successfully loaded | NSIDC | Cryosphere |
| NASA GPM IMERG | Connector implemented v1.0; data access pending unless real source was successfully loaded | NASA GPM / GES DISC | Hydrology |
| NASA FIRMS Wildfire | Connector implemented v1.0; data access pending unless real source was successfully loaded | NASA FIRMS | Biosphere |
| Argo Ocean | Connector implemented v1.0; data access pending unless real source was successfully loaded | International Argo Programme | Ocean |
| ERA5 | Planned | Copernicus Climate Change Service (C3S) | Atmosphere, Hydrology, Energy |

Global Mean Sea Level is planned as the next Ocean data source category. The connector structure is implemented, but data access remains pending unless a real sea-level source is successfully parsed. No sea level values are inferred or added.

ERA5 is planned as a future atmospheric reanalysis connector. It is not connected to `PCS_ENGINE`, and no ERA5 values are inferred or added.

NDVI is planned as the first Biosphere connector. The connector structure is implemented, but data access remains pending unless a real NDVI source is successfully parsed. No NDVI values are inferred or added.

NSIDC Sea Ice is the primary Cryosphere connector. The connector is implemented v1.0 for Arctic and Antarctic sea-ice extent records, but data access remains pending unless official NSIDC source records are successfully parsed and validated. No sea-ice values are inferred or added.

NASA GPM IMERG is the primary Hydrology precipitation connector. The connector is implemented v1.0 for precipitation rate, accumulated precipitation, and rainfall intensity records, but data access remains pending unless official NASA IMERG source records are successfully parsed and validated. No precipitation values are inferred or added.

NASA FIRMS Wildfire is the primary Biosphere wildfire and active fire connector. The connector is implemented v1.0 for active fire detection, fire radiative power, burned area candidate, and thermal anomaly records, but data access remains pending unless official NASA FIRMS source records are successfully parsed and validated. No wildfire values are inferred or added.

Argo Ocean is the primary Ocean profile connector. The connector is implemented v1.0 for ocean temperature profile, ocean salinity profile, pressure, and depth records, but data access remains pending unless official Argo source records are successfully parsed and validated. No ocean profile values are inferred or added.

## Missing Sources

Sea Level, NDVI, NSIDC Sea Ice, NASA GPM IMERG, NASA FIRMS Wildfire, and Argo Ocean are not connected to current PCS calculations. Missing sources remain unavailable and are not fabricated.

## Fallback Policy

PCS must never fabricate missing scientific data.

If a primary source is unavailable, the connector may use an approved fallback source listed in `PCS_CONNECTORS/DATA_SOURCE_PRIORITY.md`.

If no approved fallback source is available, accessible, parsed, and validated, the variable remains `Waiting`, `Data Access Pending`, or `Disabled`.

Fallback use must preserve source provenance, quality flags, provider identity, dataset identity, license or access terms, and connector notes.

## Connector Validation

Connector outputs must pass validation before they are used by `PCS_ENGINE`.

The validation layer checks required fields, timestamp presence, provider identity, dataset identity, variable identity, value/quality consistency, and source provenance. Invalid data must not enter PCS Engine calculations. Missing connector files are reported as missing, and pending connector outputs remain pending rather than being repaired or filled.

Validation reports are written to `PCS_ENGINE/input/connector_validation_report.json`.

## Aggregation Status

The PCS Observatory reads `PCS_ENGINE/output/latest_state.json`.

The aggregation step in `PCS_ENGINE/aggregator/` refreshes this file by summarizing connector output availability from `PCS_ENGINE/input/`.

Aggregation does not compute a new scientific PCS value. It preserves the existing prototype state fields for Observatory compatibility and adds connector-health, source-status, and domain-status summaries.

Empty connector output arrays are classified as `Waiting`. Only non-empty connector outputs are classified as `Connected`.

## Current Boundary

The PCS Engine currently uses the existing benchmark/prototype data products already present in the repository. The NASA GISTEMP and NOAA Mauna Loa CO2 connectors now write standardized connector JSON to `PCS_ENGINE/input/`. The Sea Level and NDVI connectors write pending connector outputs when authenticated or preprocessed source data are unavailable. No normalization changes, PCS state calculation, prediction, new data assimilation, or `latest_state.json` update is performed in this milestone.
