# PCS Engine Core v1.0

PCS Engine Core v1.0 defines the first operational architecture for transforming validated connector outputs into a unified Planetary Common State estimate.

This milestone is architecture only. It does not implement new scientific equations, estimate missing variables, fabricate data, add API calls, or modify the Observatory.

## Purpose

The PCS Engine provides the internal processing layer between scientific connectors and downstream PCS outputs. It receives connector-standard records, checks validation status, organizes domain-level availability, and prepares structured state outputs for future use.

## Engine Philosophy

- Validated data first.
- Missing data remain missing.
- No silent repair.
- No fabricated values.
- No prediction before validation.
- Engine outputs must preserve provenance and quality status.

## Relationship With Connectors

Connectors acquire or prepare provider-specific scientific observations and write standardized connector JSON into `PCS_ENGINE/input/`.

The Engine must treat connector outputs as inputs only after validation.

## Relationship With Registry

The PCS Variable Registry defines domains, subdomains, variable meaning, units, source priorities, and fallback rules. The Engine should use registry definitions to organize future variables without hard-coding scientific taxonomy into processing logic.

## Relationship With Observatory

The PCS Observatory reads Engine outputs. The Observatory should not compute PCS values or repair missing data in the user interface.

## Relationship With AI

Future AI modules may assist with monitoring, summarization, anomaly triage, or workflow support only after validated Engine outputs exist. AI modules must not fabricate missing observations or replace scientific validation.

## Current Folder Roles

- `input/`: connector outputs and validation reports.
- `validated/`: future validated connector records.
- `state/`: future internal state assembly artifacts.
- `output/`: Engine outputs intended for dashboards or downstream tools.
- `logs/`: future Engine logs.
- `config/`: future Engine configuration files.
- `aggregator/`: connector availability aggregation for Observatory-facing `latest_state.json`.

## Aggregation Engine

The Aggregation Engine reads connector JSON outputs from `PCS_ENGINE/input/` and writes a refreshed `PCS_ENGINE/output/latest_state.json` for the Observatory.

The aggregation step summarizes source availability only. It does not compute a new scientific PCS value, estimate missing data, fabricate observations, call APIs, or modify connector outputs.

Empty connector output arrays are treated as `Waiting`, not `Connected`. A connector is marked `Connected` only when its JSON output exists and contains non-empty records.

## Current Boundary

Milestone 4 defines architecture only. Existing prototype scripts remain in place, but this milestone does not change scientific calculations or state-generation behavior.
