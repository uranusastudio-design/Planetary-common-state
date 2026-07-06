# Connector Output Standard

Every implemented PCS connector must produce a standard JSON output record or file.

## Required JSON Output Fields

- timestamp
- variable
- value
- unit
- quality
- confidence
- source
- dataset
- provider
- license
- version

## Output Rules

- `timestamp` must identify the observation time or valid time.
- `variable` must describe the scientific quantity.
- `value` may be null only when quality metadata indicates missing or unavailable data.
- `unit` must preserve the source unit unless a documented conversion is performed.
- `quality` must describe source and connector data status.
- `confidence` must remain traceable to validation and source status.
- `source` must identify the source URL, file, or documented access route.
- `dataset`, `provider`, `license`, and `version` must remain explicit.

## Engine Eligibility

PCS Engine may use only connector outputs that pass validation.
