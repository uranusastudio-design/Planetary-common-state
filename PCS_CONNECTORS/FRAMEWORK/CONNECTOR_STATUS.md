# Connector Status

Connector status describes implementation readiness and scientific availability.

## Status States

| Status | Meaning |
|---|---|
| Proposed | Dataset family has been identified but not reviewed. |
| Candidate | Dataset appears scientifically relevant and requires review. |
| Planned | Dataset is accepted for future connector work. |
| Documented | Metadata and access requirements are recorded. |
| Implemented | Connector code exists in a future milestone. |
| Validated | Connector output has passed validation checks. |
| Deprecated | Connector is no longer recommended. |
| Unavailable | Dataset is inaccessible or unsuitable for current PCS use. |

## Status Rules

- Documentation status is not implementation status.
- Connected status should be used only after a connector exists and is tested.
- Validation status should be separate from download success.
- Deprecated connectors should retain historical notes for reproducibility.
