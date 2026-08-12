import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("./milky-way-scientific-model.js",import.meta.url),"utf8");
const contract=JSON.parse(await readFile(new URL("./assets/deep-space/milky-way-scientific-scale/source-contract.json",import.meta.url),"utf8"));
const sourceRegistry=JSON.parse(await readFile(new URL("./assets/deep-space/astronomical-source-registry.json",import.meta.url),"utf8"));
const context={globalThis:{}};
vm.runInNewContext(source,context);
const Model=context.globalThis.PCSMilkyWayScientificModel;

test("representative Milky Way tracers are deterministic for model version and seed",()=>{
  const first=Model.build(contract),second=Model.build(contract);
  assert.equal(first.seed,4172019);
  assert.equal(first.modelVersion,"2026.08-reid2019-gravity2019");
  assert.equal(JSON.stringify(first),JSON.stringify(second));
  assert.equal(first.representativeTracerCount,11450);
  assert.equal(Model.build(contract,{mobile:true}).representativeTracerCount,3960);
});

test("every generated density point is representative rather than a catalog star",()=>{
  const model=Model.build(contract);
  for(const tracer of [...model.density,...model.armDensity]){
    assert.equal(tracer.visualizationStatus,"representative density visualization");
    assert.equal(tracer.objectType,"Representative Density Tracer");
    assert.equal(tracer.scientificFidelityLevel,"C");
    assert.equal(tracer.scientificDataCategory,"representative visualization");
    assert.notEqual(tracer.dataStatus,"catalog observation");
    assert.equal(Array.isArray(tracer.position),true);
    assert.equal(tracer.position.every(Number.isFinite),true);
  }
  assert.equal(model.density.filter(item=>item.component==="thin-disk").length,contract.lod.desktopCounts.thinDisk);
  assert.equal(model.density.filter(item=>item.component==="thick-disk").length,contract.lod.desktopCounts.thickDisk);
});

test("arm density stays within named published segments and preserves exact counts",()=>{
  const model=Model.build(contract),groups=Map.groupBy(model.armDensity,tracer=>tracer.armId);
  assert.equal(groups.size,contract.spiralArmModel.arms.length);
  assert.equal(model.armDensity.length,contract.lod.desktopCounts.spiralArms);
  for(const arm of contract.spiralArmModel.arms){
    const tracers=groups.get(arm.id);
    assert.ok(tracers.length>0);
    assert.ok(tracers.every(tracer=>tracer.structureId===`milky-way:arm:${arm.id}`&&tracer.dataStatus==="observation-based reconstruction"));
    assert.ok(Math.abs(Model.armRadius(arm,arm.betaKinkDeg)-arm.radiusKinkKpc)<1e-10);
  }
});

test("the Local Arm navigation anchor is model-derived and spatially associated with the Sun",()=>{
  const arm=contract.spiralArmModel.arms.find(item=>item.id==="local"),closest=Model.closestArmPoint(arm,contract.coordinateFrame.sunPositionKpc);
  assert.ok(closest.betaDeg>=arm.betaRangeDeg[0]&&closest.betaDeg<=arm.betaRangeDeg[1]);
  assert.ok(closest.distanceKpc<1);
  assert.notDeepEqual([...closest.position],contract.coordinateFrame.sunPositionKpc);
});

test("catalog coordinate transforms do not mutate the observed input",()=>{
  const record={sourceId:"test",heliocentricGalacticCartesianKpc:[1,2,3],dataStatus:"catalog-observation"};
  const transformed=Model.transformHmsfr(record,contract.coordinateFrame);
  assert.ok(Math.abs(transformed.galactocentricCartesianKpc[0]+7.178)<1e-12);
  assert.ok(Math.abs(transformed.galactocentricCartesianKpc[1]-2)<1e-12);
  assert.ok(Math.abs(transformed.galactocentricCartesianKpc[2]-3.0208)<1e-12);
  assert.deepEqual(record.heliocentricGalacticCartesianKpc,[1,2,3]);
  assert.equal(transformed.dataStatus,"catalog-observation");
  assert.equal(transformed.scientificFidelityLevel,"B");
  assert.equal(transformed.scientificDataCategory,"catalog-derived");
});

test("shared astronomical source registry identifies every Milky Way source family",()=>{
  const ids=new Set(sourceRegistry.sources.map(source=>source.sourceId));
  for(const id of ["gravity-2019-galactic-center-distance","vizier-j-apj-885-131","gaia-edr3-gcns","milky-way-structural-model-literature"])assert.ok(ids.has(id),id);
});
