(function exposeDeepSpaceMotionStreaks(global) {
  "use strict";

  const MODES = Object.freeze({
    off: Object.freeze({gain:0,maxLength:0,minLength:0,width:0,alpha:0,desktopCap:0,mobileCap:0}),
    subtle: Object.freeze({gain:.72,maxLength:22,minLength:1.5,width:.82,alpha:.5,desktopCap:180,mobileCap:60}),
    standard: Object.freeze({gain:1,maxLength:38,minLength:2,width:1,alpha:.68,desktopCap:360,mobileCap:120}),
    cinematic: Object.freeze({gain:1.3,maxLength:58,minLength:2.5,width:1.16,alpha:.78,desktopCap:600,mobileCap:200})
  });
  const CONTEXTS = Object.freeze({
    nearby:Object.freeze({depth:.95,length:1}),
    "milky-way":Object.freeze({depth:.68,length:.82}),
    "local-group":Object.freeze({depth:.46,length:.58})
  });
  const SETTLE_MS=190;
  const START_MS=72;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const validMode=value=>Object.prototype.hasOwnProperty.call(MODES,value)?value:null;
  function deterministicHash(value){let hash=2166136261;for(const character of String(value)){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
  function defaultMode(stored,reducedMotion){return validMode(stored)||(reducedMotion?"off":"subtle");}
  function candidateId(candidate){return String(candidate?.id??candidate?.record?.id??candidate?.record?.source_id??candidate?.record?.sourceId??"");}
  function chooseCandidates(candidates,cap,selectedId){
    const selected=String(selectedId??"");
    return candidates.filter(candidate=>candidate&&candidate.eligible!==false&&candidate.position&&candidateId(candidate)).sort((a,b)=>{
      const aId=candidateId(a),bId=candidateId(b);
      const aPriority=aId===selected?0:a.landmark?1:2,bPriority=bId===selected?0:b.landmark?1:2;
      return aPriority-bPriority||(Number(b.prominence)||0)-(Number(a.prominence)||0)||(Number(a.distance)||Infinity)-(Number(b.distance)||Infinity)||deterministicHash(aId)-deterministicHash(bId)||aId.localeCompare(bId);
    }).slice(0,Math.max(0,cap));
  }
  function screenVelocity(previous,current,deltaMs){
    if(!previous||!current)return {dx:0,dy:0,speed:0};
    const dx=current.x-previous.x,dy=current.y-previous.y;
    return {dx,dy,speed:Math.hypot(dx,dy)*16.667/clamp(deltaMs||16.667,4,80)};
  }
  function streakLength(velocity,modeName,contextName,depthFactor=1,activation=1,automationFactor=1){
    const mode=MODES[validMode(modeName)||"off"],context=CONTEXTS[contextName]||CONTEXTS.nearby;
    return clamp(velocity*mode.gain*context.depth*context.length*clamp(depthFactor,.42,1.15)*clamp(automationFactor,0,1)*clamp(activation,0,1),0,mode.maxLength*context.length);
  }
  function streakWidth(prominence,selected,modeName){
    const mode=MODES[validMode(modeName)||"off"];
    return clamp((.62+Math.sqrt(Math.max(0,Number(prominence)||0))*.32+(selected?.55:0))*mode.width,.7,3.2);
  }
  function cameraSnapshot(camera){
    const frustum=camera?.frustum||{};
    return {position:[camera?.positionWC?.x||0,camera?.positionWC?.y||0,camera?.positionWC?.z||0],direction:[camera?.directionWC?.x||0,camera?.directionWC?.y||0,camera?.directionWC?.z||0],up:[camera?.upWC?.x||0,camera?.upWC?.y||0,camera?.upWC?.z||0],fov:Number(frustum.fov||frustum.width||0)};
  }
  function cameraMoved(previous,current){
    if(!previous||!current)return false;
    const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
    const scale=Math.max(1,Math.hypot(...previous.position));
    return distance(previous.position,current.position)/scale>1e-8||distance(previous.direction,current.direction)>2e-7||distance(previous.up,current.up)>2e-7||Math.abs(previous.fov-current.fov)>1e-8;
  }

  class MotionStreakController {
    constructor(viewer,options={}){
      this.viewer=viewer;
      this.mode=defaultMode(options.mode,Boolean(options.reducedMotion));
      this.reducedMotion=Boolean(options.reducedMotion);
      this.context="nearby";
      this.mobile=Boolean(options.mobile);
      this.reduced=Boolean(options.reduced);
      this.selectedId="";
      this.allCandidates=[];
      this.entries=[];
      this.state="idle";
      this.activation=0;
      this.lastFrame=0;
      this.lastCamera=null;
      this.automation={factor:1,until:0};
      this.collection=viewer.scene.primitives.add(new Cesium.PolylineCollection({show:false}));
      this.removePostRender=viewer.scene.postRender.addEventListener(()=>this.update());
    }
    cap(){
      const config=MODES[this.mode],base=this.mobile?config.mobileCap:config.desktopCap;
      return this.reduced?Math.max(1,Math.floor(base*.55)):base;
    }
    setMode(mode){
      this.mode=validMode(mode)||"off";
      this.rebuild();
      if(this.mode==="off")this.resetVisuals();
      this.viewer.scene.requestRender();
    }
    setSource(context,candidates,options={}){
      this.context=CONTEXTS[context]?context:"nearby";
      this.mobile=Boolean(options.mobile);
      this.reduced=Boolean(options.reduced);
      this.allCandidates=Array.isArray(candidates)?candidates:[];
      this.rebuild();
    }
    clearSource(){this.allCandidates=[];this.selectedId="";this.rebuild();this.resetVisuals();}
    setSelected(id){const next=String(id??"");if(next===this.selectedId)return;this.selectedId=next;this.rebuild();}
    setAutomation(kind,durationMs=900){
      this.automation={factor:kind==="jump"?0:kind==="focus" ? .48 : .68,until:performance.now()+Math.max(0,durationMs)};
    }
    rebuild(){
      if(!this.collection)return;
      this.collection.removeAll();this.entries=[];
      for(const candidate of chooseCandidates(this.allCandidates,this.cap(),this.selectedId)){
        const id=candidateId(candidate),selected=id===this.selectedId,baseColor=Cesium.Color.clone(candidate.color||Cesium.Color.WHITE);
        baseColor.alpha=(Number.isFinite(baseColor.alpha)?baseColor.alpha:1)*MODES[this.mode].alpha;
        const line=this.collection.add({show:false,positions:[candidate.position,candidate.position],width:streakWidth(candidate.prominence,selected,this.mode),material:Cesium.Material.fromType("Color",{color:baseColor}),id:{motionStreakObject:{kind:candidate.kind,record:candidate.record,id}}});
        this.entries.push({id,candidate,line,previous:null,dx:0,dy:0,velocity:0});
      }
      this.collection.show=false;
      this.viewer?.scene?.requestRender();
    }
    resetVisuals(){
      this.state="idle";this.activation=0;
      if(this.collection)this.collection.show=false;
      for(const entry of this.entries){entry.line.show=false;entry.previous=null;entry.velocity=0;}
    }
    depthFactor(position){
      const camera=this.viewer.camera.positionWC,distance=Cesium.Cartesian3.distance(camera,position),cameraScale=Math.max(1,Cesium.Cartesian3.magnitude(camera));
      return clamp(1/(1+.2*Math.log10(1+distance/cameraScale)),.55,1.05);
    }
    endpoint(position,screen,dx,dy,length){
      const magnitude=Math.hypot(dx,dy);if(magnitude<1e-5||length<.5)return null;
      const endScreen=new Cesium.Cartesian2(screen.x-dx/magnitude*length,screen.y-dy/magnitude*length),ray=this.viewer.camera.getPickRay(endScreen);
      if(!ray)return null;
      const cameraDirection=this.viewer.camera.directionWC,offset=Cesium.Cartesian3.subtract(position,ray.origin,new Cesium.Cartesian3()),denominator=Cesium.Cartesian3.dot(ray.direction,cameraDirection);
      if(Math.abs(denominator)<1e-6)return null;
      const depth=Cesium.Cartesian3.dot(offset,cameraDirection)/denominator;
      if(!Number.isFinite(depth)||depth<=0)return null;
      return Cesium.Cartesian3.add(ray.origin,Cesium.Cartesian3.multiplyByScalar(ray.direction,depth,new Cesium.Cartesian3()),new Cesium.Cartesian3());
    }
    update(){
      if(!this.viewer||!this.collection)return;
      const now=performance.now(),elapsed=this.lastFrame?Math.max(0,now-this.lastFrame):16.667,delta=clamp(elapsed,4,80),currentCamera=cameraSnapshot(this.viewer.camera),moved=cameraMoved(this.lastCamera,currentCamera);
      this.lastFrame=now;this.lastCamera=currentCamera;
      if(this.mode==="off"||!this.entries.length){this.resetVisuals();return;}
      if(moved){this.state=this.activation<=0?"starting":"moving";this.activation=clamp(this.activation+elapsed/START_MS,0,1);}
      else if(this.activation>0){this.state="settling";this.activation=clamp(this.activation-elapsed/SETTLE_MS,0,1);}
      else this.state="idle";
      const automationFactor=now<this.automation.until?this.automation.factor:1;
      let visible=0;
      for(const entry of this.entries){
        const position=typeof entry.candidate.position==="function"?entry.candidate.position():entry.candidate.position;
        const screen=position&&(typeof entry.candidate.screenPosition==="function"?entry.candidate.screenPosition(this.viewer.scene,new Cesium.Cartesian2()):Cesium.SceneTransforms.worldToWindowCoordinates(this.viewer.scene,position,new Cesium.Cartesian2()));
        if(!screen||!Number.isFinite(screen.x)||!Number.isFinite(screen.y)){entry.line.show=false;entry.previous=null;continue;}
        const displacement=screenVelocity(entry.previous,screen,delta);
        entry.previous=Cesium.Cartesian2.clone(screen,entry.previous||new Cesium.Cartesian2());
        if(moved&&displacement.speed>.04){entry.dx=displacement.dx;entry.dy=displacement.dy;entry.velocity=entry.velocity*.45+displacement.speed*.55;}
        else entry.velocity*=Math.max(0,1-delta/SETTLE_MS);
        const length=streakLength(entry.velocity,this.mode,this.context,this.depthFactor(position),this.activation,automationFactor),end=this.endpoint(position,screen,entry.dx,entry.dy,length);
        entry.line.show=Boolean(end);
        if(end){entry.line.positions=[position,end];visible++;}
      }
      this.collection.show=visible>0;
      if(this.activation>0||moved)this.viewer.scene.requestRender();
      if(this.activation<=0){this.state="idle";this.collection.show=false;for(const entry of this.entries)entry.line.show=false;}
    }
    debug(){
      const visible=this.entries.filter(entry=>entry.line.show),mean=key=>visible.length?visible.reduce((sum,entry)=>sum+entry[key],0)/visible.length:0;
      return {mode:this.mode,state:this.state,context:this.context,candidates:this.allCandidates.length,streaks:this.entries.length,trackedScreens:this.entries.filter(entry=>entry.previous).length,visible:visible.length,meanDx:mean("dx"),meanDy:mean("dy"),maxVelocity:visible.reduce((value,entry)=>Math.max(value,entry.velocity),0),mobile:this.mobile,reduced:this.reduced,listenerActive:Boolean(this.removePostRender),independentAnimationLoop:false};
    }
    dispose(){
      this.removePostRender?.();this.removePostRender=null;
      if(this.collection&&this.viewer)this.viewer.scene.primitives.remove(this.collection);
      this.collection=null;this.entries=[];this.allCandidates=[];this.viewer=null;
    }
  }

  global.PCSDeepSpaceMotionStreaks=Object.freeze({MODES,CONTEXTS,SETTLE_MS,START_MS,clamp,deterministicHash,defaultMode,chooseCandidates,screenVelocity,streakLength,streakWidth,cameraSnapshot,cameraMoved,MotionStreakController});
})(window);
