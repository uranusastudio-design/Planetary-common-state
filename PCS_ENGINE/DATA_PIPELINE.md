# PCS Engine Data Pipeline

The PCS Engine data pipeline defines the expected processing path from connector output to structured state output.

## Pipeline Flow

```text
Connector Output
  -> Validation
    -> Normalization
      -> Quality Control
        -> State Assembly
          -> Output JSON
```

## Connector Output

Connector output consists of standardized PCS connector JSON records written by source-specific connectors.

## Validation

Validation checks required fields, timestamp presence, provider identity, dataset identity, variable identity, quality status, and source provenance.

## Normalization

Normalization is reserved for future conversion of validated variables into common representation. No new normalization logic is implemented in this milestone.

## Quality Control

Quality control records missing values, questionable records, timestamp inconsistency, unit inconsistency, and confidence limits.

## State Assembly

State assembly will eventually organize validated variables into domain-level and global PCS structures.

## Output JSON

Output JSON should be explicit about connected sources, waiting sources, planned sources, quality, confidence, and notes.

No fabricated values should appear in output JSON.
