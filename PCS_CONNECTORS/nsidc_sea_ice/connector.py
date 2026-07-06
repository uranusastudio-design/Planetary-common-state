"""NSIDC Sea Ice connector v1.0 for PCS.

This connector reads real NSIDC Sea Ice Index CSV data when official source
files are available. If live access is unavailable, it writes a pending output
without fabricating sea-ice values.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


ARCTIC_DAILY_URL = "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v3.0.csv"
ANTARCTIC_DAILY_URL = "https://noaadata.apps.nsidc.org/NOAA/G02135/south/daily/data/S_seaice_extent_daily_v3.0.csv"
PROVIDER = "NSIDC"
DATASET = "Sea Ice Index"
UNIT = "million km^2"
VERSION = "NSIDC Sea Ice connector v1.0"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "PCS_ENGINE" / "input" / "nsidc_sea_ice_pcs.json"
MISSING_MARKERS = {"", "-999", "-999.0", "-999.00", "NaN", "nan", "NA", "N/A", "null"}


class ConnectorError(RuntimeError):
    """Raised when the connector cannot process source data."""


class DataAccessPending(RuntimeError):
    """Raised when real source data cannot be accessed in this environment."""


def read_text(source: str | Path) -> tuple[str, str]:
    source_text = str(source)
    path = Path(source_text)
    if path.exists():
        return path.read_text(encoding="utf-8", errors="replace"), str(path)

    try:
        with urlopen(source_text, timeout=30) as response:
            text = response.read().decode("utf-8", errors="replace")
    except (OSError, URLError) as exc:
        raise DataAccessPending(f"Unable to load NSIDC source: {exc}") from exc

    return text, source_text


def parse_number(raw_value: object) -> float | None:
    value = str(raw_value).strip()
    if value in MISSING_MARKERS:
        return None
    return round(float(value), 4)


def normalize_header(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", header.lower()).strip("_")


def detect_field(field_map: dict[str, str], candidates: set[str]) -> str | None:
    for normalized, original in field_map.items():
        if normalized in candidates:
            return original
    return None


def build_timestamp(row: dict[str, str], field_map: dict[str, str]) -> str | None:
    date_field = detect_field(field_map, {"date", "timestamp", "time"})
    if date_field:
        timestamp = str(row.get(date_field, "")).strip()
        return timestamp or None

    year_field = detect_field(field_map, {"year", "yyyy"})
    month_field = detect_field(field_map, {"month", "mo", "mm"})
    day_field = detect_field(field_map, {"day", "dd"})
    if year_field and month_field and day_field:
        year = str(row.get(year_field, "")).strip()
        month = str(row.get(month_field, "")).strip().zfill(2)
        day = str(row.get(day_field, "")).strip().zfill(2)
        if year and month and day:
            return f"{year}-{month}-{day}"

    return None


def make_record(
    variable: str,
    timestamp: str,
    value: float | None,
    source_url: str,
) -> dict[str, object]:
    safe_variable = re.sub(r"[^0-9A-Za-z_.-]+", "_", variable.lower()).strip("_")
    safe_timestamp = re.sub(r"[^0-9A-Za-z_.-]+", "_", timestamp)
    return {
        "id": f"nsidc_sea_ice_{safe_variable}_{safe_timestamp}",
        "provider": PROVIDER,
        "dataset": DATASET,
        "variable": variable,
        "timestamp": timestamp,
        "unit": UNIT,
        "value": value,
        "uncertainty": None,
        "quality": "missing" if value is None else "observed",
        "confidence": "official source record when source data are available",
        "source_url": source_url,
        "license": "Source-specific terms; see NSIDC dataset documentation",
        "version": VERSION,
        "notes": "NSIDC Sea Ice Index connector record.",
    }


def parse_csv_source(text: str, source_url: str, variable: str) -> list[dict[str, object]]:
    lines = [line for line in text.splitlines() if line.strip() and not line.lstrip().startswith("#")]
    if not lines:
        return []

    reader = csv.DictReader(lines)
    if not reader.fieldnames:
        return []

    field_map = {normalize_header(field): field for field in reader.fieldnames}
    value_field = detect_field(field_map, {"extent", "sea_ice_extent", "ice_extent", "value", "area", "sea_ice_area"})
    if value_field is None:
        return []

    records: list[dict[str, object]] = []
    for row in reader:
        timestamp = build_timestamp(row, field_map)
        if not timestamp:
            continue
        try:
            value = parse_number(row.get(value_field, ""))
        except ValueError:
            continue
        records.append(make_record(variable, timestamp, value, source_url))

    return records


def load_records(arctic_source: str | Path, antarctic_source: str | Path) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []

    arctic_text, arctic_url = read_text(arctic_source)
    records.extend(parse_csv_source(arctic_text, arctic_url, "Arctic Sea Ice Extent"))

    antarctic_text, antarctic_url = read_text(antarctic_source)
    records.extend(parse_csv_source(antarctic_text, antarctic_url, "Antarctic Sea Ice Extent"))

    return sorted(records, key=lambda item: (str(item["variable"]), str(item["timestamp"])))


def write_output(records: list[dict[str, object]], output_path: str | Path = DEFAULT_OUTPUT) -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    return path


def validate_output(output_path: str | Path, data_access_pending: bool = False) -> dict[str, object]:
    path = Path(output_path)
    if not path.exists():
        raise ConnectorError("Validation failed: output file does not exist.")

    records = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise ConnectorError("Validation failed: output must be a JSON array.")

    if not records:
        return {
            "valid": False,
            "status": "pending",
            "data_access_pending": bool(data_access_pending),
            "record_count": 0,
            "latest_timestamp": None,
            "latest_value": None,
            "output_path": str(path),
            "notes": "No NSIDC records parsed. Data access remains pending.",
        }

    required = [
        "id",
        "provider",
        "dataset",
        "variable",
        "timestamp",
        "unit",
        "value",
        "uncertainty",
        "quality",
        "confidence",
        "source_url",
        "license",
        "version",
        "notes",
    ]
    for record in records:
        missing = [field for field in required if field not in record]
        if missing:
            raise ConnectorError(f"Validation failed: missing fields {missing}.")
        if record.get("quality") == "missing" and record.get("value") is not None:
            raise ConnectorError("Validation failed: missing values must be preserved as null.")
        if not record.get("provider") or not record.get("dataset") or not record.get("source_url"):
            raise ConnectorError("Validation failed: source provenance is incomplete.")

    observed = [record for record in records if record.get("value") is not None]
    if not observed:
        raise ConnectorError("Validation failed: no observed NSIDC sea-ice values found.")

    latest = max(observed, key=lambda item: str(item["timestamp"]))
    return {
        "valid": True,
        "status": "parsed",
        "data_access_pending": False,
        "record_count": len(records),
        "latest_timestamp": latest["timestamp"],
        "latest_value": latest["value"],
        "output_path": str(path),
        "notes": "NSIDC Sea Ice Index records parsed from real source data.",
    }


def run_connector(
    arctic_source: str | Path = ARCTIC_DAILY_URL,
    antarctic_source: str | Path = ANTARCTIC_DAILY_URL,
    output: str | Path = DEFAULT_OUTPUT,
) -> dict[str, object]:
    try:
        records = load_records(arctic_source, antarctic_source)
        if not records:
            raise DataAccessPending("No parseable NSIDC sea-ice records found.")
        output_path = write_output(records, output)
        return validate_output(output_path)
    except DataAccessPending:
        output_path = write_output([], output)
        return validate_output(output_path, data_access_pending=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run NSIDC Sea Ice PCS connector v1.0.")
    parser.add_argument("--arctic-source", default=ARCTIC_DAILY_URL, help="Official Arctic source URL or local CSV.")
    parser.add_argument("--antarctic-source", default=ANTARCTIC_DAILY_URL, help="Official Antarctic source URL or local CSV.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="PCS connector JSON output path.")
    args = parser.parse_args()

    result = run_connector(args.arctic_source, args.antarctic_source, args.output)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
