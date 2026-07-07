# Argo Ocean Connector v1.0

This connector defines the PCS Ocean connector for the international Argo float observing system.

## Provider

International Argo Programme

## Dataset

Global Argo Float Observations

## Scientific Variables

- Ocean Temperature Profile
- Ocean Salinity Profile
- Pressure
- Depth

## Units

- degrees Celsius (deg C)
- PSU
- dbar
- meters

## Temporal Resolution

- Daily
- Near real-time

## Spatial Resolution

Global float observations.

## Required Data Endpoint

Argo data are distributed through Global Data Assembly Centres (GDACs), commonly as NetCDF profile files.

Expected official access routes include:

- Argo GDAC France: `https://data-argo.ifremer.fr/`
- Argo GDAC US: `https://usgodae.org/pub/outgoing/argo/`

Native Argo files are typically NetCDF profile products. This v1.0 connector documents the endpoint and supports local official CSV or JSON profile summaries only. Native NetCDF parsing is reserved for a future connector revision.

## Current PCS Status

Connector implemented v1.0.

No live download is implemented in this milestone. If no local official Argo source file is provided, the connector writes a pending output without fabricating ocean profile values.

## PCS Role

Argo becomes the primary Ocean profile connector for future PCS ocean interior monitoring.
