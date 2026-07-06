"""Validate PCS connector JSON output files.

The validator reports connector readiness before PCS Engine use. It does not
repair records, fabricate values, or compute PCS state.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
INPUT_DIR = ROOT / "PCS_ENGINE" / "input"
REPORT_PATH = INPUT_DIR / "connector_validation_report.json"

EXPECTED_FILES = [
    "nasa_gistemp_pcs.json",
    "noaa_mauna_loa_co2_pcs.json",
    "sea_level_pcs.json",
    "ndvi_pcs.json",
]

REQUIRED_FIELDS = [
    "id",
    "provider",
    "dataset",
    "variable",
    "timestamp",
    "unit",
    "value",
    "quality",
    "confidence",
    "source_url",
    "version",
]

NULL_ALLOWED_QUALITY_TERMS = {
    "missing",
    "unavailable",
    "pending",
    "data_access_pending",
    "manual_pending",
    "disabled",
}


def quality_allows_null(quality: Any) -> bool:
    text = str(quality).strip().lower().replace(" ", "_")
    return any(term in text for term in NULL_ALLOWED_QUALITY_TERMS)


def latest_timestamp(records: list[dict[str, Any]]) -> str | None:
    observed = [record for record in records if record.get("timestamp") and record.get("value") is not None]
    if not observed:
        return None
    return str(max(observed, key=lambda record: str(record["timestamp"]))["timestamp"])


def validate_records(file_name: str, records: Any) -> dict[str, Any]:
    report = {
        "file": file_name,
        "status": "valid",
        "missing_fields": [],
        "warnings": [],
        "latest_timestamp": None,
        "notes": "",
    }

    if not isinstance(records, list):
        report["status"] = "invalid"
        report["notes"] = "Connector output must be a JSON array."
        return report

    if not records:
        report["status"] = "pending"
        report["warnings"].append("No records present; data access may be pending.")
        report["notes"] = "Empty connector output is allowed only as an explicit pending state."
        return report

    missing_fields: set[str] = set()
    warnings: list[str] = []
    invalid = False

    for index, record in enumerate(records):
        if not isinstance(record, dict):
            invalid = True
            warnings.append(f"Record {index} is not an object.")
            continue

        for field in REQUIRED_FIELDS:
            if field not in record:
                missing_fields.add(field)
                invalid = True

        if not record.get("timestamp"):
            invalid = True
            warnings.append(f"Record {index} has no timestamp.")
        if not record.get("provider"):
            invalid = True
            warnings.append(f"Record {index} has no provider.")
        if not record.get("dataset"):
            invalid = True
            warnings.append(f"Record {index} has no dataset.")
        if not record.get("variable"):
            invalid = True
            warnings.append(f"Record {index} has no variable.")

        if record.get("value") is None and not quality_allows_null(record.get("quality")):
            invalid = True
            warnings.append(f"Record {index} has null value without missing or unavailable quality.")

    report["missing_fields"] = sorted(missing_fields)
    report["warnings"] = warnings
    report["latest_timestamp"] = latest_timestamp(records)

    if invalid:
        report["status"] = "invalid"
        report["notes"] = "Validation failed; no silent repair was performed."
    else:
        report["notes"] = "Connector output passed validation."

    return report


def validate_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "file": path.name,
            "status": "missing",
            "missing_fields": [],
            "warnings": ["Expected connector output file is missing."],
            "latest_timestamp": None,
            "notes": "Missing file is reported as missing, not failed.",
        }

    try:
        records = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return {
            "file": path.name,
            "status": "invalid",
            "missing_fields": [],
            "warnings": [f"JSON parse error: {exc}"],
            "latest_timestamp": None,
            "notes": "File could not be parsed as JSON.",
        }

    return validate_records(path.name, records)


def run_validation(input_dir: Path = INPUT_DIR, report_path: Path = REPORT_PATH) -> list[dict[str, Any]]:
    input_dir.mkdir(parents=True, exist_ok=True)
    reports = [validate_file(input_dir / file_name) for file_name in EXPECTED_FILES]
    report_path.write_text(json.dumps(reports, indent=2) + "\n", encoding="utf-8")
    return reports


def main() -> None:
    reports = run_validation()
    print(json.dumps(reports, indent=2))


if __name__ == "__main__":
    main()
