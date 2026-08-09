#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const OUT=path.join(ROOT,"assets/deep-space/phase-4a");
const RAW=path.join(OUT,"raw");
const URLS={
  readme:"https://cdsarc.cds.unistra.fr/ftp/J/ApJ/843/16/ReadMe",
  groups:"https://cdsarc.cds.unistra.fr/ftp/J/ApJ/843/16/table2.dat.gz",
  galaxies:"https://cdsarc.cds.unistra.fr/ftp/J/ApJ/843/16/table3.dat.gz"
};
const EXPECTED={
  readme:"47bcea4a7430d6cf8323f40d8bc5e383c0b231622e9534cce345a6bdb6892d01",
  groups:"1e5bca96f6339905d07dccac4ed8cfe6148a9b193c1231794d57a51dbd502bab",
  galaxies:"dcddfa96bded7e3dc4c4354703bf1570ef92ae91820fd4d24dc3a56fd7071a3a"
};
const GROUP_ALIASES={
  13826:["IC 342 Group"],9892:["Maffei Group","Maffei 1 Group"],2789:["NGC 253 Group","Sculptor region"],
  46957:["Centaurus A Group","Cen A Group"],28630:["M81 Group"],43495:["M94 Group","Canes Venatici I Group"],
  48082:["M83 Group"],50063:["M101 Group"],39600:["M106 Group","Canes Venatici II Group"]
};
const MESSIER_BY_NGC={NGC0224:"M31",NGC0598:"M33",NGC3031:"M81",NGC3034:"M82",NGC4736:"M94",NGC4258:"M106",NGC5236:"M83",NGC5457:"M101",NGC5128:"Centaurus A"};
const sha=value=>crypto.createHash("sha256").update(value).digest("hex");
const field=(line,start,end)=>line.slice(start-1,end).trim();
const number=value=>value===""?null:Number(value);
const round=(value,digits=8)=>value==null?null:Number(value.toFixed(digits));
const spherical=(lonDeg,latDeg,distanceMpc)=>{const lon=lonDeg*Math.PI/180,lat=latDeg*Math.PI/180,c=Math.cos(lat);return [distanceMpc*c*Math.cos(lon),distanceMpc*c*Math.sin(lon),distanceMpc*Math.sin(lat)].map(v=>round(v));};
const aliasesFor=name=>{const compact=String(name||"").replace(/\s+/g,"").toUpperCase(),aliases=[];if(MESSIER_BY_NGC[compact])aliases.push(MESSIER_BY_NGC[compact]);return aliases;};

async function fetchVerified(key){const local=process.env.PCS_PHASE4A_SOURCE_DIR&&path.join(process.env.PCS_PHASE4A_SOURCE_DIR,key==="readme"?"kourkchi-tully-2017-ReadMe.txt":`${key}.dat.gz`);const buffer=local&&fs.existsSync(local)?fs.readFileSync(local):Buffer.from(await (await fetch(URLS[key])).arrayBuffer());const digest=sha(buffer);if(digest!==EXPECTED[key])throw new Error(`${key} checksum mismatch: ${digest}`);return buffer;}

const parseGroup=line=>({
  pgc1:number(field(line,1,7)),associationPgc1:number(field(line,9,15)),memberCount:number(field(line,17,19)),
  galacticLongitudeDeg:number(field(line,21,28)),galacticLatitudeDeg:number(field(line,30,37)),supergalacticLongitudeDeg:number(field(line,39,46)),supergalacticLatitudeDeg:number(field(line,48,55)),
  apparentKMag:number(field(line,57,61)),logKLuminositySolar:number(field(line,63,67)),heliocentricRadialVelocityKmS:number(field(line,69,72)),localSheetVelocityKmS:number(field(line,74,77)),
  measuredDistanceMemberCount:number(field(line,79,81)),distanceMpc:number(field(line,83,87)),distanceUncertaintyPercent:number(field(line,89,90)),luminosityVelocityDispersionKmS:number(field(line,92,94)),observedVelocityDispersionKmS:number(field(line,96,98)),secondTurnaroundRadiusMpc:number(field(line,100,104)),projectedVirialRadiusMpc:number(field(line,106,110)),logMassLuminositySolar:number(field(line,112,117)),logMassDynamicalSolar:number(field(line,119,124))
});
const parseGalaxy=line=>({
  pgc:number(field(line,1,7)),name:field(line,9,36),raDeg:number(field(line,38,45)),decDeg:number(field(line,47,54)),galacticLongitudeDeg:number(field(line,56,63)),galacticLatitudeDeg:number(field(line,65,72)),supergalacticLongitudeDeg:number(field(line,74,81)),supergalacticLatitudeDeg:number(field(line,83,90)),morphologyT:number(field(line,92,95)),apparentBMag:number(field(line,97,101)),apparentKMag:number(field(line,103,107)),logKLuminositySolar:number(field(line,109,113)),heliocentricRadialVelocityKmS:number(field(line,115,118)),localSheetVelocityKmS:number(field(line,120,123)),distanceMpc:number(field(line,125,130)),distanceUncertaintyPercent:number(field(line,132,133)),groupPgc1:number(field(line,135,141))
});

fs.mkdirSync(RAW,{recursive:true});
const [readmeBuffer,groupsGz,galaxiesGz]=await Promise.all([fetchVerified("readme"),fetchVerified("groups"),fetchVerified("galaxies")]);
fs.writeFileSync(path.join(RAW,"ReadMe"),readmeBuffer);fs.writeFileSync(path.join(RAW,"table2.dat.gz"),groupsGz);fs.writeFileSync(path.join(RAW,"table3.dat.gz"),galaxiesGz);
const groupsAll=zlib.gunzipSync(groupsGz).toString("utf8").trimEnd().split(/\n/).map(parseGroup);
const galaxiesAll=zlib.gunzipSync(galaxiesGz).toString("utf8").trimEnd().split(/\n/).map(parseGalaxy);
const groups=groupsAll.filter(group=>group.memberCount>=2&&group.distanceMpc>=2&&group.distanceMpc<=12);
const groupIds=new Set(groups.map(group=>group.pgc1));
const galaxies=galaxiesAll.filter(galaxy=>groupIds.has(galaxy.groupPgc1));
const galaxyByPgc=new Map(galaxiesAll.map(galaxy=>[galaxy.pgc,galaxy]));
const normalizedGroups=groups.map(group=>{const central=galaxyByPgc.get(group.pgc1),baseName=central?.name||`PGC ${group.pgc1}`;return {
  id:`pcs:galaxy-group:kt17:${group.pgc1}`,canonicalName:`${baseName} Group`,aliases:[...(GROUP_ALIASES[group.pgc1]||[]),`PGC ${group.pgc1} Group`],objectType:"Galaxy Group",parentStructure:"Nearby Universe (PCS Phase 4A coverage)",catalogIds:[`PGC ${group.pgc1}`,`Kourkchi-Tully 2017 group ${group.pgc1}`],
  sourceFrame:"Galactic and Supergalactic spherical",sourceEpoch:"J2000 where equatorial member coordinates apply",distanceConvention:"CF3 member weighted distance-modulus group aggregate",redshiftConvention:"Published heliocentric and Local Sheet radial velocity; no redshift-distance conversion",cosmologyAssumption:"None for catalog distance",transformVersion:"pcs-supergalactic-astropy-v1",
  ...group,supergalacticCartesianMpc:spherical(group.supergalacticLongitudeDeg,group.supergalacticLatitudeDeg,group.distanceMpc),membershipConfidence:"Catalog group assignment; no per-member probability published",dataStatus:"Catalog Observation",visualizationStatus:"Catalog Observation",sourceId:"vizier:J/ApJ/843/16:table2",sourceCatalog:"Kourkchi & Tully 2017 Galaxy Groups",sourceDoi:"10.3847/1538-4357/aa76db"
};});
const normalizedGalaxies=galaxies.map(galaxy=>({
  id:`pcs:galaxy:pgc:${galaxy.pgc}`,canonicalName:galaxy.name||`PGC ${galaxy.pgc}`,aliases:[...aliasesFor(galaxy.name),`PGC ${galaxy.pgc}`],objectType:"Galaxy",parentStructure:`pcs:galaxy-group:kt17:${galaxy.groupPgc1}`,catalogIds:[`PGC ${galaxy.pgc}`,galaxy.name].filter(Boolean),
  sourceFrame:"ICRS/J2000 plus published Galactic and Supergalactic coordinates",sourceEpoch:"J2000",distanceConvention:"Published individual galaxy distance where available",redshiftConvention:"Published heliocentric and Local Sheet radial velocity; no redshift-distance conversion",cosmologyAssumption:"None for catalog distance",transformVersion:"pcs-supergalactic-astropy-v1",
  ...galaxy,supergalacticCartesianMpc:galaxy.distanceMpc>0?spherical(galaxy.supergalacticLongitudeDeg,galaxy.supergalacticLatitudeDeg,galaxy.distanceMpc):null,membershipConfidence:"Catalog group assignment; no per-member probability published",dataStatus:"Catalog Observation",visualizationStatus:galaxy.distanceMpc>0?"Catalog Observation":"Unavailable in 3D — individual distance not published",sourceId:"vizier:J/ApJ/843/16:table3",sourceCatalog:"Kourkchi & Tully 2017 Galaxy Groups",sourceDoi:"10.3847/1538-4357/aa76db"
}));
const bundle={schemaVersion:"pcs-deep-space-phase4a-v1",generatedAt:"2026-08-09",coverage:{minimumDistanceMpc:2,maximumDistanceMpc:12,minimumGroupMembers:2,boundaryStatus:"PCS deployment scope, not a physical boundary"},sourceId:"vizier-j-apj-843-16",groupCount:normalizedGroups.length,galaxyCount:normalizedGalaxies.length,renderableGalaxyCount:normalizedGalaxies.filter(item=>item.supergalacticCartesianMpc).length,unavailableIndividualDistanceCount:normalizedGalaxies.filter(item=>!item.supergalacticCartesianMpc).length,groups:normalizedGroups,galaxies:normalizedGalaxies};
fs.writeFileSync(path.join(OUT,"nearby-galaxy-groups.json"),JSON.stringify(bundle,null,2)+"\n");
fs.writeFileSync(path.join(OUT,"source-contract.json"),JSON.stringify({schemaVersion:"pcs-source-contract-v1",adapter:"phase4a-kourkchi-tully-2017",sourceFrame:"ICRS/J2000, Galactic, Supergalactic",sourceEpoch:"J2000",distanceConvention:"Published CF3-based measured distances; group weighted distance-modulus aggregate; individual distances remain null when absent",redshiftConvention:"No redshift-to-distance conversion",cosmologyAssumption:"None",transformVersion:"pcs-supergalactic-astropy-v1",sourceChecksums:EXPECTED,qualityStatus:"validated",knownLimitations:["PCS Phase 4A deploys only multi-member groups from 2 through 12 Mpc.","The catalog membership field has no published numeric membership probability.","Galaxies without an individual published distance are retained for identity/search but not assigned a 3D coordinate."]},null,2)+"\n");
console.log(JSON.stringify({groups:normalizedGroups.length,galaxies:normalizedGalaxies.length,renderable:bundle.renderableGalaxyCount,missingIndividualDistance:bundle.unavailableIndividualDistanceCount,uniquePgc:new Set(normalizedGalaxies.map(item=>item.pgc)).size},null,2));
