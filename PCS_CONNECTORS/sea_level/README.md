# Sea Level Connector v0.1

This connector prepares PCS for Global Mean Sea Level data from satellite altimetry.

## Scope

- Dataset category: Global Mean Sea Level, satellite altimetry.
- Preferred providers: NASA Sea Level Change / NASA JPL / PO.DAAC, AVISO / CNES, Copernicus Marine Service.
- Variable: Global Mean Sea Level.
- Unit: millimeters or meters relative to a reference baseline, depending on the selected provider product.
- Output: `PCS_ENGINE/input/sea_level_pcs.json`.

## Current Status

Connector structure implemented v0.1.

Data access is pending unless a real source file is supplied or the NASA PO.DAAC protected endpoint is available with valid Earthdata access.

## Source Candidates

NASA Sea Level Change portal:

```text
https://sealevel.nasa.gov/understanding-sea-level/key-indicators/global-mean-sea-level/
```

NASA PO.DAAC protected data file identified by the NASA portal:

```text
https://archive.podaac.earthdata.nasa.gov/podaac-ops-cumulus-protected/NASA_SSH_GMSL_INDICATOR/NASA_SSH_GMSL_INDICATOR.txt
```

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
