# PCS Engine Quality Control

Quality control defines how the Engine should treat connector records before state assembly.

## Missing Values

Missing values are scientifically meaningful and must remain missing. A missing value should not be replaced, interpolated, or inferred by default.

## Outliers

Outliers should be flagged for review. The Engine should not silently remove or alter outliers without a documented rule and provenance record.

## Timestamp Consistency

Connector records should include valid timestamps. The Engine should track whether records are annual, monthly, daily, real-time, or irregular.

## Unit Consistency

Each connector record must include a physical unit. Unit conversion, when implemented in a later milestone, must be explicit and documented.

## Quality Flags

Quality flags should distinguish observed records, missing records, pending sources, fallback sources, validation failures, and disabled connectors.

## Confidence Propagation

Confidence should be carried forward from connector records into Engine state outputs. The Engine should not increase confidence without validation or documented scientific justification.
