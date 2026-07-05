"""Projection rules following pcs_projection_standard_v1.md."""

from __future__ import annotations

import pandas as pd


TEMP_REF = 0.0
TEMP_CRIT = 1.5
CO2_REF = 315.98
CO2_CRIT = 450.0


def normalize_larger_is_stronger(series: pd.Series, ref: float, crit: float) -> pd.Series:
    """Normalize an observable where larger values imply stronger constraint."""

    projected = (pd.to_numeric(series, errors="coerce") - ref) / (crit - ref)
    return projected.clip(lower=0.0, upper=1.0)


def compute_projections(observations: pd.DataFrame) -> pd.DataFrame:
    """Convert raw annual observations into PCS demo projections.

    Missing input values remain NaN in the corresponding projection columns.
    """

    df = observations.copy()
    if "Year" not in df.columns:
        raise ValueError("observations must contain a Year column")
    for col in ["Temperature", "CO2", "SeaLevel", "NDVI"]:
        if col not in df.columns:
            df[col] = pd.NA

    out = pd.DataFrame({"Year": pd.to_numeric(df["Year"], errors="coerce").astype("Int64")})
    out["L_T"] = normalize_larger_is_stronger(df["Temperature"], TEMP_REF, TEMP_CRIT)
    out["L_C"] = normalize_larger_is_stronger(df["CO2"], CO2_REF, CO2_CRIT)
    out["L_S"] = pd.NA
    out["L_I"] = pd.NA
    out["L_S"] = pd.to_numeric(out["L_S"], errors="coerce")
    out["L_I"] = pd.to_numeric(out["L_I"], errors="coerce")
    return out.dropna(subset=["Year"]).astype({"Year": int}).reset_index(drop=True)

