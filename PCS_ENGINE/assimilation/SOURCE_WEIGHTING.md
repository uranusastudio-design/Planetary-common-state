# Source Weighting

Source weighting describes future principles for handling multiple approved sources for the same scientific quantity.

No numerical weights are defined in this document.

No equations are implemented in this milestone.

## Weighting Philosophy

Future weighting should be based on transparent scientific criteria, including source authority, validation status, uncertainty, coverage, temporal resolution, spatial resolution, quality flags, and fallback status.

## Source Priority

Source priority chains are defined in `PCS_CONNECTORS/DATA_SOURCE_PRIORITY.md`. Primary and fallback sources should remain explicit in downstream records.

## Fallback Visibility

If a fallback source is used, the state record should preserve the fallback source identity and quality status.

## Current Boundary

No source-weighting algorithm, coefficient, or automatic source fusion is implemented here.
