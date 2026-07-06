# PCS State Model

The PCS State Model describes the conceptual structure of future Engine state outputs.

No equations are defined in this document.

## Prototype PCS State

The prototype PCS state is a structured representation of available validated observations and their domain-level status. It should indicate which sources are connected, which sources are waiting, which sources are planned, and which domains remain incomplete.

## Future Domains

Future state outputs should be organized around the following domains:

- Atmosphere
- Ocean
- Cryosphere
- Biosphere
- Hydrology
- Geosphere
- Human
- Energy
- Food
- Infrastructure
- Space
- Planetary Common State

## Domain Status

Each domain should eventually report:

- connected sources;
- waiting sources;
- planned sources;
- quality state;
- confidence state;
- notes on missing data and provenance.

## Missing Data Boundary

Missing domains or variables must remain explicit. The Engine must not estimate unavailable variables unless a later validated scientific method is approved.
