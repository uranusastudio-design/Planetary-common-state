"""Global Mean Sea Level connector v0.1 for PCS.

This connector reads real global mean sea-level data when an official source is
available locally or through a public endpoint. If the NASA PO.DAAC endpoint
requires Earthdata authentication, the connector records pending access without
fabricating sea-level values.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import date, timedelta
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


NOAA_GMSL_PAGE = "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/LSA_SLR_timeseries_global.php"
NOAA_GMSL_URL = "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr/slr_sla_gbl_keep_ref_90.csv"
PROVIDER = "NOAA Laboratory for Satellite Altimetry"
DATASET = "Global mean sea level anomaly, annual signals retained"
VARIABLE = "Global Mean Sea Level Anomaly"
UNIT = "millimeters relative to 1990 reference"
VERSION = "Sea Level connector v1.0"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "PCS_ENGINE" / "input" / "sea_level_pcs.json"
MISSING_MARKERS = {"", "***", "****", "*****", "-999", "-999.0", "-999.00", "NaN", "nan", "NA", "N/A"}


class ConnectorError(RuntimeError):
    """Raised when the connector cannot process source data."""


class DataAccessPending(RuntimeError):
    """Raised when the source is real but not accessible in this environment."""


def read_source(source: str | Path | None = None) -> tuple[str, str]:
    """Read sea-level data from a local source or NOAA LSA public endpoint."""

    if source is not None:
        path = Path(source)
        return path.read_text(encoding="utf-8", errors="replace"), str(path)

    try:
        with urlopen(NOAA_GMSL_URL, timeout=60) as response:
            text = response.read().decode("utf-8", errors="replace")
    except (OSError, URLError) as exc:
        raise DataAccessPending(f"Unable to load NOAA GMSL source: {exc}") from exc

    return text, NOAA_GMSL_URL


def decimal_year_to_date(raw: str) -> str:
    decimal_year = float(raw)
    year = int(decimal_year)
    start = date(year, 1, 1)
    next_start = date(year + 1, 1, 1)
    offset = round((decimal_year - year) * (next_start - start).days)
    return (start + timedelta(days=offset)).isoformat()


def normalize_header(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", header.lower()).strip("_")


def parse_number(raw_value: str) -> float | None:
    value = raw_value.strip()
    if value in MISSING_MARKERS:
        return None
    return round(float(value), 4)


def make_record(
    timestamp: str,
    value: float | None,
    uncertainty: float | None,
    source_url: str,
    unit: str = UNIT,
    provider: str = PROVIDER,
    dataset: str = DATASET,
) -> dict[str, object]:
    quality = "missing" if value is None else "observed"
    safe_timestamp = re.sub(r"[^0-9A-Za-z_.-]+", "_", timestamp)
    return {
        "id": f"sea_level_{safe_timestamp}",
        "provider": provider,
        "dataset": dataset,
        "variable": VARIABLE,
        "timestamp": timestamp,
        "unit": unit,
        "value": value,
        "uncertainty": uncertainty,
        "quality": quality,
        "confidence": "official source record when source data are available",
        "source_url": source_url,
        "license": "No-cost scientific use with required NOAA LSA acknowledgment",
        "version": VERSION,
        "notes": (
            "Satellite-altimetry record. Required acknowledgment: Altimetry data "
            "are provided by the NOAA Laboratory for Satellite Altimetry."
        ),
    }


def parse_delimited_text(text: str, source_url: str) -> list[dict[str, object]]:
    """Parse common CSV or whitespace sea-level formats without assuming a provider-specific schema."""

    lines = [line.strip() for line in text.splitlines() if line.strip() and not line.lstrip().startswith("#")]
    if not lines:
        return []

    if any("," in line for line in lines[:5]):
        records = parse_csv_lines(lines, source_url)
    else:
        records = parse_whitespace_lines(lines, source_url)

    return sorted(records, key=lambda item: str(item["timestamp"]))


def parse_csv_lines(lines: list[str], source_url: str) -> list[dict[str, object]]:
    reader = csv.DictReader(lines)
    if not reader.fieldnames:
        return []

    field_map = {field.lower().strip(): field for field in reader.fieldnames}
    time_field = next((field_map[key] for key in field_map if key in {"timestamp", "time", "date", "year", "decimal_year"}), None)
    value_field = next(
        (
            field_map[key]
            for key in field_map
            if key in {"sea_level", "sealevel", "gmsl", "value", "height", "msl", "sea_level_mm"}
        ),
        None,
    )
    uncertainty_field = next((field_map[key] for key in field_map if key in {"uncertainty", "unc", "sigma", "error"}), None)

    mission_fields = [
        field for field in reader.fieldnames
        if normalize_header(field) in {"topex_poseidon", "jason_1", "jason_2", "jason_3", "sentinel_6mf"}
    ]

    if time_field is None or (value_field is None and not mission_fields):
        return []

    records: list[dict[str, object]] = []
    for row in reader:
        timestamp = str(row.get(time_field, "")).strip()
        if not timestamp:
            continue
        if value_field:
            value = parse_number(str(row.get(value_field, "")))
        else:
            source_values = [parse_number(str(row.get(field, ""))) for field in mission_fields]
            value = next((item for item in source_values if item is not None), None)
        uncertainty = parse_number(str(row.get(uncertainty_field, ""))) if uncertainty_field else None
        if normalize_header(time_field) in {"year", "decimal_year"} and "." in timestamp:
            timestamp = decimal_year_to_date(timestamp)
        records.append(make_record(timestamp, value, uncertainty, source_url))
    return records


def parse_whitespace_lines(lines: list[str], source_url: str) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for line in lines:
        parts = line.split()
        if len(parts) < 2:
            continue
        if not re.match(r"^\d{4}(\.\d+)?(-\d{2}(-\d{2})?)?$", parts[0]):
            continue
        try:
            value = parse_number(parts[1])
            uncertainty = parse_number(parts[2]) if len(parts) >= 3 else None
        except ValueError:
            continue
        records.append(make_record(parts[0], value, uncertainty, source_url))
    return records


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
            "data_access_pending": True if data_access_pending else "no_records",
            "record_count": 0,
            "latest_timestamp": None,
            "latest_value": None,
            "missing_count": 0,
            "source_provenance_recorded": True,
            "output_path": str(path),
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
        if not record.get("source_url"):
            raise ConnectorError("Validation failed: source provenance is missing.")

    observed_records = [record for record in records if record.get("value") is not None]
    if not observed_records:
        raise ConnectorError("Validation failed: no observed sea-level value found.")

    latest_record = max(observed_records, key=lambda item: str(item["timestamp"]))
    return {
        "valid": True,
        "status": "parsed",
        "data_access_pending": False,
        "record_count": len(records),
        "latest_timestamp": str(latest_record["timestamp"]),
        "latest_value": latest_record["value"],
        "missing_count": sum(1 for record in records if record.get("value") is None),
        "source_provenance_recorded": all(bool(record.get("source_url")) for record in records),
        "output_path": str(path),
    }


def run_connector(source: str | Path | None = None, output: str | Path = DEFAULT_OUTPUT) -> dict[str, object]:
    try:
        text, source_url = read_source(source)
        records = parse_delimited_text(text, source_url)
        if not records:
            raise DataAccessPending("No parseable sea-level records found in source.")
        output_path = write_output(records, output)
        return validate_output(output_path)
    except DataAccessPending:
        output_path = write_output([], output)
        return validate_output(output_path, data_access_pending=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Global Mean Sea Level PCS connector v0.1.")
    parser.add_argument("--source", help="Optional local official sea-level source file.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="PCS connector JSON output path.")
    args = parser.parse_args()

    result = run_connector(args.source, args.output)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
