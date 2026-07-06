# Quality Propagation

Quality propagation defines how source quality information should move through the PCS Engine.

## Quality Flags

Quality flags should remain attached to observations as they pass through validation, domain mapping, and future state assembly.

Recommended quality states include:

- observed;
- missing;
- pending;
- fallback source;
- validation failed;
- disabled.

## Missing Values

Missing values must remain missing. They should not be repaired, interpolated, or inferred by default.

## Outliers

Outliers should be flagged for review. The Engine should preserve the source value and record the quality concern unless a later documented procedure states otherwise.

## Connector Confidence

Connector confidence should reflect provider authority, validation result, source provenance, and data accessibility. It should not be promoted silently during downstream processing.
