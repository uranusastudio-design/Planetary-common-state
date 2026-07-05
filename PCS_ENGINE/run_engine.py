"""Run the PCS Engine core pipeline.

By default this uses the existing benchmark CSV when available, which makes the
pipeline reproducible without network access. Pass explicit source paths or
adapt the data adapters for live fetching when deploying.
"""

from __future__ import annotations

from pathlib import Path

from data_adapters import load_standardized_annual_dataframe
from output_layer import save_full_state_history, save_latest_state_csv, save_latest_state_json
from projection_engine import compute_projections
from state_engine import compute_latest_state, compute_state_history


ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parent
DEFAULT_BENCHMARK = WORKSPACE / "PCS_DATA" / "processed" / "demo_annual_dataset.csv"
OUTPUT = ROOT / "output"


def run() -> dict:
    source = DEFAULT_BENCHMARK if DEFAULT_BENCHMARK.exists() else None
    observations = load_standardized_annual_dataframe(
        temperature_source=source,
        co2_source=source,
    )
    projections = compute_projections(observations)
    state_history = compute_state_history(projections)
    latest_state = compute_latest_state(state_history)

    save_latest_state_json(latest_state, OUTPUT / "latest_state.json")
    save_latest_state_csv(latest_state, OUTPUT / "latest_state.csv")
    save_full_state_history(state_history, OUTPUT / "full_state_history.csv")
    return latest_state


if __name__ == "__main__":
    run()

