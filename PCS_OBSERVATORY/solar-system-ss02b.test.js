const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = __dirname;
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(root,"solar-system-core.js"),"utf8"),{window,Date,Math,RangeError,Object});
const Core=window.PCSSolarSystemCore;

assert.equal(Core.taiMinusUtc("2016-12-31T23:59:59Z"),36);
assert.equal(Core.taiMinusUtc("2017-01-01T00:00:00Z"),37);
assert.equal(Core.timeConversionQuality("2026-08-08T12:00:00Z").status,"validated");
assert.equal(Core.timeConversionQuality("2027-01-01T00:00:00Z").status,"future-leap-second-unverified");
assert.throws(()=>Core.utcToJdTdb("1971-12-31T00:00:00Z"),RangeError);
const utcJd=Date.parse("2026-08-08T12:00:00Z")/86400000+2440587.5;
const offsetSeconds=(Core.utcToJdTdb("2026-08-08T12:00:00Z")-utcJd)*86400;
assert.ok(Math.abs(offsetSeconds-69.183)<0.003,`unexpected TDB-UTC ${offsetSeconds}`);

for(const name of ["deep-space-registry.js","data/solar-system/normalized/major-bodies-horizons-de441.js","deep-space-ephemeris-cache.js","deep-space-ephemeris.js"]){
  vm.runInNewContext(fs.readFileSync(path.join(root,name),"utf8"),{window,Date,Math,RangeError,Object,Number,String,Boolean,Infinity});
}
const registry=window.PCSDeepSpaceRegistry,ephemeris=window.PCSDeepSpaceEphemeris,dataset=window.PCSSolarSystemMajorBodyDataset;
assert.equal(dataset.records.length,19);
assert.deepEqual([...new Set(dataset.records.map(record=>record.timeScale))],["TDB"]);
const epoch="2026-08-08T12:41:00Z",solution=ephemeris.createDisplaySolution(epoch,registry.PLANET_IDS);
assert.equal(solution.authoritative,true);
assert.equal(solution.coherent,true);
assert.match(solution.id,/pcs-ss02b-horizons-de441/);
assert.ok(registry.PLANET_IDS.every(id=>ephemeris.getStateFromSolution(solution,id,epoch)?.solutionId===solution.id));
for(const id of registry.SATELLITE_IDS){
  const state=ephemeris.getSatelliteRelativeState(id,epoch);
  assert.equal(state.dataStatus,"ephemeris-derived",id);
  assert.equal(state.relativeTo,registry.BODY_REGISTRY[id].parentBodyId,id);
  assert.ok(state.positionAu.every(Number.isFinite),id);
}
assert.equal(ephemeris.getSatelliteRelativeState("moon","2024-01-01T00:00:00Z"),null);
const manifest=JSON.parse(fs.readFileSync(path.join(root,"data/solar-system/ephemeris-manifest.json"),"utf8"));
assert.equal(manifest.promotionStatus,"validated-promoted");
assert.equal(manifest.validation.failures,0);
assert.equal(manifest.validation.comparisonCount,46);
console.log("SS-02B time conversion contract: PASS");
