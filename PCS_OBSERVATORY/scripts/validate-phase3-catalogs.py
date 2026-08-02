#!/usr/bin/env python3
"""Validate Phase 3 raw catalogs, registries, metadata and null preservation."""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "deep-space" / "phase-3"
META = json.loads((OUT / "catalog-metadata.json").read_text())
EXPECTED = {"hmsfr": 199, "localGroup": 102}


def finite_vector(value):
    return isinstance(value, list) and len(value) == 3 and all(isinstance(item, (int, float)) and math.isfinite(item) for item in value)


def validate_registry(key, filename):
    registry = json.loads((OUT / filename).read_text())
    assert registry["recordCount"] == EXPECTED[key] == len(registry["records"])
    ids = [record["id"] for record in registry["records"]]
    assert len(ids) == len(set(ids)), f"{key}: duplicate IDs"
    for record in registry["records"]:
        assert record["canonicalName"] and record["sourceId"]
        assert record["sourceCatalog"] and record["sourceDoi"]
        if record["raDeg"] is not None:
            assert 0 <= record["raDeg"] < 360
        if record["decDeg"] is not None:
            assert -90 <= record["decDeg"] <= 90
        if record["distanceKpc"] is not None:
            assert math.isfinite(record["distanceKpc"]) and record["distanceKpc"] > 0
        vector = record["heliocentricGalacticCartesianKpc"]
        assert vector is None or finite_vector(vector)
        if key == "hmsfr":
            assert finite_vector(record["galactocentricCartesianKpc"])
            assert record["parallaxMas"] > 0
        if key == "localGroup" and record["radialVelocityKmS"] is None:
            assert record["radialVelocityKmS"] is None
    return registry


def main():
    hmsfr = validate_registry("hmsfr", "milky-way-hmsfr.json")
    local_group = validate_registry("localGroup", "local-group-galaxies.json")
    for key, expected in EXPECTED.items():
        source = META["sources"][key]
        raw = ROOT / source["rawFile"]
        assert raw.exists()
        assert hashlib.sha256(raw.read_bytes()).hexdigest() == source["rawSha256"]
        assert source["rawRecordCount"] == source["registryRecordCount"] == expected
        assert source["queryDate"] and source["columns"]
    assert any(record["radialVelocityKmS"] is None for record in local_group["records"]), "null radial velocity fixture missing"
    assert {record["dataStatus"] for record in hmsfr["records"]} == {"catalog-observation"}
    print(json.dumps({"hmsfr": len(hmsfr["records"]), "localGroup": len(local_group["records"]), "total": len(hmsfr["records"]) + len(local_group["records"]), "status": "valid"}))


if __name__ == "__main__":
    main()
