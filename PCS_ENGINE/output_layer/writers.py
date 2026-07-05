"""Output-layer writers for dashboard-ready PCS artifacts."""

from __future__ import annotations

import csv
import json
from pathlib import Path

import pandas as pd


def save_latest_state_json(latest_state: dict, path: str | Path) -> Path:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(latest_state, indent=2), encoding="utf-8")
    return out


def save_latest_state_csv(latest_state: dict, path: str | Path) -> Path:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    projections = latest_state.get("projections", {})
    row = {
        "Year": latest_state.get("latest_year"),
        "L_T": projections.get("L_T"),
        "L_C": projections.get("L_C"),
        "L_S": projections.get("L_S"),
        "L_I": projections.get("L_I"),
        "S_demo": latest_state.get("S_demo"),
        "coverage_count": latest_state.get("coverage_count"),
    }
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(row.keys()))
        writer.writeheader()
        writer.writerow(row)
    return out


def save_full_state_history(state_history: pd.DataFrame, path: str | Path) -> Path:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    state_history.to_csv(out, index=False, na_rep="NaN")
    return out

