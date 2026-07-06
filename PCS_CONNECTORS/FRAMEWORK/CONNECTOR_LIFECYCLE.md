# Connector Lifecycle

PCS connectors move through defined lifecycle states.

```text
Planned
  -> Prototype
    -> Connected
      -> Validated
        -> Operational
          -> Deprecated
```

## Planned

The dataset has been identified, but no connector has been implemented.

## Prototype

The connector structure exists and may contain early implementation work, but it is not ready for Engine use.

## Connected

The connector can access or read real source data and produce PCS-standard output.

## Validated

The connector output has passed required validation checks and is eligible for controlled PCS Engine use.

## Operational

The connector is maintained, monitored, versioned, and suitable for regular PCS workflows.

## Deprecated

The connector is no longer recommended for active use. Deprecation may occur because a dataset is retired, replaced, unavailable, or scientifically superseded.
