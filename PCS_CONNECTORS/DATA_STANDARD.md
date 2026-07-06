# PCS Universal Data Standard

All future PCS connectors must emit records using the same JSON field structure.

No example values are included in this standard.

## Required Fields

| Field | Description |
|---|---|
| `id` | Unique observation or connector-output identifier. |
| `provider` | Scientific provider or institutional source. |
| `dataset` | Dataset or product name. |
| `variable` | Observed variable name. |
| `timestamp` | Observation timestamp or valid time. |
| `unit` | Physical unit of the reported value. |
| `value` | Reported observation value. |
| `uncertainty` | Provider uncertainty or null if not available. |
| `quality` | Provider or PCS quality status. |
| `confidence` | Confidence level or documented confidence category. |
| `license` | Dataset license or access terms. |
| `version` | Dataset, connector, or processing version. |

## Standard Rules

- Preserve original units unless a later processing stage explicitly converts them.
- Preserve missing values as missing.
- Do not add inferred observations.
- Keep provider metadata separate from PCS calculations.
