# NSIDC Sea Ice Connector Schema

## Source Dataset

NSIDC Sea Ice Index

## Source Variables

- Arctic sea ice extent
- Antarctic sea ice extent
- Sea ice area where available from the official source

## Source Unit

million km^2

## Expected Source Fields

Daily Sea Ice Index CSV files commonly include:

- date or equivalent timestamp field;
- extent or equivalent sea-ice extent value;
- optional missing-value metadata;
- optional source metadata.

## PCS Output Fields

Each parsed record must include:

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

## Missing Values

Missing values must be represented as null and marked with an appropriate quality value.

## Status

The schema supports real source parsing when an official NSIDC CSV source is available.
