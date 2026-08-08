const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const window={};
vm.runInNewContext(fs.readFileSync(`${__dirname}/deep-space-motion-streaks.js`,"utf8"),{window,Math,Object,Array,String,Number,performance:{now:()=>0}});
const Motion=window.PCSDeepSpaceMotionStreaks;

test("motion streak modes are bounded and reduced motion defaults off",()=>{
  assert.deepEqual(Object.keys(Motion.MODES),["off","subtle","standard","cinematic"]);
  assert.equal(Motion.defaultMode(null,true),"off");
  assert.equal(Motion.defaultMode(null,false),"subtle");
  assert.equal(Motion.defaultMode("standard",true),"standard");
});
test("candidate density is deterministic and preserves selected and landmarks",()=>{
  const candidates=Array.from({length:20},(_,index)=>({id:`star-${index}`,position:{},prominence:index%5,landmark:index===18}));
  const first=Motion.chooseCandidates(candidates,4,"star-19").map(item=>item.id);
  const second=Motion.chooseCandidates([...candidates].reverse(),4,"star-19").map(item=>item.id);
  assert.deepEqual(first,second);assert.equal(first[0],"star-19");assert.equal(first[1],"star-18");
});
test("screen velocity reverses consistently and length is capped by context",()=>{
  const right=Motion.screenVelocity({x:10,y:10},{x:20,y:10},16.667),left=Motion.screenVelocity({x:20,y:10},{x:10,y:10},16.667);
  assert.ok(right.dx>0&&left.dx<0);assert.equal(right.speed,left.speed);
  assert.ok(Motion.streakLength(1000,"standard","nearby")<=Motion.MODES.standard.maxLength);
  assert.ok(Motion.streakLength(30,"standard","local-group")<Motion.streakLength(30,"standard","nearby"));
});
test("thickness follows rendered prominence, not an invented physical diameter",()=>{
  assert.ok(Motion.streakWidth(8,false,"standard")>Motion.streakWidth(2,false,"standard"));
  assert.ok(Motion.streakWidth(8,true,"standard")>Motion.streakWidth(8,false,"standard"));
  assert.ok(Motion.streakWidth(1e9,true,"cinematic")<=3.2);
});
test("camera motion includes position, orientation, up and frustum changes",()=>{
  const base={position:[1,0,0],direction:[0,0,-1],up:[0,1,0],fov:1};
  assert.equal(Motion.cameraMoved(base,base),false);
  for(const changed of [
    {...base,position:[1.01,0,0]},
    {...base,direction:[.01,0,-1]},
    {...base,up:[.01,1,0]},
    {...base,fov:1.01}
  ])assert.equal(Motion.cameraMoved(base,changed),true);
});
test("implementation reuses postRender and a batched collection without another loop or canvas",()=>{
  const source=fs.readFileSync(`${__dirname}/deep-space-motion-streaks.js`,"utf8");
  assert.match(source,/scene\.postRender\.addEventListener/);
  assert.match(source,/new Cesium\.PolylineCollection/);
  assert.doesNotMatch(source,/requestAnimationFrame|new Cesium\.Viewer|createElement\(["']canvas/);
  assert.match(source,/removePostRender\?\.\(\)/);
});
test("Deep Space integration exposes exact four-language controls and scientific disclaimer",()=>{
  const source=fs.readFileSync(`${__dirname}/deep-space.js`,"utf8");
  for(const text of ["Motion Streaks","移動光軌","移動光跡","이동 광궤적","Navigation-induced apparent streak","Representative navigation visualization","does not represent physical stellar velocity"])assert.ok(source.includes(text),text);
  assert.match(source,/pcs\.deepSpace\.motionStreakMode/);
  assert.match(source,/prefers-reduced-motion: reduce/);
});
test("only point layers publish candidates and Solar System solid bodies remain on ellipsoids",()=>{
  const deep=fs.readFileSync(`${__dirname}/deep-space.js`,"utf8"),nearby=fs.readFileSync(`${__dirname}/nearby-stars.js`,"utf8"),milky=fs.readFileSync(`${__dirname}/milky-way-layer.js`,"utf8"),local=fs.readFileSync(`${__dirname}/local-group-layer.js`,"utf8");
  assert.match(deep,/ellipsoid:\{radii:/);
  assert.doesNotMatch(deep,/setSource\("solar"/);
  for(const source of [nearby,milky,local])assert.match(source,/motionStreakCandidates\(\)/);
  assert.match(local,/this\.lod!=="far"\)return \[\]/);
});
test("transient trail picking preserves source identity and Object Card selection path",()=>{
  const source=fs.readFileSync(`${__dirname}/deep-space.js`,"utf8");
  assert.match(source,/motionStreakObject/);
  assert.match(source,/trail\?\.kind==="nearby"\?trail\.record/);
  assert.match(source,/trail\?\.kind==="phase3"\?trail\.record/);
  assert.match(source,/motionStreakController\?\.setSelected/);
});
test("required documentation records non-physical limits and open Foundation boundary",()=>{
  const docs=fs.readFileSync(`${__dirname}/docs/DEEP_SPACE_MOTION_STREAKS.md`,"utf8");
  for(const text of ["Camera-motion visualization","does not represent physical stellar velocity","solid-body Entity","Foundation requirement","does not begin Deep Space Phase 4"])assert.ok(docs.includes(text),text);
});
