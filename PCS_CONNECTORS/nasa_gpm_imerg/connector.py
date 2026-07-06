"""NASA GPM IMERG connector v1.0 for PCS.

This connector reads official local NASA IMERG-derived CSV or JSON summaries
when they are provided. No live download or external API call is implemented in
this milestone. If no source file is provided, the connector writes a pending
output without fabricating precipitation values.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


PROVIDER = "NASA"
MISSION = "Global Precipitation Measurement (GPM)"
DATASET = "IMERG"
VERSION = "NASA GPM IMERG connector v1.0"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "PCS_ENGINE" / "input" / "nasa_gpm_imerg_pcs.json"
GPM_DATA_DIRECTORY = "https://gpm.nasa.gov/data/directory"
IMERG_HALF_HOURLY_PRODUCT = "https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGHH_07/summary"
IMERG_DAILY_PRODUCT = "https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary"
IMERG_MONTHLY_PRODUCT = "https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary"
MISSING_MARKERS = {"", "-999", "-999.0", "-9999", "-9999.0", "NaN", "nan", "NA", "N/A", "null", "None"}
ALLOWED_UNITS = {"mm/hr", "mm/day"}


class ConnectorError(RuntimeError):
    """Raised when the connector cannot process source data."""


class DataAccessPending(RuntimeError):
    """Raised when real source data are not available locally."""


def normalize_header(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", header.lower()).strip("_")


def detect_field(field_map: dict[str, str], candidates: set[str]) -> str | None:
    for normalized, original in field_map.items():
        if normalized in candidates:
            return original
    return None


def parse_number(raw_value: object) -> float | None:
    value = str(raw_value).strip()
    if value in MISSING_MARKERS:
        return None
    return round(float(value), 6)


def normalize_unit(raw_unit: object | None, variable: str) -> str:
    if raw_unit is not None and str(raw_unit).strip():
        unit = str(raw_unit).strip()
    elif variable == "Global Precipitation Rate":
        unit = "mm/hr"
    else:
        unit = "mm/day"

    if unit not in ALLOWED_UNITS:
        raise ConnectorError(f"Unsupported IMERG unit: {unit}")
    return unit


def make_record(
    variable: str,
    timestamp: str,
    value: float | None,
    unit: str,
    source_url: str,
    notes: str = "NASA GPM IMERG connector record.",
) -> dict[str, object]:
    safe_variable = re.sub(r"[^0-9A-Za-z_.-]+", "_", variable.lower()).strip("_")
    safe_timestamp = re.sub(r"[^0-9A-Za-z_.-]+", "_", timestamp)
    return {
        "id": f"nasa_gpm_imerg_{safe_variable}_{safe_timestamp}",
        "provider": PROVIDER,
        "dataset": DATASET,
        "variable": variable,
        "timestamp": timestamp,
        "unit": unit,
        "value": value,
        "uncertainty": None,
        "quality": "missing" if value is None else "observed",
        "confidence": "official source record when source data are available",
        "source_url": source_url,
        "license": "Source-specific terms; see NASA GPM and GES DISC documentation",
        "version": VERSION,
        "notes": notes,
    }


def parse_csv_source(path: Path) -> list[dict[str, object]]:
    lines = [line for line in path.read_text(encoding="utf-8", errors="replace").splitlines() if line.strip()]
    if not lines:
        return []

    reader = csv.DictReader(lines)
    if not reader.fieldnames:
        return []

    field_map = {normalize_header(field): field for field in reader.fieldnames}
    timestamp_field = detect_field(field_map, {"timestamp", "time", "date", "valid_time"})
    unit_field = detect_field(field_map, {"unit", "units"})
    source_field = detect_field(field_map, {"source_url", "source", "url"})

    variable_fields = {
        "Global Precipitation Rate": detect_field(
            field_map,
            {"precipitation_rate", "global_precipitation_rate", "precip_rate", "rate", "precipitation"},
        ),
        "Accumulated Precipitation": detect_field(
            field_map,
            {"accumulated_precipitation", "precipitation_accumulation", "accumulation", "precipitation_total", "total"},
        ),
        "Rainfall Intensity": detect_field(
            field_map,
            {"rainfall_intensity", "intensity", "rain_intensity"},
        ),
    }

    if timestamp_field is None:
        return []

    records: list[dict[str, object]] = []
    for row in reader:
        timestamp = str(row.get(timestamp_field, "")).strip()
        if not timestamp:
            continue
        source_url = str(row.get(source_field, "")).strip() if source_field else str(path)
        source_url = source_url or str(path)
        for variable, value_field in variable_fields.items():
            if value_field is None:
                continue
            unit = normalize_unit(row.get(unit_field) if unit_field else None, variable)
            value = parse_number(row.get(value_field, ""))
            records.append(make_record(variable, timestamp, value, unit, source_url))

    return records


def parse_json_source(path: Path) -> list[dict[str, object]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload if isinstance(payload, list) else payload.get("records", [])
    if not isinstance(rows, list):
        return []

    records: list[dict[str, object]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        timestamp = str(row.get("timestamp") or row.get("time") or row.get("date") or "").strip()
        variable = str(row.get("variable") or "").strip()
        if not timestamp or variable not in {"Global Precipitation Rate", "Accumulated Precipitation", "Rainfall Intensity"}:
            continue
        unit = normalize_unit(row.get("unit"), variable)
        value = parse_number(row.get("value"))
        source_url = str(row.get("source_url") or row.get("source") or path)
        records.append(make_record(variable, timestamp, value, unit, source_url))

    return records


def load_records(source: str | Path | None = None) -> list[dict[str, object]]:
    if source is None:
        raise DataAccessPending("No local official NASA IMERG source file provided.")

    path = Path(source)
    if not path.exists():
        raise DataAccessPending(f"NASA IMERG source file not found: {path}")

    suffix = path.suffix.lower()
    if suffix == ".csv":
        records = parse_csv_source(path)
    elif suffix == ".json":
        records = parse_json_source(path)
    else:
        raise DataAccessPending(
            "NASA IMERG source requires an official local CSV or JSON summary for this milestone. "
            "Native HDF5 or NetCDF parsing is reserved for a future connector revision."
        )

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
            "notes": "No NASA IMERG records parsed. Data access remains pending.",
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
        if record.get("unit") not in ALLOWED_UNITS:
            raise ConnectorError("Validation failed: unexpected IMERG unit.")
        if record.get("quality") == "missing" and record.get("value") is not None:
            raise ConnectorError("Validation failed: missing values must be preserved as null.")
        if not record.get("timestamp") or not record.get("provider") or not record.get("dataset"):
            raise ConnectorError("Validation failed: timestamp or provenance is incomplete.")
        if not record.get("source_url"):
            raise ConnectorError("Validation failed: source provenance is missing.")

    observed = [record for record in records if record.get("value") is not None]
    if not observed:
        raise ConnectorError("Validation failed: no observed NASA IMERG precipitation values found.")

    latest = max(observed, key=lambda item: str(item["timestamp"]))
    return {
        "valid": True,
        "status": "parsed",
        "data_access_pending": False,
        "record_count": len(records),
        "latest_timestamp": latest["timestamp"],
        "latest_value": latest["value"],
        "output_path": str(path),
        "notes": "NASA IMERG records parsed from real source data.",
    }


def run_connector(source: str | Path | None = None, output: str | Path = DEFAULT_OUTPUT) -> dict[str, object]:
    try:
        records = load_records(source)
        if not records:
            raise DataAccessPending("No parseable NASA IMERG records found.")
        output_path = write_output(records, output)
        return validate_output(output_path)
    except DataAccessPending:
        output_path = write_output([], output)
        return validate_output(output_path, data_access_pending=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run NASA GPM IMERG PCS connector v1.0.")
    parser.add_argument("--source", help="Official local NASA IMERG CSV or JSON summary.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="PCS connector JSON output path.")
    args = parser.parse_args()

    result = run_connector(args.source, args.output)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
