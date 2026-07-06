# PCS Connector Framework v1.0

The PCS Connector Framework defines how external scientific data sources will connect to the Planetary Common State platform.

This milestone is documentation and framework only. It does not implement live API calls, perform downloads, calculate PCS values, modify the PCS Engine, or update the Observatory UI.

## Purpose

PCS connectors provide the future access layer between authoritative scientific datasets and PCS-ready observation records. The framework defines shared rules before implementation so that every connector has consistent metadata, status, validation, scheduling, health, logging, cache, security, and configuration behavior.

## Connector Philosophy

- One connector represents one scientific provider or documented dataset family.
- Each connector must preserve provenance, units, timestamps, license information, and quality status.
- Each connector must distinguish raw observation access from PCS normalization and state estimation.
- Missing data must remain missing.
- No connector may fabricate observations, infer unavailable values, or claim validation before testing.

## Universal Output Rule

All future connectors must output identical PCS JSON records using the universal fields defined in `DATA_STANDARD.md`.

Connector implementation is reserved for later milestones. The current framework defines the architecture only.

## Framework Files

- `CONNECTOR_SPECIFICATION.md`
- `DATA_STANDARD.md`
- `CONNECTOR_STATUS.md`
- `CONNECTOR_SCHEDULER.md`
- `CONNECTOR_HEALTH.md`
- `CONNECTOR_LOGGING.md`
- `CONNECTOR_CACHE.md`
- `CONNECTOR_SECURITY.md`
- `CONNECTOR_CONFIGURATION.md`
- `DATA_SOURCES/`

## Phase 2 Integration Queue

Phase 2 introduces the official connector integration queue for the first ten Earth-system datasets. The queue is defined in `INTEGRATION_QUEUE.md`.

Connectors will be implemented in priority order where access, licensing, and validation allow. A dataset remains waiting or planned until real source data are parsed, validated, and written to the PCS connector output standard.

## Current Status

PCS Connector Framework v1.0 is ready for Milestone 3 planning. No connector is live unless a future implementation file explicitly states otherwise.
