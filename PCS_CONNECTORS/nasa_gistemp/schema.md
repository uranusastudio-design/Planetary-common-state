# NASA GISTEMP Connector Schema

The NASA GISTEMP connector emits an array of PCS connector records.

## Output Fields

| Field | Description |
|---|---|
| `id` | Record identifier in the form `nasa_gistemp_<year>`. |
| `provider` | NASA Goddard Institute for Space Studies. |
| `dataset` | GISTEMP v4 global land-ocean temperature index. |
| `variable` | Global surface temperature anomaly. |
| `timestamp` | Annual record year. |
| `unit` | degrees C anomaly relative to 1951-1980 baseline. |
| `value` | Annual temperature anomaly in degrees C, or `null` when missing. |
| `uncertainty` | `null` in connector v0.1. |
| `quality` | `observed` or `missing`. |
| `confidence` | `official NASA GISTEMP annual record`. |
| `source_url` | Official NASA GISTEMP table URL. |
| `license` | NASA GISTEMP terms; see official source. |
| `version` | GISTEMP v4; connector v0.1. |
| `notes` | Annual J-D anomaly converted from hundredths of degrees C when needed. |

## Output Location

```text
PCS_ENGINE/input/nasa_gistemp_pcs.json
```
