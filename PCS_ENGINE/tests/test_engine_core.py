from __future__ import annotations

import json
import unittest
from pathlib import Path

import pandas as pd

import sys

ENGINE_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = ENGINE_ROOT.parent
sys.path.insert(0, str(ENGINE_ROOT))

from data_adapters import load_standardized_annual_dataframe
from output_layer import save_full_state_history, save_latest_state_csv, save_latest_state_json
from projection_engine import compute_projections
from state_engine import compute_latest_state, compute_state_history


class PCSEngineCoreTests(unittest.TestCase):
    def test_data_loads_from_benchmark_csv(self) -> None:
        source = WORKSPACE_ROOT / "PCS_DATA" / "processed" / "demo_annual_dataset.csv"
        df = load_standardized_annual_dataframe(source, source)
        self.assertGreaterEqual(len(df), 1)
        self.assertIn("Temperature", df.columns)
        self.assertIn("CO2", df.columns)
        self.assertTrue(df["Temperature"].notna().any())
        self.assertTrue(df["CO2"].notna().any())

    def test_projections_compute(self) -> None:
        observations = pd.DataFrame(
            {
                "Year": [2000],
                "Temperature": [0.39],
                "CO2": [369.71],
                "SeaLevel": [pd.NA],
                "NDVI": [pd.NA],
            }
        )
        projections = compute_projections(observations)
        self.assertAlmostEqual(float(projections.loc[0, "L_T"]), 0.26, places=6)
        self.assertAlmostEqual(float(projections.loc[0, "L_C"]), 0.400910, places=6)

    def test_nan_handling(self) -> None:
        observations = pd.DataFrame(
            {
                "Year": [2000, 2001],
                "Temperature": [0.39, pd.NA],
                "CO2": [pd.NA, 371.32],
            }
        )
        projections = compute_projections(observations)
        self.assertTrue(pd.isna(projections.loc[0, "L_C"]))
        self.assertTrue(pd.isna(projections.loc[1, "L_T"]))
        self.assertTrue(pd.isna(projections.loc[0, "L_S"]))
        self.assertTrue(pd.isna(projections.loc[0, "L_I"]))

    def test_state_history_and_latest_state(self) -> None:
        projections = pd.DataFrame(
            {
                "Year": [2000, 2001],
                "L_T": [0.26, pd.NA],
                "L_C": [0.40, 0.42],
                "L_S": [pd.NA, pd.NA],
                "L_I": [pd.NA, pd.NA],
            }
        )
        history = compute_state_history(projections)
        self.assertEqual(int(history.loc[0, "coverage_count"]), 2)
        self.assertEqual(int(history.loc[1, "coverage_count"]), 1)
        self.assertAlmostEqual(float(history.loc[0, "S_demo"]), 0.33, places=6)
        latest = compute_latest_state(history)
        self.assertEqual(latest["latest_year"], 2001)
        self.assertEqual(latest["coverage_count"], 1)
        self.assertAlmostEqual(float(latest["S_demo"]), 0.42, places=6)

    def test_latest_state_outputs_exist(self) -> None:
        projections = pd.DataFrame(
            {
                "Year": [2000],
                "L_T": [0.26],
                "L_C": [0.40],
                "L_S": [pd.NA],
                "L_I": [pd.NA],
            }
        )
        history = compute_state_history(projections)
        latest = compute_latest_state(history)
        tmp_path = ENGINE_ROOT / "tests" / "_tmp_outputs"
        tmp_path.mkdir(exist_ok=True)
        json_path = save_latest_state_json(latest, tmp_path / "latest_state.json")
        csv_path = save_latest_state_csv(latest, tmp_path / "latest_state.csv")
        history_path = save_full_state_history(history, tmp_path / "full_state_history.csv")
        self.assertTrue(json_path.exists())
        self.assertTrue(csv_path.exists())
        self.assertTrue(history_path.exists())
        loaded = json.loads(json_path.read_text(encoding="utf-8"))
        self.assertEqual(loaded["latest_year"], 2000)


if __name__ == "__main__":
    unittest.main()
