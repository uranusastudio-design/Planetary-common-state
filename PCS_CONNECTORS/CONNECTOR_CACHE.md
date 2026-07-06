# Connector Cache

Connector Cache defines future storage behavior for downloaded scientific data.

## Cache Philosophy

The cache exists to support reproducibility, avoid duplicate downloads, and preserve the latest valid dataset.

## Cache Requirements

- Avoid duplicate downloads when a provider file has not changed.
- Preserve the latest valid dataset.
- Record retrieval timestamp.
- Record source endpoint or access route.
- Support rollback to a previous valid file when feasible.
- Keep raw provider data separate from processed PCS records.

## Current Status

No cache implementation exists in this milestone.
