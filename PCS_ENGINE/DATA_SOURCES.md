# PCS Engine Data Sources

This document records the currently connected confirmed scientific data sources used by the PCS Engine prototype.

No calculations are changed by this document. No live API calls are added. No output values are modified.

## Current Confirmed Source Count

Current confirmed source count: 2

## Confirmed Data Sources

| Source | Observable | Current PCS role |
|---|---|---|
| NASA GISTEMP | Global Temperature | Supports the Thermal Residual and Prototype PCS Estimate. |
| NOAA Mauna Loa CO2 | Atmospheric CO2 | Supports the Chemical Residual and Prototype PCS Estimate. |

## Missing Sources

Sea Level and NDVI are not connected in the current prototype. Missing sources remain unavailable and are not fabricated.

## Current Boundary

The PCS Engine currently uses the existing benchmark/prototype data products already present in the repository. This document does not implement connector downloads, normalization changes, prediction, or new data assimilation.
