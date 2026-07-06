# PCS Connector Output Standard

This standard defines the PCS connector JSON output fields for future scientific data connectors.

No example values are included. No connector implementation is provided in this milestone.

## Required Fields

| Field | Description |
|---|---|
| `id` | Unique connector output record identifier. |
| `provider` | Scientific provider or institutional source. |
| `dataset` | Dataset or product name. |
| `variable` | Scientific variable represented by the record. |
| `timestamp` | Observation timestamp, valid time, or annual aggregation year. |
| `unit` | Physical unit of the reported value. |
| `value` | Observed value as reported or standardized by the connector. |
| `uncertainty` | Dataset uncertainty if provided, otherwise null. |
| `quality` | Provider or connector quality status. |
| `confidence` | Confidence category or documented confidence level. |
| `source_url` | Official source URL or documented access route. |
| `license` | Dataset license or usage terms. |
| `version` | Dataset, product, or connector version. |
| `notes` | Caveats, provenance notes, missing-data notes, or access limitations. |

## Standard Rules

- Preserve missing observations as missing.
- Preserve original scientific units unless a later processing stage explicitly converts them.
- Record source and license information before operational use.
- Do not fabricate values.
- Do not use connector output as prediction.
- Do not alter `PCS_ENGINE/output/latest_state.json` as part of this documentation milestone.
