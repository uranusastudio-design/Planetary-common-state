"""Argo Ocean connector v1.0 for PCS.

This connector reads official local Argo CSV or JSON profile summaries when
they are provided. No live GDAC download is implemented in this milestone.
Native NetCDF profile parsing is reserved for a future connector revision. If
no source file is provided, the connector writes a pending output without
fabricating ocean profile values.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


PROVIDER = "International Argo Programme"
DATASET = "Global Argo Float Observations"
VERSION = "Argo Ocean connector v1.0"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "PCS_ENGINE" / "input" / "argo_ocean_pcs.json"
ARGO_GDAC_FRANCE = "https://data-argo.ifremer.fr/"
ARGO_GDAC_US = "https://usgodae.org/pub/outgoing/argo/"
MISSING_MARKERS = {"", "-999", "-999.0", "-9999", "-9999.0", "NaN", "nan", "NA", "N/A", "null", "None"}
VARIABLE_UNITS = {
    "Ocean Temperature Profile": "degrees Celsius (deg C)",
    "Ocean Salinity Profile": "PSU",
    "Pressure": "dbar",
    "Depth": "meters",
}


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


def build_timestamp(row: dict[str, str], field_map: dict[str, str]) -> str | None:
    timestamp_field = detect_field(field_map, {"timestamp", "time", "date", "profile_time", "juld", "valid_time"})
    if timestamp_field:
        timestamp = str(row.get(timestamp_field, "")).strip()
        return timestamp or None
    return None


def make_record(
    variable: str,
    timestamp: str,
    value: float | None,
    source_url: str,
    quality: str,
    confidence: str,
    notes: str,
) -> dict[str, object]:
    safe_variable = re.sub(r"[^0-9A-Za-z_.-]+", "_", variable.lower()).strip("_")
    safe_timestamp = re.sub(r"[^0-9A-Za-z_.-]+", "_", timestamp)
    return {
        "id": f"argo_ocean_{safe_variable}_{safe_timestamp}",
        "provider": PROVIDER,
        "dataset": DATASET,
        "variable": variable,
        "timestamp": timestamp,
        "unit": VARIABLE_UNITS[variable],
        "value": value,
        "uncertainty": None,
        "quality": quality,
        "confidence": confidence,
        "source_url": source_url,
        "license": "Source-specific terms; see Argo data policy and GDAC documentation",
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
    depth_field = detect_field(field_map, {"depth", "depth_m", "depth_meter", "depth_meters"})
    pressure_field = detect_field(field_map, {"pressure", "pres", "pressure_dbar", "pres_dbar"})
    temperature_field = detect_field(field_map, {"temperature", "temp", "theta", "ocean_temperature"})
    salinity_field = detect_field(field_map, {"salinity", "psal", "practical_salinity"})
    quality_field = detect_field(field_map, {"quality", "qc", "quality_flag", "profile_qc"})
    float_field = detect_field(field_map, {"float_id", "platform_number", "platform", "wmo"})
    profile_field = detect_field(field_map, {"profile_id", "cycle_number", "cycle"})
    source_field = detect_field(field_map, {"source_url", "source", "url"})

    if latitude_field is None or longitude_field is None:
        return []

    records: list[dict[str, object]] = []
    seen: set[tuple[str, str, str, str, str, str]] = set()
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

        float_id = str(row.get(float_field, "")).strip() if float_field else "unknown_float"
        profile_id = str(row.get(profile_field, "")).strip() if profile_field else "unknown_profile"
        source_url = str(row.get(source_field, "")).strip() if source_field else str(path)
        source_url = source_url or str(path)
        source_quality = str(row.get(quality_field, "")).strip() if quality_field else ""
        confidence = source_quality or "source quality flag unavailable"
        base_notes = f"Argo profile record; latitude={latitude}; longitude={longitude}; float={float_id}; profile={profile_id}."

        variable_fields = {
            "Ocean Temperature Profile": temperature_field,
            "Ocean Salinity Profile": salinity_field,
            "Pressure": pressure_field,
            "Depth": depth_field,
        }
        for variable, value_field in variable_fields.items():
            if value_field is None:
                continue
            level_value = row.get(depth_field or pressure_field, "") if (depth_field or pressure_field) else ""
            duplicate_key = (timestamp, str(latitude), str(longitude), float_id, profile_id, f"{variable}:{level_value}")
            if duplicate_key in seen:
                continue
            seen.add(duplicate_key)

            value = parse_number(row.get(value_field, ""))
            records.append(
                make_record(
                    variable,
                    timestamp,
                    value,
                    source_url,
                    "missing" if value is None else "observed",
                    confidence,
                    base_notes,
                )
            )

    return sorted(records, key=lambda item: (str(item["variable"]), str(item["timestamp"])))


def parse_json_source(path: Path) -> list[dict[str, object]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload if isinstance(payload, list) else payload.get("records", [])
    if not isinstance(rows, list):
        return []

    records: list[dict[str, object]] = []
    seen: set[tuple[str, str, str, str, str, str]] = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        timestamp = str(row.get("timestamp") or row.get("time") or row.get("date") or "").strip()
        latitude = parse_number(row.get("latitude", ""))
        longitude = parse_number(row.get("longitude", ""))
        if not timestamp or latitude is None or longitude is None:
            continue
        if latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180:
            continue

        float_id = str(row.get("float_id") or row.get("platform_number") or "unknown_float")
        profile_id = str(row.get("profile_id") or row.get("cycle_number") or "unknown_profile")
        confidence = str(row.get("quality") or row.get("quality_flag") or "source quality flag unavailable")
        source_url = str(row.get("source_url") or row.get("source") or path)
        base_notes = f"Argo profile record; latitude={latitude}; longitude={longitude}; float={float_id}; profile={profile_id}."

        value_map = {
            "Ocean Temperature Profile": row.get("temperature"),
            "Ocean Salinity Profile": row.get("salinity"),
            "Pressure": row.get("pressure"),
            "Depth": row.get("depth"),
        }
        level_value = row.get("depth") or row.get("pressure") or ""
        for variable, raw_value in value_map.items():
            if raw_value is None:
                continue
            duplicate_key = (timestamp, str(latitude), str(longitude), float_id, profile_id, f"{variable}:{level_value}")
            if duplicate_key in seen:
                continue
            seen.add(duplicate_key)
            value = parse_number(raw_value)
            records.append(
                make_record(
                    variable,
                    timestamp,
                    value,
                    source_url,
                    "missing" if value is None else "observed",
                    confidence,
                    base_notes,
                )
            )

    return sorted(records, key=lambda item: (str(item["variable"]), str(item["timestamp"])))


def load_records(source: str | Path | None = None) -> list[dict[str, object]]:
    if source is None:
        raise DataAccessPending("No local official Argo source file provided.")

    path = Path(source)
    if not path.exists():
        raise DataAccessPending(f"Argo source file not found: {path}")

    suffix = path.suffix.lower()
    if suffix == ".csv":
        return parse_csv_source(path)
    if suffix == ".json":
        return parse_json_source(path)

    raise DataAccessPending(
        "Argo connector v1.0 expects an official local CSV or JSON profile summary. "
        "Native NetCDF parsing is reserved for a future connector revision."
    )


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
            "notes": "No Argo records parsed. Data access remains pending.",
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
        if record.get("variable") not in VARIABLE_UNITS:
            raise ConnectorError("Validation failed: unexpected Argo variable.")
        if record.get("unit") != VARIABLE_UNITS[str(record.get("variable"))]:
            raise ConnectorError("Validation failed: unexpected Argo unit.")
        if record.get("quality") == "missing" and record.get("value") is not None:
            raise ConnectorError("Validation failed: missing values must be preserved as null.")
        if not record.get("timestamp") or not record.get("provider") or not record.get("dataset"):
            raise ConnectorError("Validation failed: timestamp or provenance is incomplete.")
        if not record.get("source_url"):
            raise ConnectorError("Validation failed: source provenance is missing.")

    observed = [record for record in records if record.get("value") is not None]
    if not observed:
        raise ConnectorError("Validation failed: no observed Argo ocean profile values found.")

    latest = max(observed, key=lambda item: str(item["timestamp"]))
    return {
        "valid": True,
        "status": "parsed",
        "data_access_pending": False,
        "record_count": len(records),
        "latest_timestamp": latest["timestamp"],
        "latest_value": latest["value"],
        "output_path": str(path),
        "notes": "Argo ocean profile records parsed from real source data.",
    }


def run_connector(source: str | Path | None = None, output: str | Path = DEFAULT_OUTPUT) -> dict[str, object]:
    try:
        records = load_records(source)
        if not records:
            raise DataAccessPending("No parseable Argo records found.")
        output_path = write_output(records, output)
        return validate_output(output_path)
    except DataAccessPending:
        output_path = write_output([], output)
        return validate_output(output_path, data_access_pending=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Argo Ocean PCS connector v1.0.")
    parser.add_argument("--source", help="Official local Argo CSV or JSON profile summary.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="PCS connector JSON output path.")
    args = parser.parse_args()

    result = run_connector(args.source, args.output)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
