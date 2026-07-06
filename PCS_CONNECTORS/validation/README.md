# PCS Connector Validation Layer v0.1

The PCS Connector Validation Layer checks connector output before any connector record is eligible for PCS Engine use.

## Purpose

Connector validation exists to prevent malformed, incomplete, or unprovenanced data from entering downstream PCS processing. It is a scientific quality gate, not a data-repair tool.

## Missing Data Preservation

PCS must preserve missing data because unavailable observations carry scientific meaning. A missing sea-level or NDVI record should remain missing until a real source is accessed, parsed, and validated.

The validator allows `null` values only when the record quality explicitly indicates that the observation is missing or unavailable.

## Invalid Data Boundary

Invalid connector output must not enter PCS Engine calculations. The validation layer reports problems but does not silently repair records, infer values, interpolate missing observations, or fabricate replacements.

## Reproducibility

Validation supports scientific reproducibility by checking required fields, timestamp presence, provider identity, dataset identity, variable identity, source provenance, and quality status. The generated report records which connector outputs are valid, pending, missing, or invalid.

## Report Output

The validation report is written to:

```text
PCS_ENGINE/input/connector_validation_report.json
```

## Current Expected Connector Files

- `nasa_gistemp_pcs.json`
- `noaa_mauna_loa_co2_pcs.json`
- `sea_level_pcs.json`
- `ndvi_pcs.json`
