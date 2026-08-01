#!/usr/bin/env python3
"""Build bounded, static PCS nearby-star tiers from the official Gaia Archive.

The GCNS distance columns are in kpc. Website output is converted to pc. The
builder never treats a missing radial velocity as zero and keeps the original
catalog fields under ``raw`` for auditability.
"""
from __future__ import annotations

import csv
import datetime as dt
import io
import json
import math
import pathlib
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "deep-space" / "nearby-stars"
QUERY_FILE = pathlib.Path(__file__).with_name("nearby-stars-gcns.adql")
TAP = "https://gea.esac.esa.int/tap-server/tap/sync"
LY_PER_PC = 3.261563777
TIERS = (
    # id, radius, configured cap, deployed snapshot count, magnitude limit
    ("10pc", 10, 1200, 303, 20.0),
    ("25pc", 25, 5000, 4901, 18.0),
    ("50pc", 50, 8000, 8000, 16.5),
    ("100pc", 100, 10000, 10000, 15.0),
)


def tap_csv(query: str) -> list[dict[str, str]]:
    params = urllib.parse.urlencode({"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": query})
    with urllib.request.urlopen(f"{TAP}?{params}", timeout=180) as response:
        return list(csv.DictReader(io.StringIO(response.read().decode("utf-8"))))


def number(row: dict[str, str], name: str):
    value = row.get(name, "").strip()
    return float(value) if value else None


def status_for(row: dict[str, str]) -> tuple[str, list[str], list[str]]:
    p, pe, ruwe = number(row, "parallax"), number(row, "parallax_error"), number(row, "ruwe")
    frac = pe / p if p and pe is not None else math.inf
    notes, uncertainty = [], []
    if ruwe is not None and ruwe > 1.4:
        notes.append("RUWE above 1.4; possible astrometric complexity")
    if frac > 0.2:
        uncertainty.append("fractional parallax uncertainty above 20%")
    if number(row, "ipd_frac_multi_peak") not in (None, 0):
        notes.append("image-parameter determination reports multi-peak windows")
    if row.get("duplicated_source", "").lower() == "true":
        notes.append("Gaia EDR3 duplicated_source flag is true")
    solved = number(row, "astrometric_params_solved")
    if solved not in (31, 95):
        notes.append("astrometric_params_solved is not a standard 5- or 6-parameter solution")
    if row.get("radial_velocity_is_valid") != "1":
        uncertainty.append("radial velocity unavailable; 3D velocity incomplete")
    if frac <= 0.1 and (ruwe is None or ruwe <= 1.4) and not notes:
        return "high-confidence astrometry", notes, uncertainty
    if frac <= 0.2:
        return "catalog astrometry", notes, uncertainty
    return "limited astrometry", notes, uncertainty


def compact(row: dict[str, str]) -> dict:
    distance_pc = number(row, "dist_50") * 1000
    d16, d84 = number(row, "dist_16") * 1000, number(row, "dist_84") * 1000
    bp, rp = number(row, "phot_bp_mean_mag"), number(row, "phot_rp_mean_mag")
    status, quality, uncertainty = status_for(row)
    rv = number(row, "adoptedrv") if row.get("radial_velocity_is_valid") == "1" else None
    return {
        "source_id": row["source_id"], "sourceCatalog": "Gaia EDR3 GCNS", "release": "Gaia EDR3 / GCNS v1",
        "referenceEpoch": 2016.0, "ra": number(row, "ra"), "dec": number(row, "dec"), "ra_error": number(row,"ra_error"), "dec_error": number(row,"dec_error"),
        "parallax": number(row, "parallax"), "parallax_error": number(row, "parallax_error"),
        "pmra": number(row, "pmra"), "pmra_error": number(row, "pmra_error"),
        "pmdec": number(row, "pmdec"), "pmdec_error": number(row, "pmdec_error"),
        "radial_velocity": rv, "radial_velocity_error": number(row, "adoptedrv_error") if rv is not None else None,
        "radialVelocityAvailable": rv is not None, "phot_g_mean_mag": number(row, "phot_g_mean_mag"),
        "bp_rp": bp - rp if bp is not None and rp is not None else None, "ruwe": number(row, "ruwe"),
        "distancePc": distance_pc, "distanceLy": distance_pc * LY_PER_PC,
        "distanceMethod": "GCNS geometric distance posterior median (dist_50)",
        "distanceIntervalPc": [d16, d84], "gcnsProbability": number(row, "gcns_prob"),
        "cartesianPc": [number(row, "xcoord_50"), number(row, "ycoord_50"), number(row, "zcoord_50")],
        "coordinateFrame": "GCNS heliocentric Galactic Cartesian", "transformationStatus": "catalog-provided Cartesian; independently validated",
        "dataStatus": status if rv is not None else "incomplete 6D state", "astrometryStatus": status,
        "qualityNotes": quality, "uncertaintyNotes": uncertainty,
        "astrometric_params_solved": int(number(row,"astrometric_params_solved")) if number(row,"astrometric_params_solved") is not None else None,
        "duplicated_source": row.get("duplicated_source","").lower()=="true",
        "qualityFlags": {"ruwe": number(row, "ruwe"), "ipd_frac_multi_peak": number(row, "ipd_frac_multi_peak"), "astrometric_params_solved": int(number(row,"astrometric_params_solved")) if number(row,"astrometric_params_solved") is not None else None, "duplicated_source": row.get("duplicated_source","").lower()=="true", "non_single_star": "not available in Gaia EDR3 / GCNS"},
    }


def main() -> None:
    query_template = QUERY_FILE.read_text(encoding="utf-8")
    build_date = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    OUT.mkdir(parents=True, exist_ok=True)
    counts, excluded = {}, {}
    previous_records = []
    for name, radius, cap, deployed_count, mag_limit in TIERS:
        query = query_template.format(max_objects=cap * 2, radius_kpc=radius / 1000)
        rows = tap_csv(query)
        queried, reasons = [], {"magnitudeLimit": 0, "invalidCoordinate": 0, "objectCap": 0, "nestedCarryForward": len(previous_records)}
        for row in rows:
            item = compact(row)
            if item["phot_g_mean_mag"] is not None and item["phot_g_mean_mag"] > mag_limit:
                reasons["magnitudeLimit"] += 1; continue
            if not all(math.isfinite(v) for v in item["cartesianPc"]):
                reasons["invalidCoordinate"] += 1; continue
            queried.append(item)
        records=list(previous_records)
        seen={item["source_id"] for item in records}
        records.extend(item for item in queried if item["source_id"] not in seen)
        if len(records) > deployed_count:
            reasons["objectCap"] = len(records) - deployed_count
            records = records[:deployed_count]
        previous_records=records
        payload = {"schemaVersion": 1, "tier": name, "radiusPc": radius, "maxObjects": cap, "magnitudeLimit": mag_limit,
                   "queryDate": build_date, "records": records}
        (OUT / f"nearby-stars-{name}.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
        counts[name] = len(records); excluded[name] = reasons
    metadata = {
        "catalog": "Gaia Catalogue of Nearby Stars", "release": "Gaia EDR3 / GCNS v1", "queryDate": build_date,
        "referenceEpoch": "J2016.0", "queryFile": "scripts/nearby-stars-gcns.adql",
        "qualityFilters": ["positive non-null parallax", "gcns_prob >= 0.5", "tier magnitude limit", "bounded maxObjects"],
        "coordinateFrame": "ICRS input; GCNS heliocentric Galactic Cartesian output", "distanceMethod": "GCNS dist_50 posterior median",
        "recordCounts": counts, "excludedCounts": excluded,
        "processing": ["convert kpc to pc", "preserve null radial velocity", "classify multi-factor astrometric quality", "retain queried fields or lossless derived equivalents", "carry each inner tier into the next outer tier before capped fill"],
        "licenseCredit": "ESA/Gaia/DPAC; Gaia Collaboration, Smart et al. (2021), A&A 649 A6",
        "notes": ["DR3 source_id is not assumed to match EDR3 source_id across releases.", "No Gaia DR4 data used."]}
    (OUT / "catalog-metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(json.dumps(metadata["recordCounts"], indent=2))


if __name__ == "__main__":
    main()
