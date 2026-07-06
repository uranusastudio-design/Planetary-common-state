# NASA GPM IMERG Connector v1.0

This connector defines the PCS Hydrology connector for NASA Global Precipitation Measurement IMERG precipitation observations.

## Provider

NASA

## Mission

Global Precipitation Measurement (GPM)

## Dataset

IMERG

## Scientific Variables

- Global Precipitation Rate
- Accumulated Precipitation
- Rainfall Intensity

## Units

- mm/hr
- mm/day

## Temporal Resolution

- 30 minutes
- Daily
- Monthly

## Spatial Resolution

Approximately 0.1 degree.

## Required Data Endpoints

Official NASA data access should be routed through NASA GPM and NASA GES DISC product pages, including IMERG half-hourly, daily, and monthly products:

- NASA GPM data directory: `https://gpm.nasa.gov/data/directory`
- GES DISC IMERG half-hourly product family: `https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGHH_07/summary`
- GES DISC IMERG daily product family: `https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary`
- GES DISC IMERG monthly product family: `https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary`

Access may require NASA Earthdata authentication depending on product and access route.

## Expected Format

NASA IMERG data are commonly distributed as HDF5, NetCDF-compatible products, or provider-generated subsets. PCS may ingest official preprocessed CSV or JSON summaries when the source and transformation are documented.

## Current PCS Status

Connector implemented v1.0.

No live download is implemented in this milestone. If no local official source file is provided, the connector writes a pending output without fabricating precipitation values.

## PCS Role

NASA GPM IMERG becomes the primary Hydrology precipitation connector for future PCS precipitation monitoring.
