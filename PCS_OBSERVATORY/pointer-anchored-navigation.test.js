const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync(`${__dirname}/pointer-anchored-navigation.js`,"utf8");
const manager=fs.readFileSync(`${__dirname}/deep-space.js`,"utf8");
const html=fs.readFileSync(`${__dirname}/index.html`,"utf8");
const window={};vm.runInNewContext(source,{window,Math,Number,Object});const navigation=window.PCSPointerAnchoredNavigation;

test("wheel and pinch input are bounded against uncontrolled scale jumps",()=>{
  assert.equal(navigation.wheelScale(-100000),navigation.MIN_SCALE);
  assert.equal(navigation.wheelScale(100000),navigation.MAX_SCALE);
  assert.equal(navigation.pinchScale(100,100),1);
  assert.equal(navigation.pinchScale(100,1000),navigation.MIN_SCALE);
  assert.equal(navigation.pinchScale(1000,100),navigation.MAX_SCALE);
});

test("anchored motion stays on the camera-anchor ray and respects surface clearance",()=>{
  const toward=navigation.anchoredPosition([0,0,10],[0,0,0],.5,3,100);
  const away=navigation.anchoredPosition([0,0,10],[0,0,0],2,3,12);
  assert.ok(Math.abs(toward.position[2]-7.8)<1e-12);
  assert.ok(Math.abs(toward.targetDistance-7.8)<1e-12);
  assert.deepEqual([...away.position],[0,0,12]);
  assert.equal(away.targetDistance,12);
  assert.equal(navigation.anchoredPosition([0,0,0],[0,0,0],1),null);
});

test("touch metrics use the gesture center and separation",()=>{
  const metrics=navigation.touchMetrics([{clientX:20,clientY:30},{clientX:80,clientY:110}],{left:10,top:10});
  assert.deepEqual([...metrics.center],[40,60]);
  assert.equal(metrics.distance,100);
});

test("Deep Space installs one abortable pointer lifecycle and rejects orbit-line anchors",()=>{
  assert.match(html,/pointer-anchored-navigation\.js/);
  assert.match(manager,/navigationAbort=new AbortController\(\)/);
  assert.match(manager,/navigationAbort\?\.abort\(\)/);
  assert.match(manager,/orbitId[\s\S]*selected-object-after-orbit-rejection/);
  assert.match(manager,/event\.ctrlKey\?"trackpad-pinch":"mouse-wheel"/);
  assert.match(manager,/event\.touches\.length!==2/);
  assert.match(manager,/viewer\.scene\.screenSpaceCameraController\.enableZoom=false/);
  assert.match(manager,/enableZoom=saved\.zoomEnabled/);
  assert.doesNotMatch(manager,/requestAnimationFrame|setInterval/);
});

test("pointer zoom never mutates the selected-object state",()=>{
  const functionBody=manager.match(/function applyAnchoredZoom\([\s\S]*?\n  \}/)?.[0]||"";
  assert.ok(functionBody);
  assert.doesNotMatch(functionBody,/selected\s*=|selectBody\(|selectPhase3\(|renderNearbyInfo\(/);
  assert.match(functionBody,/camera\.setView/);
});
