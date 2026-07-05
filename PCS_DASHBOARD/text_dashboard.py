"""Minimal text dashboard for PCS Engine output.

This reader does not compute new values, download data, or modify PCS Engine
outputs. It only displays PCS_ENGINE/output/latest_state.json.
"""

from __future__ import annotations

import json
from pathlib import Path


DASHBOARD_VERSION = "PCS Text Dashboard v0.1"
DEFAULT_STATE_PATH = Path(__file__).resolve().parents[1] / "PCS_ENGINE" / "output" / "latest_state.json"
PROJECTION_LABELS = {
    "L_T": "Thermal L_T",
    "L_C": "Chemical L_C",
    "L_S": "Structural L_S",
    "L_I": "Informational L_I",
}


def display_value(value: object, digits: int = 4) -> str:
    if value is None:
        return "Waiting for data"
    if isinstance(value, (int, float)):
        return f"{value:.{digits}f}"
    return str(value)


def status_for_state(state: dict) -> str:
    coverage = state.get("coverage_count")
    try:
        coverage_int = int(coverage)
    except (TypeError, ValueError):
        return "Waiting for data"
    if coverage_int <= 0:
        return "Waiting for data"
    if coverage_int < 4:
        return "Operational benchmark"
    return "Operational"


def source_line(state: dict) -> str:
    sources = state.get("sources")
    if isinstance(sources, dict) and sources:
        return ", ".join(sources.keys())
    return "NASA GISTEMP, NOAA CO2"


def render_dashboard(state: dict) -> str:
    projections = state.get("projections") or {}
    latest_year = state.get("latest_year")
    coverage = state.get("coverage_count")
    coverage_display = "Waiting for data" if coverage is None else f"{coverage} / 4"

    lines = [
        "==============================",
        "Planetary Common State",
        "==============================",
        "",
        f"PCS Engine version: {DASHBOARD_VERSION}",
        f"Latest year: {display_value(latest_year, digits=0)}",
        f"PCS state: {display_value(state.get('S_demo'))}",
        f"Coverage: {coverage_display}",
        "",
    ]

    for key, label in PROJECTION_LABELS.items():
        lines.append(f"{label}: {display_value(projections.get(key))}")

    lines.extend(
        [
            "",
            f"Status: {status_for_state(state)}",
            f"Sources: {source_line(state)}",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    if not DEFAULT_STATE_PATH.exists():
        print(f"PCS state file not found: {DEFAULT_STATE_PATH}")
        return 1
    state = json.loads(DEFAULT_STATE_PATH.read_text(encoding="utf-8"))
    print(render_dashboard(state))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

