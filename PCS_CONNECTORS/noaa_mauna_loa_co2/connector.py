"""NOAA Mauna Loa CO2 connector v0.1 for PCS.

This connector reads real NOAA GML Mauna Loa annual mean CO2 data from the
official NOAA file or a local official-source snapshot and writes PCS
connector-standard JSON records. It does not compute PCS state values.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


NOAA_CO2_URL = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_mlo.txt"
PROVIDER = "NOAA Global Monitoring Laboratory"
DATASET = "Mauna Loa annual mean CO2"
VARIABLE = "Atmospheric CO2 concentration"
UNIT = "ppm"
VERSION = "NOAA GML annual Mauna Loa CO2; connector v0.1"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "PCS_ENGINE" / "input" / "noaa_mauna_loa_co2_pcs.json"
MISSING_MARKERS = {"", "***", "****", "*****", "-999.99", "-99.99", "NaN", "nan", "NA", "N/A"}


class ConnectorError(RuntimeError):
    """Raised when the connector cannot produce valid output."""


def read_source(source: str | Path | None = None) -> str:
    """Read NOAA CO2 text from a local file or the official NOAA URL."""

    if source is not None:
        return Path(source).read_text(encoding="utf-8", errors="replace")

    try:
        with urlopen(NOAA_CO2_URL, timeout=30) as response:
            return response.read().decode("utf-8", errors="replace")
    except (OSError, URLError) as exc:
        raise ConnectorError(f"Unable to load NOAA Mauna Loa CO2 source: {exc}") from exc


def parse_float(raw_value: str) -> float | None:
    """Parse a NOAA numeric field while preserving missing values."""

    value = raw_value.strip()
    if value in MISSING_MARKERS:
        return None
    return round(float(value), 3)


def make_record(year: int, value: float | None, uncertainty: float | None) -> dict[str, object]:
    """Create one PCS connector-standard record."""

    quality = "missing" if value is None else "observed"
    return {
        "id": f"noaa_mauna_loa_co2_{year}",
        "provider": PROVIDER,
        "dataset": DATASET,
        "variable": VARIABLE,
        "timestamp": str(year),
        "unit": UNIT,
        "value": value,
        "uncertainty": uncertainty,
        "quality": quality,
        "confidence": "official NOAA GML annual record",
        "source_url": NOAA_CO2_URL,
        "license": "NOAA GML data use terms; see official source",
        "version": VERSION,
        "notes": "Annual mean dry-air mole fraction in ppm from the Mauna Loa CO2 record.",
    }


def parse_noaa_text(text: str) -> list[dict[str, object]]:
    """Parse the official NOAA annual text file or compatible local snapshot."""

    records: list[dict[str, object]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if "," in stripped:
            parts = [part.strip() for part in stripped.split(",")]
        else:
            parts = stripped.split()

        if len(parts) < 2 or not parts[0].isdigit():
            continue

        year = int(parts[0])
        value = parse_float(parts[1])
        uncertainty = parse_float(parts[2]) if len(parts) >= 3 else None
        records.append(make_record(year, value, uncertainty))

    if not records:
        raise ConnectorError("NOAA Mauna Loa CO2 connector found no annual records.")

    return sorted(records, key=lambda item: int(str(item["timestamp"])))


def write_output(records: list[dict[str, object]], output_path: str | Path = DEFAULT_OUTPUT) -> Path:
    """Write PCS connector-standard JSON records."""

    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    return path


def validate_output(output_path: str | Path) -> dict[str, object]:
    """Validate the connector output file and required fields."""

    path = Path(output_path)
    if not path.exists():
        raise ConnectorError("Validation failed: output file does not exist.")

    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, list) or not records:
        raise ConnectorError("Validation failed: output must contain a non-empty record list.")

    for record in records:
        if "timestamp" not in record:
            raise ConnectorError("Validation failed: a record is missing timestamp.")
        if "value" not in record:
            raise ConnectorError("Validation failed: a record is missing value.")
        if record.get("quality") == "missing" and record.get("value") is not None:
            raise ConnectorError("Validation failed: missing values must be preserved as null.")

    observed_records = [record for record in records if record.get("value") is not None]
    if not observed_records:
        raise ConnectorError("Validation failed: no observed annual value found.")

    latest_record = max(observed_records, key=lambda item: int(str(item["timestamp"])))
    return {
        "valid": True,
        "record_count": len(records),
        "latest_timestamp": str(latest_record["timestamp"]),
        "latest_value": latest_record["value"],
        "missing_count": sum(1 for record in records if record.get("value") is None),
        "output_path": str(path),
    }


def run_connector(source: str | Path | None = None, output: str | Path = DEFAULT_OUTPUT) -> dict[str, object]:
    text = read_source(source)
    records = parse_noaa_text(text)
    output_path = write_output(records, output)
    return validate_output(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run NOAA Mauna Loa CO2 PCS connector v0.1.")
    parser.add_argument("--source", help="Optional local NOAA Mauna Loa CO2 source file.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="PCS connector JSON output path.")
    args = parser.parse_args()

    result = run_connector(args.source, args.output)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
