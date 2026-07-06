# NASA FIRMS Wildfire Connector v1.0

This connector defines the PCS Biosphere connector for NASA FIRMS wildfire and active fire observations.

## Provider

NASA

## System

FIRMS

## Dataset

Fire Information for Resource Management System

## Scientific Variables

- Active Fire Detection
- Fire Radiative Power
- Burned Area Candidate
- Thermal Anomaly

## Units

- count
- MW
- confidence class

## Temporal Resolution

- Near real-time
- Daily

## Spatial Resolution

Sensor-dependent:

- MODIS
- VIIRS

## Required Data Endpoint

NASA FIRMS provides an area CSV API for fire detection hotspots:

```text
https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]
https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]/[DATE]
```

Supported source families include MODIS and VIIRS products. FIRMS web services require a free MAP_KEY for data requests.

## Expected Format

FIRMS area downloads are expected as CSV records with fire detection attributes such as latitude, longitude, acquisition date/time, satellite, instrument, confidence, and fire radiative power.

## Current PCS Status

Connector implemented v1.0.

No live download is implemented in this milestone. If no local official FIRMS CSV source file is provided, the connector writes a pending output without fabricating wildfire values.

## PCS Role

NASA FIRMS becomes the primary Biosphere wildfire and active fire connector for future PCS disturbance monitoring.
