# PCS Text Dashboard v0.1

This is the first minimal dashboard reader for PCS Engine output.

It reads:

```text
PCS_ENGINE/output/latest_state.json
```

It does not compute new values, download data, predict, modify `PCS_ENGINE`, or edit the manuscript.

## Run

From the workspace root:

```powershell
& "C:\Users\luus\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" PCS_DASHBOARD\text_dashboard.py
```

## Displayed Fields

- PCS Engine version
- Latest year
- PCS state
- Coverage count
- \(L_T\)
- \(L_C\)
- \(L_S\)
- \(L_I\)
- Data sources
- Status

Null values are displayed as:

```text
Waiting for data
```

