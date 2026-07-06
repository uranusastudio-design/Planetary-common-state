# Uncertainty Model

The uncertainty model defines future handling of uncertainty and confidence.

No uncertainty algorithm is implemented in this milestone.

## Observation Uncertainty

Observation uncertainty should be preserved when provided by the source dataset. If the source does not provide uncertainty, the value should remain unavailable rather than invented.

## Propagation Philosophy

Uncertainty propagation should be transparent, documented, and reversible. Future propagation rules should preserve source-level uncertainty and should not increase confidence without justification.

## Confidence Propagation

Confidence should follow the record through validation, domain mapping, quality control, and state assembly. Connector confidence, validation status, source priority, and fallback use should all remain visible.

## Current Boundary

No uncertainty propagation method, numerical confidence model, or assimilation algorithm is implemented here.
