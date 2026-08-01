#!/usr/bin/env python3
import json, math, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "assets" / "deep-space" / "nearby-stars"
meta = json.loads((DATA / "catalog-metadata.json").read_text())
failures = []
previous_ids = set()
union_ids = set()
for tier, expected in meta["recordCounts"].items():
    payload = json.loads((DATA / f"nearby-stars-{tier}.json").read_text())
    records = payload["records"]
    if len(records) != expected: failures.append(f"{tier}: metadata count mismatch")
    ids = [r["source_id"] for r in records]
    if len(ids) != len(set(ids)): failures.append(f"{tier}: duplicate source_id")
    current_ids=set(ids)
    if not previous_ids.issubset(current_ids): failures.append(f"{tier}: does not contain prior inner tier")
    previous_ids=current_ids
    union_ids.update(current_ids)
    for r in records:
        if not (0 <= r["ra"] < 360 and -90 <= r["dec"] <= 90): failures.append(f"{tier}: invalid RA/Dec")
        if not (0 < r["distancePc"] <= payload["radiusPc"] * 1.02): failures.append(f"{tier}: invalid distance")
        if not all(math.isfinite(v) for v in r["cartesianPc"]): failures.append(f"{tier}: invalid Cartesian")
        if not r["radialVelocityAvailable"] and r["radial_velocity"] is not None: failures.append(f"{tier}: missing RV filled")
        if r.get("astrometric_params_solved") is None or not isinstance(r.get("duplicated_source"),bool): failures.append(f"{tier}: missing EDR3 quality fields")
        if "DR4" in r["release"]: failures.append(f"{tier}: forbidden DR4")
landmarks=json.loads((DATA / "landmark-systems.json").read_text())["records"]
required={"Proxima Centauri","Alpha Centauri A","Alpha Centauri B","Barnard's Star","Wolf 359","Lalande 21185","Sirius A","Sirius B","Luyten 726-8 A","Luyten 726-8 B","Epsilon Eridani","Tau Ceti","Procyon A","Procyon B","Ross 128","Ross 154","Ross 248","Altair","Vega","Fomalhaut","TRAPPIST-1"}
found={r["primaryName"] for r in landmarks}
if not required.issubset(found): failures.append("landmarks: required name missing")
for r in landmarks:
    if r["primaryName"] != "Sun" and (not r.get("source_id") or not math.isfinite(r.get("distancePc",math.nan))): failures.append(f"landmark invalid: {r['primaryName']}")
if failures:
    print("\n".join(failures)); sys.exit(1)
print(f"validated {sum(meta['recordCounts'].values())} tier records; {len(union_ids)} unique deployed sources; {len(landmarks)} landmarks")
