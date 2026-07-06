# Connector Logging

Connector Logging defines future audit records for connector operations.

## Log Types

| Log | Purpose |
|---|---|
| Connection log | Records provider reachability and access attempts. |
| Download log | Records file or response retrieval events. |
| Validation log | Records schema, unit, timestamp, and quality checks. |
| Error log | Records failures without suppressing missing data. |
| Recovery log | Records retry, rollback, or restored-service events. |

## Logging Rules

- Logs must not contain secrets or credentials.
- Logs should distinguish provider failure from PCS processing failure.
- Missing data must be logged as missing, not filled.
- Logs should support reproducibility and later review.
