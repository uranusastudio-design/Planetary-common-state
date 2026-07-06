# Connector Validation

Connector Validation defines how future connector outputs should be checked before PCS use.

## Validation Scope

Validation should confirm that acquired observations match expected metadata, units, temporal coverage, and missing-data policy.

## Future Validation Checks

- Dataset downloaded from expected source
- File format matches connector metadata
- Required fields are present
- Units match documented units
- Timestamp parsing is reproducible
- Missing values are preserved
- No fabricated values are introduced
- Basic range checks are documented
- Provenance is recorded

## Boundary

Connector validation is not PCS theory validation and is not prediction validation. It only checks observation acquisition and connector output integrity.
