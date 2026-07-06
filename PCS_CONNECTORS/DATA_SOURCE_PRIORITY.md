# PCS Data Source Priority Chains

This document defines approved source priority chains for future PCS connectors.

The chains identify candidate fallback sources only. They do not mark fallback sources as connected, validated, or operational.

## Global Temperature

1. Primary: NASA GISTEMP
2. Fallback: NOAA GlobalTemp
3. Fallback: Berkeley Earth

## CO2

1. Primary: NOAA Mauna Loa
2. Fallback: NOAA Global Monitoring Laboratory
3. Fallback: Copernicus Atmosphere Monitoring Service

## Sea Level

1. Primary: NASA/JPL Sea Level
2. Fallback: AVISO/CNES
3. Fallback: Copernicus Marine Service

## NDVI

1. Primary: NASA MODIS
2. Fallback: NASA VIIRS
3. Fallback: Copernicus Global Land Service
4. Fallback: NOAA AVHRR CDR

## Sea Ice

1. Primary: NSIDC
2. Fallback: Copernicus
3. Fallback: ESA

## Wildfire

1. Primary: NASA FIRMS
2. Fallback: VIIRS active fire
3. Fallback: MODIS active fire

## Precipitation

1. Primary: NASA IMERG
2. Fallback: GPM
3. Fallback: ERA5 precipitation

## Atmosphere

1. Primary: ERA5
2. Fallback: NOAA reanalysis
3. Fallback: JRA-55

## Use Rule

If no source in the approved priority chain can be accessed, parsed, and validated, the connector must leave the variable as `Waiting`, `Data Access Pending`, or `Disabled`. No scientific value may be fabricated.
