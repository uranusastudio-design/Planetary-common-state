# NASA GPM IMERG Connector Validation

The NASA GPM IMERG connector output must pass validation before it is eligible for PCS Engine use.

## Required Validation

### Timestamp

Each record must include a valid timestamp or valid time from the source product.

### Units

Units must be explicit and must match the parsed variable. Expected units include mm/hr and mm/day.

### Missing Values

Missing precipitation values must remain null. Missing records must not be interpolated or inferred.

### Quality Flag

Each record must include a quality flag. Null values are allowed only when quality indicates missing or unavailable data.

### Spatial Consistency

Spatial resolution, grid information, or aggregation method must be documented. A global aggregate must not be mixed with grid-cell values without explicit metadata.

## Pending Access

If official NASA IMERG data are unavailable in the execution environment, the connector may write an empty JSON array and report data access pending.

## No-Fabrication Rule

Validation must not repair, infer, interpolate, or fabricate precipitation observations.
