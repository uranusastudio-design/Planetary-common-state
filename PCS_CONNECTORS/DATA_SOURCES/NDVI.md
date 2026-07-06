# NDVI Connector Source

## Provider Candidates

- NASA MODIS
- NASA VIIRS
- ESA / Copernicus vegetation products

## Dataset Family

Normalized Difference Vegetation Index satellite vegetation products.

## Scientific Variable

NDVI.

## Unit

Dimensionless vegetation index.

## Domain

Biosphere.

## Subdomain

Vegetation.

## Temporal Resolution

8-day, 16-day, monthly, or annual aggregate depending on product and preprocessing.

## Update Frequency

Provider-dependent.

## Current PCS Status

Connector structure implemented v0.1.

Confirmed data only if real source was successfully parsed.

## Future PCS Role

Biosphere / informational residual indicator.

## Notes

MODIS MOD13C2 and related NDVI products require Earthdata/LP DAAC access and gridded global aggregation before PCS-ready annual values can be emitted.

No NDVI values are fabricated in this milestone.
