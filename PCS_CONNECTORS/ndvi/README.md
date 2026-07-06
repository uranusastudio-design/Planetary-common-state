# NDVI Connector v0.1

This connector prepares PCS for Normalized Difference Vegetation Index data from satellite vegetation products.

## Scope

- Dataset category: NDVI, Normalized Difference Vegetation Index.
- Preferred providers: NASA MODIS, NASA VIIRS, ESA / Copernicus vegetation products.
- Variable: NDVI.
- Unit: dimensionless vegetation index.
- Output: `PCS_ENGINE/input/ndvi_pcs.json`.

## Current Status

Connector structure implemented v0.1.

Data access is pending unless a real source file is supplied. MODIS MOD13C2 and similar global NDVI products generally require Earthdata/LP DAAC access and gridded global aggregation before a single PCS-ready annual series can be emitted.

## Source Candidates

NASA MODIS MOD13C2 product page:

```text
https://lpdaac.usgs.gov/products/mod13c2v061/
```

NASA VIIRS vegetation index products and ESA / Copernicus vegetation products may be evaluated in future milestones.

## Rules

- Missing values are preserved as `null`.
- No missing values are fabricated.
- No NDVI values are invented.
- No PCS state is computed.
- `PCS_ENGINE/output/latest_state.json` is not modified.
- No prediction is performed.

## Usage

```text
python PCS_CONNECTORS/ndvi/connector.py
```

Optional local source:

```text
python PCS_CONNECTORS/ndvi/connector.py --source path/to/official_ndvi_annual_file.csv
```

Expected local CSV columns may include `timestamp`, `date`, `year`, or `time`, and `ndvi`, `value`, or `vegetation_index`.

## Validation

When real records are available, the connector validates that:

- the output file exists;
- records contain `timestamp`;
- records contain `value`;
- the latest timestamp exists;
- missing values are represented as `null`;
- source provenance is recorded.

When no real source is accessible, validation returns `pending` and writes an empty connector output without fabricated records.
