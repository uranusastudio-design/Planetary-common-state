# PCS Engine Core Architecture v1.0

This package contains the first modular PCS Engine core. It does not include a dashboard and does not modify the manuscript.

## Layers

### `data_adapters/`

Loads public annual observations and returns a standardized dataframe:

```text
Year, Temperature, CO2, SeaLevel, NDVI
```

The current adapters support NASA GISTEMP and NOAA GML Mauna Loa CO2. Missing projections remain unavailable rather than inferred.

### `projection_engine/`

Converts raw annual observables into:

```text
L_T, L_C, L_S, L_I
```

The normalization constants follow `demo/pcs_projection_standard_v1.md`:

```text
L_T = (Temperature - 0.0) / (1.5 - 0.0)
L_C = (CO2 - 315.98) / (450.0 - 315.98)
```

Both projections are clipped to `[0, 1]`. `L_S` and `L_I` remain `NaN` until data adapters are added.

### `state_engine/`

Computes:

```text
S_demo(t)
coverage_count
latest available state
```

`S_demo(t)` is the mean of available projections for the operational engine state. No missing projection is fabricated.

### `output_layer/`

Writes dashboard-ready files:

```text
latest_state.json
latest_state.csv
full_state_history.csv
```

By default, `run_engine.py` writes these files under `PCS_ENGINE/output/`.

## Run

From the workspace root:

```powershell
& "C:\Users\luus\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" PCS_ENGINE\run_engine.py
```

## Tests

```powershell
& "C:\Users\luus\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m unittest discover PCS_ENGINE\tests
```

## Rules

- No dashboard yet.
- No prediction.
- No interpolation.
- No fabricated data.
- No manuscript edits.
- `latest_state.json` is the intended dashboard handoff file.

