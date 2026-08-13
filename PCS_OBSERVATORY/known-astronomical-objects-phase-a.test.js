import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {ADAPTERS,mastRequest,tapSyncRequest} from "./scripts/catalogs/adapters.mjs";
import {assertPromotionReceipt,buildAliasIndex,buildRelationshipGraph,catalogDiff,ingestRecords,normalizeRecord,sha256,validateRecord} from "./scripts/catalogs/catalog-core.mjs";

const root=new URL("./",import.meta.url),sources=JSON.parse(fs.readFileSync(new URL("data/catalogs/provenance/source-registry.json",root))),production=JSON.parse(fs.readFileSync(new URL("data/catalogs/production/known-astronomical-objects.json",root))),manifest=JSON.parse(fs.readFileSync(new URL("data/catalogs/manifests/phase-a.json",root)));
const base=overrides=>({pcsObjectId:"pcs:fixture:alpha",officialName:"Fixture Alpha",commonName:null,aliases:[],objectClass:"stellar-object",objectSubtype:"test fixture",catalogIdentifiers:[{catalog:"FIXTURE",identifier:"A"}],raDeg:10,decDeg:-10,coordinateFrame:"ICRS",coordinateEpoch:"J2000",distance:null,distanceLower:null,distanceUpper:null,distanceUnit:null,distanceMethod:null,parallaxMas:null,properMotionRaMasYr:null,properMotionDecMasYr:null,radialVelocityKmS:null,redshift:null,physicalSize:null,angularSize:null,mass:null,massMethod:null,age:null,temperatureK:null,spectralType:null,hostStructure:null,parentObject:null,associatedObjects:[],discoveryDate:null,discoveryMethod:null,observationStatus:"TEST_FIXTURE_ONLY",evidenceClass:"CATALOG-DERIVED",scientificFidelity:"LB",wavelengths:[],geometryStatus:"MEASURED_POSITION",lastUpdated:"2026-08-14",dataSources:["cds-simbad-tap"],researchReferences:["TEST_FIXTURE_ONLY"],knownLimitations:["Not production astronomical data"],...overrides});

test("Phase A production baseline imports no Phase B-E objects",()=>{
  assert.equal(production.status,"EMPTY_ARCHITECTURE_BASELINE");assert.deepEqual({objects:production.objectCount,relationships:production.relationshipCount},{objects:0,relationships:0});
  assert.deepEqual(manifest.productionCounts,{imported:0,rejected:0,unresolved:0,rendered:0});
});

test("authoritative service adapters are registered without fetching object rows",()=>{
  assert.equal(sources.sources.length,6);assert.equal(new Set(sources.sources.map(source=>source.sourceId)).size,6);
  for(const source of sources.sources){assert.match(source.endpoint,/^https:\/\//);assert.match(source.retrievalScope,/no production object rows fetched/i);assert.match(source.promotionPolicy,/review|promote/i);}
  assert.deepEqual(Object.values(ADAPTERS).map(adapter=>adapter.sourceId).sort(),sources.sources.map(source=>source.sourceId).sort());
  const tap=tapSyncRequest(ADAPTERS.simbad,"SELECT TOP 1 main_id FROM basic");assert.equal(tap.method,"POST");assert.match(tap.url,/\/sync$/);assert.match(tap.body,/QUERY=/);
  const mast=mastRequest("Mast.Catalogs.Filtered.Tic",{columns:"ID"});assert.equal(mast.method,"POST");assert.match(mast.body,/request=/);
});

test("normalization preserves scientific zero while converting unavailable fields to null",()=>{
  const record=normalizeRecord(base({raDeg:0,decDeg:0,radialVelocityKmS:0,distance:"",distanceUnit:""}),{sourceId:"cds-simbad-tap",retrievedAt:"2026-08-14"});
  assert.equal(record.raDeg,0);assert.equal(record.decDeg,0);assert.equal(record.radialVelocityKmS,0);assert.equal(record.distance,null);assert.equal(record.distanceUnit,null);
  assert.equal(validateRecord(record,{sourceIds:new Set(sources.sources.map(source=>source.sourceId))}).valid,true);
});

test("ingestion cross-matches shared catalog identity and quarantines rejection and unresolved relationship",()=>{
  const raw=[base({}),base({pcsObjectId:"pcs:fixture:alpha-alternate",officialName:"Fixture Alpha Alternate",commonName:"Common Alpha",aliases:["Alpha alias"]}),base({pcsObjectId:"pcs:fixture:beta",officialName:"Fixture Beta",catalogIdentifiers:[{catalog:"FIXTURE",identifier:"B"}],raDeg:20,decDeg:5,parentObject:"pcs:fixture:alpha",associatedObjects:["pcs:fixture:missing"]}),base({pcsObjectId:"pcs:fixture:invalid",officialName:""})];
  const result=ingestRecords(raw,{sourceRegistry:sources,sourceId:"cds-simbad-tap",retrievedAt:"2026-08-14"});
  assert.deepEqual({input:result.inputCount,imported:result.importedCount,rejected:result.rejectedCount,unresolved:result.unresolvedCount},{input:4,imported:2,rejected:1,unresolved:1});
  assert.equal(result.aliasIndex["common alpha"],"pcs:fixture:alpha");assert.equal(result.relationships.resolved.length,1);assert.equal(result.relationships.unresolved[0].reason,"missing target object");
});

test("alias conflicts, relationship targets, and representative identity rules are explicit",()=>{
  const alpha=base({aliases:["Shared"]}),beta=base({pcsObjectId:"pcs:fixture:beta",officialName:"Fixture Beta",aliases:["Shared"],catalogIdentifiers:[{catalog:"FIXTURE",identifier:"B"}]});
  assert.equal(buildAliasIndex([alpha,beta]).conflicts.length,1);assert.equal(buildRelationshipGraph([alpha],[{from:alpha.pcsObjectId,predicate:"part-of",to:"pcs:fixture:missing",evidenceClass:"CATALOG-DERIVED",sourceIds:alpha.dataSources}]).unresolved.length,1);
  const representative=base({pcsObjectId:"pcs:fixture:representative",evidenceClass:"REPRESENTATIVE",scientificFidelity:"LD",catalogIdentifiers:[{catalog:"FAKE",identifier:"1"}]});assert.match(validateRecord(representative).errors.join(" "),/cannot claim catalog identifiers/);
});

test("catalog update needs diff plus checksum-bound human approval",()=>{
  const candidate={...production,catalogVersion:"fixture-candidate",objects:[base({})],objectCount:1},validation={rejectedCount:0},diff={...catalogDiff(production,candidate),unresolvedCount:0},receipt={decision:"APPROVED",decisionDate:"2026-08-14",catalogVersion:"fixture-candidate",reviewer:"Fixture Reviewer"};
  Object.assign(receipt,{candidateChecksum:sha256(candidate),validationChecksum:sha256(validation),diffChecksum:sha256(diff)});assert.equal(assertPromotionReceipt({candidate,validation,diff,receipt}),true);
  assert.throws(()=>assertPromotionReceipt({candidate,validation,diff,receipt:{...receipt,candidateChecksum:"wrong"}}),/does not match/);assert.throws(()=>assertPromotionReceipt({candidate,validation,diff,receipt:{...receipt,decision:"REJECTED"}}),/APPROVED/);
});
