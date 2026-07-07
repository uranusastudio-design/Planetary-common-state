# CWA Weather Connector v0.1

This connector is a temporary live data integration test for the PCS pipeline.

## Provider

Taiwan Central Weather Administration (CWA)

## Dataset

CWA Open Data current surface weather observations.

## Official Endpoint

The connector uses the officially documented CWA Open Data REST API:

```text
https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0003-001
```

Authorization is required by CWA Open Data. Provide the token through:

```text
CWA_API_KEY
```

or by passing:

```text
--authorization <token>
```

## Extracted Fields

- Observation Time
- Station Name
- Latitude
- Longitude
- Air Temperature
- Relative Humidity
- Wind Speed
- Pressure
- Rainfall

## Output

```text
PCS_ENGINE/input/cwa_weather_pcs.json
```

## Boundary

This connector is for pipeline validation only. It does not replace NASA or NOAA connectors. It does not compute PCS values, estimate missing fields, fabricate observations, or modify existing connector outputs.
