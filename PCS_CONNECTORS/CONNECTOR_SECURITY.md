# Connector Security

Connector Security defines future access and integrity practices.

## API Keys

Future connectors that require API keys must keep keys outside version-controlled documentation and source files.

## OAuth

Future OAuth-based connectors should document authentication flow, token scope, refresh behavior, and failure handling without storing credentials in the repository.

## Rate Limits

Each connector should document provider rate limits and avoid unnecessary requests.

## Checksum Verification

Where providers publish checksums or file integrity metadata, future connectors should verify downloaded files before use.

## Security Rules

- Do not commit credentials.
- Do not bypass provider access rules.
- Do not overload provider services.
- Preserve integrity checks when available.
