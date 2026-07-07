# Argo Ocean Connector Validation

The Argo Ocean connector output must pass validation before it is eligible for PCS Engine use.

## Required Validation

### Timestamp

Each record must include a profile timestamp or valid observation timestamp.

### Latitude

Latitude must be present and within the valid geographic range.

### Longitude

Longitude must be present and within the valid geographic range.

### Depth

Depth must be present when the record represents a depth-based profile value.

### Temperature

Temperature values must preserve source units and missing-value flags.

### Salinity

Salinity values must preserve source units and missing-value flags.

### Pressure

Pressure values must preserve source units and missing-value flags.

### Missing Values

Missing values must remain null and must not be inferred or interpolated.

### Duplicate Profiles

Duplicate profile checks should use timestamp, latitude, longitude, float identifier, profile identifier, and depth or pressure level.

### Quality Flags

Argo quality flags must be preserved when available.

## Pending Access

If official Argo data are unavailable in the execution environment, the connector may write an empty JSON array and report data access pending.

## No-Fabrication Rule

Validation must not repair, infer, interpolate, or fabricate ocean observations.
