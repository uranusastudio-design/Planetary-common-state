import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {buildAliasIndex,buildRelationshipGraph,sha256,validateRecord} from "./catalog-core.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../..");
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),"utf8"));
const write=(relative,value)=>{const target=path.join(root,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`);};
const sourceRegistry=read("data/catalogs/provenance/source-registry.json");
const sourceIds=new Set(sourceRegistry.sources.map(source=>source.sourceId));
const inputs=[
  "data/catalogs/validated/phase-b-nebulae.json",
  "data/catalogs/validated/phase-c-compact-objects.json",
  "data/catalogs/validated/phase-d-clusters.json",
  "data/catalogs/validated/phase-e-exoplanets.json"
];
const bundles=inputs.map(read),objects=bundles.flatMap(bundle=>bundle.objects),edges=bundles.flatMap(bundle=>bundle.relationships||[]);
const validationFailures=objects.flatMap(record=>{const result=validateRecord(record,{sourceIds});return result.valid?[]:[{pcsObjectId:record.pcsObjectId,errors:result.errors}];});
const duplicateIds=[...new Set(objects.map(record=>record.pcsObjectId).filter((id,index,all)=>all.indexOf(id)!==index))];
const aliases=buildAliasIndex(objects),graph=buildRelationshipGraph(objects,edges);
const approvedAliasResolutions=[{normalizedAlias:"simbad m 16",preferredObjectId:"pcs:nebula:eagle",alternateObjectId:"pcs:cluster:ngc-6611",reason:"Messier 16 names the Eagle Nebula complex in public search; the embedded cluster retains its distinct NGC 6611 identity."}];
const unresolvedAliasConflicts=aliases.conflicts.filter(conflict=>!approvedAliasResolutions.some(resolution=>resolution.normalizedAlias===conflict.normalizedAlias&&conflict.objectIds.includes(resolution.preferredObjectId)&&conflict.objectIds.includes(resolution.alternateObjectId)));
for(const resolution of approvedAliasResolutions)aliases.index[resolution.normalizedAlias]=resolution.preferredObjectId;
if(validationFailures.length||duplicateIds.length||unresolvedAliasConflicts.length||graph.unresolved.length)throw new Error(JSON.stringify({validationFailures,duplicateIds,aliasConflicts:unresolvedAliasConflicts,unresolvedRelationships:graph.unresolved},null,2));
const counts=objects.reduce((result,record)=>{result.byClass[record.objectClass]=(result.byClass[record.objectClass]||0)+1;result.byEvidence[record.evidenceClass]=(result.byEvidence[record.evidenceClass]||0)+1;return result;},{total:objects.length,byClass:{},byEvidence:{},relationships:graph.resolved.length,rejected:0,unresolved:0,rendered:0});
const inputChecksums=Object.fromEntries(inputs.map((input,index)=>[input,`sha256:${sha256(bundles[index])}`]));
const runtime={schemaVersion:"pcs-known-astronomical-objects-runtime-v1",catalogVersion:"phase-f-runtime-2026-08-14",generatedAt:"2026-08-14",status:"VALIDATED_RUNTIME_CANDIDATE_NOT_FROZEN",counts,inputCatalogs:inputChecksums,objects,aliasIndex:aliases.index,aliasResolutions:approvedAliasResolutions,relationships:graph.resolved,knownLimitations:["The runtime catalog is a curated priority subset, not a complete census of known astronomical objects.","A database record is not necessarily rendered at every scale; Phase G applies deterministic LOD.","Objects without a source-published distance do not receive an invented three-dimensional position.","M16 is routed to the Eagle Nebula complex; the embedded cluster remains independently searchable as NGC 6611."]};
write("data/catalogs/runtime/known-astronomical-objects.json",runtime);
write("data/catalogs/manifests/phase-f.json",{schemaVersion:"pcs-known-object-manifest-v1",phase:"F",status:"VALIDATED_RUNTIME_CANDIDATE_NOT_FROZEN",catalogVersion:runtime.catalogVersion,generatedAt:runtime.generatedAt,counts,runtimeCatalog:"data/catalogs/runtime/known-astronomical-objects.json",runtimeChecksum:`sha256:${sha256(runtime)}`,inputCatalogs:inputChecksums,scientificBoundary:"Search and relationship resolution cover all 55 validated records. Object-level 3D Focus requires measured sky coordinates plus a source-published distance; otherwise PCS focuses the scientifically supported parent scale."});
console.log(JSON.stringify({counts,runtimeChecksum:`sha256:${sha256(runtime)}`},null,2));
