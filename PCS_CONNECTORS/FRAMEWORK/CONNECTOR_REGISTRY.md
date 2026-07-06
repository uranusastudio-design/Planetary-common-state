# Connector Registry

The Connector Registry is the authoritative documentation index for future PCS data connectors.

## Registry Role

The registry records which scientific providers and dataset families may become PCS connectors. It distinguishes provider identity, scientific purpose, access method, update cadence, data format, license, citation, and planned PCS role.

## Registry Fields

Each future connector record should include:

- Connector ID
- Provider
- Dataset family
- Scientific domain
- Observation category
- Access method
- Authentication requirement
- Native data format
- Update frequency
- Temporal coverage
- Spatial coverage
- License
- Citation requirement
- Connector status
- Validation status
- Notes

## Registry Rules

- Use authoritative scientific or institutional sources only.
- Do not list unsupported or unverifiable datasets as active.
- Do not treat provider availability as proof of PCS readiness.
- Keep dataset identity separate from PCS variables.
- Mark unimplemented connectors as proposed, planned, or candidate.

## Relationship to Existing Files

Provider-level documentation remains in `PCS_CONNECTORS/*.md`. The registry framework defines how those records should later be standardized.
