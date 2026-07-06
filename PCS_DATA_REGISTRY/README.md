# PCS Global Observation Registry

The PCS Global Observation Registry records planned Earth-system, human-system, infrastructure, and space-environment observation sources for the Planetary Common State platform.

This registry defines authoritative observation sources before connector implementation. It is a planning and documentation layer, not an API layer and not an engine implementation.

PCS should use only authoritative scientific or institutional datasets. Candidate sources should come from recognized public agencies, scientific programs, international organizations, or well-documented open-data providers.

## Purpose

- Record planned observation source families.
- Separate scientific data-source planning from connector implementation.
- Support future mapping from observations to PCS variables.
- Preserve provenance, provider identity, update expectations, and licensing context.
- Prevent undocumented or ad hoc data-source selection.

## Scope

This registry includes dataset families and observation categories only. It does not implement API calls, data downloads, variable definitions, normalization rules, or PCS Engine logic.

