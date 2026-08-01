#!/usr/bin/env python3
"""Resolve requested landmarks through SIMBAD, then fetch Gaia DR3 rows by ID."""
import csv, datetime as dt, io, json, math, pathlib, re, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/deep-space/nearby-stars/landmark-systems.json"
GAIA = "https://gea.esac.esa.int/tap-server/tap/sync"
SIMBAD = "https://simbad.cds.unistra.fr/simbad/sim-id"
LY = 3.261563777
OBJECTS = [
 ("proxima-centauri","Proxima Centauri",None),("alpha-centauri-a","Alpha Centauri A","alpha-centauri"),("alpha-centauri-b","Alpha Centauri B","alpha-centauri"),
 ("barnards-star","Barnard's Star",None),("wolf-359","Wolf 359",None),("lalande-21185","Lalande 21185",None),
 ("sirius-a","Sirius A","sirius"),("sirius-b","Sirius B","sirius"),("luyten-726-8-a","Luyten 726-8 A","luyten-726-8"),("luyten-726-8-b","Luyten 726-8 B","luyten-726-8"),
 ("epsilon-eridani","Epsilon Eridani",None),("tau-ceti","Tau Ceti",None),("procyon-a","Procyon A","procyon"),("procyon-b","Procyon B","procyon"),
 ("ross-128","Ross 128",None),("ross-154","Ross 154",None),("ross-248","Ross 248",None),("altair","Altair",None),("vega","Vega",None),
 ("fomalhaut","Fomalhaut",None),("trappist-1","TRAPPIST-1",None)]
RESOLVE_AS = {"Luyten 726-8 A":"BL Cet", "Luyten 726-8 B":"UV Cet"}

def get(url, params):
    with urllib.request.urlopen(url+"?"+urllib.parse.urlencode(params), timeout=90) as r: return r.read().decode("utf-8", "replace")

def gaia_row(source_id):
    q=("SELECT TOP 1 source_id,designation,ra,dec,parallax,parallax_error,pmra,pmra_error,pmdec,pmdec_error,"
       "radial_velocity,radial_velocity_error,phot_g_mean_mag,bp_rp,ruwe,astrometric_params_solved,duplicated_source "
       f"FROM gaiadr3.gaia_source WHERE source_id={source_id}")
    rows=list(csv.DictReader(io.StringIO(get(GAIA,{"REQUEST":"doQuery","LANG":"ADQL","FORMAT":"csv","QUERY":q}))))
    return rows[0] if rows else None

def hip_row(hip):
    q=f"SELECT TOP 1 hip,ra,dec,plx,e_plx,pm_ra,e_pm_ra,pm_de,e_pm_de,hp_mag,b_v FROM public.hipparcos_newreduction WHERE hip={hip}"
    rows=list(csv.DictReader(io.StringIO(get(GAIA,{"REQUEST":"doQuery","LANG":"ADQL","FORMAT":"csv","QUERY":q}))))
    return rows[0] if rows else None

def num(row,key):
    v=row.get(key,"").strip(); return float(v) if v else None

records=[]
for slug,name,system in OBJECTS:
    text=get(SIMBAD,{"Ident":RESOLVE_AS.get(name,name),"output.format":"ASCII"})
    main=re.search(r"Object\s+(.+?)\s+---\s+(.+?)\s+---",text)
    gaia=re.search(r"Gaia DR3\s+(\d+)",text)
    aliases=[]
    for prefix in ("HIP ","HD ","GJ ","Gaia DR3 "):
        aliases.extend(re.findall(rf"{re.escape(prefix)}[^\s<]+",text))
    if not gaia:
        hip_match=re.search(r"HIP\s+(\d+)",text)
        hip=hip_row(hip_match.group(1)) if hip_match else None
        if hip:
            p,pe=num(hip,"plx"),num(hip,"e_plx"); distance=1000/p if p and p>0 and pe/p<=0.2 else None
            ra,dec=map(math.radians,(num(hip,"ra"),num(hip,"dec"))); cart=[distance*math.cos(dec)*math.cos(ra),distance*math.cos(dec)*math.sin(ra),distance*math.sin(dec)] if distance else None
            records.append({"id":slug,"primaryName":name,"aliases":sorted(set(aliases)),"objectType":main.group(2).strip() if main else "star","systemId":system,
              "systemRelationship":"component; rendered as system marker when unresolved" if system else None,"sourceCatalog":"Hipparcos new reduction; name/type cross-checked with SIMBAD",
              "source_id":f"HIP {hip['hip']}","release":"Hipparcos new reduction","queryDate":dt.date.today().isoformat(),"referenceEpoch":1991.25,
              "ra":num(hip,"ra"),"dec":num(hip,"dec"),"parallax":p,"parallax_error":pe,"pmra":num(hip,"pm_ra"),"pmra_error":num(hip,"e_pm_ra"),"pmdec":num(hip,"pm_de"),"pmdec_error":num(hip,"e_pm_de"),
              "radial_velocity":None,"radial_velocity_error":None,"radialVelocityAvailable":False,"phot_g_mean_mag":None,"bp_rp":None,"ruwe":None,"distancePc":distance,"distanceLy":distance*LY if distance else None,
              "distanceMethod":"inverse Hipparcos parallax; only used when fractional uncertainty <= 20%","cartesianPc":cart,"coordinateFrame":"heliocentric ICRS Cartesian","transformationStatus":"computed from Hipparcos ICRS",
              "dataStatus":"supplemental Hipparcos","qualityNotes":["Gaia DR3 identifier unavailable or saturated bright source"],"uncertaintyNotes":["radial velocity unavailable in deployed record; 3D velocity incomplete","component separation/orbit not visualized"]})
            continue
        records.append({"id":slug,"primaryName":name,"aliases":sorted(set(aliases)),"objectType":main.group(2).strip() if main else "star",
          "systemId":system,"sourceCatalog":"SIMBAD cross-check; no Gaia DR3 source resolved","source_id":main.group(1).strip() if main else name,"release":"Gaia DR3",
          "dataStatus":"representative only","qualityNotes":["No Gaia DR3 identifier resolved; system marker only"],"uncertaintyNotes":["No fabricated component separation or orbit"]})
        continue
    row=gaia_row(gaia.group(1))
    if not row: continue
    p,pe=num(row,"parallax"),num(row,"parallax_error"); distance=1000/p if p and p>0 and pe/p<=0.2 else None
    rv=num(row,"radial_velocity")
    status="high-confidence astrometry" if distance and num(row,"ruwe") and num(row,"ruwe")<=1.4 and row.get("duplicated_source")=="false" else "catalog astrometry"
    if rv is None: status="incomplete 6D state"
    ra,dec=map(math.radians,(num(row,"ra"),num(row,"dec"))); d=distance
    cart=[d*math.cos(dec)*math.cos(ra),d*math.cos(dec)*math.sin(ra),d*math.sin(dec)] if d else None
    records.append({"id":slug,"primaryName":name,"aliases":sorted(set(aliases+[row["designation"]])),"objectType":main.group(2).strip() if main else "star",
      "systemId":system,"systemRelationship":"component; rendered as system marker when unresolved" if system else None,
      "sourceCatalog":"Gaia DR3; name/type cross-checked with SIMBAD","source_id":row["source_id"],"release":"Gaia DR3","queryDate":dt.date.today().isoformat(),
      "referenceEpoch":2016.0,"ra":num(row,"ra"),"dec":num(row,"dec"),"parallax":p,"parallax_error":pe,"pmra":num(row,"pmra"),"pmra_error":num(row,"pmra_error"),
      "pmdec":num(row,"pmdec"),"pmdec_error":num(row,"pmdec_error"),"radial_velocity":rv,"radial_velocity_error":num(row,"radial_velocity_error"),
      "radialVelocityAvailable":rv is not None,"phot_g_mean_mag":num(row,"phot_g_mean_mag"),"bp_rp":num(row,"bp_rp"),"ruwe":num(row,"ruwe"),
      "distancePc":distance,"distanceLy":distance*LY if distance else None,"distanceMethod":"inverse parallax; only used when fractional uncertainty <= 20%",
      "cartesianPc":cart,"coordinateFrame":"heliocentric ICRS Cartesian","transformationStatus":"computed from Gaia DR3 ICRS",
      "dataStatus":status,"qualityNotes":[],"uncertaintyNotes":([] if rv is not None else ["radial velocity unavailable; 3D velocity incomplete"])+(["component separation/orbit not visualized"] if system else [])})
for record in records:
    if record.get("distancePc") is not None or not record.get("systemId"): continue
    marker=next((x for x in records if x.get("systemId")==record["systemId"] and x.get("distancePc") is not None),None)
    if not marker: continue
    for key in ("ra","dec","parallax","parallax_error","pmra","pmra_error","pmdec","pmdec_error","distancePc","distanceLy","distanceMethod","cartesianPc","coordinateFrame","referenceEpoch","queryDate"):
        record[key]=marker.get(key)
    record["sourceCatalog"] += f"; system marker position from {marker['sourceCatalog']}"
    record["transformationStatus"]="co-located system marker; internal component separation not rendered"
    record["qualityNotes"].append("System-level marker uses the catalog position of a resolved component")
    record["uncertaintyNotes"].append("Component separation and orbit are intentionally not visualized")
OUT.write_text(json.dumps({"schemaVersion":1,"records":[{"id":"sun","primaryName":"Sun","aliases":["Sol"],"objectType":"star","systemId":"solar-system","sourceCatalog":"IAU/NASA","source_id":"NAIF 10","release":"official solar-system identifier","distancePc":0,"distanceLy":0,"cartesianPc":[0,0,0],"dataStatus":"representative only","qualityNotes":[],"uncertaintyNotes":["Scene origin"]}]+records},indent=2),encoding="utf-8")
print(f"wrote {len(records)+1} landmarks")
