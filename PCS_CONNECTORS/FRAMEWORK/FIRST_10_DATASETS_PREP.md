# First 10 Scientific Dataset Connectors Preparation

This document prepares the connector framework for the first ten real scientific dataset families. It is a planning document only and does not implement access, download data, or compute PCS values.

## Candidate Dataset Families

| Priority | Dataset family | Provider | Planned role |
|---|---|---|---|
| 1 | GISTEMP global temperature anomaly | NASA | Thermal observation connector |
| 2 | Mauna Loa atmospheric CO2 | NOAA | Chemical observation connector |
| 3 | Global mean sea level from satellite altimetry | NASA / NOAA / AVISO | Sea-level observation connector |
| 4 | MODIS vegetation index products | NASA | Biosphere observation connector |
| 5 | ERA5 reanalysis | ECMWF / Copernicus | Atmosphere and climate reanalysis connector |
| 6 | CERES radiation products | NASA | Radiation and energy-balance connector |
| 7 | Argo ocean profiles | Argo Program | Ocean interior connector |
| 8 | GRACE / GRACE-FO mass-change products | NASA / GFZ / JPL | Water storage and ice-mass connector |
| 9 | Sea-ice concentration products | NSIDC / NOAA / NASA | Cryosphere connector |
| 10 | Biodiversity occurrence records | GBIF | Biosphere and biodiversity connector |

## Preparation Checklist

Each candidate connector should later document:

- Provider citation
- Dataset citation
- Access route
- Authentication requirement
- Native format
- Native unit
- Temporal resolution
- Spatial resolution
- Coverage
- Latency
- Missing-data behavior
- Validation checks
- Cache policy
- Connector status

## Current Limitation

This list identifies real dataset families for future connector planning. It does not imply that all datasets are already connected, validated, or suitable for PCS operational use.
