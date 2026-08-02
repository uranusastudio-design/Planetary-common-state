#!/usr/bin/env python3
"""Build auditable Phase 3 web registries from versioned VizieR TSV responses."""
from __future__ import annotations

import csv
import hashlib
import json
import math
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "deep-space" / "phase-3"
RAW = OUT / "raw"
R0_KPC = 8.15
Z_SUN_KPC = 0.0208
MATRIX = (
    (-0.0548755604, -0.8734370902, -0.4838350155),
    (0.4941094279, -0.4448296300, 0.7469822445),
    (-0.8676661490, -0.1980763734, 0.4559837762),
)
SOURCES = {
    "hmsfr": {
        "query": ROOT / "scripts" / "phase3-reid2019.query.txt",
        "raw": RAW / "reid2019-hmsfr.tsv",
        "output": OUT / "milky-way-hmsfr.json",
        "expected": 199,
        "catalog": "VizieR J/ApJ/885/131/table1",
        "doi": "10.26093/cds/vizier.18850131",
    },
    "localGroup": {
        "query": ROOT / "scripts" / "phase3-local-group.query.txt",
        "raw": RAW / "mcconnachie2012-local-group.tsv",
        "output": OUT / "local-group-galaxies.json",
        "expected": 102,
        "catalog": "VizieR J/AJ/144/4/catalog",
        "doi": "10.26093/cds/vizier.51440004",
    },
}


def download(url: str, target: Path) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "PCS-Observatory-Phase3-Builder/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = response.read()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    return payload


def parse_vizier_tsv(payload: bytes) -> tuple[list[dict[str, str]], dict]:
    text = payload.decode("utf-8")
    lines = text.splitlines()
    query_date = next((line.split("=", 1)[1].split("\t", 1)[0] for line in lines if line.startswith("#INFO\trequest_date=")), None)
    columns = [line.split("\t", 2)[1] for line in lines if line.startswith("#Column\t")]
    content = [line for line in lines if line and not line.startswith("#")]
    if len(content) < 4:
        raise ValueError("VizieR TSV has no data table")
    header = content[0].split("\t")
    rows = []
    for line in content[3:]:
        values = line.split("\t")
        if len(values) != len(header):
            raise ValueError(f"TSV field count mismatch: {len(values)} != {len(header)}")
        rows.append(dict(zip(header, values)))
    return rows, {"queryDate": query_date, "columns": columns or header}


def number(value: str):
    value = value.strip()
    return float(value) if value else None


def sexagesimal(value: str, hours: bool = False) -> float:
    parts = re.split(r"[ :]+", value.strip())
    if len(parts) != 3:
        raise ValueError(f"invalid sexagesimal coordinate: {value!r}")
    sign = -1 if parts[0].startswith("-") else 1
    degrees = abs(float(parts[0])) + float(parts[1]) / 60 + float(parts[2]) / 3600
    return sign * degrees * (15 if hours else 1)


def icrs_galactic_cartesian(ra: float, dec: float, distance: float) -> list[float]:
    a, d = math.radians(ra), math.radians(dec)
    vector = (distance * math.cos(d) * math.cos(a), distance * math.cos(d) * math.sin(a), distance * math.sin(d))
    return [sum(row[index] * vector[index] for index in range(3)) for row in MATRIX]


def galactocentric(ra: float, dec: float, distance: float) -> list[float]:
    x, y, z = icrs_galactic_cartesian(ra, dec, distance)
    return [x - R0_KPC, y, z + Z_SUN_KPC]


def clean_aliases(*values: str) -> list[str]:
    return list(dict.fromkeys(value.strip() for value in values if value and value.strip()))


def build_hmsfr(rows: list[dict[str, str]], source: dict, build_date: str) -> dict:
    records = []
    for row_index, row in enumerate(rows, start=1):
        parallax, parallax_error = number(row["plx"]), number(row["e_plx"])
        if parallax is None or parallax <= 0:
            raise ValueError(f"invalid VLBI parallax for {row['Name']}")
        distance = 1 / parallax
        uncertainty = parallax_error / (parallax * parallax) if parallax_error is not None else None
        ra, dec = sexagesimal(row["RAJ2000"], True), sexagesimal(row["DEJ2000"])
        records.append({
            "id": f"reid2019:{row_index:03d}:{row['Name'].strip()}", "catalogRow": row_index, "canonicalName": row["Name"].strip(),
            "aliases": clean_aliases(row.get("OName", ""), row.get("SimbadName", "")),
            "objectType": "high-mass star-forming region", "sourceId": row["Name"].strip(),
            "raDeg": ra, "decDeg": dec, "referenceEpoch": "J2000", "parallaxMas": parallax,
            "parallaxErrorMas": parallax_error, "distanceKpc": distance, "distanceErrorKpc": uncertainty,
            "distanceMethod": "inverse VLBI trigonometric parallax", "pmEastMasYr": number(row["pmE"]),
            "pmNorthMasYr": number(row["pmN"]), "vLsrKmS": number(row["VLSR"]),
            "vLsrErrorKmS": number(row["e_VLSR"]), "spiralArmCode": row["Arm"].strip() or None,
            "heliocentricGalacticCartesianKpc": icrs_galactic_cartesian(ra, dec, distance),
            "galactocentricCartesianKpc": galactocentric(ra, dec, distance),
            "dataStatus": "catalog-observation", "visualizationStatus": "observed-tracer",
            "sourceCatalog": source["catalog"], "sourceDoi": source["doi"], "buildDate": build_date,
            "transformationStatus": "ICRS J2000 to fixed PCS Galactocentric frame"
        })
    return {"schemaVersion": 1, "id": "milky-way-hmsfr", "recordCount": len(records), "deduplicationPolicy": "Preserve every published measurement row; stable ID is catalog row sequence plus source name because one source name has multiple measurements.", "records": records}


def build_local_group(rows: list[dict[str, str]], source: dict, build_date: str) -> dict:
    records = []
    for row_index, row in enumerate(rows, start=1):
        distance = number(row["D"])
        ra = sexagesimal(row["RAJ2000"], True) if row["RAJ2000"].strip() else None
        dec = sexagesimal(row["DEJ2000"]) if row["DEJ2000"].strip() else None
        cartesian = icrs_galactic_cartesian(ra, dec, distance) if None not in (ra, dec, distance) else None
        records.append({
            "id": f"mcconnachie2012:{row_index:03d}:{row['Name'].strip()}", "catalogRow": row_index, "canonicalName": row["Name"].strip(),
            "aliases": clean_aliases(row.get("OName", "")), "objectType": row["MType"].strip() or "galaxy",
            "sourceId": row["Name"].strip(), "subgroup": row["SubG"].strip() or None,
            "membershipFlag": row["n_Name"].strip() or None, "raDeg": ra, "decDeg": dec,
            "galacticLongitudeDeg": number(row["GLON"]), "galacticLatitudeDeg": number(row["GLAT"]),
            "referenceEpoch": "J2000", "distanceKpc": distance, "distanceErrorPlusKpc": number(row["E_D"]),
            "distanceErrorMinusKpc": number(row["e_D"]), "distanceModulus": number(row["(m-M)"]),
            "distanceMethod": "McConnachie catalog adopted heliocentric distance",
            "radialVelocityKmS": number(row["HRV"]), "heliocentricGalacticCartesianKpc": cartesian,
            "dataStatus": "catalog-observation" if cartesian else "limited-catalog-observation",
            "visualizationStatus": "catalog-member" if cartesian else "excluded-from-3d",
            "sourceCatalog": source["catalog"], "sourceDoi": source["doi"], "buildDate": build_date,
            "transformationStatus": "ICRS J2000 to Sun-centered Galactic Cartesian" if cartesian else "not transformed: coordinate or distance unavailable"
        })
    return {"schemaVersion": 1, "id": "local-group-galaxies", "recordCount": len(records), "deduplicationPolicy": "Preserve every published catalog row; stable ID is catalog row sequence plus canonical name.", "records": records}


def main() -> None:
    build_date = datetime.now(timezone.utc).date().isoformat()
    metadata = {"schemaVersion": 1, "buildTimestamp": datetime.now(timezone.utc).isoformat(), "frame": "pcs-galactocentric-reid2019-v1", "sources": {}}
    for key, source in SOURCES.items():
        url = source["query"].read_text().strip()
        payload = download(url, source["raw"])
        rows, details = parse_vizier_tsv(payload)
        if len(rows) != source["expected"]:
            raise ValueError(f"{key}: expected {source['expected']} rows, received {len(rows)}")
        registry = build_hmsfr(rows, source, build_date) if key == "hmsfr" else build_local_group(rows, source, build_date)
        source["output"].write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n")
        metadata["sources"][key] = {"catalog": source["catalog"], "doi": source["doi"], "query": url, "queryDate": details["queryDate"], "columns": details["columns"], "rawFile": str(source["raw"].relative_to(ROOT)), "rawSha256": hashlib.sha256(payload).hexdigest(), "rawRecordCount": len(rows), "registryFile": str(source["output"].relative_to(ROOT)), "registryRecordCount": registry["recordCount"]}
    (OUT / "catalog-metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({key: value["registryRecordCount"] for key, value in metadata["sources"].items()}))


if __name__ == "__main__":
    main()
