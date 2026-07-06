# NASA GPM IMERG

## Dataset Description

NASA Global Precipitation Measurement IMERG provides satellite-based precipitation estimates intended for global precipitation monitoring and hydrological applications.

## Scientific Variables

- Global Precipitation Rate
- Accumulated Precipitation
- Rainfall Intensity

## Spatial Resolution

Approximately 0.1 degree.

## Temporal Resolution

- 30 minutes
- Daily
- Monthly

## Update Frequency

Update frequency depends on IMERG product type, including near-real-time and final research products. Operational PCS use must record the exact product family and latency.

## Quality Considerations

IMERG quality handling must preserve timestamp, unit, source product, spatial aggregation, missing values, and any provider quality metadata. Global aggregates must not be mixed with grid-cell records without explicit spatial metadata.

## Future PCS Role

NASA GPM IMERG becomes the primary Hydrology precipitation connector for future PCS precipitation monitoring.

## Current PCS Status

Connector implemented v1.0. Data are confirmed only after official NASA IMERG records are successfully parsed and validated.
