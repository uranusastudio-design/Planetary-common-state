# Connector Metadata

Connector Metadata records scientific, technical, and provenance information for each future connector.

## Required Metadata Categories

- Provider identity
- Dataset identity
- Scientific domain
- Observed quantity
- Physical unit
- Spatial coverage
- Temporal coverage
- Native resolution
- Data format
- Access method
- Authentication
- License
- Citation
- Quality notes
- Known limitations
- PCS integration status

## Metadata Rules

- Metadata must be explicit before connector implementation.
- Missing metadata should be marked as unknown or TODO, not guessed.
- Dataset citation and provider citation should be recorded separately when needed.
- Metadata should be version controlled with connector documentation.
