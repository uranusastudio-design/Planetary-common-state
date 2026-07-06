# NSIDC Sea Ice Connector v1.0

This connector defines the PCS Cryosphere connector for NSIDC Sea Ice Index observations.

## Provider

NSIDC

## Dataset

Sea Ice Index

## Scientific Variables

- Arctic Sea Ice Extent
- Antarctic Sea Ice Extent
- Sea Ice Area

## Unit

million km^2

## Temporal Resolution

- Daily
- Monthly

## Current PCS Status

Connector implemented v1.0.

Live data access depends on availability of the public NSIDC Sea Ice Index endpoint or a local official source file. If data access is unavailable, the connector writes a pending output without fabricating values.

## Required Endpoints

Expected NSIDC Sea Ice Index daily extent CSV endpoints:

- Arctic: `https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v3.0.csv`
- Antarctic: `https://noaadata.apps.nsidc.org/NOAA/G02135/south/daily/data/S_seaice_extent_daily_v3.0.csv`

## PCS Role

NSIDC Sea Ice Index is the planned primary Cryosphere connector for sea-ice extent and related cryosphere monitoring.

## No-Fabrication Rule

Missing or unavailable sea-ice observations remain missing. The connector must not infer, interpolate, or fabricate observations.
