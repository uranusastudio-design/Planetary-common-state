# PCS Regional Registry v1.0

This document defines the initial regional configuration for future Planetary Common State regional monitoring. Bounding boxes and camera settings are approximate initial configuration values and must be reviewed before scientific regional production use.

Regional mode does not fabricate regional values. Regional PCS outputs must be derived from real source data, validated connector outputs, documented spatial filters, and reproducible aggregation methods.

| Region ID | Display Name | Country / Area | Bounding Box (W, S, E, N) | Center Latitude | Center Longitude | Default Cesium Camera Altitude | Primary Data Sources | Notes |
|---|---|---|---:|---:|---:|---:|---|---|
| global | Global | Global | -180, -90, 180, 90 | 20.0 | 120.0 | 30000000 m | NASA, NOAA, ESA, Copernicus, CWA, JAXA, WMO | Global default view and fallback state. |
| japan | Japan | Japan | 122.0, 24.0, 154.0, 46.0 | 36.2 | 138.2 | 7000000 m | JMA, JAXA, NASA, NOAA, Copernicus | Initial configuration for Japan regional monitoring. |
| taiwan | Taiwan | Taiwan | 119.0, 21.5, 123.5, 25.5 | 23.7 | 121.0 | 2200000 m | CWA, NASA, NOAA, JAXA, Copernicus | Initial configuration for Taiwan regional monitoring. |
| korea | Korea | Korean Peninsula | 124.0, 33.0, 132.0, 43.5 | 37.6 | 127.8 | 3500000 m | KMA, NASA, NOAA, JAXA, Copernicus | Regional boundary is approximate and includes the Korean Peninsula. |
| canada | Canada | Canada | -141.0, 41.5, -52.0, 83.5 | 56.1 | -106.3 | 12000000 m | Environment and Climate Change Canada, NASA, NOAA, Copernicus | Initial configuration for Canada regional monitoring. |
| uk | United Kingdom | United Kingdom | -8.6, 49.8, 1.8, 60.9 | 54.5 | -2.5 | 3200000 m | Met Office, ESA, Copernicus, NASA, NOAA | Initial configuration for United Kingdom regional monitoring. |
| usa | United States | United States | -125.0, 24.0, -66.5, 49.5 | 39.8 | -98.6 | 8500000 m | NOAA, NASA, USGS, EPA, Copernicus | Contiguous United States initial view; Alaska and Hawaii require future regional handling. |
| china | China | China | 73.5, 18.0, 135.1, 53.6 | 35.9 | 104.2 | 8500000 m | CMA, CAS, NASA, NOAA, ESA, Copernicus | Initial configuration for China regional monitoring. |
| singapore | Singapore | Singapore | 103.6, 1.15, 104.1, 1.50 | 1.35 | 103.82 | 900000 m | MSS, NEA, NASA, NOAA, Copernicus | Small-area view; future regional aggregation requires high-resolution sources. |
| dubai | Dubai | Dubai, United Arab Emirates | 54.7, 24.7, 55.7, 25.6 | 25.2 | 55.27 | 1200000 m | UAE NCM, Dubai Municipality, NASA, NOAA, Copernicus | Initial configuration for Dubai regional monitoring. |

## Configuration Boundary

- Bounding boxes are approximate initial settings.
- Regional datasets are not connected in this milestone.
- Global PCS output remains the fallback until validated regional state files exist.
- Regional connector outputs must preserve source provenance, spatial filtering method, temporal coverage, quality flags, and confidence metadata.

