# Connector Interface

The Connector Interface defines the expected conceptual contract for future PCS connectors.

## Interface Role

A connector should eventually provide a consistent way to describe, acquire, parse, and hand off observations. This document defines the interface concept only and does not implement code.

## Future Interface Responsibilities

A future connector may expose:

- Provider metadata
- Dataset metadata
- Availability status
- Access requirements
- Native observation fields
- Expected output schema
- Error and missing-data behavior
- Provenance record

## Expected Connector Output

Future connectors should return observations in a standardized form suitable for downstream validation and PCS Engine ingestion. The framework does not define computed PCS values and does not normalize observations.

## Boundary

Connectors should not perform PCS state calculation, prediction, decision logic, or dashboard rendering. Their role is observation access and metadata preservation.
