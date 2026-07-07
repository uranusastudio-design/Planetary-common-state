# Argo Ocean Connector Schema

## Source Dataset

Global Argo Float Observations.

## Source Variables

- Ocean Temperature Profile
- Ocean Salinity Profile
- Pressure
- Depth

## Units

- degrees Celsius (deg C)
- PSU
- dbar
- meters

## Temporal Resolution

- Daily
- Near real-time

## Spatial Resolution

Global float observations.

## Expected Source Fields

Official or documented local profile summaries should include:

- timestamp or profile time;
- latitude;
- longitude;
- float identifier or profile identifier;
- depth or pressure level;
- temperature;
- salinity;
- pressure;
- quality flags where available.

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

## Duplicate Profiles

Duplicate profile checks should use timestamp, latitude, longitude, float identifier, profile identifier, and depth or pressure level.
