# PCS Core Data Integration Queue

Phase 2.1 defines the first ten priority Earth-system datasets for PCS connector implementation.

This queue is documentation only. It does not implement APIs, download data, calculate PCS values, update `latest_state.json`, or mark any source as connected unless a real connector has already parsed validated data.

## Integration Rules

- Connectors are implemented in priority order unless access, licensing, or validation constraints require deferral.
- PCS must never fabricate missing scientific observations.
- Each connector must preserve source provenance, units, timestamps, quality flags, confidence, and license information.
- PCS Engine may use only validated connector outputs.
- Waiting datasets remain waiting until real source data are parsed and validated.

## First 10 Priority Datasets

| Priority | Dataset | PCS Domain | Subdomain | Scientific variable | Preferred provider | Fallback provider | Expected update frequency | Expected format | Current status | Future connector folder | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | NASA GISTEMP - Global Temperature | Atmosphere | Temperature | Global surface temperature anomaly | NASA GISS | NOAA GlobalTemp; Berkeley Earth | Monthly or annual release | Text, CSV, or tabular data | Confirmed source; connector implemented v0.1 | `PCS_CONNECTORS/nasa_gistemp/` | Existing Tier 1 benchmark source. |
| 2 | NOAA Mauna Loa CO2 - Atmospheric CO2 | Atmosphere | Trace Gases | Atmospheric CO2 concentration | NOAA Global Monitoring Laboratory | Copernicus Atmosphere Monitoring Service | Monthly or annual release | Text, CSV, or tabular data | Confirmed source; connector implemented v0.1 | `PCS_CONNECTORS/noaa_mauna_loa_co2/` | Existing Tier 1 benchmark source. |
| 3 | NASA/JPL or AVISO Sea Level - Global Mean Sea Level | Ocean | Sea Level | Global mean sea level | NASA/JPL Sea Level Change | AVISO/CNES; Copernicus Marine Service | Monthly or mission-dependent | NetCDF, CSV, text, or tabular data | Waiting; connector structure implemented v0.1 | `PCS_CONNECTORS/sea_level/` | No fabricated sea-level values are permitted. |
| 4 | NASA MODIS or VIIRS NDVI - Vegetation Index | Biosphere | Vegetation | NDVI | NASA MODIS | NASA VIIRS; Copernicus Global Land Service; NOAA AVHRR CDR | 16-day, monthly, or annual aggregate | HDF, GeoTIFF, NetCDF, CSV, or derived tabular data | Waiting; connector structure implemented v0.1 | `PCS_CONNECTORS/ndvi/` | Access and aggregation strategy require validation. |
| 5 | NSIDC Sea Ice - Arctic and Antarctic Sea Ice | Cryosphere | Sea Ice | Sea-ice extent or concentration | NSIDC | Copernicus; ESA | Daily or monthly | NetCDF, GeoTIFF, CSV, or tabular data | Connector implemented v1.0; data access pending unless real source was successfully loaded | `PCS_CONNECTORS/nsidc_sea_ice/` | Arctic and Antarctic products should remain distinguishable. |
| 6 | NASA FIRMS - Wildfire / Active Fire | Biosphere | Wildfire | Active fire detections | NASA FIRMS | VIIRS active fire; MODIS active fire | Near-real-time to daily | CSV, GeoJSON, shapefile, or API response | Planned | `PCS_CONNECTORS/firms_wildfire/` | Event data require careful spatial and temporal aggregation. |
| 7 | NASA IMERG - Precipitation | Hydrology | Precipitation | Precipitation rate or accumulation | NASA IMERG | GPM; ERA5 precipitation | Half-hourly, daily, monthly, or annual aggregate | NetCDF, HDF, GeoTIFF, or tabular data | Planned | `PCS_CONNECTORS/imerg_precipitation/` | Connector must preserve aggregation period. |
| 8 | ERA5 - Atmospheric Reanalysis | Atmosphere | Atmospheric Reanalysis | Reanalysis atmospheric variables | Copernicus Climate Change Service | NOAA reanalysis; JRA-55 | Hourly with delayed releases | NetCDF, GRIB, or API response | Planned | `PCS_CONNECTORS/era5/` | Future atmospheric backbone dataset across several domains. |
| 9 | Argo - Ocean Temperature / Salinity | Ocean | Ocean Interior | Ocean temperature and salinity profiles | Argo | Copernicus Marine Service | Near-real-time and delayed-mode updates | NetCDF or profile data | Planned | `PCS_CONNECTORS/argo/` | Profile data require depth-aware handling before PCS aggregation. |
| 10 | GRACE - Terrestrial Water Storage | Hydrology | Water Storage | Terrestrial water storage anomaly | NASA GRACE / GRACE-FO | CSR; JPL; GFZ; Copernicus products where appropriate | Monthly or mission-dependent | NetCDF, HDF, GeoTIFF, or tabular data | Planned | `PCS_CONNECTORS/grace_water_storage/` | Mission gaps and uncertainty metadata must remain visible. |

## Confirmed Sources

Current confirmed sources: 2

- NASA GISTEMP - Global Temperature
- NOAA Mauna Loa CO2 - Atmospheric CO2

## Waiting Sources

Current waiting sources from the first batch:

- NASA/JPL or AVISO Sea Level - Global Mean Sea Level
- NASA MODIS or VIIRS NDVI - Vegetation Index

## Planned Sources

The remaining first-batch datasets are planned until connector implementation and validation are completed.
