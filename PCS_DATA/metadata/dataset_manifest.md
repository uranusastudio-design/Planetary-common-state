# PCS Benchmark Dataset Manifest

Run date: 2026-07-05  
Benchmark version: PCS Benchmark Dataset Run v1.0  
Scope: Tier 1 operational demonstration only

## Dataset Summary

| Field | Value |
|---|---|
| Time axis | Annual, 2000--2024 |
| Processed dataset | `processed/demo_annual_dataset.csv` |
| Normalized dataset | `normalized/demo_projection_dataset.csv` |
| Missing value convention | Literal `NaN` |
| Normalization standard | `demo/pcs_projection_standard_v1.md` |
| Demo state | Mean of available projections per year |

## Variables

| Column | Provider | Dataset | Variable | Unit | Coverage in benchmark | Update date | Download method |
|---|---|---|---|---|---|---|---|
| `Temperature` | NASA GISS | GISTEMP v4 | Global annual temperature anomaly | degrees C | 2000--2024 | Source accessed 2026-07-05 | Official source text excerpt from NASA GISTEMP global table |
| `CO2` | NOAA GML | Mauna Loa annual mean CO2 | Atmospheric CO2 concentration | ppm | 2000--2024 | Source accessed 2026-07-05 | Official source text excerpt from NOAA annual file |
| `SeaLevel` | NASA Sea Level Change / PO.DAAC | Global mean sea-level indicator | Global mean sea-level change | mm | Missing; `NaN` for 2000--2024 | Source checked 2026-07-05 | Manual/authenticated Earthdata access required |
| `NDVI` | NASA Earthdata / LP DAAC | MODIS MOD13C2 v6.1 | Global NDVI / vegetation index | dimensionless | Missing; `NaN` for 2000--2024 | Source checked 2026-07-05 | Manual/authenticated Earthdata access and gridded processing required |

## Citations and Source Links

### NASA GISTEMP

- Provider: NASA Goddard Institute for Space Studies.
- Dataset: GISS Surface Temperature Analysis (GISTEMP), version 4.
- URL: https://data.giss.nasa.gov/gistemp/
- Data table: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt
- Citation: GISTEMP Team, 2026, GISS Surface Temperature Analysis (GISTEMP), version 4, NASA Goddard Institute for Space Studies; Lenssen et al., J. Geophys. Res. Atmos. 129, e2023JD040179 (2024), doi:10.1029/2023JD040179.

### NOAA Mauna Loa CO2

- Provider: NOAA Global Monitoring Laboratory.
- Dataset: Mauna Loa annual mean CO2.
- URL: https://gml.noaa.gov/ccgg/trends/data.html
- Data file: https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt
- Citation: NOAA Global Monitoring Laboratory, Trends in Atmospheric Carbon Dioxide, Mauna Loa annual mean CO2 record.

### NASA Global Mean Sea Level

- Provider: NASA Sea Level Change / NASA JPL / PO.DAAC.
- Dataset: Global mean sea-level satellite altimetry indicator.
- URL: https://sealevel.nasa.gov/understanding-sea-level/key-indicators/global-mean-sea-level/
- Data access note: the NASA page links to the PO.DAAC/Earthdata file `NASA_SSH_GMSL_INDICATOR.txt`.
- Citation: NASA Sea Level Change Team / NASA JPL / PO.DAAC GMSL indicator; Beckley et al. (2017) as cited by the NASA GMSL portal.

### MODIS NDVI

- Provider: NASA Earthdata / LP DAAC.
- Dataset: MODIS/Terra Vegetation Indices Monthly L3 Global 0.05Deg CMG, MOD13C2 Version 6.1.
- URL: https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061
- Legacy page: https://lpdaac.usgs.gov/products/mod13c2v061/
- Citation: NASA LP DAAC MOD13C2 Version 6.1 product citation and DOI from the Earthdata/LP DAAC product page.

## Normalization Constants

| Projection | Reference value | Critical value | Direction | Status |
|---|---:|---:|---|---|
| \(L_T\) | 0.0 degrees C | 1.5 degrees C | Increasing constraint | Applied |
| \(L_C\) | 315.98 ppm | 450.0 ppm | Increasing constraint | Applied |
| \(L_S\) | first valid sea-level annual value | reference + 100 mm | Increasing constraint | Not applied; source unavailable |
| \(L_I\) | valid baseline NDVI mean | reference - 0.05 | Decline increases constraint | Not applied; source unavailable |

## Files

### Raw

- `raw/GISTEMP_official_annual_excerpt_2000_2024.txt`
- `raw/NOAA_MaunaLoa_CO2_official_annual_excerpt_2000_2024.txt`
- `raw/NASA_GMSL_acquisition_note.md`
- `raw/MODIS_NDVI_acquisition_note.md`

### Processed

- `processed/demo_annual_dataset.csv`

### Normalized

- `normalized/demo_projection_dataset.csv`

### Figures

- `figures/fig09_demo_projection_components.png`
- `figures/fig10_demo_state_trajectory.png`

## Limitations

- This is an operational demonstration only.
- It does not claim prediction accuracy.
- Sea-level and NDVI values were not fabricated and remain unavailable in this first Tier 1 run.
- `S_demo` is computed as the mean of available projections, with `coverage_count` recording how many projections contributed each year.
