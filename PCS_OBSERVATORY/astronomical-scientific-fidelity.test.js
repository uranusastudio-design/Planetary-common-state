import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("./astronomical-scientific-fidelity.js",import.meta.url),"utf8");
const window={PCSI18n:{getLanguage:()=>"en"}};
vm.runInNewContext(source,{window});
const Fidelity=window.PCSAstronomicalScientificFidelity;

test("scientific fidelity defines immutable Levels A through E",()=>{
  assert.deepEqual(Object.keys(Fidelity.LEVELS),["A","B","C","D","E"]);
  assert.deepEqual(Object.values(Fidelity.LEVELS).map(level=>level.canonicalName),["Precision Ephemeris","Catalog-Derived","Observation-Derived Reconstruction","Representative Large-Scale Visualization","Observational Sky Map"]);
});

test("scale contracts cover the continuous PCS observation sequence",()=>{
  assert.deepEqual(Object.keys(Fidelity.CONTRACTS),["solar","nearby","milky-way","local-group","galaxy-groups","virgo","laniakea","cosmic-web","observable-universe","cmb"]);
  assert.equal(Fidelity.classify({scaleContext:"solar"}).level,"A");
  assert.equal(Fidelity.classify({scaleContext:"nearby"}).level,"B");
  assert.equal(Fidelity.classify({scaleContext:"milky-way"}).level,"C");
  assert.equal(Fidelity.classify({scaleContext:"laniakea"}).level,"D");
  assert.equal(Fidelity.classify({scaleContext:"cmb"}).level,"E");
});

test("Milky Way catalog objects and reconstructed structures are not conflated",()=>{
  const star=Fidelity.classify({scaleContext:"milky-way",record:{objectType:"catalog star",dataStatus:"catalog astrometry",visualizationStatus:"representative marker size"}});
  const arm=Fidelity.classify({scaleContext:"milky-way",record:{objectType:"spiral arm / arm segment",dataStatus:"observation-based reconstruction"}});
  const tracer=Fidelity.classify({scaleContext:"milky-way",record:{objectType:"Representative Density Tracer",visualizationStatus:"representative density visualization"}});
  assert.equal(star.level,"B");
  assert.equal(star.categoryKey,"catalogObservation");
  assert.equal(arm.level,"C");
  assert.equal(arm.categoryKey,"reconstructedStructure");
  assert.equal(tracer.level,"C");
  assert.equal(tracer.categoryKey,"representativeDensityTracer");
});

test("Level A display scaling is not mislabeled as a Galactic density tracer",()=>{
  const sun=Fidelity.classify({scaleContext:"solar",record:{objectType:"star",dataStatus:"ephemeris",visualizationStatus:"Representative display scaling"}});
  assert.equal(sun.level,"A");
  assert.equal(sun.categoryKey,"referenceAnchor");
});

test("all required fidelity interface terms exist in four languages",()=>{
  const keys=["scientificFidelity","precisionEphemeris","catalogDerived","observationReconstruction","representativeLargeScale","observationalSkyMap","representativeDensityTracer","youAreHere","milkyWay","galacticCenter","localArm","dataSource","reconstruction","uncertainty","knownLimitations"];
  for(const language of ["en","zh-TW","ja","ko"])for(const key of keys)assert.ok(Fidelity.COPY[language][key],`${language}:${key}`);
});

test("CMB contract is a sky projection and not a physical shell",()=>{
  const result=Fidelity.classify({scaleContext:"cmb"});
  assert.equal(result.level,"E");
  assert.match(result.disclaimer,/projected|projection/i);
  assert.doesNotMatch(result.disclaimer,/literal physical shell surrounding Earth/i);
});
