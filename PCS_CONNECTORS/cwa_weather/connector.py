"""CWA Weather connector v0.1 for PCS live pipeline validation.

This connector uses the official Taiwan Central Weather Administration Open
Data API when an authorization token is available. If no token is available, it
writes an empty pending output without fabricating weather observations.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen


PROVIDER = "Taiwan Central Weather Administration"
DATASET = "CWA Open Data Surface Weather Observations"
VERSION = "CWA Weather connector v0.1"
ENDPOINT = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0003-001"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "PCS_ENGINE" / "input" / "cwa_weather_pcs.json"
MISSING_MARKERS = {"", "-99", "-99.0", "-999", "-999.0", "-9999", "-9999.0", "NaN", "nan", "NA", "N/A", "null", "None"}
VARIABLES = {
    "Air Temperature": {"unit": "degrees Celsius", "keys": ["AirTemperature", "TEMP", "Temperature"]},
    "Relative Humidity": {"unit": "percent", "keys": ["RelativeHumidity", "HUMD", "Humidity"]},
    "Wind Speed": {"unit": "m/s", "keys": ["WindSpeed", "WDSD"]},
    "Pressure": {"unit": "hPa", "keys": ["AirPressure", "PRES", "Pressure"]},
    "Rainfall": {"unit": "mm", "keys": ["Precipitation", "RAIN", "Rainfall", "Now"]},
}


class ConnectorError(RuntimeError):
    """Raised when the connector cannot process source data."""


class DataAccessPending(RuntimeError):
    """Raised when CWA data cannot be accessed in this environment."""


def parse_number(raw_value: object) -> float | None:
    if raw_value is None:
        return None
    if isinstance(raw_value, dict):
        raw_value = raw_value.get("Precipitation") or raw_value.get("Value")
    value = str(raw_value).strip()
    if value in MISSING_MARKERS:
        return None
    return round(float(value), 6)


def safe_id(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z_.-]+", "_", value).strip("_")


def get_nested(mapping: dict, path: list[str]) -> object | None:
    current: object = mapping
    for key in path:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def find_first(mapping: dict, keys: list[str]) -> object | None:
    for key in keys:
        if key in mapping:
            return mapping[key]
    for value in mapping.values():
        if isinstance(value, dict):
            found = find_first(value, keys)
            if found is not None:
                return found
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    found = find_first(item, keys)
                    if found is not None:
                        return found
    return None


def station_list(payload: dict) -> list[dict]:
    records = payload.get("records", {})
    if isinstance(records, dict):
        if isinstance(records.get("Station"), list):
            return records["Station"]
        if isinstance(records.get("location"), list):
            return records["location"]
    return []


def coordinates(station: dict) -> tuple[float | None, float | None]:
    latitude = (
        get_nested(station, ["GeoInfo", "Coordinates", 0, "StationLatitude"])
        if False
        else None
    )
    longitude = None

    geo = station.get("GeoInfo")
    if isinstance(geo, dict):
        coords = geo.get("Coordinates")
        if isinstance(coords, list) and coords:
            first = coords[0]
            if isinstance(first, dict):
                latitude = first.get("StationLatitude") or first.get("Latitude")
                longitude = first.get("StationLongitude") or first.get("Longitude")

    latitude = latitude or find_first(station, ["lat", "Lat", "Latitude", "StationLatitude"])
    longitude = longitude or find_first(station, ["lon", "Lon", "Longitude", "StationLongitude"])

    try:
        lat = parse_number(latitude)
        lon = parse_number(longitude)
    except ValueError:
        return None, None
    return lat, lon


def observation_time(station: dict) -> str | None:
    value = (
        get_nested(station, ["ObsTime", "DateTime"])
        or get_nested(station, ["time", "obsTime"])
        or find_first(station, ["DateTime", "obsTime", "time", "DataTime"])
    )
    return str(value).strip() if value else None


def station_name(station: dict) -> str | None:
    value = station.get("StationName") or station.get("locationName") or find_first(station, ["StationName", "locationName"])
    return str(value).strip() if value else None


def weather_elements(station: dict) -> dict:
    element = station.get("WeatherElement")
    if isinstance(element, dict):
        return element
    if isinstance(element, list):
        result = {}
        for item in element:
            if not isinstance(item, dict):
                continue
            name = item.get("elementName") or item.get("ElementName")
            value = item.get("elementValue") or item.get("ElementValue")
            if isinstance(value, list) and value:
                value = value[0].get("value") if isinstance(value[0], dict) else value[0]
            if name:
                result[str(name)] = value
        return result
    return station


def variable_value(station: dict, variable: str) -> float | None:
    elements = weather_elements(station)
    keys = VARIABLES[variable]["keys"]
    raw_value = find_first(elements, keys)
    return parse_number(raw_value)


def make_record(
    station: str,
    latitude: float,
    longitude: float,
    timestamp: str,
    variable: str,
    value: float | None,
    source_url: str,
) -> dict[str, object]:
    quality = "missing" if value is None else "observed"
    return {
        "id": f"cwa_weather_{safe_id(station)}_{safe_id(variable.lower())}_{safe_id(timestamp)}",
        "provider": PROVIDER,
        "dataset": DATASET,
        "variable": variable,
        "timestamp": timestamp,
        "unit": VARIABLES[variable]["unit"],
        "value": value,
        "uncertainty": None,
        "quality": quality,
        "confidence": "official CWA Open Data record when source data are available",
        "source_url": source_url,
        "license": "Source-specific terms; see CWA Open Data documentation",
        "version": VERSION,
        "notes": f"CWA station observation; station={station}; latitude={latitude}; longitude={longitude}.",
    }


def download_payload(authorization: str | None) -> tuple[dict, str]:
    if not authorization:
        raise DataAccessPending("CWA authorization token is required for live Open Data access.")

    query = urlencode({"Authorization": authorization, "format": "JSON"})
    source_url = f"{ENDPOINT}?{query}"
    try:
        with urlopen(source_url, timeout=30) as response:
            text = response.read().decode("utf-8", errors="replace")
    except (OSError, URLError) as exc:
        raise DataAccessPending(f"Unable to load CWA Open Data endpoint: {exc}") from exc

    payload = json.loads(text)
    if isinstance(payload, dict) and str(payload.get("success", "")).lower() == "false":
        raise DataAccessPending(f"CWA Open Data request failed: {payload.get('message') or payload}")
    return payload, source_url


def load_payload(source: str | Path | None, authorization: str | None) -> tuple[dict, str]:
    if source:
        path = Path(source)
        return json.loads(path.read_text(encoding="utf-8")), str(path)
    return download_payload(authorization)


def parse_payload(payload: dict, source_url: str) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    seen: set[tuple[str, str, str]] = set()

    for station in station_list(payload):
        if not isinstance(station, dict):
            continue
        name = station_name(station)
        timestamp = observation_time(station)
        lat, lon = coordinates(station)
        if not name or not timestamp or lat is None or lon is None:
            continue
        if lat < -90 or lat > 90 or lon < -180 or lon > 180:
            continue

        for variable in VARIABLES:
            key = (name, timestamp, variable)
            if key in seen:
                continue
            seen.add(key)
            try:
                value = variable_value(station, variable)
            except ValueError:
                continue
            records.append(make_record(name, lat, lon, timestamp, variable, value, source_url))

    return records


def write_output(records: list[dict[str, object]], output_path: str | Path = DEFAULT_OUTPUT) -> Path:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
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
            "output_path": str(path),
            "notes": "No CWA records parsed. Data access remains pending.",
        }

    required = ["id", "provider", "dataset", "variable", "timestamp", "unit", "value", "quality", "confidence", "source_url", "version", "notes"]
    seen: set[tuple[str, str, str]] = set()
    for record in records:
        missing = [field for field in required if field not in record]
        if missing:
            raise ConnectorError(f"Validation failed: missing fields {missing}.")
        station = str(record.get("notes", ""))
        duplicate_key = (station, str(record["timestamp"]), str(record["variable"]))
        if duplicate_key in seen:
            raise ConnectorError("Validation failed: duplicate station-variable timestamp.")
        seen.add(duplicate_key)
        if record.get("quality") == "missing" and record.get("value") is not None:
            raise ConnectorError("Validation failed: missing values must be preserved as null.")

    latest = max(str(record["timestamp"]) for record in records)
    return {
        "valid": True,
        "status": "parsed",
        "data_access_pending": False,
        "record_count": len(records),
        "latest_timestamp": latest,
        "output_path": str(path),
        "notes": "CWA Open Data weather observations parsed from official source data.",
    }


def run_connector(
    source: str | Path | None = None,
    authorization: str | None = None,
    output: str | Path = DEFAULT_OUTPUT,
) -> dict[str, object]:
    try:
        token = authorization or os.environ.get("CWA_API_KEY")
        payload, source_url = load_payload(source, token)
        records = parse_payload(payload, source_url)
        if not records:
            raise DataAccessPending("No parseable CWA records found.")
        output_path = write_output(records, output)
        return validate_output(output_path)
    except DataAccessPending:
        output_path = write_output([], output)
        return validate_output(output_path, data_access_pending=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run CWA Weather PCS connector v0.1.")
    parser.add_argument("--source", help="Optional local official CWA JSON source file.")
    parser.add_argument("--authorization", help="CWA Open Data authorization token.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="PCS connector JSON output path.")
    args = parser.parse_args()

    result = run_connector(args.source, args.authorization, args.output)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
