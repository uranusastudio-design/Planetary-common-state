# PCS Regional Connector Strategy v1.0

This document defines how future PCS connectors should support regional filtering and regional aggregation.

Regional support is a connector capability, not a permission to fabricate regional values. Regional data must be derived from real source data only.

## Regional Selection Methods

### Country Code

Use official country or territory identifiers when the source dataset provides country-level observations or administrative metadata.

### Bounding Box

Use longitude-latitude bounding boxes for gridded, point, or swath observations when rectangular spatial selection is scientifically appropriate.

### Administrative Boundary

Use authoritative administrative boundaries when national, subnational, or city-level masking is required.

### Spatial Mask

Use documented spatial masks for irregular regions, coastlines, watersheds, urban boundaries, or ecological zones.

### Regional Aggregation

Aggregate only after source records pass validation. Regional aggregation must document:

- source dataset
- spatial filter
- temporal filter
- aggregation method
- units
- missing-data policy
- quality flags
- confidence metadata

### Source Provenance

Every regional connector output must preserve provider identity, dataset identity, source URL, license or access terms, timestamp, and connector version.

## No-Fabrication Rule

Regional PCS values must never be inferred from unsupported assumptions. If no approved source data are available for a region, the regional state remains pending and the Observatory falls back to global state.

