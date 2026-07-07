# PCS Aggregation Engine v0.1

The PCS Aggregation Engine prepares `PCS_ENGINE/output/latest_state.json` for the Observatory by summarizing connector output availability.

## Purpose

The aggregation step reads connector-standard JSON files from:

```text
PCS_ENGINE/input/
```

It writes a refreshed Observatory-facing state file:

```text
PCS_ENGINE/output/latest_state.json
```

## Scientific Boundary

The aggregation engine does not compute a new scientific PCS value. It does not fabricate data, estimate missing observations, interpolate values, call APIs, or modify connector outputs.

## Connector Trust Boundary

Connector outputs are not treated as scientifically usable until they contain real non-empty records and pass validation in the appropriate validation workflow.

In this v0.1 aggregation layer:

- non-empty connector JSON files are summarized as `Connected`;
- empty connector JSON arrays are summarized as `Waiting`;
- missing expected connector files are summarized as `Planned` or `Missing`.

The temporary CWA Weather connector is included for live pipeline validation and is classified by the same rules as all other connector outputs.

## Observatory Preparation

The aggregation output preserves existing Observatory-compatible fields such as `metadata`, `latest_year`, `projections`, `S_demo`, and `coverage_count` when they already exist.
