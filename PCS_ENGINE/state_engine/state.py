"""PCS state calculations."""

from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd


PROJECTION_COLUMNS = ["L_T", "L_C", "L_S", "L_I"]


def compute_state_history(projections: pd.DataFrame) -> pd.DataFrame:
    """Compute S_demo and coverage_count for each year."""

    df = projections.copy()
    if "Year" not in df.columns:
        raise ValueError("projections must contain a Year column")
    for col in PROJECTION_COLUMNS:
        if col not in df.columns:
            df[col] = pd.NA
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["coverage_count"] = df[PROJECTION_COLUMNS].notna().sum(axis=1)
    df["S_demo"] = df[PROJECTION_COLUMNS].mean(axis=1, skipna=True)
    df.loc[df["coverage_count"] == 0, "S_demo"] = pd.NA
    return df[["Year", *PROJECTION_COLUMNS, "S_demo", "coverage_count"]].copy()


def compute_latest_state(state_history: pd.DataFrame) -> dict:
    """Return the latest year with at least one available projection."""

    valid = state_history[pd.to_numeric(state_history["coverage_count"], errors="coerce") > 0]
    if valid.empty:
        return {
            "metadata": {
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "no_prediction": True,
                "no_interpolation": True,
                "no_fabricated_data": True,
            },
            "latest_year": None,
            "projections": {},
            "S_demo": None,
            "coverage_count": 0,
        }

    row = valid.sort_values("Year").iloc[-1]
    projections = {
        col: (None if pd.isna(row[col]) else float(row[col]))
        for col in PROJECTION_COLUMNS
    }
    return {
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "no_prediction": True,
            "no_interpolation": True,
            "no_fabricated_data": True,
        },
        "latest_year": int(row["Year"]),
        "projections": projections,
        "S_demo": None if pd.isna(row["S_demo"]) else float(row["S_demo"]),
        "coverage_count": int(row["coverage_count"]),
    }

