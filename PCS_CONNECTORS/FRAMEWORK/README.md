# PCS Connector Framework v1.0

The PCS Connector Framework defines the official standard for every future Earth-system data connector used by the Planetary Common State platform.

Every future connector must follow this framework regardless of provider, agency, data format, update frequency, or scientific domain.

## Purpose

PCS connectors provide the controlled bridge between authoritative scientific datasets and PCS-ready observation records. The framework standardizes connector structure, lifecycle, requirements, metadata, output format, error handling, versioning, and agency mapping before new APIs are implemented.

## Framework Documents

- `CONNECTOR_SPECIFICATION.md`
- `CONNECTOR_LIFECYCLE.md`
- `CONNECTOR_REQUIREMENTS.md`
- `CONNECTOR_METADATA.md`
- `CONNECTOR_OUTPUT_STANDARD.md`
- `CONNECTOR_ERROR_POLICY.md`
- `CONNECTOR_VERSIONING.md`
- `AGENCY_MAPPING.md`

## Common Connector Rule

All connectors must preserve source provenance, timestamps, units, quality metadata, confidence, license information, and version information.

## Non-Implementation Rule

This framework is documentation only. It does not implement APIs, download data, authenticate with providers, generate fake data, run validation, normalize observations, or compute PCS Engine values.
