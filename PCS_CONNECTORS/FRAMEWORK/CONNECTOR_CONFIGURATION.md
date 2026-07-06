# Connector Configuration

Connector Configuration defines the future configuration metadata for PCS connectors.

## Configuration Role

Configuration should separate provider-specific settings from connector logic and PCS Engine calculation.

## Future Configuration Fields

- Connector ID
- Provider name
- Dataset name
- Access endpoint
- Authentication mode
- Refresh interval
- Cache policy
- Output location
- Validation profile
- Logging level
- Enabled or disabled state
- Manual-download flag

## Configuration Rules

- Do not hard-code credentials.
- Do not store secrets in version-controlled files.
- Use explicit disabled states for incomplete connectors.
- Keep configuration separate from scientific normalization rules.
