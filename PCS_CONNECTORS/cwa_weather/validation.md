# CWA Weather Connector Validation

The CWA Weather connector output must pass validation before it is treated as connected by the PCS aggregation layer.

## Required Validation

### Timestamp

Every record must include an observation timestamp.

### Station Name

Every record must preserve the station name.

### Latitude

Latitude must be present and within the valid geographic range.

### Longitude

Longitude must be present and within the valid geographic range.

### Weather Variables

Air temperature, relative humidity, wind speed, pressure, and rainfall must preserve source values and units when available.

### Missing Values

Missing values must remain null. They must not be inferred or interpolated.

### Duplicate Timestamps

Duplicate station-variable timestamps must be rejected.

## Pending Access

If no CWA authorization token is available, the connector writes an empty JSON array and reports data access pending.

## No-Fabrication Rule

Validation must not repair, infer, interpolate, or fabricate weather observations.
