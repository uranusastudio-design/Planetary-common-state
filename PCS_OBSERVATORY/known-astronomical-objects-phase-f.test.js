import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root=new URL("./",import.meta.url),read=name=>fs.readFileSync(new URL(name,root),"utf8"),bundle=JSON.parse(read("data/catalogs/runtime/known-astronomical-objects.json")),manifest=JSON.parse(read("data/catalogs/manifests/phase-f.json"));
const context={PCSUnifiedObjectCard:{normalize:value=>value},fetch:async()=>({ok:true,json:async()=>structuredClone(bundle)}),structuredClone};context.globalThis=context;vm.createContext(context);vm.runInContext(read("known-astronomical-objects.js"),context,{filename:"known-astronomical-objects.js"});
const Catalog=context.PCSKnownAstronomicalObjects.Catalog,catalog=new Catalog();await catalog.load();

test("Phase F merges all validated classes without rejection, unresolved identity, or renderer inflation",()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(manifest.counts)),{total:55,byClass:{nebula:18,"black-hole":11,"stellar-object":2,"star-cluster":12,"galactic-structure":2,"exoplanetary-system":10},byEvidence:{MEASURED:1,"CATALOG-DERIVED":54},relationships:9,rejected:0,unresolved:0,rendered:0});
  assert.equal(catalog.debug().recordCount,55);assert.equal(catalog.debug().relationshipCount,9);
});

test("required common and catalog aliases resolve to one physical record",()=>{
  const pairs=[["Pillars of Creation","pcs:nebula:pillars-of-creation"],["M16","pcs:nebula:eagle"],["Horsehead","pcs:nebula:horsehead"],["Barnard 33","pcs:nebula:horsehead"],["NGC 6543","pcs:nebula:cats-eye"],["M1","pcs:nebula:crab"],["Sgr A*","pcs:black-hole:sagittarius-a-star"],["Gaia BH3","pcs:black-hole:gaia-bh3"],["M87*","pcs:black-hole:m87-star"],["Kepler-186","pcs:exoplanetary-system:kepler-186"]];
  for(const [term,id] of pairs)assert.equal(catalog.search(term)?.pcsObjectId,id,term);
  assert.equal(catalog.search("NGC 6611")?.pcsObjectId,"pcs:cluster:ngc-6611");
});

test("M16 ambiguity is explicitly resolved while the embedded NGC 6611 cluster remains distinct",()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(bundle.aliasResolutions)),[{normalizedAlias:"simbad m 16",preferredObjectId:"pcs:nebula:eagle",alternateObjectId:"pcs:cluster:ngc-6611",reason:"Messier 16 names the Eagle Nebula complex in public search; the embedded cluster retains its distinct NGC 6611 identity."}]);
  assert.notEqual(catalog.search("M16").pcsObjectId,catalog.search("NGC 6611").pcsObjectId);
});

test("relationship graph preserves parent and associated physical identities",()=>{
  const pillars=catalog.relationships("pcs:nebula:pillars-of-creation"),crab=catalog.relationships("pcs:compact-object:crab-pulsar"),m87=catalog.relationships("pcs:black-hole:m87-star");
  assert.ok(pillars.some(edge=>edge.to==="pcs:nebula:eagle"));assert.ok(crab.some(edge=>edge.to==="pcs:nebula:crab"));assert.equal(m87.length,0);
});

test("Focus routing refuses invented 3D positions and uses a measured parent anchor where available",()=>{
  const pillars=catalog.navigation(catalog.search("Pillars of Creation")),sgr=catalog.navigation(catalog.search("Sgr A*")),m87=catalog.navigation(catalog.search("M87*")),kepler=catalog.navigation(catalog.search("Kepler-186"));
  assert.equal(pillars.anchorObjectId,"pcs:nebula:eagle");assert.equal(pillars.hasThreeDimensionalPosition,true);
  assert.equal(sgr.hasThreeDimensionalPosition,false);assert.equal(sgr.reason,"INCOMPLETE_3D_POSITION");
  assert.equal(m87.context,"virgo");assert.equal(m87.hasThreeDimensionalPosition,false);
  assert.equal(kepler.context,"milky-way");assert.equal(kepler.hasThreeDimensionalPosition,true);
});

test("Object Card provenance and missing velocity remain scientifically explicit",()=>{
  const kepler=catalog.cardModel(catalog.search("Kepler-186")),blackHole=catalog.cardModel(catalog.search("Gaia BH3"));
  assert.match(kepler.eventData,/Confirmed planets/);assert.match(kepler.knownLimitations.join(" "),/3D VELOCITY = INCOMPLETE/);assert.equal(kepler.velocity?.includes("radial"),false);
  assert.match(blackHole.eventData,/DYNAMICALLY_SUPPORTED/);assert.ok(blackHole.dataSources.length);assert.ok(blackHole.references.length);
});

test("one Deep Space manager consumes the catalog without another Viewer, canvas, or animation clock",()=>{
  const manager=read("deep-space.js"),html=read("index.html"),runtime=read("known-astronomical-objects.js");
  assert.match(html,/known-astronomical-objects\.js\?v=known-objects-phase-f-1/);assert.match(manager,/KnownObjects\.Catalog/);assert.match(manager,/searchKnownObject/);assert.match(manager,/knownObjectNavigation/);
  assert.doesNotMatch(runtime,/new Cesium\.Viewer|createElement\(["']canvas|requestAnimationFrame|setInterval/);
});
