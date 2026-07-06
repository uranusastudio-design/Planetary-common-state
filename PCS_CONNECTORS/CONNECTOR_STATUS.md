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

## Status Rules

- Documentation alone is not `Connected`.
- `Connected` requires future implementation and successful access testing.
- `Error` must preserve failure information without fabricating data.
- Deprecated connectors should retain historical notes for reproducibility.
