# State History

State history defines how PCS Engine outputs should eventually be archived and versioned.

## Historical Archive

Future Engine runs should preserve historical state outputs so that changes in inputs, validation rules, configuration, and connector versions remain auditable.

## Version History

Each state output should record relevant connector versions, dataset versions, Engine version, validation report version, and configuration version.

## Time Consistency

State history should distinguish observation time, connector retrieval time, validation time, and Engine output time.

## Rollback Philosophy

Rollback should restore a prior validated state output when later data are unavailable, invalid, or corrupted. Rollback must not fabricate replacement observations.

## Current Boundary

No historical archive mechanism is implemented in Milestone 5.
