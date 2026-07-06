# NASA FIRMS Wildfire Connector Validation

The NASA FIRMS wildfire connector output must pass validation before it is eligible for PCS Engine use.

## Required Validation

### Timestamp

Each record must include an acquisition timestamp or valid timestamp derived from official FIRMS acquisition date and time fields.

### Latitude

Latitude must be present and within the valid geographic range.

### Longitude

Longitude must be present and within the valid geographic range.

### Sensor

Sensor or instrument information must be preserved when available, including MODIS or VIIRS product identity.

### Confidence

Confidence must be preserved as a source confidence class or numeric source confidence field.

### Fire Radiative Power

Fire Radiative Power must preserve the official source value and unit where present.

### Missing Values

Missing values must remain null and must not be inferred or interpolated.

### Duplicate Detections

Duplicate detection checks should use timestamp, latitude, longitude, sensor, and source identity.

## Pending Access

If official NASA FIRMS data are unavailable in the execution environment, the connector may write an empty JSON array and report data access pending.

## No-Fabrication Rule

Validation must not repair, infer, interpolate, or fabricate wildfire observations.
