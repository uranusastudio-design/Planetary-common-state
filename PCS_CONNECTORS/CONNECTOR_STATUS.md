# Connector Status

Connector status describes operational and lifecycle state.

## Status States

| State | Meaning |
|---|---|
| Offline | Connector is not available for use. |
| Waiting | Connector depends on missing access, review, credentials, or implementation. |
| Connected | Connector is implemented and can access its documented data source. |
| Updating | Connector is actively refreshing or processing a provider update. |
| Maintenance | Connector is temporarily disabled for update or repair. |
| Error | Connector encountered an access, parsing, validation, or output error. |
| Deprecated | Connector is no longer recommended for future PCS use. |
| Primary Connected | The approved primary source is implemented, accessible, parsed, and validated. |
| Fallback Connected | An approved fallback source is implemented, accessible, parsed, and validated. |
| Data Access Pending | A real source is identified, but access, authentication, preprocessing, or availability is unresolved. |
| Validation Failed | A connector accessed data but validation did not pass. |
| Disabled | Connector is intentionally inactive and must not emit scientific values. |

## Status Rules

- Documentation alone is not `Connected`.
- `Waiting` means the dataset has been identified but no connector has been implemented.
- `Connected` requires future implementation and successful access testing.
- `Error` must preserve failure information without fabricating data.
- `Data Access Pending` means no connector output values should be treated as observed.
- `Fallback Connected` must record fallback provenance and quality flags.
- `Validation Failed` must not be promoted to `Connected`.
- `Disabled` connectors must not emit fabricated values.
- Deprecated connectors should retain historical notes for reproducibility.

## Planned Datasets

| Dataset | Status | Note |
|---|---|---|
| ERA5 | Planned | Connector not implemented. |
