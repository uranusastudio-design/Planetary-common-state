import {cp,mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {buildSyncStatus,loadValidatedManifests,promoteValidatedCandidate,writeSyncStatus} from "./pipeline-core.mjs";

const here=dirname(fileURLToPath(import.meta.url)),deployedRoot=resolve(here,"../.."),mode=process.argv.includes("--status-only")?"status-only":"full";
const previous=await readFile(resolve(deployedRoot,"data/solar-system/sync-status.json"),"utf8").then(JSON.parse).catch(()=>null);
if(mode==="status-only"){const manifests=await loadValidatedManifests(deployedRoot),generatedAt=new Date().toISOString(),status=buildSyncStatus({manifests,generatedAt,state:"validated",lastSuccessfulSynchronization:previous?.lastSuccessfulSynchronization||manifests.map(item=>item.validatedAt).filter(Boolean).sort().at(-1)});await writeSyncStatus(deployedRoot,status);console.log(JSON.stringify({mode,status:"PASS",lastSuccessfulSynchronization:status.lastSuccessfulSynchronization,datasets:manifests.length}));process.exit(0);}
const temporary=await mkdtemp(resolve(tmpdir(),"pcs-solar-sync-")),candidateRoot=resolve(temporary,"PCS_OBSERVATORY"),stages=["sync-major-bodies.mjs","validate-major-bodies.mjs","sync-small-bodies.mjs","validate-small-bodies.mjs","sync-tno.mjs","validate-tno.mjs","sync-comets.mjs","validate-comets.mjs","validate-meteor-showers.mjs"];
try{
  for(const item of ["scripts/solar-system","data/solar-system","solar-system-core.js","small-body-catalog.js"])await cp(resolve(deployedRoot,item),resolve(candidateRoot,item),{recursive:true});
  for(const stage of stages){const result=spawnSync(process.execPath,[resolve(candidateRoot,"scripts/solar-system",stage)],{cwd:resolve(temporary),encoding:"utf8",maxBuffer:64*1024*1024});process.stdout.write(result.stdout||"");process.stderr.write(result.stderr||"");if(result.status!==0)throw new Error(`${stage} failed with exit ${result.status}`);}
  const manifests=await loadValidatedManifests(candidateRoot),completedAt=new Date().toISOString(),status=buildSyncStatus({manifests,generatedAt:completedAt,state:"validated",lastSuccessfulSynchronization:completedAt});await writeSyncStatus(candidateRoot,status);const promotion=await promoteValidatedCandidate(candidateRoot,deployedRoot);console.log(JSON.stringify({mode,status:"PASS",lastSuccessfulSynchronization:status.lastSuccessfulSynchronization,datasets:manifests.length,...promotion}));
}catch(error){const manifests=await loadValidatedManifests(deployedRoot),failedAt=new Date().toISOString(),status=buildSyncStatus({manifests,generatedAt:failedAt,state:"stale",previous,error:error.message});await writeSyncStatus(deployedRoot,status);console.error(JSON.stringify({mode,status:"FAIL",retainedLastValidated:true,lastSuccessfulSynchronization:status.lastSuccessfulSynchronization,error:error.message}));process.exitCode=1;
}finally{await rm(temporary,{recursive:true,force:true});}
