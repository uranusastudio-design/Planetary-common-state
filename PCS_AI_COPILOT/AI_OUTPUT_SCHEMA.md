# AI Output Schema

This document defines the future AI Copilot output fields. No example values are provided in this milestone.

## Fields

- timestamp
- summary
- status
- confidence
- source_references
- anomaly_flags
- missing_data
- recommended_human_review
- limitations

## Field Descriptions

### timestamp

Time when the AI summary or status note is generated.

### summary

Plain-language summary grounded in PCS output and source status.

### status

Overall monitoring status using documented alert language.

### confidence

Confidence statement based on source coverage, validation status, and data quality.

### source_references

References to PCS outputs, connector files, validation reports, or source metadata used by the summary.

### anomaly_flags

Review flags for possible anomalies. Flags should not imply causality.

### missing_data

Explicit list of missing, waiting, stale, or unavailable data sources.

### recommended_human_review

Items that should be reviewed by human scientists or operators.

### limitations

Known limitations of the summary, including partial coverage, missing sources, or validation constraints.
