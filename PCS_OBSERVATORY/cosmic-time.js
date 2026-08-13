(function exposeCosmicTime(global){
  "use strict";

  const MIN_OFFSET_MYR=0;
  const MAX_OFFSET_MYR=100;
  const BASE_RATE_MYR_PER_SECOND=.02;
  const PRESETS=Object.freeze([0,1,10,50,100]);
  const MULTIPLIERS=Object.freeze([1,10,100,1000,10000]);

  function finite(value,fallback=0){const number=Number(value);return Number.isFinite(number)?number:fallback;}
  function clampOffset(value){return Math.min(MAX_OFFSET_MYR,Math.max(MIN_OFFSET_MYR,finite(value)));}

  class CosmicTimeState{
    constructor(options={}){this.offsetMyr=clampOffset(options.offsetMyr);this.playing=false;this.multiplier=MULTIPLIERS.includes(Number(options.multiplier))?Number(options.multiplier):1;this.listeners=new Set();this.revision=0;}
    snapshot(){return Object.freeze({offsetMyr:this.offsetMyr,playing:this.playing,multiplier:this.multiplier,baseRateMyrPerSecond:BASE_RATE_MYR_PER_SECOND,modelRateMyrPerSecond:BASE_RATE_MYR_PER_SECOND*this.multiplier,positionMode:this.offsetMyr===0?"static-observation":"model-integrated",scientificLabel:this.offsetMyr===0?"Observation Epoch":"Model Evolution",revision:this.revision});}
    emit(){this.revision+=1;const snapshot=this.snapshot();for(const listener of this.listeners)listener(snapshot);return snapshot;}
    subscribe(listener){if(typeof listener!=="function")throw new TypeError("Cosmic Time listener must be a function");this.listeners.add(listener);return()=>this.listeners.delete(listener);}
    setOffsetMyr(value){const next=clampOffset(value);if(next===this.offsetMyr)return this.snapshot();this.offsetMyr=next;return this.emit();}
    setPlaying(value){const next=Boolean(value);if(next===this.playing)return this.snapshot();this.playing=next;return this.emit();}
    toggle(){return this.setPlaying(!this.playing);}
    setMultiplier(value){const next=Number(value);if(!MULTIPLIERS.includes(next))throw new RangeError("Unsupported Cosmic Time multiplier");if(next===this.multiplier)return this.snapshot();this.multiplier=next;return this.emit();}
    tick(deltaSeconds){if(!this.playing)return this.snapshot();const delta=Math.max(0,finite(deltaSeconds))*BASE_RATE_MYR_PER_SECOND*this.multiplier;if(!delta)return this.snapshot();const next=clampOffset(this.offsetMyr+delta);this.offsetMyr=next;if(next>=MAX_OFFSET_MYR)this.playing=false;return this.emit();}
    reset(){this.playing=false;this.multiplier=1;this.offsetMyr=0;return this.emit();}
    dispose(){this.listeners.clear();this.playing=false;}
    debug(){return{...this.snapshot(),listenerCount:this.listeners.size,presets:[...PRESETS],multipliers:[...MULTIPLIERS]};}
  }

  global.PCSCosmicTime=Object.freeze({MIN_OFFSET_MYR,MAX_OFFSET_MYR,BASE_RATE_MYR_PER_SECOND,PRESETS,MULTIPLIERS,clampOffset,CosmicTimeState});
})(typeof window==="undefined"?globalThis:window);
