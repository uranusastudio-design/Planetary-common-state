import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {createHash} from "node:crypto";

const observatory=path.resolve(import.meta.dirname,"..");
globalThis.window=globalThis;
for(const file of ["nearby-stars.js","phase3-coordinates.js","milky-way-scientific-model.js","milky-way-dynamics.js","milky-way-kepler.js"]){
  vm.runInThisContext(fs.readFileSync(path.join(observatory,file),"utf8"),{filename:file});
}

const readJson=file=>JSON.parse(fs.readFileSync(path.join(observatory,file),"utf8"));
const sourceContract=readJson("assets/deep-space/milky-way-scientific-scale/source-contract.json");
const dynamicsContract=readJson("assets/deep-space/milky-way-scientific-scale/dynamics-contract.json");
const nearby=readJson("assets/deep-space/nearby-stars/nearby-stars-100pc.json");
const landmarks=readJson("assets/deep-space/nearby-stars/landmark-systems.json");
const hmsfrBundle=readJson("assets/deep-space/phase-3/milky-way-hmsfr.json");
const keplerSource=readJson("assets/deep-space/milky-way-kepler/kepler-observed-stars.json");
const Model=globalThis.PCSMilkyWayScientificModel,Dynamics=globalThis.PCSMilkyWayDynamics,Nearby=globalThis.PCSNearbyStars,Kepler=globalThis.PCSMilkyWayKepler;

function runtimeGaia(maxRecords=1200){
  const combined=[...landmarks.records,...nearby.records],seen=new Set(),records=[];
  for(const record of combined){
    const key=String(record.source_id||record.id||"");
    if(!key||seen.has(key)||records.length>=maxRecords)continue;
    seen.add(key);
    records.push(Model.transformNearbyStar(record,sourceContract.coordinateFrame,Nearby.galacticCartesian(record)));
  }
  return records;
}
const hmsfr=hmsfrBundle.records.map(record=>Model.transformHmsfr(record,sourceContract.coordinateFrame));
const model=Model.build(sourceContract,{mobile:false});
const gaia=runtimeGaia();
const kepler=Kepler.transformBundle(keplerSource,sourceContract.coordinateFrame).records;
const quadrant=position=>position[0]>=0?(position[1]>=0?"Q1":"Q4"):(position[1]>=0?"Q2":"Q3");
function quadrantCounts(records,position=value=>value.position||value.galactocentricCartesianKpc){
  const counts={Q1:0,Q2:0,Q3:0,Q4:0};
  for(const record of records)counts[quadrant(position(record))]+=1;
  return counts;
}
function componentCounts(records,key){
  const result={};
  for(const record of records){const id=record[key]||"unclassified";(result[id]??={Q1:0,Q2:0,Q3:0,Q4:0})[quadrant(record.position)]+=1;}
  return result;
}
function diagnostic(radiusKpc,theta0Rad){
  const initial=[radiusKpc*Math.cos(theta0Rad),radiusKpc*Math.sin(theta0Rad),0];
  const states=Object.fromEntries([1,10,50,100].map(offset=>[offset,Dynamics.circularEvolution(initial,offset,dynamicsContract)]));
  const velocity=Dynamics.circularVelocityKmS(radiusKpc,dynamicsContract);
  return {radiusKpc,initialPositionKpc:initial,initialThetaRad:theta0Rad,circularVelocityKmS:velocity,omegaRadPerMyr:Math.abs(states[1].angularOffsetRad),epochsMyr:Object.fromEntries(Object.entries(states).map(([offset,state])=>[offset,{propagatedPositionKpc:state.position,finalThetaRad:Math.atan2(state.position[1],state.position[0]),deltaThetaRad:state.angularOffsetRad,deltaThetaDeg:state.angularOffsetRad*180/Math.PI}]))};
}
const diagnostics=[diagnostic(6,Math.PI),diagnostic(sourceContract.coordinateFrame.galactocentricDistanceKpc,Math.PI),diagnostic(12,Math.PI)];
const omegaDistinct=new Set(diagnostics.map(item=>item.omegaRadPerMyr.toFixed(12))).size===diagnostics.length;
const gaiaComplete=gaia.filter(record=>Dynamics.icrsVelocityKmS(record)).length;
const digest=file=>createHash("sha256").update(fs.readFileSync(path.join(observatory,file))).digest("hex");
const report={
  generatedAt:new Date().toISOString(),
  status:"AUDIT — MILKY WAY NOT COMPLETE",
  frame:{id:sourceContract.coordinateFrame.id,origin:sourceContract.coordinateFrame.origin,axes:sourceContract.coordinateFrame.axes,quadrants:"Q1 x>=0/y>=0; Q2 x<0/y>=0; Q3 x<0/y<0; Q4 x>=0/y<0. Face-on screen left corresponds to negative Galactocentric x, the Sun side."},
  dynamics:{modelId:dynamicsContract.modelId,modelVersion:dynamicsContract.version,source:dynamicsContract.rotationCurve.sourceDoi,method:"axisymmetric differential circular rotation; no rigid root rotation",diagnostics,omegaDistinct,sun:{initialPositionKpc:sourceContract.coordinateFrame.sunPositionKpc,referenceFrame:sourceContract.coordinateFrame.id,displayFrame:"Galactic Center fixed; not Sun-co-moving",velocitySource:"Eilers et al. 2019 circular-velocity curve",circularVelocityKmS:Dynamics.circularVelocityKmS(sourceContract.coordinateFrame.galactocentricDistanceKpc,dynamicsContract)},gaia:{renderedCount:gaia.length,full6dCount:gaiaComplete,incomplete3dVelocityCount:gaia.length-gaiaComplete,referenceEpoch:"J2016.0 for Gaia EDR3/GCNS records; individual supplements preserve their source epoch",propagation:"uniform rectilinear motion, capped at ±1 Myr; radial velocity required; unavailable is never zero"},kepler:{databaseCount:kepler.length,gaiaCrossMatchedCount:keplerSource.counts.recordsWithGaiaDr3,full6dCount:keplerSource.counts.full6d,incomplete3dVelocityCount:keplerSource.counts.incomplete6d,referenceEpochs:"KIC ICRS/J2000 preserved; Gaia DR3 cross-matches use J2016.0",propagation:"only Gaia-cross-matched full-6D records use uniform rectilinear propagation capped at ±1 Myr; all missing radial velocities remain null and static"},staticPolicies:dynamicsContract.componentPolicies},
  asymmetry:{
    scientificQuadrants:{gaiaObservedStars:quadrantCounts(gaia),hmsfr:quadrantCounts(hmsfr),keplerTargets:quadrantCounts(kepler),keplerConfirmedHosts:quadrantCounts(kepler.filter(record=>record.confirmedPlanets?.length)),keplerCandidateHosts:quadrantCounts(kepler.filter(record=>!record.confirmedPlanets?.length&&record.candidatePlanets?.length)),catalogAnchors:{Q1:1,Q2:1,Q3:0,Q4:0},reconstructionArmPopulation:quadrantCounts(model.armDensity),representativeDensityTracers:quadrantCounts(model.density)},
    keplerSelection:{counts:keplerSource.counts,samplePolicy:keplerSource.samplePolicy,footprintMethod:keplerSource.footprint.method},
    representativeComponents:componentCounts(model.density,"component"),
    reconstructionArmSegments:componentCounts(model.armDensity,"armId"),
    gaiaGalactocentricBoundsKpc:{x:[Math.min(...gaia.map(record=>record.galactocentricCartesianKpc[0])),Math.max(...gaia.map(record=>record.galactocentricCartesianKpc[0]))],y:[Math.min(...gaia.map(record=>record.galactocentricCartesianKpc[1])),Math.max(...gaia.map(record=>record.galactocentricCartesianKpc[1]))]},
    diagnosis:[
      {cause:"heliocentric survey geometry",classification:"observational selection",evidence:"All deployed GCNS stars are within 100 pc of the Sun, so every scientific point lies on the negative-x Sun side. In the fixed whole-Galaxy browser view, the Gaia-only capture shows these points are distance-faded and do not create the current bright arm structure."},
      {cause:"point overdraw",classification:"bounded rendering risk, not the current overview cause",evidence:"The 1,200 nearby catalog markers occupy a tiny Galactic region, but the runtime NearFarScalar fades them to zero at the audited whole-Galaxy camera distance. They may emerge only at closer LOD and remain independently toggleable."},
      {cause:"HMSFR footprint and arm fit coverage",classification:"observational selection plus reconstruction",evidence:"Reid HMSFR measurements and source-bounded arm beta ranges are not azimuthally complete and must not be mirrored for symmetry."},
      {cause:"representative smooth density",classification:"model sampling",evidence:"Thin/thick disk and halo samples are approximately quadrant-balanced; the bar/bulge follow their adopted orientation."},
      {cause:"camera clipping / LOD bug",classification:"not supported",evidence:"Fixed-camera Gaia-only, HMSFR-only, reconstruction-only and representative-only browser captures show the expected scientific populations without edge clipping. The representative disk remains approximately quadrant-balanced."},
      {cause:"Kepler field geometry",classification:"observational selection",evidence:`The Kepler target layer is a narrow mission footprint: ${kepler.length.toLocaleString()} deployed real records from an upstream ${keplerSource.counts.upstreamKeplerStellar.toLocaleString()}-target DR25 table. It is independently toggleable and is not normalized with Gaia or tracers.`}
    ]
  },
  inputChecksums:{sourceContract:digest("assets/deep-space/milky-way-scientific-scale/source-contract.json"),dynamicsContract:digest("assets/deep-space/milky-way-scientific-scale/dynamics-contract.json"),gaia100pc:digest("assets/deep-space/nearby-stars/nearby-stars-100pc.json"),hmsfr:digest("assets/deep-space/phase-3/milky-way-hmsfr.json"),kepler:digest("assets/deep-space/milky-way-kepler/kepler-observed-stars.json")}
};

const output=process.argv[2]||path.join(observatory,"test-results","milky-way-dynamics-asymmetry-audit-2026-08-13","scientific-audit.json");
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({output,status:report.status,omegaDistinct,quadrants:report.asymmetry.scientificQuadrants,gaia:report.dynamics.gaia},null,2));
