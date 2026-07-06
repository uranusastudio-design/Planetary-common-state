# Connector Metadata

Connector metadata records the scientific, technical, and provenance fields required for each PCS connector.

## Metadata Fields

- connector_id
- provider
- dataset
- agency
- version
- status
- created
- updated
- maintainer
- license

## Additional Recommended Metadata

- scientific domain
- subdomain
- scientific variables
- source URL
- spatial resolution
- temporal resolution
- data format
- citation
- quality notes
- known limitations

## Metadata Rules

- Metadata must be explicit before connector implementation.
- Missing metadata should be marked as unknown or pending, not guessed.
- Dataset citation and provider citation should be recorded separately when needed.
- Metadata should be version controlled with connector documentation.
- Metadata must not imply that data are connected before real source records are parsed and validated.
