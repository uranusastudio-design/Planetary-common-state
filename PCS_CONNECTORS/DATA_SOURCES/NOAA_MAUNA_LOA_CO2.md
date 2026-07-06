# NOAA Mauna Loa CO2 Connector Source

## Provider

NOAA Global Monitoring Laboratory.

## Dataset Name

Mauna Loa atmospheric CO2 record.

## Scientific Variable

Atmospheric carbon dioxide concentration.

## Unit

Parts per million.

## Temporal Resolution

Monthly and annual products are available. The current PCS prototype uses annual mean atmospheric CO2 concentration.

## Update Frequency

Monthly, with annual means derived from the observation record.

## Current PCS Status

Connector implemented v0.1.

## Current Role in PCS

NOAA Mauna Loa CO2 supports the chemical component displayed as the Chemical Residual and contributes to the current Prototype PCS Estimate.

## Connector Plan

The v0.1 connector reads the NOAA GML annual Mauna Loa CO2 file or a local official-source snapshot, parses annual CO2 values and uncertainty, preserves missing values as `null`, and writes standardized PCS connector JSON.

The connector output path is `PCS_ENGINE/input/noaa_mauna_loa_co2_pcs.json`. It does not update `PCS_ENGINE/output/latest_state.json` and does not compute PCS state.

## Citation Placeholder

[Citation: NOAA Global Monitoring Laboratory Mauna Loa CO2 dataset documentation]
