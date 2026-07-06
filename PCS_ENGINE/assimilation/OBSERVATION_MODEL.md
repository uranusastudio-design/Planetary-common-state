# Observation Model

The observation model describes the minimum metadata required for future assimilation.

## Observation

An observation is a connector-provided record representing a measured, derived, or provider-published scientific quantity.

## Metadata

Each observation should preserve:

- provider;
- dataset;
- variable;
- source URL or access route;
- license or access terms;
- dataset version;
- connector version;
- notes.

## Timestamp

Each observation should include a timestamp or valid time. The timestamp may represent an annual, monthly, daily, hourly, or irregular observation.

## Spatial Resolution

Spatial resolution describes the native or effective geographic scale of the observation, such as station, grid cell, regional average, global mean, or satellite footprint.

## Temporal Resolution

Temporal resolution describes the cadence of the source observation, such as hourly, daily, monthly, annual, or event-based.

## Quality Flag

Quality flags indicate whether the observation is observed, missing, pending, fallback-derived, validation-failed, or disabled.

## Confidence

Confidence describes the trust level of a record based on source authority, validation result, uncertainty, quality flags, and provenance.
