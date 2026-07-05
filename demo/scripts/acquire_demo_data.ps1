# PCS demo data acquisition scaffold.
#
# This script records the intended public sources. In the current environment,
# direct Invoke-WebRequest downloads failed with connection-close errors for the
# NASA/NOAA endpoints. The cleaned CSVs in ../data preserve official GISTEMP and
# NOAA annual values verified from source pages, while SeaLevel and NDVI remain
# missing until manual/authenticated data are supplied.

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Data = Join-Path $Root "data"

Write-Host "PCS demo data folder: $Data"
Write-Host "Expected cleaned files:"
Write-Host "  temperature.csv"
Write-Host "  co2.csv"
Write-Host "  sea_level.csv"
Write-Host "  ndvi.csv"
Write-Host "  demo_annual_dataset.csv"

Write-Host ""
Write-Host "Official source URLs:"
Write-Host "  NASA GISTEMP: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt"
Write-Host "  NOAA CO2:     https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt"
Write-Host "  NASA GMSL:    https://sealevel.nasa.gov/understanding-sea-level/key-indicators/global-mean-sea-level/"
Write-Host "  MOD13C2:      https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061"
