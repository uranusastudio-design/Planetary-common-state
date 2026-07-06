# NOAA Mauna Loa CO2 Connector v0.1

This connector converts NOAA Global Monitoring Laboratory Mauna Loa annual mean CO2 data into the PCS connector JSON output standard.

## Scope

- Dataset: NOAA GML Mauna Loa annual mean CO2.
- Variable: Atmospheric CO2 concentration.
- Unit: ppm.
- Output: `PCS_ENGINE/input/noaa_mauna_loa_co2_pcs.json`.

## Source

Default source:

```text
https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt
```

The connector can also read a local official-source snapshot with the same annual format.

## Rules

- Missing values are preserved as `null`.
- No missing values are fabricated.
- No PCS state is computed.
- `PCS_ENGINE/output/latest_state.json` is not modified.
- No prediction is performed.

## Usage

```text
python PCS_CONNECTORS/noaa_mauna_loa_co2/connector.py
```

Milestone 3.5 source snapshot:

```text
python PCS_CONNECTORS/noaa_mauna_loa_co2/connector.py --source PCS_CONNECTORS/noaa_mauna_loa_co2/source_snapshot_1959_2025.txt
```

## Validation

The connector validates that:

- the output file exists;
- records contain `timestamp`;
- records contain `value`;
- the latest timestamp exists;
- missing values, if present, are represented as `null`.
