import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("./milky-way-layer.js",import.meta.url),"utf8");
const modelSource=await readFile(new URL("./milky-way-scientific-model.js",import.meta.url),"utf8");
const index=await readFile(new URL("./index.html",import.meta.url),"utf8");
const registry=JSON.parse(await readFile(new URL("./assets/deep-space/phase-3/milky-way-hmsfr.json",import.meta.url),"utf8"));
const localGroup=JSON.parse(await readFile(new URL("./assets/deep-space/phase-3/local-group-galaxies.json",import.meta.url),"utf8"));
const contract=JSON.parse(await readFile(new URL("./assets/deep-space/milky-way-scientific-scale/source-contract.json",import.meta.url),"utf8"));
const dynamicsContract=JSON.parse(await readFile(new URL("./assets/deep-space/milky-way-scientific-scale/dynamics-contract.json",import.meta.url),"utf8"));
const sourceRegistry=JSON.parse(await readFile(new URL("./assets/deep-space/astronomical-source-registry.json",import.meta.url),"utf8"));

test("Milky Way layer reuses the existing Cesium Viewer and one canvas",()=>{
  assert.match(source,/PointPrimitiveCollection/);
  assert.match(source,/PolylineCollection/);
  assert.match(source,/LabelCollection/);
  assert.doesNotMatch(source,/new Cesium\.Viewer|createElement\(["']canvas|requestAnimationFrame/);
  assert.ok(index.indexOf("milky-way-scientific-model.js")<index.indexOf("milky-way-layer.js"));
});

test("all 199 Reid 2019 HMSFR catalog observations remain distinct from model tracers",()=>{
  assert.equal(registry.records.length,199);
  assert.ok(registry.records.every(record=>record.dataStatus==="catalog-observation"&&record.visualizationStatus==="observed-tracer"));
  assert.match(source,/this\.model\.armDensity/);
  assert.match(source,/pickable:false/);
  assert.doesNotMatch(modelSource,/Math\.random/);
});

test("spiral reconstruction is bounded by the published Reid 2019 Table 2 fits",()=>{
  assert.equal(contract.spiralArmModel.source.table,"Table 2");
  assert.equal(contract.spiralArmModel.source.doi,"10.3847/1538-4357/ab4a11");
  assert.deepEqual(contract.spiralArmModel.arms.map(arm=>arm.id),["norma","scutum-centaurus","sagittarius-carina","local","perseus","outer"]);
  assert.ok(contract.spiralArmModel.arms.every(arm=>arm.betaRangeDeg.length===2&&arm.radiusKinkKpc>0&&arm.widthKpc>0));
  assert.match(modelSource,/arm\.betaRangeDeg\[0\]\+\(arm\.betaRangeDeg\[1\]-arm\.betaRangeDeg\[0\]\)/);
});

test("Sun, Galactic Center, Sagittarius A*, disk, bar, bulge and halo are explicit",()=>{
  assert.deepEqual(contract.coordinateFrame.sunPositionKpc,[-8.178,0,0.0208]);
  assert.deepEqual(contract.anchors.galacticCenter.galactocentricCartesianKpc,[0,0,0]);
  assert.deepEqual(contract.anchors.sagittariusAStar.galactocentricCartesianKpc,[0,0,0]);
  assert.equal(contract.anchors.sagittariusAStar.visualizationStatus,"visibility-enhanced representative marker");
  for(const key of ["stellarDisk","bar","bulge","stellarHalo"])assert.ok(contract.components[key]);
  assert.equal(contract.components.stellarHalo.notice.includes("not a dark-matter-halo boundary"),true);
});

test("LMC and SMC reuse catalog directions/distances and remain outside the displayed stellar disk",()=>{
  const extent=contract.components.stellarDisk.displayedRadialExtentKpc;
  for(const name of ["LMC","SMC"]){
    const record=localGroup.records.find(item=>item.canonicalName===name);
    assert.equal(record.dataStatus,"catalog-observation");
    assert.ok(record.distanceKpc>45);
    const [hx,hy,hz]=record.heliocentricGalacticCartesianKpc;
    const galactocentric=[hx-contract.coordinateFrame.galactocentricDistanceKpc,hy,hz+contract.coordinateFrame.sunHeightKpc];
    assert.ok(Math.hypot(...galactocentric)>extent);
  }
});

test("layer lifecycle and scientific visibility controls are complete",()=>{
  for(const method of ["load(","show()","hide()","unload()","dispose()","setLabels(","translateLabels(","searchNearby(","setReconstruction(","setCatalog(","setDensity(","setHalo(","setPlane(","fitCoordinates(","setModelTime(","recordAtModelTime("])assert.ok(source.includes(method));
});

test("the reopened Milky Way fit and dynamics contracts remain scientifically separate",()=>{
  assert.match(source,/fitCoordinates\(\{includeSatellites=false,includeHalo=false\}/);
  assert.match(source,/Dynamics\.evolveRecord/);
  assert.equal(dynamicsContract.rotationCurve.minimumRadiusKpc,5);
  assert.equal(dynamicsContract.rotationCurve.maximumRadiusKpc,25);
  const sourceEntry=sourceRegistry.sources.find(entry=>entry.sourceId==="eilers-2019-galactic-rotation-curve");
  assert.equal(sourceEntry.DOI,"10.3847/1538-4357/aaf648");
  assert.match(sourceEntry.qualityStatus,/not a precision future ephemeris/);
});

test("layer audit distinguishes catalogs, reconstructions and deterministic representative tracers",()=>{
  assert.equal(contract.layerAudit.syntheticDecorativeVisibleCount,0);
  assert.equal(contract.layerAudit.visibleLayers.length,9);
  assert.deepEqual(new Set(contract.layerAudit.visibleLayers.map(layer=>layer.classification)),new Set(["catalog-derived","observation-derived reconstruction","representative visualization"]));
  assert.ok(contract.layerAudit.visibleLayers.filter(layer=>layer.classification==="representative visualization").every(layer=>layer.identityPolicy.includes("No ")||layer.id==="galactic-plane-grid"));
  assert.deepEqual(contract.layerAudit.notRendered.map(layer=>layer.class),["globular clusters","open clusters","nebulae and star-forming regions beyond the HMSFR catalog","molecular clouds"]);
  assert.match(contract.layerAudit.determinism,/4172019/);
  assert.match(source,/syntheticDecorativeVisibleCount:0/);
});
