# CWA Weather Connector Schema

## Source

Taiwan Central Weather Administration Open Data API.

## Source Product

Current surface weather observations from the documented CWA Open Data REST datastore.

## Required Source Fields

- observation time;
- station name;
- latitude;
- longitude;
- air temperature;
- relative humidity;
- wind speed;
- pressure;
- rainfall.

## PCS Connector Output Fields

Each record must include:

- id
- provider
- dataset
- variable
- timestamp
- unit
- value
- uncertainty
- quality
- confidence
- source_url
- license
- version
- notes

## Variable Units

- Air Temperature: degrees Celsius
- Relative Humidity: percent
- Wind Speed: m/s
- Pressure: hPa
- Rainfall: mm

## Missing Values

Missing values must be represented as null and marked with a missing quality flag.
