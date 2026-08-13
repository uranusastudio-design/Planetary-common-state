# Sea Level Connector v1.0

This connector prepares PCS for Global Mean Sea Level data from satellite altimetry.

## Scope

- Dataset category: Global Mean Sea Level, satellite altimetry.
- Provider: NOAA Laboratory for Satellite Altimetry (LSA).
- Variable: Global Mean Sea Level Anomaly.
- Unit: millimeters relative to the source's 1990 reference.
- Output: `PCS_ENGINE/input/sea_level_pcs.json`.

## Current Status

Connector implementation v1.0 uses NOAA LSA's public CSV. Runtime validation
is required before a release matrix may mark it `CONNECTED`. NOAA describes
this as an experimental, non-operational product.

## Source

```text
https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_keep_ref_90.csv
```

Data are distributed at no cost. Publications, presentations, and web pages
must acknowledge that altimetry data are provided by NOAA LSA.

## Rules

- Missing values are preserved as `null`.
- No missing values are fabricated.
- No sea-level values are invented.
- No PCS state is computed.
- `PCS_ENGINE/output/latest_state.json` is not modified.
- No prediction is performed.

## Usage

```text
python PCS_CONNECTORS/sea_level/connector.py
```

Optional local source:

```text
python PCS_CONNECTORS/sea_level/connector.py --source path/to/official_sea_level_file.csv
```

## Validation

When real records are available, the connector validates that:

- the output file exists;
- records contain `timestamp`;
- records contain `value`;
- the latest timestamp exists;
- missing values are represented as `null`;
- source provenance is recorded.

When no real source is accessible, validation returns `pending` and writes an empty connector output without fabricated records.
