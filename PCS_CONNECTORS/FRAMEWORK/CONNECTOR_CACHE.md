# Connector Cache

The Connector Cache defines future local storage rules for downloaded observations.

## Cache Role

Caching should preserve reproducibility, reduce unnecessary provider requests, and retain raw observations before downstream processing.

## Cache Principles

- Preserve raw files when possible.
- Record source URL or access route.
- Record download timestamp.
- Record file checksum when implemented.
- Do not overwrite raw observations without version notes.
- Keep cache files separate from processed PCS outputs.

## Cache Status

The current framework does not create cache files. Cache implementation is reserved for later connector engineering.
