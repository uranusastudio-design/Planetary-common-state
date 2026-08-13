import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("./cosmic-time.js",import.meta.url),"utf8"),context={globalThis:{}};
vm.runInNewContext(source,context);
const CosmicTime=context.globalThis.PCSCosmicTime;

test("one Cosmic Time state owns reproducible Milky Way model time",()=>{
  const state=new CosmicTime.CosmicTimeState(),events=[],remove=state.subscribe(snapshot=>events.push(snapshot));
  assert.deepEqual([...CosmicTime.PRESETS],[0,1,10,50,100]);
  assert.equal(state.snapshot().positionMode,"static-observation");
  state.setOffsetMyr(10);
  assert.equal(state.snapshot().offsetMyr,10);
  assert.equal(state.snapshot().positionMode,"model-integrated");
  assert.equal(events.length,1);
  remove();
  assert.equal(state.debug().listenerCount,0);
});

test("Cosmic Time advances from model time rather than frame count",()=>{
  const state=new CosmicTime.CosmicTimeState();
  state.setMultiplier(10);
  state.setPlaying(true);
  state.tick(5);
  assert.ok(Math.abs(state.snapshot().offsetMyr-1)<1e-12);
  state.setOffsetMyr(99.9);
  state.setMultiplier(10000);
  state.tick(1);
  assert.equal(state.snapshot().offsetMyr,100);
  assert.equal(state.snapshot().playing,false);
});

test("Cosmic Time clamps the human-review interval and has no private animation loop",()=>{
  const state=new CosmicTime.CosmicTimeState({offsetMyr:1000});
  assert.equal(state.snapshot().offsetMyr,100);
  state.setOffsetMyr(-4);
  assert.equal(state.snapshot().offsetMyr,0);
  assert.doesNotMatch(source,/requestAnimationFrame|setInterval/);
});
