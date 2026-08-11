(function exposeAstronomicalCameraScale(global){
  "use strict";

  const SCALE_NAMES=Object.freeze({
    PLANETARY:"PLANETARY",
    INNER_SOLAR_SYSTEM:"INNER SOLAR SYSTEM",
    SOLAR_SYSTEM:"SOLAR SYSTEM",
    COMET_ORBIT:"COMET ORBIT",
    HELIOSPHERE:"HELIOSPHERE",
    INTERSTELLAR:"INTERSTELLAR",
    GALACTIC:"GALACTIC"
  });
  const PARSEC_AU=206264.80624709636;

  function finitePositive(value,name){
    const number=Number(value);
    if(!Number.isFinite(number)||number<=0)throw new RangeError(`${name} must be a finite positive number`);
    return number;
  }
  function classify({distanceAu=0,context="solar",intent=null}={}){
    if(intent==="comet-orbit")return SCALE_NAMES.COMET_ORBIT;
    if(["milky-way","local-group","galaxy-groups","virgo","laniakea","cosmic-web","observable-universe","cmb"].includes(context))return SCALE_NAMES.GALACTIC;
    if(context==="nearby")return SCALE_NAMES.INTERSTELLAR;
    const au=Math.max(0,Number(distanceAu)||0);
    if(au<.02)return SCALE_NAMES.PLANETARY;
    if(au<5)return SCALE_NAMES.INNER_SOLAR_SYSTEM;
    if(au<50)return SCALE_NAMES.SOLAR_SYSTEM;
    if(au<250)return SCALE_NAMES.HELIOSPHERE;
    if(au<PARSEC_AU)return SCALE_NAMES.INTERSTELLAR;
    return SCALE_NAMES.GALACTIC;
  }
  function boundingSphere(points){
    if(!Array.isArray(points)||points.length<2)throw new RangeError("At least two orbit points are required");
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],clean=[];
    for(const raw of points){
      const point=Array.from(raw||[],Number);
      if(point.length!==3||point.some(value=>!Number.isFinite(value)))continue;
      clean.push(point);
      for(let axis=0;axis<3;axis+=1){min[axis]=Math.min(min[axis],point[axis]);max[axis]=Math.max(max[axis],point[axis]);}
    }
    if(clean.length<2)throw new RangeError("At least two finite orbit points are required");
    const center=min.map((value,axis)=>(value+max[axis])/2);
    const radius=Math.max(...clean.map(point=>Math.hypot(point[0]-center[0],point[1]-center[1],point[2]-center[2])));
    return Object.freeze({center:Object.freeze(center),radius,pointCount:clean.length});
  }
  function subtract(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function normalize(vector){const magnitude=Math.hypot(...vector);return magnitude>0?vector.map(value=>value/magnitude):null;}
  function orbitPlane(points,center){
    const vectors=points.map(point=>subtract(point,center)).filter(vector=>Math.hypot(...vector)>0);
    if(vectors.length<2)return Object.freeze({normal:Object.freeze([0,0,1]),up:Object.freeze([0,1,0])});
    const major=vectors.reduce((best,value)=>Math.hypot(...value)>Math.hypot(...best)?value:best,vectors[0]);
    const second=vectors.reduce((best,value)=>Math.hypot(...cross(major,value))>Math.hypot(...cross(major,best))?value:best,vectors[1]);
    let normal=normalize(cross(major,second))||[0,0,1];
    if(normal[2]<0)normal=normal.map(value=>-value);
    const up=normalize(major)||[0,1,0];
    return Object.freeze({normal:Object.freeze(normal),up:Object.freeze(up)});
  }
  function fitDistance({radius,fovY,aspectRatio,margin=1.13}){
    const r=finitePositive(radius,"radius"),vertical=finitePositive(fovY,"fovY"),aspect=finitePositive(aspectRatio,"aspectRatio"),safeMargin=Math.max(1,Number(margin)||1);
    const horizontal=2*Math.atan(Math.tan(vertical/2)*aspect),halfAngle=Math.max(.01,Math.min(vertical,horizontal)/2);
    return r*safeMargin/Math.sin(halfAngle);
  }
  function clipPlanes({range,radius}){
    const distance=finitePositive(range,"range"),r=finitePositive(radius,"radius"),near=Math.max(1,(distance-r*1.08)*.45),far=Math.max(near*100,(distance+r*1.08)*1.4);
    return Object.freeze({near,far,ratio:far/near});
  }
  function inverseExhibitionDistance(sceneDistance){
    const distance=Math.max(0,Number(sceneDistance)||0);
    if(distance<=250000)return 0;
    return Math.max(0,10**((distance-250000)/1550000)-1);
  }

  global.PCSAstronomicalCameraScale=Object.freeze({SCALE_NAMES,PARSEC_AU,classify,boundingSphere,orbitPlane,fitDistance,clipPlanes,inverseExhibitionDistance});
})(typeof window!=="undefined"?window:globalThis);
