"""
Minimal PCS demonstration pipeline.

This script is a reproducible scaffold. It does not fabricate unavailable data.
Sea-level and NDVI inputs are expected as manually prepared annual CSV files
unless stable direct-download endpoints are added later.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd
import requests


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"

GISTEMP_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
NOAA_CO2_URL = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt"


@dataclass(frozen=True)
class Normalization:
    ref: float
    crit: float
    invert: bool = False


NORMALIZATION = {
    # Placeholder values for software testing only. Replace before manuscript use.
    "L_T": Normalization(ref=0.0, crit=1.5, invert=False),
    "L_C": Normalization(ref=315.97, crit=450.0, invert=False),
    "L_S": Normalization(ref=0.0, crit=100.0, invert=False),
    "L_I": Normalization(ref=0.0, crit=-0.05, invert=True),
}


def download_text(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    path.write_text(response.text, encoding="utf-8")


def load_gistemp() -> pd.DataFrame:
    path = RAW / "gistemp_global.csv"
    if not path.exists():
        download_text(GISTEMP_URL, path)

    df = pd.read_csv(path, skiprows=1)
    df = df.rename(columns={df.columns[0]: "year"})
    annual_col = "J-D"
    if annual_col not in df.columns:
        raise ValueError(f"Expected annual column {annual_col!r} in GISTEMP file.")

    out = df[["year", annual_col]].copy()
    out["year"] = pd.to_numeric(out["year"], errors="coerce")
    out["temp_anomaly_c"] = pd.to_numeric(out[annual_col], errors="coerce")
    # GISTEMP CSV values are commonly in 0.01 degrees C units.
    if out["temp_anomaly_c"].abs().median(skipna=True) > 10:
        out["temp_anomaly_c"] = out["temp_anomaly_c"] / 100.0
    return out[["year", "temp_anomaly_c"]].dropna().astype({"year": int})


def load_noaa_co2() -> pd.DataFrame:
    path = RAW / "co2_annmean_mlo.txt"
    if not path.exists():
        download_text(NOAA_CO2_URL, path)

    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        rows.append((int(parts[0]), float(parts[1])))
    return pd.DataFrame(rows, columns=["year", "co2_ppm"])


def load_manual_csv(filename: str, required_columns: list[str]) -> pd.DataFrame:
    path = RAW / filename
    if not path.exists():
        raise FileNotFoundError(
            f"Manual input required: {path}. Expected columns: {required_columns}"
        )
    df = pd.read_csv(path)
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"{path} is missing columns: {missing}")
    return df[required_columns].dropna()


def normalize(series: pd.Series, cfg: Normalization) -> pd.Series:
    if cfg.invert:
        values = (cfg.ref - series) / (cfg.ref - cfg.crit)
    else:
        values = (series - cfg.ref) / (cfg.crit - cfg.ref)
    return values


def add_projection(
    df: pd.DataFrame,
    source_col: str,
    projection_col: str,
    cfg: Normalization,
) -> pd.DataFrame:
    out = df.copy()
    raw_col = f"{projection_col}_raw"
    out[raw_col] = normalize(out[source_col], cfg)
    out[projection_col] = out[raw_col].clip(0.0, 1.0)
    return out


def build_demo_state() -> pd.DataFrame:
    thermal = add_projection(load_gistemp(), "temp_anomaly_c", "L_T", NORMALIZATION["L_T"])
    chemical = add_projection(load_noaa_co2(), "co2_ppm", "L_C", NORMALIZATION["L_C"])
    structural = add_projection(
        load_manual_csv("sea_level_annual.csv", ["year", "gmsl_mm"]),
        "gmsl_mm",
        "L_S",
        NORMALIZATION["L_S"],
    )
    biosphere = add_projection(
        load_manual_csv("ndvi_annual.csv", ["year", "ndvi"]),
        "ndvi",
        "L_I",
        NORMALIZATION["L_I"],
    )

    merged = thermal.merge(chemical, on="year", how="inner")
    merged = merged.merge(structural, on="year", how="inner")
    merged = merged.merge(biosphere, on="year", how="inner")
    merged["S_demo"] = merged[["L_T", "L_C", "L_S", "L_I"]].mean(axis=1)
    return merged.sort_values("year")


def main() -> None:
    PROCESSED.mkdir(parents=True, exist_ok=True)
    demo = build_demo_state()
    output = PROCESSED / "pcs_demo_state.csv"
    demo.to_csv(output, index=False)
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
