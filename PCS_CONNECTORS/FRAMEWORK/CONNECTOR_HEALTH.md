# Connector Health

Connector Health describes the operational state of future connectors.

## Health Dimensions

- Provider reachable
- Authentication available
- Dataset available
- Last successful update
- Last validation result
- Recent failure count
- Output freshness
- Metadata completeness

## Health States

| Health State | Meaning |
|---|---|
| Healthy | Connector is available, current, and validation passed. |
| Degraded | Connector runs but has warnings, latency, or partial output. |
| Waiting | Connector depends on unavailable data or manual access. |
| Failed | Connector cannot acquire or parse required observations. |
| Not implemented | Connector is documentation only. |

## Current Status

All entries in this framework are documentation only unless later implementation files explicitly state otherwise.
