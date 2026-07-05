"""Live PCS observation ingest prototype.

This script downloads public annual observations from NASA GISTEMP and
NOAA GML Mauna Loa CO2, parses the latest complete annual values, and
computes the two available PCS demo projections.

It performs no prediction, interpolation, or gap filling.
"""

from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"

GISTEMP_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt"
NOAA_CO2_URL = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt"

TEMP_REF = 0.0
TEMP_CRIT = 1.5
CO2_REF = 315.98
CO2_CRIT = 450.0


def download_text(url: str, filename: str) -> tuple[str | None, str]:
    RAW.mkdir(exist_ok=True)
    try:
        with urlopen(url, timeout=30) as response:
            text = response.read().decode("utf-8", errors="replace")
        (RAW / filename).write_text(text, encoding="utf-8")
        return text, "ok"
    except (OSError, URLError) as exc:
        local = RAW / filename
        if local.exists():
            return local.read_text(encoding="utf-8", errors="replace"), f"local_cache_after_error: {exc}"
        return None, f"unavailable: {exc}"


def parse_latest_gistemp(text: str) -> dict:
    latest = None
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 14 or not re.fullmatch(r"\d{4}", parts[0]):
            continue
        year = int(parts[0])
        annual = parts[13]
        if annual == "*****":
            continue
        latest = {
            "year": year,
            "value": int(annual) / 100.0,
            "unit": "deg C anomaly relative to 1951-1980",
        }
    if latest is None:
        raise ValueError("No complete annual GISTEMP value found.")
    return latest


def parse_latest_noaa_co2(text: str) -> dict:
    latest = None
    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 2 or not re.fullmatch(r"\d{4}", parts[0]):
            continue
        latest = {
            "year": int(parts[0]),
            "value": float(parts[1]),
            "unit": "ppm",
        }
    if latest is None:
        raise ValueError("No annual NOAA CO2 value found.")
    return latest


def normalize(value: float, ref: float, crit: float) -> float:
    raw = (value - ref) / (crit - ref)
    return min(1.0, max(0.0, raw))


def main() -> int:
    generated_at = datetime.now(timezone.utc).isoformat()
    gistemp_text, gistemp_status = download_text(GISTEMP_URL, "GLB.Ts+dSST.txt")
    co2_text, co2_status = download_text(NOAA_CO2_URL, "co2_annmean_mlo.txt")

    observations = {}
    errors = {}

    if gistemp_text is not None:
        try:
            observations["Temperature"] = parse_latest_gistemp(gistemp_text)
        except ValueError as exc:
            errors["Temperature"] = str(exc)
    else:
        errors["Temperature"] = gistemp_status

    if co2_text is not None:
        try:
            observations["CO2"] = parse_latest_noaa_co2(co2_text)
        except ValueError as exc:
            errors["CO2"] = str(exc)
    else:
        errors["CO2"] = co2_status

    projections = {}
    if "Temperature" in observations:
        projections["L_T"] = normalize(observations["Temperature"]["value"], TEMP_REF, TEMP_CRIT)
    if "CO2" in observations:
        projections["L_C"] = normalize(observations["CO2"]["value"], CO2_REF, CO2_CRIT)

    available = [v for v in projections.values() if v is not None]
    state = sum(available) / len(available) if available else None

    latest_state = {
        "metadata": {
            "generated_at_utc": generated_at,
            "prototype": "PCS_LIVE v1.0",
            "no_prediction": True,
            "no_interpolation": True,
            "no_fabricated_data": True,
        },
        "sources": {
            "NASA_GISTEMP": {"url": GISTEMP_URL, "status": gistemp_status},
            "NOAA_CO2": {"url": NOAA_CO2_URL, "status": co2_status},
        },
        "observations": observations,
        "projections": projections,
        "S_demo": state,
        "coverage_count": len(available),
        "errors": errors,
    }

    (ROOT / "latest_state.json").write_text(json.dumps(latest_state, indent=2), encoding="utf-8")
    with (ROOT / "latest_state.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["Year", "Temperature", "CO2", "L_T", "L_C", "S_demo", "coverage_count"],
        )
        writer.writeheader()
        years = [obs["year"] for obs in observations.values()]
        writer.writerow(
            {
                "Year": max(years) if years else "",
                "Temperature": observations.get("Temperature", {}).get("value", ""),
                "CO2": observations.get("CO2", {}).get("value", ""),
                "L_T": projections.get("L_T", ""),
                "L_C": projections.get("L_C", ""),
                "S_demo": state if state is not None else "",
                "coverage_count": len(available),
            }
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

