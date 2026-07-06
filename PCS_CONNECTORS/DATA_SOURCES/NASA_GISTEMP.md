# NASA GISTEMP Connector Source

## Provider

NASA Goddard Institute for Space Studies.

## Dataset Name

GISTEMP global temperature anomaly dataset.

## Scientific Variable

Global temperature anomaly.

## Unit

Degrees Celsius anomaly relative to the dataset baseline.

## Temporal Resolution

Monthly and annual products are available. The current PCS prototype uses annual global temperature anomaly values.

## Update Frequency

Monthly, with annual summaries derived from monthly records.

## Current PCS Status

Connector implemented v0.1.

## Current Role in PCS

NASA GISTEMP supports the thermal component displayed as the Thermal Residual and contributes to the current Prototype PCS Estimate.

## Connector Plan

The v0.1 connector reads the NASA GISTEMP annual global table or a local official-source excerpt, parses annual temperature anomaly values, preserves missing values as `null`, and writes standardized PCS connector JSON.

The connector output path is `PCS_ENGINE/input/nasa_gistemp_pcs.json`. It does not update `PCS_ENGINE/output/latest_state.json` and does not compute PCS state.

## Citation Placeholder

[Citation: NASA GISTEMP dataset documentation]
