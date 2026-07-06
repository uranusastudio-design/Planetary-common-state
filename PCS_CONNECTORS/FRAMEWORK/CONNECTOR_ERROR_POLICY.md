# Connector Error Policy

PCS connectors must report errors clearly and preserve scientific data integrity.

## Missing Data

Missing values must remain missing. A connector may report missing data but must not fabricate replacement values.

## Network Failure

Network failures should be recorded as access failures. The connector should not mark new data as connected.

## Invalid Format

Invalid or unexpected source formats should trigger validation failure or manual review.

## Timestamp Mismatch

Timestamp mismatches should be reported when source records do not match expected temporal resolution or ordering.

## Unit Mismatch

Unit mismatches should be reported and blocked from silent use until reviewed.

## Quality Failure

Quality failures should preserve the original record and mark it as not eligible for Engine use.

## Validation Failure

Validation failure prevents connector output from entering PCS Engine workflows.

## Fallback Policy

Fallback sources may be used only when approved in the source priority documentation and when provenance remains explicit.
