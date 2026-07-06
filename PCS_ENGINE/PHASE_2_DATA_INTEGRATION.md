# Phase 2 Data Integration

Phase 2 expands PCS from a two-source operational prototype toward a validated multi-source Earth-system data integration layer.

This document is architecture and planning only. It does not implement APIs, modify `latest_state.json`, compute PCS values, estimate missing observations, or change Engine calculations.

## Phase 2 Goal

The goal of Phase 2 is to connect the first batch of authoritative Earth-system datasets through documented PCS connectors, validation checks, and Engine-ready standardized outputs.

## Current Confirmed Sources

Current confirmed sources: 2

- NASA GISTEMP: Global Temperature
- NOAA Mauna Loa CO2: Atmospheric CO2

These sources have existing connector implementations and standardized PCS connector output files.

## Target First Batch

The target first batch contains 10 datasets:

1. NASA GISTEMP - Global Temperature
2. NOAA Mauna Loa CO2 - Atmospheric CO2
3. NASA/JPL or AVISO Sea Level - Global Mean Sea Level
4. NASA MODIS or VIIRS NDVI - Vegetation Index
5. NSIDC Sea Ice - Arctic and Antarctic Sea Ice
6. NASA FIRMS - Wildfire / Active Fire
7. NASA IMERG - Precipitation
8. ERA5 - Atmospheric Reanalysis
9. Argo - Ocean Temperature / Salinity
10. GRACE - Terrestrial Water Storage

## No Fabricated Data Rule

PCS must never fabricate missing scientific data. If a dataset is unavailable, inaccessible, stale, invalid, or not yet implemented, the corresponding source remains waiting, planned, or data access pending.

## Connector Validation Requirement

Every connector output must pass validation before it is eligible for PCS Engine use. Validation should check required fields, timestamps, source provenance, quality flags, confidence, missing-value consistency, and file integrity.

## Engine Use Rule

PCS Engine will only use validated connector outputs. Documentation, planned connectors, and unvalidated source records do not change PCS state output.

## Current Boundary

Phase 2.1 defines the integration queue and Engine planning document only. Dataset APIs, connector implementations, state calculations, and Observatory updates are reserved for later milestones.
