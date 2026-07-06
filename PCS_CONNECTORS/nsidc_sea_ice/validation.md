# NSIDC Sea Ice Connector Validation

The NSIDC Sea Ice connector output must pass validation before it is eligible for PCS Engine use.

## Validation Checks

- Output file exists.
- Output is a JSON array.
- Each record contains required PCS connector fields.
- Each record contains a timestamp.
- Each record contains a variable name.
- Each record contains a unit.
- Each record records provider and dataset provenance.
- Null values are allowed only when quality indicates missing or unavailable data.
- Source provenance is recorded for every parsed record.

## Pending Access

If the official NSIDC endpoint is unavailable in the execution environment, the connector may write an empty JSON array and report data access pending.

## No-Fabrication Rule

Validation must not repair, infer, interpolate, or fabricate sea-ice observations.
