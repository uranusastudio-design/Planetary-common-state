# Demo Data Processing Report

Date: 2026-07-04

## Scope

Acquired or documented acquisition status for the four public datasets required for the minimal PCS demonstration. No manuscript files were modified. No normalization was performed.

## Output Files

Cleaned annual files:

- `demo/data/temperature.csv`
- `demo/data/co2.csv`
- `demo/data/sea_level.csv`
- `demo/data/ndvi.csv`

Merged annual file:

- `demo/data/demo_annual_dataset.csv`

Supporting acquisition scaffold:

- `demo/scripts/acquire_demo_data.ps1`
- `demo/data/raw/README.md`

## Time Axis

All cleaned files use the common annual timeline 2000--2024.

## Variables and Units

- `Temperature`: NASA GISTEMP global annual temperature anomaly, degrees C relative to the 1951--1980 baseline.
- `CO2`: NOAA GML / Mauna Loa annual mean atmospheric CO2 concentration, ppm.
- `SeaLevel`: NASA global mean sea-level change from satellite altimetry, mm. Values are currently missing pending manual/authenticated data access.
- `NDVI`: MODIS MOD13C2 annual global vegetation index or anomaly, dimensionless. Values are currently missing pending Earthdata/LP DAAC download and gridded aggregation.

## Source Status

### NASA GISTEMP

- Source: NASA GISTEMP global land-ocean temperature index.
- Official URL: `https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt`
- Processing: annual `J-D` values for 2000--2024 were converted from hundredths of degrees C to degrees C.
- Status: cleaned annual CSV produced.

### NOAA Mauna Loa CO2

- Source: NOAA GML Mauna Loa annual mean CO2.
- Official URL: `https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt`
- Processing: annual mean values for 2000--2024 were preserved in ppm.
- Status: cleaned annual CSV produced.

### NASA Global Mean Sea Level

- Source: NASA Sea Level Change / PO.DAAC global mean sea-level indicator.
- Official page: `https://sealevel.nasa.gov/understanding-sea-level/key-indicators/global-mean-sea-level/`
- Data access: the page links to an Earthdata-protected PO.DAAC file, `NASA_SSH_GMSL_INDICATOR.txt`.
- Processing: no annual values were fabricated. `SeaLevel` is set to `NaN` for 2000--2024.
- Status: manual/authenticated download required.

### MODIS NDVI

- Source: MODIS/Terra MOD13C2 Version 6.1 NDVI.
- Official page: `https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061`
- Processing required: Earthdata/LP DAAC download, quality control, area-weighted global mean, annual aggregation.
- Processing completed here: none. `NDVI` is set to `NaN` for 2000--2024.
- Status: manual/authenticated download and gridded processing required.

## Missing Data

Missing values are written as literal `NaN` in the CSV files.

No interpolation, imputation, or gap filling was performed.

## Notes

The local shell could not directly download the NASA/NOAA endpoints with `Invoke-WebRequest` because the remote connection closed during transfer. Official source pages were still verified, and cleaned GISTEMP/CO2 values were populated from the official source text exposed through the browsing tool. Sea-level and NDVI values remain missing because their official access paths require Earthdata authentication and/or gridded preprocessing.
