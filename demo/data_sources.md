# PCS Demo Data Sources

Access date: 2026-07-04

## Thermal Projection \(L_T\)

- Dataset name: GISS Surface Temperature Analysis (GISTEMP), version 4
- Provider: NASA Goddard Institute for Space Studies
- Official page: https://data.giss.nasa.gov/gistemp/
- Candidate data URL: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv
- Time coverage: 1880 to present, updated monthly
- Variable: global annual land-ocean temperature anomaly
- Units: degrees C relative to the 1951-1980 baseline
- Citation: GISTEMP Team, 2026, GISS Surface Temperature Analysis (GISTEMP), version 4, NASA Goddard Institute for Space Studies; Lenssen et al. (2024), J. Geophys. Res. Atmos., doi:10.1029/2023JD040179
- Download status: automatic download planned

## Chemical Projection \(L_C\)

- Dataset name: Mauna Loa annual mean CO2
- Provider: NOAA Global Monitoring Laboratory
- Official page: https://gml.noaa.gov/ccgg/trends/data.html
- Data URL: https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt
- Time coverage: 1959 to present, subject to NOAA quality-control updates
- Variable: annual mean atmospheric CO2 concentration at Mauna Loa
- Units: ppm
- Citation: NOAA GML Trends in Atmospheric Carbon Dioxide; cite NOAA/GML and the Mauna Loa CO2 record as requested on the NOAA data page
- Download status: automatic download planned

## Structural Projection \(L_S\)

- Dataset name: NASA global mean sea level / satellite altimetry record
- Provider: NASA Sea Level Change / NASA JPL / PO.DAAC ecosystem
- Official page: https://sealevel.nasa.gov/
- Supporting NASA page: https://science.nasa.gov/climate-change/
- Candidate data access: NASA Sea Level Change portal or PO.DAAC global mean sea-level data products
- Time coverage: satellite altimetry era, approximately 1993 to present
- Variable: global mean sea level change
- Units: mm
- Citation: NASA Sea Level Change Team / NASA JPL satellite altimetry data product used for final download
- Download status: manual-download required until a stable direct dataset endpoint is selected

## Biosphere / Informational Projection \(L_I\)

- Dataset name: MODIS/Terra Vegetation Indices Monthly L3 Global 0.05Deg CMG, MOD13C2 Version 6.1
- Provider: NASA Earthdata / LP DAAC
- Official page: https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061
- Legacy product page: https://lpdaac.usgs.gov/products/mod13c2v061/
- Time coverage: 2000-02-01 to present
- Variable: global vegetation index; NDVI layer preferred for the minimal demo
- Units: dimensionless vegetation index
- Citation: NASA LP DAAC MOD13C2 Version 6.1 product citation and DOI from the Earthdata/LP DAAC product page
- Download status: manual-download required; Earthdata authentication and gridded processing are expected
