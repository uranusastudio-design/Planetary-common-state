"""PCS EARTH observation validation, regional filtering, and evidence views."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable


RESIDUAL_KEYS = ("L_T", "L_F", "L_C", "L_I", "L_S")
ALLOWED_STATUSES = {"observation_only", "candidate"}
REGION_BOUNDS = {
    "Global": None,
    "Taiwan": (20.0, 27.0, 118.0, 123.5),
    "Japan": (24.0, 46.5, 122.0, 146.5),
    "Korea": (33.0, 43.5, 124.0, 132.0),
}


class ObservationValidationError(ValueError):
    pass


def _iso_datetime(value: Any, field: str, nullable: bool = False) -> None:
    if value is None and nullable:
        return
    if not isinstance(value, str):
        raise ObservationValidationError(f"{field} must be an ISO datetime string")
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ObservationValidationError(f"{field} is not an ISO datetime") from exc


def validate_observation(record: dict[str, Any]) -> dict[str, Any]:
    required = {
        "id", "domain", "provider", "original_source", "event_type",
        "timestamp", "retrieved_at", "latitude", "longitude", "country",
        "region", "value", "unit", "severity_source", "confidence_source",
        "source_url", "license", "attribution", "pcs_mapping", "status",
    }
    missing = sorted(required - record.keys())
    if missing:
        raise ObservationValidationError(f"missing fields: {missing}")
    _iso_datetime(record["timestamp"], "timestamp", nullable=True)
    _iso_datetime(record["retrieved_at"], "retrieved_at")
    lat, lon = record["latitude"], record["longitude"]
    if lat is not None and (not isinstance(lat, (int, float)) or not -90 <= lat <= 90):
        raise ObservationValidationError("latitude outside [-90, 90]")
    if lon is not None and (not isinstance(lon, (int, float)) or not -180 <= lon <= 180):
        raise ObservationValidationError("longitude outside [-180, 180]")
    if record["status"] not in ALLOWED_STATUSES:
        raise ObservationValidationError("status must be observation_only or candidate")
    mapping = record["pcs_mapping"]
    if not isinstance(mapping, dict) or set(mapping) != set(RESIDUAL_KEYS):
        raise ObservationValidationError("pcs_mapping must contain exactly L_T/L_F/L_C/L_I/L_S")
    return record


def regional_observations(records: Iterable[dict[str, Any]], region: str) -> list[dict[str, Any]]:
    if region not in REGION_BOUNDS:
        raise ObservationValidationError(f"unsupported region: {region}")
    bounds = REGION_BOUNDS[region]
    validated = [validate_observation(record) for record in records]
    if bounds is None:
        return validated
    south, north, west, east = bounds
    return [
        record for record in validated
        if record["latitude"] is not None and record["longitude"] is not None
        and south <= record["latitude"] <= north
        and west <= record["longitude"] <= east
    ]


def regional_state(records: Iterable[dict[str, Any]], region: str) -> dict[str, Any]:
    filtered = regional_observations(records, region)
    return {
        "region": region,
        "status": "available" if filtered else "Regional data unavailable",
        "records": filtered,
    }


def evidence_record(record: dict[str, Any]) -> dict[str, Any]:
    item = validate_observation(record)
    return {
        "observed_variable": item["event_type"],
        "original_source": item["original_source"],
        "provider": item["provider"],
        "timestamp": item["timestamp"],
        "location": {"latitude": item["latitude"], "longitude": item["longitude"], "country": item["country"], "region": item["region"]},
        "raw_value": item["value"],
        "normalized_value": None,
        "residual_candidate": item["pcs_mapping"],
        "confidence": item["confidence_source"],
        "method": None,
    }
