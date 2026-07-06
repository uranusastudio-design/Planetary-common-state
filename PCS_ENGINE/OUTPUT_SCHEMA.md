# PCS Engine Output Schema

This document defines the intended high-level schema for future `latest_state.json` outputs.

No numerical values are defined in this schema.

## `latest_state.json` Fields

| Field | Description |
|---|---|
| `timestamp` | Time when the Engine output was generated. |
| `connected_sources` | Sources that are implemented, parsed, validated, and available for Engine use. |
| `waiting_sources` | Sources that are identified but not yet connected or validated. |
| `planned_sources` | Sources or domains planned for future connector work. |
| `domain_status` | Domain-level status map for Atmosphere, Ocean, Biosphere, and future domains. |
| `pcs_state` | Placeholder for future unified PCS state representation. |
| `confidence` | Confidence summary derived from validated source availability and quality. |
| `quality` | Quality-control summary for source and state records. |
| `notes` | Provenance notes, missing-data notes, limitations, and operational caveats. |

## Schema Rules

- Output must distinguish connected, waiting, and planned sources.
- Output must preserve missing-data status.
- Output must not fabricate unavailable variables.
- Output must not imply prediction unless a future validated prediction module exists.
