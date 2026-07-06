# NASA GPM IMERG Connector Schema

## Source Dataset

NASA GPM IMERG.

## Source Variables

- Global Precipitation Rate
- Accumulated Precipitation
- Rainfall Intensity

## Units

- mm/hr
- mm/day

## Spatial Resolution

Approximately 0.1 degree.

## Temporal Resolution

- 30 minutes
- Daily
- Monthly

## Expected Source Fields

Provider-specific source files may include:

- timestamp or valid time;
- precipitation rate;
- accumulated precipitation;
- rainfall intensity;
- unit metadata;
- grid or spatial aggregation metadata;
- quality fields where available.

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

## Status

The schema supports real source parsing when an official NASA IMERG source file or documented subset is available.
