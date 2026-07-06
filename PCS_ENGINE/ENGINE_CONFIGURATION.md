# PCS Engine Configuration

Engine configuration defines operational settings and processing requirements for future PCS Engine runs.

## Refresh Interval

The refresh interval should define how often the Engine checks validated connector output. It should respect connector scheduler rules and provider update frequency.

## Logging

Engine runs should write logs to `PCS_ENGINE/logs/`. Logs should record input availability, validation status, quality-control status, output generation, and errors.

## Output Directory

Engine outputs should be written to `PCS_ENGINE/output/`. Intermediate validated records may be written to `PCS_ENGINE/validated/`, and internal state artifacts may be written to `PCS_ENGINE/state/`.

## Validation Requirement

Connector outputs must pass validation before use by the Engine. Pending and invalid connector outputs should not be used as observed values.

## Fallback Policy

The Engine should follow the connector fallback strategy defined in `PCS_CONNECTORS/FALLBACK_STRATEGY.md` and source priority chains defined in `PCS_CONNECTORS/DATA_SOURCE_PRIORITY.md`.

## No-Fabrication Rule

Configuration must not enable fake data, silent repair, hidden interpolation, or unsupported prediction.
