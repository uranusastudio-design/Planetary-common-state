"""Aggregate PCS connector availability into latest_state.json.

This script summarizes connector output status for the Observatory. It does not
compute scientific PCS values, estimate missing observations, call APIs, or
modify connector outputs.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ENGINE_ROOT = Path(__file__).resolve().parents[1]
INPUT_DIR = ENGINE_ROOT / "input"
OUTPUT_DIR = ENGINE_ROOT / "output"
LOG_DIR = ENGINE_ROOT / "logs"
LATEST_STATE_PATH = OUTPUT_DIR / "latest_state.json"
AGGREGATION_LOG_PATH = LOG_DIR / "aggregation_log.json"

DOMAINS = [
    "Atmosphere",
    "Ocean",
    "Cryosphere",
    "Biosphere",
    "Hydrology",
    "Geosphere",
    "Human System",
    "Energy",
    "Food System",
    "Infrastructure",
    "Space Environment",
    "Planetary Common State",
]

EXPECTED_CONNECTORS = [
    {
        "name": "NASA GISTEMP",
        "domain": "Atmosphere",
        "file": "nasa_gistemp_pcs.json",
        "notes": "Global temperature connector output.",
    },
    {
        "name": "NOAA Mauna Loa CO2",
        "domain": "Atmosphere",
        "file": "noaa_mauna_loa_co2_pcs.json",
        "notes": "Atmospheric CO2 connector output.",
    },
    {
        "name": "NSIDC Sea Ice",
        "domain": "Cryosphere",
        "file": "nsidc_sea_ice_pcs.json",
        "notes": "Sea ice connector output.",
    },
    {
        "name": "NASA GPM IMERG",
        "domain": "Hydrology",
        "file": "nasa_gpm_imerg_pcs.json",
        "notes": "Precipitation connector output.",
    },
    {
        "name": "NASA FIRMS Wildfire",
        "domain": "Biosphere",
        "file": "nasa_firms_wildfire_pcs.json",
        "notes": "Wildfire and active fire connector output.",
    },
    {
        "name": "Argo Ocean",
        "domain": "Ocean",
        "file": "argo_ocean_pcs.json",
        "notes": "Ocean profile connector output.",
    },
    {
        "name": "Global Mean Sea Level",
        "domain": "Ocean",
        "file": "sea_level_pcs.json",
        "notes": "Sea level connector output.",
    },
    {
        "name": "NDVI",
        "domain": "Biosphere",
        "file": "ndvi_pcs.json",
        "notes": "Vegetation index connector output.",
    },
    {
        "name": "ERA5",
        "domain": "Atmosphere",
        "file": "era5_pcs.json",
        "notes": "Planned atmospheric reanalysis connector output.",
    },
    {
        "name": "GRACE Terrestrial Water Storage",
        "domain": "Hydrology",
        "file": "grace_water_storage_pcs.json",
        "notes": "Planned terrestrial water storage connector output.",
    },
]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_existing_state() -> dict[str, Any]:
    if not LATEST_STATE_PATH.exists():
        return {}
    payload = load_json(LATEST_STATE_PATH)
    return payload if isinstance(payload, dict) else {}


def record_count(payload: Any) -> int:
    if isinstance(payload, list):
        return len(payload)
    if isinstance(payload, dict):
        records = payload.get("records")
        if isinstance(records, list):
            return len(records)
        return 1 if payload else 0
    return 0


def latest_timestamp(payload: Any) -> str | None:
    records: list[Any]
    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, dict) and isinstance(payload.get("records"), list):
        records = payload["records"]
    else:
        records = [payload] if isinstance(payload, dict) else []

    timestamps = [
        str(record.get("timestamp"))
        for record in records
        if isinstance(record, dict) and record.get("timestamp") not in (None, "")
    ]
    return max(timestamps) if timestamps else None


def summarize_connector(connector: dict[str, str]) -> tuple[dict[str, Any], str | None]:
    path = INPUT_DIR / connector["file"]
    if not path.exists():
        return (
            {
                "name": connector["name"],
                "domain": connector["domain"],
                "status": "Planned",
                "file": connector["file"],
                "records": 0,
                "latest_timestamp": None,
                "quality": "missing_file",
                "notes": "Expected connector output file is not present.",
            },
            f"Missing expected connector output: {connector['file']}",
        )

    try:
        payload = load_json(path)
    except json.JSONDecodeError as exc:
        return (
            {
                "name": connector["name"],
                "domain": connector["domain"],
                "status": "Waiting",
                "file": connector["file"],
                "records": 0,
                "latest_timestamp": None,
                "quality": "invalid_json",
                "notes": f"Connector output could not be parsed: {exc}",
            },
            f"Invalid JSON in connector output: {connector['file']}",
        )

    count = record_count(payload)
    if count > 0:
        return (
            {
                "name": connector["name"],
                "domain": connector["domain"],
                "status": "Connected",
                "file": connector["file"],
                "records": count,
                "latest_timestamp": latest_timestamp(payload),
                "quality": "non_empty_connector_output",
                "notes": connector["notes"],
            },
            None,
        )

    return (
        {
            "name": connector["name"],
            "domain": connector["domain"],
            "status": "Waiting",
            "file": connector["file"],
            "records": 0,
            "latest_timestamp": None,
            "quality": "empty_connector_output",
            "notes": "Connector output exists but contains no records. Data remain waiting.",
        },
        None,
    )


def build_domain_status(connector_health: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    domain_status: dict[str, dict[str, Any]] = {}
    for domain in DOMAINS:
        connected = [
            item["name"]
            for item in connector_health
            if item["domain"] == domain and item["status"] == "Connected"
        ]
        waiting = [
            item["name"]
            for item in connector_health
            if item["domain"] == domain and item["status"] == "Waiting"
        ]
        planned = [
            item["name"]
            for item in connector_health
            if item["domain"] == domain and item["status"] == "Planned"
        ]

        if connected:
            status = "Connected"
            notes = "At least one connector output contains non-empty records."
        elif waiting:
            status = "Waiting"
            notes = "Connector output exists but data are empty or pending."
        elif planned:
            status = "Planned"
            notes = "Connector output has not been created yet."
        else:
            status = "Planned"
            notes = "No connector assigned in this aggregation version."

        domain_status[domain] = {
            "status": status,
            "connected_sources": connected,
            "waiting_sources": waiting,
            "notes": notes,
        }

    return domain_status


def aggregate() -> dict[str, Any]:
    now = utc_now()
    existing = load_existing_state()
    connector_health: list[dict[str, Any]] = []
    warnings: list[str] = []

    for connector in EXPECTED_CONNECTORS:
        health, warning = summarize_connector(connector)
        connector_health.append(health)
        if warning:
            warnings.append(warning)

    confirmed_sources = [
        item["name"] for item in connector_health if item["status"] == "Connected"
    ]
    waiting_sources = [
        item["name"] for item in connector_health if item["status"] == "Waiting"
    ]
    planned_sources = [
        item["name"] for item in connector_health if item["status"] == "Planned"
    ]

    output = dict(existing)
    metadata = dict(output.get("metadata", {}))
    metadata.update(
        {
            "generated_at_utc": now.isoformat(),
            "aggregation_engine": "PCS Aggregation Engine v0.1",
            "no_prediction": True,
            "no_interpolation": True,
            "no_fabricated_data": True,
        }
    )
    output["metadata"] = metadata
    output["timestamp"] = now.isoformat()
    output["local_generated_time"] = datetime.now().astimezone().isoformat()
    output["confirmed_sources"] = confirmed_sources
    output["waiting_sources"] = waiting_sources
    output["planned_sources"] = planned_sources
    output["connector_health"] = connector_health
    output["domain_status"] = build_domain_status(connector_health)
    output["pcs_state"] = {
        "status": "prototype",
        "value": output.get("S_demo") if "S_demo" in output else None,
        "source": "Preserved existing prototype state; aggregation engine does not compute PCS state.",
    }
    output["prototype_notice"] = (
        "PCS state remains prototype. Aggregation summarizes connector availability and does not compute a new scientific PCS value."
        if "S_demo" in output
        else "PCS state not computed by aggregation engine."
    )
    output["notes"] = [
        "Aggregation reads connector output availability only.",
        "Empty connector outputs are Waiting, not Connected.",
        "No missing values are estimated or fabricated.",
    ]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    LATEST_STATE_PATH.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    log = {
        "timestamp": now.isoformat(),
        "files_checked": [connector["file"] for connector in EXPECTED_CONNECTORS],
        "connected_count": len(confirmed_sources),
        "waiting_count": len(waiting_sources),
        "planned_count": len(planned_sources),
        "warnings": warnings,
    }
    AGGREGATION_LOG_PATH.write_text(json.dumps(log, indent=2) + "\n", encoding="utf-8")

    return output


def main() -> None:
    output = aggregate()
    summary = {
        "latest_state": str(LATEST_STATE_PATH),
        "aggregation_log": str(AGGREGATION_LOG_PATH),
        "connected_count": len(output["confirmed_sources"]),
        "waiting_count": len(output["waiting_sources"]),
        "planned_count": len(output["planned_sources"]),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
