# Data Quality Assistant

The Data Quality Assistant describes how the AI Copilot may help humans inspect PCS data-quality status.

## Quality Issues

The Copilot may help detect and explain:

- missing data;
- stale data;
- invalid timestamps;
- connector failure;
- inconsistent units;
- unexpected null values.

## Missing Data

Missing data should be reported directly. The Copilot must not infer, interpolate, or replace missing observations.

## Stale Data

Stale data should be described in relation to expected update frequency and last known timestamp.

## Connector Failure

Connector failures should be linked to connector logs, validation reports, or documented provider access status when available.

## Unit Consistency

The Copilot may flag inconsistent units for human review. It must not silently convert or correct values unless a future validated conversion process exists.
