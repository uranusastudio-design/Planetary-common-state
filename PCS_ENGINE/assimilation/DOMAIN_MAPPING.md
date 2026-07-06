# Domain Mapping

Domain mapping defines how connector outputs are assigned to PCS scientific domains.

No calculations are implemented in this document.

## Mapping Responsibility

Each connector output should map to one or more PCS domains based on scientific meaning, not file format or provider identity alone.

## Example Domain Categories

- Atmospheric observations map to Atmosphere.
- Sea-level observations map to Ocean.
- NDVI observations map to Biosphere.
- Hydrologic observations map to Hydrology.
- Energy statistics map to Energy.
- Infrastructure records map to Infrastructure.

## Registry Relationship

The PCS Variable Registry should define domain and subdomain assignments. The assimilation layer should use registry definitions rather than inventing domain mappings internally.

## Current Boundary

Milestone 5 defines mapping architecture only. It does not add variable entries or implement domain-mapping code.
