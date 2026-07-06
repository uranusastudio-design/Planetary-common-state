# NASA FIRMS Wildfire

## Dataset Description

NASA FIRMS provides active fire and thermal anomaly observations from satellite instruments including MODIS and VIIRS. FIRMS supports near-real-time wildfire and active fire monitoring.

## Scientific Variables

- Active Fire Detection
- Fire Radiative Power
- Burned Area Candidate
- Thermal Anomaly

## Spatial Resolution

Sensor-dependent, including MODIS and VIIRS products.

## Temporal Resolution

- Near real-time
- Daily

## Update Frequency

Update frequency depends on source product and processing stream. FIRMS supports near-real-time active fire products where available.

## Quality Considerations

FIRMS quality handling must preserve timestamp, latitude, longitude, sensor, confidence, fire radiative power, missing values, duplicate detections, and source product identity. Duplicate detection policy must be explicit before operational use.

## Future PCS Role

NASA FIRMS becomes the primary Biosphere wildfire and active fire connector for future PCS disturbance monitoring.

## Current PCS Status

Connector implemented v1.0. Data are confirmed only after official NASA FIRMS records are successfully parsed and validated.
