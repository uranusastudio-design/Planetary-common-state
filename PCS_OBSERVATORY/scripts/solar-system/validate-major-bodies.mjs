import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildVectorQuery, normalizeResponse } from "./horizons-adapter.mjs";

const here=dirname(fileURLToPath(import.meta.url)),appRoot=resolve(here,"../..");
const window={};
vm.runInNewContext(await readFile(resolve(appRoot,"solar-system-core.js"),"utf8"),{window,Date,Math,RangeError,Object});
vm.runInNewContext(await readFile(resolve(appRoot,"data/solar-system/normalized/major-bodies-horizons-de441.js"),"utf8"),{window,Object});
const Core=window.PCSSolarSystemCore,dataset=window.PCSSolarSystemMajorBodyDataset;
const records=new Map(dataset.records.map(record=>[record.objectId,record]));
const AU_KM=149597870.7;
const epochs={planet:["2025-03-17T05:37:00Z","2026-08-08T12:41:00Z","2027-10-21T18:23:00Z"],moon:["2025-11-13T04:17:00Z","2027-02-19T16:43:00Z"]};
const tolerancesKm={mercury:10,venus:10,earth:10,mars:20,jupiter:20,saturn:20,uranus:20,neptune:20,moon:5,phobos:5,deimos:5,io:5,europa:5,ganymede:5,callisto:5,enceladus:5,titan:5,titania:5,triton:5};

function interpolate(record,jd){
  const samples=record.samples;if(jd<samples[0][0]||jd>samples.at(-1)[0])throw new RangeError("outside coverage");
  let low=0,high=samples.length-1;while(high-low>1){const mid=(low+high)>>1;if(samples[mid][0]<=jd)low=mid;else high=mid;}
  const a=samples[low],b=samples[high],h=b[0]-a[0],t=(jd-a[0])/h,t2=t*t,t3=t2*t;
  const h00=2*t3-3*t2+1,h10=t3-2*t2+t,h01=-2*t3+3*t2,h11=t3-t2;
  return [0,1,2].map(i=>h00*a[i+1]+h10*h*a[i+4]+h01*b[i+1]+h11*h*b[i+4]);
}

const comparisons=[];
for(const record of dataset.records){
  for(const epoch of epochs[record.objectClass]){
    const jd=Core.utcToJdTdb(epoch),request=buildVectorQuery({command:record.naifId,center:record.center,start:`JD${jd.toFixed(9)}`,stop:`JD${(jd+1/144).toFixed(9)}`,step:"10 m"});
    const response=await fetch(request.url,{headers:{accept:"application/json","user-agent":"PCS-Observatory-SS02-Validation/2.2"}});
    if(!response.ok)throw new Error(`${record.objectId}: Horizons HTTP ${response.status}`);
    const payload=await response.json();
    const reference=normalizeResponse(payload,request,{objectId:record.objectId,naifId:record.naifId,retrievedAt:new Date().toISOString()}).samples[0];
    const pcs=interpolate(record,jd),differenceKm=Math.hypot(...pcs.map((value,index)=>(value-reference.positionAu[index])*AU_KM));
    const toleranceKm=tolerancesKm[record.objectId];
    comparisons.push({epochUtc:epoch,jdTdb:jd,object:record.objectId,objectClass:record.objectClass,referenceSource:"NASA/JPL Horizons API direct VECTORS query",catalogEphemeris:record.catalogEphemeris,pcsPositionAu:pcs,referencePositionAu:reference.positionAu,difference:differenceKm,units:"km",tolerance:toleranceKm,toleranceBasis:`Object-specific ceiling for ${record.query.STEP_SIZE.replaceAll("'","")} cubic-Hermite interpolation; cache vector numeric precision is materially finer.`,pass:differenceKm<=toleranceKm});
    process.stdout.write(`${record.objectId} ${epoch}: ${differenceKm.toFixed(6)} km\n`);
  }
}
const failures=comparisons.filter(item=>!item.pass),report={schemaVersion:1,stage:"SS-02B",generatedAt:new Date().toISOString(),datasetId:dataset.datasetId,method:"Withheld-epoch direct Horizons vectors versus PCS cubic-Hermite states. UTC converted to JDTDB with NAIF naif0012.tls.",comparisonCount:comparisons.length,pass:failures.length===0,failures:failures.length,comparisons};
const output=resolve(appRoot,"test-results/solar-system-ss02b/authoritative-position-comparison.json");
await mkdir(dirname(output),{recursive:true});await writeFile(output,`${JSON.stringify(report,null,2)}\n`);
if(failures.length)throw new Error(`${failures.length} authoritative comparisons failed`);
const manifestPath=resolve(appRoot,"data/solar-system/ephemeris-manifest.json");
const manifest=JSON.parse(await readFile(manifestPath,"utf8"));
manifest.promotionStatus="validated-promoted";
manifest.validatedAt=report.generatedAt;
manifest.validation={method:report.method,comparisonCount:report.comparisonCount,failures:0,evidence:"../../test-results/solar-system-ss02b/authoritative-position-comparison.json",tolerancePolicy:"Per-object limits declared in validate-major-bodies.mjs; no universal tolerance."};
await writeFile(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
console.log(`SS-02B authoritative comparison: PASS (${comparisons.length})`);
