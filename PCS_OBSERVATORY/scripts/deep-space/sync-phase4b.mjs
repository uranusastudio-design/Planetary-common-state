#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const OUT=path.join(ROOT,"assets/deep-space/phase-4b");
const RAW=path.join(OUT,"raw");
const URLS={
  readme:"https://cdsarc.cds.unistra.fr/ftp/J/ApJS/215/22/ReadMe",
  catalog:"https://cdsarc.cds.unistra.fr/ftp/J/ApJS/215/22/table2.dat"
};
const EXPECTED={
  readme:"4d560f8d8eb40669eba87c3034603364a78f5ce6e6be7bd4805bd959d7d207ed",
  catalog:"0edf63832d5e0381f6b8436e517583e1c98f182fcbbb69b31479406e2d6d16ea"
};
const REFERENCE_DISTANCE_MPC=16.5;
const C_KM_S=299792.458;
const MESSIER_BY_NGC=Object.freeze({"4374":"M84","4406":"M86","4472":"M49","4486":"M87","4649":"M60"});
const sha=value=>crypto.createHash("sha256").update(value).digest("hex");
const field=(line,start,end)=>line.slice(start-1,end).trim();
const number=value=>value===""?null:Number(value);
const round=(value,digits=8)=>value==null?null:Number(value.toFixed(digits));

async function fetchVerified(key){
  const sourceDir=process.env.PCS_PHASE4B_SOURCE_DIR;
  const local=sourceDir&&path.join(sourceDir,key==="readme"?"ReadMe":"table2.dat");
  const response=local&&fs.existsSync(local)?fs.readFileSync(local):Buffer.from(await (await fetch(URLS[key])).arrayBuffer());
  const digest=sha(response);
  if(digest!==EXPECTED[key])throw new Error(`${key} checksum mismatch: ${digest}`);
  return response;
}

function icrsToGalactic(raDeg,decDeg){
  const d=Math.PI/180,ra=raDeg*d,dec=decDeg*d,c=Math.cos(dec),v=[c*Math.cos(ra),c*Math.sin(ra),Math.sin(dec)];
  const matrix=[[-0.0548755604162154,-0.873437090234885, -0.4838350155487132],[0.4941094278755837,-0.4448296299600112,0.7469822444972189],[-0.8676661490190047,-0.1980763734312015,0.4559837761750669]];
  const r=matrix.map(row=>row.reduce((sum,value,index)=>sum+value*v[index],0));
  return {longitudeDeg:(Math.atan2(r[1],r[0])/d+360)%360,latitudeDeg:Math.asin(r[2])/d};
}
function galacticToSupergalactic(lonDeg,latDeg){
  const d=Math.PI/180,lon=lonDeg*d,lat=latDeg*d,c=Math.cos(lat),v=[c*Math.cos(lon),c*Math.sin(lon),Math.sin(lat)];
  const matrix=[[-0.735742574804,0.677261296414,0],[-0.074553778365,-0.080991471307,0.9939225904],[0.673145302109,0.731271165817,0.110081262225]];
  const r=matrix.map(row=>row.reduce((sum,value,index)=>sum+value*v[index],0));
  return {longitudeDeg:(Math.atan2(r[1],r[0])/d+360)%360,latitudeDeg:Math.asin(r[2])/d};
}
function shellPosition(raDeg,decDeg){
  const galactic=icrsToGalactic(raDeg,decDeg),supergalactic=galacticToSupergalactic(galactic.longitudeDeg,galactic.latitudeDeg),d=Math.PI/180,lon=supergalactic.longitudeDeg*d,lat=supergalactic.latitudeDeg*d,c=Math.cos(lat);
  return {galactic,supergalactic,cartesian:[REFERENCE_DISTANCE_MPC*c*Math.cos(lon),REFERENCE_DISTANCE_MPC*c*Math.sin(lon),REFERENCE_DISTANCE_MPC*Math.sin(lat)].map(value=>round(value))};
}
function parse(line){
  return {
    evcc:number(field(line,1,4)),vcc:number(field(line,6,9)),ngc:field(line,11,15)||null,
    raDeg:number(field(line,17,24)),decDeg:number(field(line,26,32)),fiberRaDeg:number(field(line,34,41)),fiberDecDeg:number(field(line,43,49)),fiberOffsetArcsec:number(field(line,51,57)),
    sdssHeliocentricVelocityKmS:number(field(line,59,64)),nedHeliocentricVelocityKmS:number(field(line,66,72)),membershipCode:field(line,74,74),vccMembershipCode:field(line,76,76)||null,
    morphology:field(line,78,85)||null,morphologyDetail:field(line,87,88)||null,ttype:number(field(line,90,92)),vccMorphology:field(line,94,112)||null
  };
}
const identityFor=(row,ambiguousNgc)=>row.ngc&&!ambiguousNgc.has(row.ngc)?`pcs:galaxy:ngc:${row.ngc.toLowerCase()}`:row.ngc?`pcs:galaxy:ngc:${row.ngc.toLowerCase()}:evcc:${row.evcc}`:row.vcc?`pcs:galaxy:vcc:${row.vcc}`:`pcs:galaxy:evcc:${row.evcc}`;
const aliasesFor=row=>{
  const values=[`EVCC ${row.evcc}`,row.vcc?`VCC ${row.vcc}`:null,row.ngc?`NGC ${row.ngc}`:null,MESSIER_BY_NGC[row.ngc]||null];
  return [...new Set(values.filter(Boolean))];
};

fs.mkdirSync(RAW,{recursive:true});
const [readmeBuffer,catalogBuffer]=await Promise.all([fetchVerified("readme"),fetchVerified("catalog")]);
fs.writeFileSync(path.join(RAW,"ReadMe"),readmeBuffer);fs.writeFileSync(path.join(RAW,"table2.dat"),catalogBuffer);
const parsed=catalogBuffer.toString("utf8").trimEnd().split(/\n/).map(parse);
if(parsed.length!==1589)throw new Error(`EVCC record count mismatch: ${parsed.length}`);
const ngcCounts=new Map();for(const row of parsed)if(row.ngc)ngcCounts.set(row.ngc,(ngcCounts.get(row.ngc)||0)+1);
const ambiguousNgc=new Set([...ngcCounts].filter(([,count])=>count>1).map(([ngc])=>ngc));
const galaxies=parsed.map(row=>{
  const position=shellPosition(row.raDeg,row.decDeg),velocity=row.sdssHeliocentricVelocityKmS??row.nedHeliocentricVelocityKmS,aliases=aliasesFor(row),messier=MESSIER_BY_NGC[row.ngc]||null;
  return {
    id:identityFor(row,ambiguousNgc),canonicalName:messier||row.ngc&&`NGC ${row.ngc}`||row.vcc&&`VCC ${row.vcc}`||`EVCC ${row.evcc}`,aliases,objectType:"Galaxy",parentStructure:"pcs:galaxy-cluster:virgo",catalogIds:aliases,identityCrossMatchStatus:row.ngc&&ambiguousNgc.has(row.ngc)?"Ambiguous shared NGC designation retained as separate EVCC records; not silently merged":"Canonical identity resolved from NGC, VCC, then EVCC priority",
    sourceFrame:"ICRS/J2000",sourceEpoch:"J2000",distanceConvention:"Individual distance unavailable; 16.5 Mpc is the catalog cluster reference distance only",redshiftConvention:"Derived z≈v_helio/c from catalog heliocentric recession velocity; never used as distance",cosmologyAssumption:"None for catalog membership or reference distance",transformVersion:"pcs-supergalactic-astropy-v1",
    ...row,preferredHeliocentricVelocityKmS:velocity,redshiftApprox:velocity==null?null:round(velocity/C_KM_S,8),velocitySource:row.sdssHeliocentricVelocityKmS!=null?"SDSS DR7":row.nedHeliocentricVelocityKmS!=null?"NED":"Unavailable",
    galacticLongitudeDeg:round(position.galactic.longitudeDeg),galacticLatitudeDeg:round(position.galactic.latitudeDeg),supergalacticLongitudeDeg:round(position.supergalactic.longitudeDeg),supergalacticLatitudeDeg:round(position.supergalactic.latitudeDeg),
    distanceMpc:null,representativeDisplayDistanceMpc:REFERENCE_DISTANCE_MPC,representativeSupergalacticCartesianMpc:position.cartesian,
    membershipStatus:row.membershipCode==="M"?"Member":"Possible member",membershipConfidence:row.membershipCode==="M"?"EVCC member from Virgo infall-model classification":"EVCC possible member from Virgo infall-model classification",
    observationStatus:"Catalog Observation",reconstructionStatus:null,visualizationStatus:"Representative Visualization — catalog sky direction on common Virgo reference shell; not an individual 3D distance",dataStatus:"Catalog Observation",
    sourceId:"vizier-j-apjs-215-22",sourceCatalog:"Extended Virgo Cluster Catalog (EVCC)",sourceDoi:"10.1088/0067-0049/215/2/22"
  };
});
const members=galaxies.filter(record=>record.membershipCode==="M"),possible=galaxies.filter(record=>record.membershipCode==="P"),velocities=galaxies.map(record=>record.preferredHeliocentricVelocityKmS).filter(Number.isFinite).sort((a,b)=>a-b);
const median=values=>values.length?(values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2):null;
const m87=galaxies.find(record=>record.aliases.includes("M87"));
if(!m87)throw new Error("M87 reference object missing");
const cluster={
  id:"pcs:galaxy-cluster:virgo",canonicalName:"Virgo Cluster",aliases:["Virgo Cluster","Virgo A Cluster"],objectType:"Galaxy Cluster",parentStructure:"Virgo region / Local Supercluster",catalogIds:["EVCC","VCC region"],
  sourceFrame:"ICRS/J2000",sourceEpoch:"J2000",distanceConvention:"EVCC adopted Virgo cluster reference distance",redshiftConvention:"Member velocity distribution from preferred SDSS DR7 or NED heliocentric velocities; no redshift-distance conversion",cosmologyAssumption:"None",transformVersion:"pcs-supergalactic-astropy-v1",
  raDeg:m87.raDeg,decDeg:m87.decDeg,galacticLongitudeDeg:m87.galacticLongitudeDeg,galacticLatitudeDeg:m87.galacticLatitudeDeg,supergalacticLongitudeDeg:m87.supergalacticLongitudeDeg,supergalacticLatitudeDeg:m87.supergalacticLatitudeDeg,distanceMpc:REFERENCE_DISTANCE_MPC,distanceUncertaintyMpc:null,distanceType:"Cluster reference distance adopted by EVCC; not an individual member distance",supergalacticCartesianMpc:m87.representativeSupergalacticCartesianMpc,
  memberCount:members.length,possibleMemberCount:possible.length,catalogObjectCount:galaxies.length,velocitySampleCount:velocities.length,velocityMinimumKmS:velocities[0]??null,velocityMedianKmS:median(velocities),velocityMaximumKmS:velocities.at(-1)??null,
  membershipStatus:"EVCC M/P classification from the Virgo infall model",observationStatus:"Catalog Observation",reconstructionStatus:null,visualizationStatus:"Catalog center marker; marker size is representative",dataStatus:"Catalog Observation plus derived velocity summary",
  sourceId:"vizier-j-apjs-215-22",sourceCatalog:"Extended Virgo Cluster Catalog (EVCC)",sourceDoi:"10.1088/0067-0049/215/2/22"
};
const ids=galaxies.map(record=>record.id);if(new Set(ids).size!==ids.length)throw new Error("Canonical identity collision in EVCC normalization");
for(const name of ["M84","M86","M49","M87","M60"])if(!galaxies.some(record=>record.aliases.includes(name)))throw new Error(`${name} cross-match missing`);
const bundle={schemaVersion:"pcs-deep-space-phase4b-v1",generatedAt:"2026-08-09",sourceId:"vizier-j-apjs-215-22",coverage:{skyAreaSquareDegrees:725,referenceDistanceMpc:REFERENCE_DISTANCE_MPC,referenceDistanceStatus:"Catalog-wide Virgo distance assumption; never substituted for individual galaxy distance",membershipMethod:"Virgo infall-model classification published by EVCC"},cluster,galaxyCount:galaxies.length,memberCount:members.length,possibleMemberCount:possible.length,velocitySampleCount:velocities.length,ambiguousSharedDesignationCount:ambiguousNgc.size,galaxies};
fs.writeFileSync(path.join(OUT,"virgo-cluster.json"),JSON.stringify(bundle,null,2)+"\n");
fs.writeFileSync(path.join(OUT,"source-contract.json"),JSON.stringify({schemaVersion:"pcs-source-contract-v1",adapter:"phase4b-evcc-2014",sourceFrame:"ICRS/J2000",sourceEpoch:"J2000",distanceConvention:"EVCC cluster reference distance 16.5 Mpc; individual distances unavailable and remain null",redshiftConvention:"Derived z≈v_helio/c from published heliocentric velocity; not used as distance",cosmologyAssumption:"None",transformVersion:"pcs-supergalactic-astropy-v1",sourceChecksums:EXPECTED,qualityStatus:"validated",knownLimitations:["EVCC membership is an infall-model classification, not a numeric membership probability.","Individual galaxy distances are not present in EVCC table 2 and remain unavailable.","The 3D display uses real catalog sky directions on a clearly labeled common 16.5 Mpc reference shell.","Coverage is the EVCC 725 square-degree footprint, not the full sky."]},null,2)+"\n");
console.log(JSON.stringify({galaxies:galaxies.length,members:members.length,possible:possible.length,velocitySamples:velocities.length,velocityMedianKmS:cluster.velocityMedianKmS,major:["M84","M86","M49","M87","M60"].map(name=>galaxies.find(record=>record.aliases.includes(name)).id)},null,2));
