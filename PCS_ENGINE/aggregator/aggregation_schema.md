# Aggregation Output Schema

The aggregation engine writes `PCS_ENGINE/output/latest_state.json`.

## Required Top-Level Fields

- `timestamp`
- `local_generated_time`
- `confirmed_sources`
- `waiting_sources`
- `planned_sources`
- `connector_health`
- `domain_status`
- `pcs_state`
- `prototype_notice`
- `notes`

## Observatory Compatibility Fields

The aggregator preserves existing fields when present:

- `metadata`
- `latest_year`
- `projections`
- `S_demo`
- `coverage_count`

## confirmed_sources

List of sources whose connector output exists and contains non-empty connector records.

## waiting_sources

List of sources whose connector output exists but is empty or pending data access.

## planned_sources

List of expected sources whose connector output file is not present.

## connector_health

Each connector health record contains:

- `name`
- `domain`
- `status`
- `file`
- `records`
- `latest_timestamp`
- `quality`
- `notes`

## domain_status

Domain status records are provided for:

- Atmosphere
- Ocean
- Cryosphere
- Biosphere
- Hydrology
- Geosphere
- Human System
- Energy
- Food System
- Infrastructure
- Space Environment
- Planetary Common State

Each domain record contains:

- `status`
- `connected_sources`
- `waiting_sources`
- `notes`

## Prototype State Boundary

`pcs_state` remains prototype. The aggregation engine does not compute a new scientific PCS value.
