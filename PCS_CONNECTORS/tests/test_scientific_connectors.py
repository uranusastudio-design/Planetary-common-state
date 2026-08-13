from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_connector(name: str):
    path = ROOT / f"{name}.py" if (ROOT / f"{name}.py").exists() else ROOT / name / "connector.py"
    spec = importlib.util.spec_from_file_location(f"pcs_{name}", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


class SeaLevelConnectorTests(unittest.TestCase):
    def test_noaa_mission_columns_and_decimal_timestamp(self):
        module = load_connector("sea_level")
        sample = """# source metadata
year,TOPEX/Poseidon,Jason-1,Jason-2,Jason-3,Sentinel-6MF
1992.96140,-14.57,,,,
2025.12880,,,,,80.98
"""
        records = module.parse_delimited_text(sample, module.NOAA_GMSL_URL)
        self.assertEqual(2, len(records))
        self.assertEqual("1992-12-18", records[0]["timestamp"])
        self.assertEqual(80.98, records[1]["value"])
        self.assertIn("NOAA Laboratory", records[1]["attribution"] if "attribution" in records[1] else records[1]["notes"])

    def test_null_is_preserved(self):
        module = load_connector("sea_level")
        record = module.make_record("2025-01-01", None, None, module.NOAA_GMSL_URL)
        self.assertIsNone(record["value"])
        self.assertEqual("missing", record["quality"])


class NsidcConnectorTests(unittest.TestCase):
    def test_v4_csv_parsing_and_null(self):
        module = load_connector("nsidc_sea_ice")
        sample = """Year, Month, Day, Extent, Missing, Source Data
YYYY, MM, DD, 10^6 sq km, 10^6 sq km, source
2026, 08, 11, 7.123, 0.000, source
2026, 08, 12, -999, 0.000, source
"""
        records = module.parse_csv_source(sample, module.ARCTIC_DAILY_URL, "Arctic Sea Ice Extent")
        self.assertEqual(2, len(records))
        self.assertEqual("2026-08-11", records[0]["timestamp"])
        self.assertEqual(7.123, records[0]["value"])
        self.assertIsNone(records[1]["value"])

    def test_validation_rejects_all_null_output(self):
        module = load_connector("nsidc_sea_ice")
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "output.json"
            module.write_output(
                [module.make_record("Arctic Sea Ice Extent", "2026-08-12", None, module.ARCTIC_DAILY_URL)],
                output,
            )
            with self.assertRaises(module.ConnectorError):
                module.validate_output(output)


class UnifiedObservationTests(unittest.TestCase):
    def setUp(self):
        self.module = load_connector("unified_observation")
        self.record = {
            "id": "cwa-1", "domain": "atmosphere", "provider": "CWA",
            "original_source": "CWA", "event_type": "temperature",
            "timestamp": "2026-08-13T12:00:00+08:00",
            "retrieved_at": "2026-08-13T12:05:00+08:00",
            "latitude": 25.04, "longitude": 121.52, "country": "TW",
            "region": "Taiwan", "value": 31.2, "unit": "degC",
            "severity_source": None, "confidence_source": None,
            "source_url": "https://example.invalid/source", "license": None,
            "attribution": "CWA", "pcs_mapping": {
                "L_T": "candidate", "L_F": None, "L_C": None,
                "L_I": None, "L_S": None,
            }, "status": "candidate",
        }

    def test_regional_filter_uses_coordinates(self):
        state = self.module.regional_state([self.record], "Taiwan")
        self.assertEqual("available", state["status"])
        self.assertEqual(1, len(state["records"]))

    def test_empty_region_is_explicit(self):
        state = self.module.regional_state([self.record], "Korea")
        self.assertEqual("Regional data unavailable", state["status"])

    def test_evidence_does_not_invent_normalization_or_method(self):
        evidence = self.module.evidence_record(self.record)
        self.assertIsNone(evidence["normalized_value"])
        self.assertIsNone(evidence["method"])


if __name__ == "__main__":
    unittest.main()
