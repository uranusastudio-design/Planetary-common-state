# Raw Data Notes

Network download from the local shell failed for the public endpoints during this run, but official data pages were accessed for source verification.

## Automatically populated cleaned data

- `temperature.csv`: values transcribed from the official NASA GISTEMP global land-ocean table, annual `J-D` column, divided by 100 to convert to degrees C.
- `co2.csv`: values transcribed from the official NOAA GML Mauna Loa annual mean CO2 text file.

## Manual-download required

- `sea_level.csv`: NASA Sea Level Change portal links the GMSL data to a PO.DAAC Earthdata-protected endpoint. Annual values are left missing until the authenticated data file is supplied.
- `ndvi.csv`: MODIS MOD13C2 requires Earthdata/LP DAAC access and gridded global aggregation. Annual values are left missing until processed NDVI data are supplied.
