import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {normalizeAlias,validateRecord} from "./scripts/catalogs/catalog-core.mjs";

const root=new URL("./",import.meta.url),bundle=JSON.parse(fs.readFileSync(new URL("data/catalogs/validated/phase-b-nebulae.json",root))),manifest=JSON.parse(fs.readFileSync(new URL("data/catalogs/manifests/phase-b.json",root))),sources=JSON.parse(fs.readFileSync(new URL("data/catalogs/provenance/source-registry.json",root))),raw=fs.readFileSync(new URL("data/catalogs/staging/phase-b-nebulae/simbad-nebulae.json",root)),sourceIds=new Set(sources.sources.map(source=>source.sourceId));
const byId=id=>bundle.objects.find(record=>record.pcsObjectId===id),resolve=alias=>bundle.aliasIndex[normalizeAlias(alias)];

test("Phase B imports the required nebula landmarks without runtime rendering",()=>{
  assert.deepEqual({objects:bundle.objectCount,relationships:bundle.relationshipCount,rejected:bundle.rejectedCount,unresolved:bundle.unresolvedCount,rendered:bundle.renderedCount},{objects:18,relationships:3,rejected:0,unresolved:0,rendered:0});
  for(const name of ["Pillars of Creation","Eagle Nebula","Horsehead Nebula","Cat's Eye Nebula","Orion Nebula","Carina Nebula","Helix Nebula","Ring Nebula","Crab Nebula","Cygnus Loop","Veil Nebula (Western Veil)","Rosette Nebula","Lagoon Nebula","Trifid Nebula","Omega Nebula","North America Nebula","Tarantula Nebula"])assert.ok(bundle.objects.some(record=>record.officialName===name),name);
});

test("every normalized nebula passes the shared schema and scientific validation",()=>{
  for(const record of bundle.objects){const result=validateRecord(record,{sourceIds});assert.equal(result.valid,true,`${record.pcsObjectId}: ${result.errors.join("; ")}`);assert.equal(record.objectClass,"nebula");assert.ok(["MEASURED_POSITION","OBSERVED_ANGULAR_EXTENT"].includes(record.geometryStatus));}
});

test("catalog aliases resolve one physical object while structural relationships stay separate",()=>{
  assert.equal(resolve("M1"),"pcs:nebula:crab");assert.equal(resolve("NGC 1952"),"pcs:nebula:crab");assert.equal(resolve("M42"),"pcs:nebula:orion");assert.equal(resolve("M57"),"pcs:nebula:ring");assert.equal(resolve("NGC 6543"),"pcs:nebula:cats-eye");assert.equal(resolve("Barnard 33"),"pcs:nebula:horsehead");assert.equal(resolve("M16"),"pcs:nebula:eagle");
  assert.deepEqual(bundle.relationships.map(edge=>[edge.from,edge.predicate,edge.to]).sort(),[["pcs:nebula:horsehead","part-of","pcs:nebula:ic-434"],["pcs:nebula:pillars-of-creation","part-of","pcs:nebula:eagle"],["pcs:nebula:veil-west","part-of","pcs:nebula:cygnus-loop"]].sort());
});

test("missing position, distance, and 3D geometry remain unavailable rather than zero-filled",()=>{
  const pillars=byId("pcs:nebula:pillars-of-creation");assert.equal(pillars.raDeg,null);assert.equal(pillars.decDeg,null);assert.equal(pillars.distance,null);assert.equal(pillars.geometryStatus,"OBSERVED_ANGULAR_EXTENT");assert.equal(pillars.parentObject,"pcs:nebula:eagle");
  assert.equal(bundle.objects.filter(record=>record.distance!==null).length,12);assert.equal(bundle.objects.filter(record=>record.distance===null).length,6);assert.ok(bundle.objects.every(record=>record.physicalSize===null&&record.angularSize===null));assert.ok(bundle.objects.every(record=>record.geometryStatus!=="RECONSTRUCTED_3D"&&record.geometryStatus!=="REPRESENTATIVE_VISUALIZATION"));
});

test("SIMBAD snapshot, literature references, and checksums are preserved",()=>{
  const checksum=crypto.createHash("sha256").update(raw).digest("hex");assert.equal(manifest.sources[0].checksum,`sha256:${checksum}`);assert.equal(JSON.parse(raw).snapshots.length,17);assert.ok(sourceIds.has("cds-simbad-tap"));assert.ok(sourceIds.has("hester-1996-m16-pillars"));
  assert.ok(bundle.objects.every(record=>record.dataSources.length&&record.researchReferences.length));assert.ok(byId("pcs:nebula:pillars-of-creation").researchReferences.includes("1996AJ....111.2349H"));
});

test("database count and renderer count remain independent",()=>{
  assert.equal(manifest.counts.imported,18);assert.equal(manifest.counts.rendered,0);assert.match(manifest.scientificBoundary,/runtime rendering.*deferred/i);assert.equal(bundle.status,"VALIDATED_NOT_PUBLISHED");
});
