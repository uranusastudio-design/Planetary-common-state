"""Annual public-observation adapters for the PCS Engine.

The adapters return a standardized annual dataframe with the columns used by
the PCS demonstration: Year, Temperature, CO2, SeaLevel, and NDVI.
"""

from __future__ import annotations

from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

import pandas as pd


GISTEMP_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt"
NOAA_CO2_URL = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt"

STANDARD_COLUMNS = ["Year", "Temperature", "CO2", "SeaLevel", "NDVI"]


class DataAdapterError(RuntimeError):
    """Raised when an adapter cannot load data from source or cache."""


def _read_text(source: str | Path | None, url: str) -> str:
    if source is not None:
        return Path(source).read_text(encoding="utf-8", errors="replace")
    try:
        with urlopen(url, timeout=30) as response:
            return response.read().decode("utf-8", errors="replace")
    except (OSError, URLError) as exc:
        raise DataAdapterError(f"Unable to load {url}: {exc}") from exc


def _read_csv_projection_column(source: str | Path, value_column: str) -> pd.DataFrame | None:
    path = Path(source)
    if path.suffix.lower() != ".csv":
        return None
    df = pd.read_csv(path)
    if "Year" not in df.columns or value_column not in df.columns:
        return None
    out = df[["Year", value_column]].copy()
    out["Year"] = pd.to_numeric(out["Year"], errors="coerce").astype("Int64")
    out[value_column] = pd.to_numeric(out[value_column], errors="coerce")
    return out.dropna(subset=["Year"]).astype({"Year": int})


def load_nasa_gistemp(source: str | Path | None = None) -> pd.DataFrame:
    """Load NASA GISTEMP annual global temperature anomalies.

    Returns columns:
    - Year
    - Temperature: annual anomaly in degrees C relative to 1951--1980.
    """

    if source is not None:
        csv_df = _read_csv_projection_column(source, "Temperature")
        if csv_df is not None:
            return csv_df

    text = _read_text(source, GISTEMP_URL)
    rows: list[dict[str, float | int]] = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 14 or not parts[0].isdigit():
            continue
        annual = parts[13]
        if annual in {"***", "****", "*****"}:
            continue
        rows.append({"Year": int(parts[0]), "Temperature": int(annual) / 100.0})
    if not rows:
        raise DataAdapterError("NASA GISTEMP adapter found no complete annual records.")
    return pd.DataFrame(rows)


def load_noaa_co2(source: str | Path | None = None) -> pd.DataFrame:
    """Load NOAA GML Mauna Loa annual mean CO2.

    Returns columns:
    - Year
    - CO2: annual mean dry-air mole fraction in ppm.
    """

    if source is not None:
        csv_df = _read_csv_projection_column(source, "CO2")
        if csv_df is not None:
            return csv_df

    text = _read_text(source, NOAA_CO2_URL)
    rows: list[dict[str, float | int]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        parts = stripped.split()
        if len(parts) < 2 or not parts[0].isdigit():
            continue
        rows.append({"Year": int(parts[0]), "CO2": float(parts[1])})
    if not rows:
        raise DataAdapterError("NOAA CO2 adapter found no annual records.")
    return pd.DataFrame(rows)


def load_standardized_annual_dataframe(
    temperature_source: str | Path | None = None,
    co2_source: str | Path | None = None,
) -> pd.DataFrame:
    """Load available annual observations into the standard PCS dataframe."""

    temp = load_nasa_gistemp(temperature_source)
    co2 = load_noaa_co2(co2_source)
    df = pd.merge(temp, co2, on="Year", how="outer").sort_values("Year")
    for col in STANDARD_COLUMNS:
        if col not in df.columns:
            df[col] = pd.NA
    df = df[STANDARD_COLUMNS].copy()
    for col in STANDARD_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df.reset_index(drop=True)

