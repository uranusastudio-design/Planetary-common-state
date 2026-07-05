# PCS Prototype Freeze v0.1

Date: 2026-07-05  
Status: First operational PCS prototype freeze  
Scope: PCS Engine core plus minimal text dashboard reader

This freeze records the current operational prototype. It does not modify the manuscript, recompute values, download data, or change code.

## PCS_ENGINE Structure

```text
PCS_ENGINE/
  README.md
  run_engine.py
  __init__.py
  data_adapters/
    __init__.py
    annual_sources.py
  projection_engine/
    __init__.py
    projections.py
  state_engine/
    __init__.py
    state.py
  output_layer/
    __init__.py
    writers.py
  output/
    latest_state.json
    latest_state.csv
    full_state_history.csv
  tests/
    test_engine_core.py
```

The engine is organized into four core layers:

- Data Adapter: loads standardized annual observations for NASA GISTEMP and NOAA CO2.
- Projection Engine: computes \(L_T\) and \(L_C\) according to the PCS projection standard.
- State Engine: computes \(S_{\mathrm{demo}}(t)\), `coverage_count`, and the latest available state.
- Output Layer: writes dashboard-readable JSON and CSV outputs.

## PCS_DASHBOARD Structure

```text
PCS_DASHBOARD/
  README.md
  text_dashboard.py
```

The dashboard is a read-only terminal viewer. It reads:

```text
PCS_ENGINE/output/latest_state.json
```

It does not compute new values, download data, predict, or modify PCS Engine outputs.

## latest_state.json Schema

```json
{
  "metadata": {
    "generated_at_utc": "string",
    "no_prediction": true,
    "no_interpolation": true,
    "no_fabricated_data": true
  },
  "latest_year": "integer or null",
  "projections": {
    "L_T": "number or null",
    "L_C": "number or null",
    "L_S": "number or null",
    "L_I": "number or null"
  },
  "S_demo": "number or null",
  "coverage_count": "integer"
}
```

## Current Output Values

Frozen source file:

```text
PCS_ENGINE/output/latest_state.json
```

Current values:

| Field | Value |
|---|---:|
| Latest year | 2024 |
| \(L_T\) | 0.8533333333333334 |
| \(L_C\) | 0.8105506640799881 |
| \(L_S\) | null |
| \(L_I\) | null |
| \(S_{\mathrm{demo}}\) | 0.8319419987066607 |
| coverage_count | 2 |

Dashboard display convention:

- Numeric values are displayed to four decimals.
- Null values are displayed as `Waiting for data`.
- Current status is `Operational benchmark`.

## Data Sources

Current operational sources:

- NASA GISTEMP v4 global annual temperature anomaly.
- NOAA GML Mauna Loa annual mean CO2.

Current dashboard source display:

```text
NASA GISTEMP, NOAA CO2
```

## Known Missing Projections

The following PCS demonstration projections are not yet operational in the engine output:

- \(L_S\): Structural projection, intended to use global mean sea-level change.
- \(L_I\): Informational or biosphere projection, intended to use NDVI or an equivalent vegetation index.

Both are preserved as `null` in `latest_state.json` and displayed as `Waiting for data` in the text dashboard.

## No-Prediction Statement

PCS Prototype v0.1 performs no prediction, forecasting, hindcasting, or prediction-skill evaluation. It only reads available benchmark observations, computes defined projections, computes the current demo state from available projections, and writes dashboard-readable outputs.

## No-Fabrication Statement

PCS Prototype v0.1 does not fabricate, infer, interpolate, or impute missing projections. Missing values remain missing. In the current frozen output, \(L_S\) and \(L_I\) remain unavailable.

## Next Milestones

1. Add Sea Level.
2. Add NDVI.
3. Add API layer.
4. Add graphical dashboard.

