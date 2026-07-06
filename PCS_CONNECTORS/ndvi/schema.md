# NDVI Connector Schema

The NDVI connector emits an array of PCS connector records when real source data are available.

## Output Fields

| Field | Description |
|---|---|
| `id` | Record identifier in the form `ndvi_<timestamp>`. |
| `provider` | Scientific provider, such as NASA MODIS, NASA VIIRS, ESA, or Copernicus. |
| `dataset` | Dataset or product name. |
| `variable` | Normalized Difference Vegetation Index. |
| `timestamp` | Observation timestamp, year, or annual aggregate time coordinate. |
| `unit` | Dimensionless. |
| `value` | NDVI value, or `null` when missing. |
| `uncertainty` | Source uncertainty if available, otherwise `null`. |
| `quality` | `observed`, `missing`, or source-specific quality status. |
| `confidence` | Source confidence or connector confidence statement. |
| `source_url` | Official source URL or documented access route. |
| `license` | Dataset license or access terms. |
| `version` | Dataset/product version and connector version. |
| `notes` | Provenance, processing, aggregation, or caveat notes. |

## Pending Output

If no real source is accessible, `PCS_ENGINE/input/ndvi_pcs.json` contains an empty JSON array. This is a deliberate no-fabrication state, not a scientific observation.
