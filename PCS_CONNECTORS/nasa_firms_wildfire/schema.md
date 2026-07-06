# NASA FIRMS Wildfire Connector Schema

## Source Dataset

NASA FIRMS Fire Information for Resource Management System.

## Source Variables

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

Sensor-dependent, including MODIS and VIIRS products.

## Expected Source Fields

FIRMS CSV records commonly include:

- latitude;
- longitude;
- acquisition date;
- acquisition time;
- satellite;
- instrument;
- confidence;
- fire radiative power;
- day/night flag;
- source product metadata.

## PCS Output Fields

Each parsed record must include:

- id
- provider
- dataset
- variable
- timestamp
- unit
- value
- uncertainty
- quality
- confidence
- source_url
- license
- version
- notes

## Missing Values

Missing values must be represented as null and marked with an appropriate quality value.

## Duplicate Detections

Duplicate detections should be identified by timestamp, latitude, longitude, sensor, and source record fields. Deduplication policy must be explicit before operational use.
