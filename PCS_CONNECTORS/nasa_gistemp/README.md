# NASA GISTEMP Connector v0.1

This connector converts NASA GISTEMP global annual temperature anomaly data into the PCS connector JSON output standard.

## Scope

- Dataset: NASA GISTEMP v4 global land-ocean temperature index.
- Variable: Global surface temperature anomaly.
- Unit: degrees C anomaly relative to the NASA GISTEMP 1951-1980 baseline.
- Output: `PCS_ENGINE/input/nasa_gistemp_pcs.json`.

## Source

Default source:

```text
https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt
```

The connector can also read a local source file containing the same official annual data format or the repository's official GISTEMP annual excerpt.

## Rules

- Missing values are preserved as `null`.
- No missing values are fabricated.
- No PCS state is computed.
- `PCS_ENGINE/output/latest_state.json` is not modified.
- No prediction is performed.

## Usage

```text
python PCS_CONNECTORS/nasa_gistemp/connector.py
```

Optional local source:

```text
python PCS_CONNECTORS/nasa_gistemp/connector.py --source PCS_DATA/raw/GISTEMP_official_annual_excerpt_2000_2024.txt
```

Milestone 3.4 source snapshot:

```text
python PCS_CONNECTORS/nasa_gistemp/connector.py --source PCS_CONNECTORS/nasa_gistemp/source_snapshot_2000_2026.csv
```

## Validation

The connector validates that:

- the output file exists;
- records contain `timestamp`;
- records contain `value`;
- the latest year exists;
- missing values, if present, are represented as `null`.
