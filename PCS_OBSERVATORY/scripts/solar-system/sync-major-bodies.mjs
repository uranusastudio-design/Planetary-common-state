import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildVectorQuery, normalizeResponse } from "./horizons-adapter.mjs";

const here=dirname(fileURLToPath(import.meta.url));
const appRoot=resolve(here,"../..");
const rawRoot=resolve(appRoot,"data/solar-system/raw/horizons-de441");
const normalizedRoot=resolve(appRoot,"data/solar-system/normalized");
const retrievedAt=new Date().toISOString();
const common={start:"2025-01-01",stop:"2028-01-01"};
const targets=[
  ["mercury",199,"500@10","12 h","planet"],["venus",299,"500@10","2 d","planet"],
  ["earth",399,"500@10","2 d","planet"],["mars",499,"500@10","3 d","planet"],
  ["jupiter",599,"500@10","1 d","planet"],["saturn",699,"500@10","3 d","planet"],
  ["uranus",799,"500@10","4 d","planet"],["neptune",899,"500@10","4 d","planet"],
  ["moon",301,"500@399","12 h","moon"],["phobos",401,"500@499","30 m","moon"],
  ["deimos",402,"500@499","1 h","moon"],["io",501,"500@599","1 h","moon"],
  ["europa",502,"500@599","4 h","moon"],["ganymede",503,"500@599","6 h","moon"],
  ["callisto",504,"500@599","6 h","moon"],["enceladus",602,"500@699","1 h","moon"],
  ["titan",606,"500@699","6 h","moon"],["titania",703,"500@799","6 h","moon"],
  ["triton",801,"500@899","6 h","moon"]
].map(([objectId,naifId,center,step,objectClass])=>({objectId,naifId,center,step,objectClass,...common}));

const sha256=value=>createHash("sha256").update(value).digest("hex");
const compact=record=>({
  objectId:record.objectId,naifId:record.naifId,targetName:record.targetName,centerName:record.centerName,
  objectClass:targets.find(item=>item.objectId===record.objectId).objectClass,source:record.source,
  catalogEphemeris:record.catalogEphemeris,retrievedAt:record.retrievedAt,query:record.query,
  timeScale:record.timeScale,referenceSystem:record.referenceSystem,referencePlane:record.referencePlane,
  center:record.center,outputUnits:record.outputUnits,vectorCorrection:record.vectorCorrection,
  samples:record.samples.map(sample=>[sample.jdTdb,...sample.positionAu,...sample.velocityAuPerDay])
});

await mkdir(rawRoot,{recursive:true});
await mkdir(normalizedRoot,{recursive:true});
const records=[];
const provenance=[];
for(const item of targets){
  const request=buildVectorQuery({command:item.naifId,center:item.center,start:item.start,stop:item.stop,step:item.step});
  const response=await fetch(request.url,{headers:{accept:"application/json","user-agent":"PCS-Observatory-SS02/2.2"}});
  if(!response.ok)throw new Error(`${item.objectId}: Horizons HTTP ${response.status}`);
  const text=await response.text();
  const payload=JSON.parse(text);
  const normalized=normalizeResponse(payload,request,{...item,retrievedAt});
  const rawFile=`${item.objectId}.json.gz`;
  await writeFile(resolve(rawRoot,rawFile),gzipSync(text,{level:9}));
  records.push(compact(normalized));
  provenance.push({objectId:item.objectId,naifId:item.naifId,objectClass:item.objectClass,center:item.center,start:item.start,stop:item.stop,step:item.step,sampleCount:normalized.samples.length,rawFile:`raw/horizons-de441/${rawFile}`,rawSha256:sha256(text),catalogEphemeris:normalized.catalogEphemeris});
  process.stdout.write(`${item.objectId}: ${normalized.samples.length} samples\n`);
}
const dataset={schemaVersion:1,datasetId:"pcs-ss02b-horizons-de441-2025-2028",generatedAt:retrievedAt,source:"NASA/JPL Horizons API",sourceUrl:"https://ssd.jpl.nasa.gov/api/horizons.api",catalogEphemeris:"JPL DE441 / satellite source reported per target",timeScale:"TDB",displayTimeScale:"UTC",referenceSystem:"ICRF",referencePlane:"Earth mean ecliptic at J2000.0 (IAU76/80)",interpolation:"Cubic Hermite using authoritative position and velocity vectors",coverage:{start:"2025-01-01T00:00:00.000Z",end:"2028-01-01T00:00:00.000Z"},records};
const js=`(function(g){\"use strict\";g.PCSSolarSystemMajorBodyDataset=Object.freeze(${JSON.stringify(dataset)});})(window);\n`;
await writeFile(resolve(normalizedRoot,"major-bodies-horizons-de441.js"),js);
const manifest={schemaVersion:1,datasetId:dataset.datasetId,promotionStatus:"candidate",generatedAt:retrievedAt,lastSuccessfulSynchronization:retrievedAt,source:dataset.source,sourceUrl:dataset.sourceUrl,catalogEphemeris:dataset.catalogEphemeris,timeScale:dataset.timeScale,displayTimeScale:dataset.displayTimeScale,referenceSystem:dataset.referenceSystem,referencePlane:dataset.referencePlane,interpolation:dataset.interpolation,coverage:dataset.coverage,normalizedFile:"normalized/major-bodies-horizons-de441.js",normalizedSha256:sha256(js),objects:provenance,fallbackPolicy:"Retain the last validated promoted dataset. Never fabricate a missing vector."};
await writeFile(resolve(appRoot,"data/solar-system/ephemeris-manifest.json"),`${JSON.stringify(manifest,null,2)}\n`);
process.stdout.write(`wrote ${records.length} objects; normalized sha256 ${manifest.normalizedSha256}\n`);
