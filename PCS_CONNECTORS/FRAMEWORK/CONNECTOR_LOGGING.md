# Connector Logging

Connector Logging defines the future event record for connector operations.

## Logging Role

Logs should make connector behavior reproducible and auditable without storing unsupported scientific claims.

## Future Log Events

- Connector start
- Provider access attempt
- Authentication status, if applicable
- Download status
- Parse status
- Validation status
- Missing-data notice
- Error message
- Output write status
- Connector completion

## Logging Rules

- Logs should never contain secrets or credentials.
- Failed downloads should be recorded clearly.
- Missing observations should remain missing.
- Logs should separate provider failure from PCS processing failure.
