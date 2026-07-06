"""NASA FIRMS Wildfire connector v1.0 for PCS.

This connector reads official local NASA FIRMS CSV files when they are
provided. No live FIRMS API call is implemented in this milestone because
FIRMS requests require a MAP_KEY. If no source file is provided, the connector
writes a pending output without fabricating wildfire values.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


PROVIDER = "NASA"
SYSTEM = "FIRMS"
DATASET = "Fire Information for Resource Management System"
VERSION = "NASA FIRMS Wildfire connector v1.0"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "PCS_ENGINE" / "input" / "nasa_firms_wildfire_pcs.json"
FIRMS_API_AREA = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]"
FIRMS_API_AREA_DATE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]/[DATE]"
MISSING_MARKERS = {"", "-999", "-999.0", "-9999", "-9999.0", "NaN", "nan", "NA", "N/A", "null", "None"}


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


def parse_confidence(raw_value: object) -> str | None:
    value = str(raw_value).strip()
    if value in MISSING_MARKERS:
        return None
    return value


def build_timestamp(row: dict[str, str], field_map: dict[str, str]) -> str | None:
    timestamp_field = detect_field(field_map, {"timestamp", "time", "date_time", "datetime", "valid_time"})
    if timestamp_field:
        timestamp = str(row.get(timestamp_field, "")).strip()
        return timestamp or None

    date_field = detect_field(field_map, {"acq_date", "date", "acquisition_date"})
    time_field = detect_field(field_map, {"acq_time", "time", "acquisition_time"})
    date_value = str(row.get(date_field, "")).strip() if date_field else ""
    time_value = str(row.get(time_field, "")).strip() if time_field else ""

    if date_value and time_value:
        padded = time_value.zfill(4)
        return f"{date_value}T{padded[:2]}:{padded[2:]}:00"
    if date_value:
        return date_value
    return None


def make_record(
    variable: str,
    timestamp: str,
    value: float | str | None,
    unit: str,
    quality: str,
    confidence: str,
    source_url: str,
    notes: str,
) -> dict[str, object]:
    safe_variable = re.sub(r"[^0-9A-Za-z_.-]+", "_", variable.lower()).strip("_")
    safe_timestamp = re.sub(r"[^0-9A-Za-z_.-]+", "_", timestamp)
    return {
        "id": f"nasa_firms_wildfire_{safe_variable}_{safe_timestamp}",
        "provider": PROVIDER,
        "dataset": DATASET,
        "variable": variable,
        "timestamp": timestamp,
        "unit": unit,
        "value": value,
        "uncertainty": None,
        "quality": quality,
        "confidence": confidence,
        "source_url": source_url,
        "license": "Source-specific terms; see NASA FIRMS documentation",
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
    latitude_field = detect_field(field_map, {"latitude", "lat"})
    longitude_field = detect_field(field_map, {"longitude", "lon", "long"})
    confidence_field = detect_field(field_map, {"confidence", "confidence_class"})
    frp_field = detect_field(field_map, {"frp", "fire_radiative_power"})
    instrument_field = detect_field(field_map, {"instrument", "sensor"})
    satellite_field = detect_field(field_map, {"satellite"})
    source_field = detect_field(field_map, {"source_url", "source", "url"})

    if latitude_field is None or longitude_field is None:
        return []

    records: list[dict[str, object]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for row in reader:
        timestamp = build_timestamp(row, field_map)
        if not timestamp:
            continue

        latitude = parse_number(row.get(latitude_field, ""))
        longitude = parse_number(row.get(longitude_field, ""))
        if latitude is None or longitude is None:
            continue
        if latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180:
            continue

        sensor = str(row.get(instrument_field, "") or row.get(satellite_field, "") or "unknown").strip()
        duplicate_key = (timestamp, str(latitude), str(longitude), sensor)
        if duplicate_key in seen:
            continue
        seen.add(duplicate_key)

        source_url = str(row.get(source_field, "")).strip() if source_field else str(path)
        source_url = source_url or str(path)
        confidence_value = parse_confidence(row.get(confidence_field, "")) if confidence_field else None
        confidence = confidence_value or "source confidence unavailable"
        base_notes = f"NASA FIRMS active fire record; latitude={latitude}; longitude={longitude}; sensor={sensor}."

        records.append(
            make_record(
                "Active Fire Detection",
                timestamp,
                1,
                "count",
                "observed",
                confidence,
                source_url,
                base_notes,
            )
        )

        if frp_field:
            frp_value = parse_number(row.get(frp_field, ""))
            records.append(
                make_record(
                    "Fire Radiative Power",
                    timestamp,
                    frp_value,
                    "MW",
                    "missing" if frp_value is None else "observed",
                    confidence,
                    source_url,
                    base_notes,
                )
            )

        if confidence_value is not None:
            records.append(
                make_record(
                    "Thermal Anomaly",
                    timestamp,
                    confidence_value,
                    "confidence class",
                    "observed",
                    confidence,
                    source_url,
                    base_notes,
                )
            )

    return sorted(records, key=lambda item: (str(item["variable"]), str(item["timestamp"])))


def load_records(source: str | Path | None = None) -> list[dict[str, object]]:
    if source is None:
        raise DataAccessPending("No local official NASA FIRMS source file provided.")

    path = Path(source)
    if not path.exists():
        raise DataAccessPending(f"NASA FIRMS source file not found: {path}")
    if path.suffix.lower() != ".csv":
        raise DataAccessPending("NASA FIRMS connector v1.0 expects an official local FIRMS CSV source file.")

    return parse_csv_source(path)


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
            "notes": "No NASA FIRMS records parsed. Data access remains pending.",
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
    allowed_units = {"count", "MW", "confidence class"}
    for record in records:
        missing = [field for field in required if field not in record]
        if missing:
            raise ConnectorError(f"Validation failed: missing fields {missing}.")
        if record.get("unit") not in allowed_units:
            raise ConnectorError("Validation failed: unexpected FIRMS unit.")
        if record.get("quality") == "missing" and record.get("value") is not None:
            raise ConnectorError("Validation failed: missing values must be preserved as null.")
        if not record.get("timestamp") or not record.get("provider") or not record.get("dataset"):
            raise ConnectorError("Validation failed: timestamp or provenance is incomplete.")
        if not record.get("source_url"):
            raise ConnectorError("Validation failed: source provenance is missing.")

    observed = [record for record in records if record.get("value") is not None]
    if not observed:
        raise ConnectorError("Validation failed: no observed NASA FIRMS wildfire values found.")

    latest = max(observed, key=lambda item: str(item["timestamp"]))
    return {
        "valid": True,
        "status": "parsed",
        "data_access_pending": False,
        "record_count": len(records),
        "latest_timestamp": latest["timestamp"],
        "latest_value": latest["value"],
        "output_path": str(path),
        "notes": "NASA FIRMS records parsed from real source data.",
    }


def run_connector(source: str | Path | None = None, output: str | Path = DEFAULT_OUTPUT) -> dict[str, object]:
    try:
        records = load_records(source)
        if not records:
            raise DataAccessPending("No parseable NASA FIRMS records found.")
        output_path = write_output(records, output)
        return validate_output(output_path)
    except DataAccessPending:
        output_path = write_output([], output)
        return validate_output(output_path, data_access_pending=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run NASA FIRMS Wildfire PCS connector v1.0.")
    parser.add_argument("--source", help="Official local NASA FIRMS CSV source.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="PCS connector JSON output path.")
    args = parser.parse_args()

    result = run_connector(args.source, args.output)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
