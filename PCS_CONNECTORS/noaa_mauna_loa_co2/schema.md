# NOAA Mauna Loa CO2 Connector Schema

The NOAA Mauna Loa CO2 connector emits an array of PCS connector records.

## Output Fields

| Field | Description |
|---|---|
| `id` | Record identifier in the form `noaa_mauna_loa_co2_<year>`. |
| `provider` | NOAA Global Monitoring Laboratory. |
| `dataset` | Mauna Loa annual mean CO2. |
| `variable` | Atmospheric CO2 concentration. |
| `timestamp` | Annual record year. |
| `unit` | ppm. |
| `value` | Annual mean atmospheric CO2 concentration, or `null` when missing. |
| `uncertainty` | NOAA annual uncertainty value when available, otherwise `null`. |
| `quality` | `observed` or `missing`. |
| `confidence` | `official NOAA GML annual record`. |
| `source_url` | Official NOAA GML annual CO2 file URL. |
| `license` | NOAA GML data use terms; see official source. |
| `version` | NOAA GML annual Mauna Loa CO2; connector v0.1. |
| `notes` | Annual mean dry-air mole fraction in ppm. |

## Output Location

```text
PCS_ENGINE/input/noaa_mauna_loa_co2_pcs.json
```
