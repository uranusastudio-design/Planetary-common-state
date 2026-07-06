# PCS Variable Registry

The PCS Variable Registry is the scientific registry for all variables used by the Planetary Common State (PCS) research platform.

Its purpose is to provide a stable, traceable, and extensible record of the variables that may enter PCS data adapters, projection definitions, validation studies, dashboards, and future operational workflows. The registry is documentation-first: it defines scientific meaning and metadata before variables are used in code.

Every PCS variable must have:

- unique identifier
- scientific definition
- physical unit
- data source
- update frequency
- spatial scale
- temporal scale
- quality flag
- confidence
- references

The registry is designed to grow from approximately 100 variables to several hundred without changing the PCS architecture. New variables should be added through the registry schema, assigned to a scientific domain, and documented before integration into the PCS Engine or any dashboard layer.

