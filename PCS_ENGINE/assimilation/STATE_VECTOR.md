# PCS State Vector

The PCS State Vector is the future structured representation of validated domain-level state components.

No equations are defined in this document.

## Future Domains

The future PCS State Vector should include the following domains:

- Atmosphere
- Ocean
- Cryosphere
- Biosphere
- Hydrology
- Geosphere
- Human System
- Energy
- Food
- Infrastructure
- Space Environment
- Planetary Common State

## Domain Records

Each domain record should eventually include:

- connected observations;
- waiting observations;
- planned observations;
- quality status;
- confidence status;
- provenance notes;
- missing-data notes.

## State Boundary

The state vector must not contain fabricated observations. Domains without validated data should remain explicit as waiting, planned, or pending.
