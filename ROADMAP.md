# PCS Roadmap v1.0

Official development roadmap for the Planetary Common State research platform.

This roadmap is a planning document only. It does not modify manuscript content, PCS Engine code, benchmark data, validation outputs, or dashboard outputs.

## 1. Current Status

### UCT Manuscript

The Unified Constraint Theory / Planetary Common State manuscript has been prepared as a structured research manuscript with supporting tables, figures, references, benchmark demonstration material, and publication-readiness audits. The manuscript remains separate from prototype engineering work.

### PCS Engine

The PCS Engine core architecture has been established with four operational layers:

- Data Adapter
- Projection Engine
- State Engine
- Output Layer

The current engine reads benchmark annual observations, computes available PCS projections, computes the demo state, and writes dashboard-readable output files.

### PCS Live Prototype

The live prototype defines the first public-observation ingest path for NASA GISTEMP and NOAA CO2. Its purpose is to test whether PCS can ingest live public observations. It performs no prediction, interpolation, or fabrication.

### PCS Text Dashboard

The text dashboard reads `PCS_ENGINE/output/latest_state.json` and displays the current PCS state in terminal form. It does not compute new values, download data, or modify engine outputs.

### PCS Validation

The validation package defines the first methodology for evaluating PCS representation using benchmark data. It includes validation plans, hypotheses, metrics, protocol, and initial validation outputs for available benchmark projections.

### PCS Comparison

The comparison package defines the first scientific comparison framework:

- Baseline A: Temperature only
- Baseline B: Temperature + CO2
- PCS Benchmark v1

The comparison focuses on representational coverage and reproducibility, not prediction accuracy.

### GitHub Repository Established

The project repository is established as the working home for manuscript preparation, PCS benchmark data, validation outputs, engine code, dashboard readers, and roadmap documents.

## 2. Architecture

### Data Adapter

The Data Adapter layer loads public annual observations and returns standardized annual dataframes. Current priority sources are NASA GISTEMP and NOAA CO2.

### Projection Engine

The Projection Engine converts raw observables into normalized PCS projections. Current operational projections are:

- \(L_T\): thermal projection
- \(L_C\): chemical projection

Missing projections remain missing and are not inferred.

### State Engine

The State Engine computes:

- \(S_{\mathrm{demo}}(t)\)
- `coverage_count`
- latest available PCS state

The state is computed from available projections only.

### Output Layer

The Output Layer writes:

- `latest_state.json`
- `latest_state.csv`
- `full_state_history.csv`

These files are intended to serve as stable handoff artifacts for dashboards and future services.

### Dashboard Layer

The first dashboard layer is a text dashboard. It reads `latest_state.json` and displays the current PCS state without recomputation.

### Future API Layer

A future API layer should expose the latest PCS state, projection history, metadata, and validation status through stable machine-readable endpoints.

## 3. Prototype v0.1 Completed

Prototype v0.1 establishes the first operational PCS prototype.

Completed items:

- Temperature projection.
- CO2 projection.
- `latest_state.json`.
- Text dashboard.
- No prediction.
- No fabrication.

The current prototype demonstrates the operational path:

```text
public observations -> projections -> PCS state -> JSON/CSV output -> text dashboard
```

## 4. Prototype v1.0 Milestones

Prototype v1.0 should complete the four-projection benchmark.

Milestones:

1. Add Sea Level projection.
2. Add NDVI projection.
3. Reach `coverage_count = 4`.
4. Add validation comparison.
5. Add graphical dashboard.

Completion of v1.0 requires all four benchmark projections to be available from documented public or reproducible data sources.

## 5. Future Milestones

Future milestones are ordered to preserve scientific discipline and prevent premature forecasting claims.

1. API endpoint.
2. GitHub Actions automation.
3. Dashboard deployment.
4. Uncertainty estimation.
5. Sequential data assimilation.
6. Prediction module only after validation.

The prediction module should not be introduced until the benchmark dataset, validation protocol, and comparison baselines are stable.

## 6. Research Rule

The PCS research platform follows this development rule:

1. Framework first.
2. Data second.
3. Validation third.
4. Prediction last.

This order is part of the scientific guardrail for the project. PCS should first be made reproducible and empirically testable before any predictive claims are considered.

## 7. Versioning

### v0.1 Operational Prototype

Scope:

- Temperature and CO2 projections.
- Engine output files.
- Text dashboard.
- No prediction.
- No fabricated data.

### v1.0 Four-Projection Benchmark

Scope:

- Temperature.
- CO2.
- Sea level.
- NDVI.
- `coverage_count = 4`.
- Benchmark comparison and validation.

### v2.0 Live Automated PCS

Scope:

- Automated data updates.
- Reproducible data acquisition logs.
- Automated output refresh.
- Validation status tracking.

### v3.0 Dashboard/API Platform

Scope:

- Graphical dashboard.
- API layer.
- Deployment workflow.
- User-facing state and metadata views.
- Integration of uncertainty and validation summaries.

## Rules

- Do not edit PCS Engine code as part of roadmap maintenance.
- Do not edit manuscript content as part of roadmap maintenance.
- Do not compute new results in roadmap documents.
- Do not treat roadmap milestones as completed until implementation and validation artifacts exist.

