import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("./milky-way-dynamics.js",import.meta.url),"utf8"),contract=JSON.parse(await readFile(new URL("./assets/deep-space/milky-way-scientific-scale/dynamics-contract.json",import.meta.url),"utf8")),context={globalThis:{}};
vm.runInNewContext(source,context);
const Dynamics=context.globalThis.PCSMilkyWayDynamics;

test("Eilers 2019 rotation curve is applied only inside its adopted radial range",()=>{
  assert.equal(Dynamics.circularVelocityKmS(4.99,contract),null);
  assert.equal(Dynamics.circularVelocityKmS(25.01,contract),null);
  assert.ok(Math.abs(Dynamics.circularVelocityKmS(8.178,contract)-229)<1e-12);
  assert.ok(Dynamics.circularVelocityKmS(18,contract)<229);
});

test("differential rotation changes azimuth without changing radius or height",()=>{
  const inner=Dynamics.circularEvolution([-8.178,0,.0208],100,contract),outer=Dynamics.circularEvolution([-16,0,.3],100,contract);
  assert.ok(Math.abs(Math.hypot(inner.position[0],inner.position[1])-8.178)<1e-10);
  assert.ok(Math.abs(inner.position[2]-.0208)<1e-12);
  assert.notEqual(inner.angularOffsetRad,outer.angularOffsetRad);
  assert.equal(inner.motionClass,"model-integrated");
  assert.ok(inner.position[1]>0,"coordinate contract requires the Sun to move toward positive Galactic y");
});

test("inner bar, bulge, halo and Magellanic anchors never inherit disk rotation",()=>{
  for(const record of [
    {component:"galactic-bar",position:[3,0,0]},
    {component:"galactic-bulge",position:[2,0,0]},
    {component:"stellar-halo",position:[12,0,4]},
    {objectType:"satellite galaxy",galactocentricCartesianKpc:[-1,-40,-30]}
  ]){
    const result=Dynamics.evolveRecord(record,100,contract);
    assert.equal(result.motionClass,"static-observation");
    assert.deepEqual([...result.position],record.position||record.galactocentricCartesianKpc);
  }
});

test("Gaia catalog propagation requires a measured radial velocity and is capped at one Myr",()=>{
  const base={objectType:"catalog star",ra:10,dec:20,distancePc:10,pmra:100,pmdec:-50,radial_velocity:20,heliocentricGalacticCartesianKpc:[.002,.004,.008],galactocentricCartesianKpc:[-8.176,.004,.0288]},sun=[-8.178,0,.0208],sunFuture=[-7,4,.0208],complete=Dynamics.nearbyStarEvolution(base,10,contract,sun,sunFuture),missing=Dynamics.nearbyStarEvolution({...base,radial_velocity:null},10,contract,sun,sunFuture);
  assert.equal(complete.motionClass,"catalog-propagated");
  assert.equal(complete.appliedOffsetMyr,1);
  assert.equal(complete.velocityComplete,true);
  assert.equal(missing.motionClass,"insufficient-motion-data");
  assert.deepEqual([...missing.position],base.galactocentricCartesianKpc);
});

test("motion policies keep spiral geometry separate from moving arm-population samples",()=>{
  assert.equal(Dynamics.policyFor({id:"milky-way:arm:local",galactocentricCartesianKpc:[-8,0,0]}),"static");
  assert.equal(Dynamics.policyFor({component:"spiral-arm",position:[-8,0,0]}),"armPopulationRepresentative");
  assert.doesNotMatch(source,/requestAnimationFrame|rotate\(milkyWayRoot\)/);
});
