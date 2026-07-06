"""NASA GISTEMP connector v0.1 for PCS.

This connector reads real NASA GISTEMP annual global temperature anomaly data
from the official NASA table or a local official-source excerpt and writes PCS
connector-standard JSON records. It does not compute PCS state values.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


GISTEMP_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt"
PROVIDER = "NASA Goddard Institute for Space Studies"
DATASET = "GISTEMP v4 global land-ocean temperature index"
VARIABLE = "Global surface temperature anomaly"
UNIT = "deg C anomaly relative to 1951-1980 baseline"
VERSION = "GISTEMP v4; connector v0.1"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "PCS_ENGINE" / "input" / "nasa_gistemp_pcs.json"
MISSING_MARKERS = {"", "***", "****", "*****", "NaN", "nan", "NA", "N/A"}


class ConnectorError(RuntimeError):
    """Raised when the connector cannot produce valid output."""


def read_source(source: str | Path | None = None) -> str:
    """Read NASA GISTEMP text from a local file or the official NASA URL."""

    if source is not None:
        return Path(source).read_text(encoding="utf-8", errors="replace")

    try:
        with urlopen(GISTEMP_URL, timeout=30) as response:
            return response.read().decode("utf-8", errors="replace")
    except (OSError, URLError) as exc:
        raise ConnectorError(f"Unable to load NASA GISTEMP source: {exc}") from exc


def parse_value(raw_value: str) -> float | None:
    """Convert NASA GISTEMP annual values to degrees C, preserving missing values."""

    value = raw_value.strip()
    if value in MISSING_MARKERS:
        return None

    numeric = float(value)
    if abs(numeric) > 10:
        numeric = numeric / 100.0
    return round(numeric, 3)


def make_record(year: int, value: float | None) -> dict[str, object]:
    """Create one PCS connector-standard record."""

    quality = "missing" if value is None else "observed"
    return {
        "id": f"nasa_gistemp_{year}",
        "provider": PROVIDER,
        "dataset": DATASET,
        "variable": VARIABLE,
        "timestamp": str(year),
        "unit": UNIT,
        "value": value,
        "uncertainty": None,
        "quality": quality,
        "confidence": "official NASA GISTEMP annual record",
        "source_url": GISTEMP_URL,
        "license": "NASA GISTEMP terms; see official source",
        "version": VERSION,
        "notes": "Annual J-D anomaly; source values in hundredths of degrees C are converted to degrees C.",
    }


def parse_gistemp_text(text: str) -> list[dict[str, object]]:
    """Parse official NASA table text or the repository's official annual excerpt."""

    records: list[dict[str, object]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        if "," in stripped:
            parts = [part.strip() for part in stripped.split(",")]
            if len(parts) >= 2 and parts[0].isdigit():
                records.append(make_record(int(parts[0]), parse_value(parts[1])))
            continue

        parts = stripped.split()
        if len(parts) >= 14 and parts[0].isdigit():
            records.append(make_record(int(parts[0]), parse_value(parts[13])))

    if not records:
        raise ConnectorError("NASA GISTEMP connector found no annual records.")

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
        "latest_year": int(str(latest_record["timestamp"])),
        "latest_value": latest_record["value"],
        "missing_count": sum(1 for record in records if record.get("value") is None),
        "output_path": str(path),
    }


def run_connector(source: str | Path | None = None, output: str | Path = DEFAULT_OUTPUT) -> dict[str, object]:
    text = read_source(source)
    records = parse_gistemp_text(text)
    output_path = write_output(records, output)
    return validate_output(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run NASA GISTEMP PCS connector v0.1.")
    parser.add_argument("--source", help="Optional local NASA GISTEMP source file.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="PCS connector JSON output path.")
    args = parser.parse_args()

    result = run_connector(args.source, args.output)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
