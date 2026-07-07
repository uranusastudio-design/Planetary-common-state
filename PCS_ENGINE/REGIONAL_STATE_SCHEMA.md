# PCS Regional State Schema v1.0

This document defines the future regional state files used by PCS Regional Mode.

Regional state files are not created in this milestone. The schema below defines the expected structure for future validated regional outputs.

## Future Output Files

```text
PCS_ENGINE/output/regions/global_state.json
PCS_ENGINE/output/regions/japan_state.json
PCS_ENGINE/output/regions/taiwan_state.json
PCS_ENGINE/output/regions/korea_state.json
PCS_ENGINE/output/regions/canada_state.json
PCS_ENGINE/output/regions/uk_state.json
PCS_ENGINE/output/regions/usa_state.json
PCS_ENGINE/output/regions/china_state.json
PCS_ENGINE/output/regions/singapore_state.json
PCS_ENGINE/output/regions/dubai_state.json
```

## Required Fields

| Field | Description |
|---|---|
| `region_id` | Stable region identifier matching `PCS_VARIABLE_REGISTRY/REGIONS.md`. |
| `display_name` | Human-readable region name. |
| `timestamp` | ISO 8601 generation timestamp for the regional state file. |
| `connected_sources` | Validated regional sources currently connected. |
| `waiting_sources` | Regional sources identified but not yet connected or not currently available. |
| `planned_sources` | Future regional sources not yet implemented. |
| `domain_status` | Domain-level regional readiness and connector status. |
| `pcs_state` | Regional PCS state object or `null` if not computed. |
| `confidence` | Regional confidence metadata when available. |
| `quality` | Regional quality flags and validation status. |
| `notes` | Boundary notes, provenance notes, and regional limitations. |

## Boundary Rules

- Regional state values must come from real source data.
- Missing regional values must remain missing.
- Regional aggregation must document spatial filters, temporal coverage, and source provenance.
- Global `latest_state.json` remains the fallback when regional state files do not exist.

