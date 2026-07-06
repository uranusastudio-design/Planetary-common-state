# Sea Level Connector Schema

The Sea Level connector emits an array of PCS connector records when real source data are available.

## Output Fields

| Field | Description |
|---|---|
| `id` | Record identifier in the form `sea_level_<timestamp>`. |
| `provider` | Scientific provider, such as NASA JPL / PO.DAAC, AVISO / CNES, or Copernicus Marine Service. |
| `dataset` | Dataset or product name. |
| `variable` | Global Mean Sea Level. |
| `timestamp` | Observation timestamp or annual/monthly time coordinate. |
| `unit` | Sea-level unit from the source product, usually millimeters or meters relative to a baseline. |
| `value` | Sea-level value, or `null` when missing. |
| `uncertainty` | Source uncertainty if available, otherwise `null`. |
| `quality` | `observed`, `missing`, or source-specific quality status. |
| `confidence` | Source confidence or connector confidence statement. |
| `source_url` | Official source URL or documented access route. |
| `license` | Dataset license or access terms. |
| `version` | Dataset/product version and connector version. |
| `notes` | Provenance, baseline, access, or caveat notes. |

## Pending Output

If no real source is accessible, `PCS_ENGINE/input/sea_level_pcs.json` contains an empty JSON array. This is a deliberate no-fabrication state, not a scientific observation.
