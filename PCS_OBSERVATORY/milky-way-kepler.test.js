import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const directory=new URL("./",import.meta.url),read=name=>fs.readFileSync(new URL(name,directory),"utf8"),bundle=JSON.parse(read("assets/deep-space/milky-way-kepler/kepler-observed-stars.json"));
const context={globalThis:{}};context.globalThis.globalThis=context.globalThis;vm.createContext(context);for(const file of ["phase3-coordinates.js","milky-way-kepler.js"])vm.runInContext(read(file),context,{filename:file});
const Kepler=context.globalThis.PCSMilkyWayKepler,frame={id:"pcs-galactocentric-gravity2019-v2",galactocentricDistanceKpc:8.178,sunHeightKpc:.0208};

test("Kepler bundle is a traceable DR25/Gaia scientific subset",()=>{
  assert.equal(bundle.datasetId,"pcs-mw-kepler-observed-stars-v1");
  assert.equal(bundle.counts.upstreamKeplerStellar,200038);
  assert.equal(bundle.counts.deployedRecords,bundle.records.length);
  assert.ok(bundle.counts.deployedRecords>12000);
  assert.ok(bundle.counts.recordsWithGaiaDr3>1900);
  assert.equal(bundle.counts.full6d+bundle.counts.incomplete6d,bundle.records.length);
  assert.ok(bundle.sources.some(source=>source.table==="q1_q17_dr25_ks"));
  assert.ok(bundle.sources.some(source=>source.table==="gaiadr3.gaia_source"));
  assert.match(bundle.footprint.method,/target coordinates/i);
  assert.ok(bundle.footprint.perimeter.length>=20);
});

test("priority Kepler systems preserve KIC and Gaia identities",()=>{
  for(const name of ["Kepler-10","Kepler-11","Kepler-22","Kepler-62","Kepler-90","Kepler-186","Kepler-452"]){
    const record=bundle.records.find(item=>item.canonicalName===name||item.aliases.includes(name));
    assert.ok(record,`${name} is present`);
    assert.match(record.kepid,/^\d+$/);
    assert.ok(record.aliases.includes(`KIC ${record.kepid}`));
    assert.ok(record.confirmedPlanets.length>=1);
    assert.match(record.gaiaSourceId,/^\d{16,20}$/);
  }
});

test("missing radial velocity remains unavailable and prevents 3D propagation",()=>{
  const incomplete=bundle.records.filter(record=>record.radial_velocity==null);
  assert.ok(incomplete.length<=bundle.counts.incomplete6d);
  assert.ok(incomplete.length>10000);
  assert.ok(incomplete.every(record=>record.motionClass==="insufficient-6D"));
  assert.ok(incomplete.every(record=>record.radial_velocity!==0));
  assert.equal(bundle.records.filter(record=>record.motionClass==="insufficient-6D").length,bundle.counts.incomplete6d);
  const complete=bundle.records.filter(record=>record.motionClass==="catalog-propagatable");
  assert.equal(complete.length,bundle.counts.full6d);
  assert.ok(complete.every(record=>Number.isFinite(record.radial_velocity)));
});

test("coordinate transform preserves original observations and deterministic render partitions",()=>{
  const transformed=Kepler.transformBundle(bundle,frame),record=transformed.records.find(item=>item.canonicalName==="Kepler-186");
  assert.equal(record.kepid,bundle.records.find(item=>item.canonicalName==="Kepler-186").kepid);
  assert.equal(record.originalKicCoordinates.epoch,"J2000");
  assert.ok(record.galactocentricCartesianKpc.every(Number.isFinite));
  assert.ok(record.heliocentricGalacticCartesianKpc.every(Number.isFinite));
  const first=Kepler.renderPartition(transformed.records),second=Kepler.renderPartition(transformed.records);
  assert.deepEqual(first,second);
  assert.equal(first.confirmed.length,bundle.counts.confirmedHosts);
  assert.equal(first.candidates.length,bundle.counts.candidateHosts);
  assert.ok(first.ordinary.length<=4600);
  const ids=[...first.ordinary,...first.confirmed,...first.candidates].map(item=>item.id);
  assert.equal(new Set(ids).size,ids.length);
});

test("Milky Way UI exposes independent observed, reconstructed and Kepler debug layers",()=>{
  const manager=read("deep-space.js"),layer=read("milky-way-layer.js"),html=read("index.html");
  for(const name of ["gaia","hmsfr","reconstruction","representative","local-arm","spiral-arms","kepler-field","kepler-targets","kepler-hosts","kepler-candidates","diagnostics"])assert.match(manager,new RegExp(`data-ds-mw-layer=\\"${name}\\"`));
  for(const method of ["setGaiaObserved","setHmsfr","setReconstruction","setDensity","setLocalArm","setSpiralArmReconstruction","setKeplerField","setKeplerTargets","setKeplerHosts","setKeplerCandidates","setDiagnostics"])assert.match(layer,new RegExp(method));
  assert.match(html,/milky-way-kepler\.js/);
  assert.doesNotMatch(layer,/rotate\(milkyWayRoot\)/);
});
