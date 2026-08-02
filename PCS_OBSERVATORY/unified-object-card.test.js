const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync(`${__dirname}/unified-object-card.js`,"utf8"),manager=fs.readFileSync(`${__dirname}/deep-space.js`,"utf8"),html=fs.readFileSync(`${__dirname}/index.html`,"utf8");
const window={};vm.runInNewContext(source,{window,Object,Number,String,Math});const cards=window.PCSUnifiedObjectCard;

test("the unified model preserves the complete reusable Phase 4 contract",()=>{
  const model=cards.normalize({id:"test",canonicalName:"Test",aliases:[],catalogIds:[],dataSources:[],references:[],knownLimitations:[]});
  for(const key of ["id","canonicalName","localizedName","aliases","objectType","parentStructure","catalogIds","coordinates","coordinateFrame","distance","distanceUncertainty","redshift","velocity","physicalSize","orbitalData","epoch","dataSources","dataStatus","visualizationStatus","references","knownLimitations"])assert.ok(Object.hasOwn(model,key),key);
  assert.equal(model.redshift,null);
  assert.equal(model.dataStatus,"Unavailable");
});

test("approved data statuses remain distinct and missing values are unavailable",()=>{
  assert.equal(cards.status("catalog-observation"),"Catalog observation");
  assert.equal(cards.status("ephemeris-derived"),"JPL ephemeris");
  assert.equal(cards.status("approximate"),"Orbital-element approximation");
  assert.equal(cards.status("observation-based reconstruction"),"Observation-based reconstruction");
  assert.equal(cards.status("representative visualization"),"Representative visualization");
  assert.equal(cards.status(null),"Unavailable");
});

test("solar, nearby, Phase 3 and reconstruction adapters do not fabricate missing data",()=>{
  const earth=cards.solar({id:"earth",name:"Earth",type:"planet",parentBodyId:"sun",naifId:399,radiusKm:6371,coordinateFrame:"J2000",dataStatus:"approximate",visualizationStatus:"representative visualization",uncertainty:"bounded",orbit:{periapsisKm:1,apoapsisKm:2,inclinationDeg:0,dataSource:"JPL"},orbitalPeriodDays:365,ephemerisSource:"https://ssd.jpl.nasa.gov"},{epoch:"J2000",positionAu:[1,0,0],dataStatus:"ephemeris-derived",source:"JPL"},"zh-TW");
  const proxima=cards.nearby({id:"p",source_id:"5853498713190525696",primaryName:"Proxima Centauri",aliases:[],objectType:"star",distancePc:1.3,radial_velocity:null,sourceCatalog:"Gaia"});
  const m31=cards.phase3({id:"m31",canonicalName:"Andromeda",aliases:["M31"],objectType:"galaxy",sourceId:"M31",distanceKpc:780,dataStatus:"catalog-observation",visualizationStatus:"representative marker",sourceCatalog:"McConnachie 2012"},"local-group");
  const arm=cards.reconstruction("Per");
  assert.equal(earth.localizedName,"地球");
  assert.equal(earth.dataStatus,"JPL ephemeris");
  assert.equal(proxima.velocity,null);
  assert.ok(proxima.knownLimitations.some(value=>value.includes("Radial velocity unavailable")));
  assert.equal(m31.dataStatus,"Catalog observation");
  assert.equal(arm.dataStatus,"Observation-based reconstruction");
  assert.equal(arm.redshift,null);
});

test("all four languages expose exact card labels",()=>{
  const expected={en:["Official name","Focus","Close object card","Unavailable"],"zh-TW":["正式名稱","聚焦","關閉天體字卡","無資料"],ja:["正式名称","フォーカス","天体カードを閉じる","利用不可"],ko:["공식 명칭","초점 맞추기","천체 카드 닫기","사용 불가"]};
  for(const [language,values] of Object.entries(expected))assert.deepEqual([cards.COPY[language].name,cards.COPY[language].focus,cards.COPY[language].close,cards.COPY[language].unavailable],values);
});

test("the card reuses selection, language, focus, Escape, and safe links",()=>{
  assert.match(html,/unified-object-card\.js/);
  assert.match(manager,/ObjectCard\.solar/);
  assert.match(manager,/ObjectCard\.nearby/);
  assert.match(manager,/ObjectCard\.phase3/);
  assert.match(manager,/ObjectCard\.reconstruction/);
  assert.match(manager,/function focusSelectedObject\(\)/);
  assert.match(manager,/data-object-card-focus/);
  assert.match(manager,/event\.key==="Escape"[\s\S]*closeObjectCard/);
  assert.doesNotMatch(source,/fetch\(|XMLHttpRequest/);
  assert.match(source,/noopener noreferrer/);
  assert.doesNotMatch(manager,/objectSelectionStore|selectedObjectStore/);
});
