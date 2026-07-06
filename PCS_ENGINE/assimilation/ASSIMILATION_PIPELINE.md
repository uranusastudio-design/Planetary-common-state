# Assimilation Pipeline

The assimilation pipeline defines the conceptual processing path from connector output to future PCS state output.

## Pipeline

```text
Connector Output
  -> Validation
    -> Normalization
      -> Domain Mapping
        -> Quality Control
          -> Assimilation
            -> PCS State Vector
              -> Output JSON
```

## Connector Output

Connector output consists of provider-specific scientific observations converted into the PCS connector output standard.

## Validation

Validation checks record structure, required fields, source provenance, timestamp presence, quality flags, and missing-value consistency.

## Normalization

Normalization is a future step that prepares validated observations for cross-domain comparison. No normalization algorithm is implemented in this milestone.

## Domain Mapping

Domain mapping assigns each validated observation to a PCS scientific domain and subdomain.

## Quality Control

Quality control preserves missing values, flags outliers, checks timestamp consistency, checks unit consistency, and propagates confidence.

## Assimilation

Assimilation is the future integration layer. No algorithm is implemented here.

## PCS State Vector

The PCS State Vector will organize domain-level state components, quality information, and confidence metadata.

## Output JSON

Output JSON should expose connected, waiting, planned, quality, confidence, provenance, and notes.
