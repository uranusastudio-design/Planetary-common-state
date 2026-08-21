(function exposePointerAnchoredNavigation(global){
  "use strict";
  const MIN_SCALE=.78,MAX_SCALE=1.28;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function wheelScale(deltaY){return clamp(Math.exp(Number(deltaY||0)*.0015),MIN_SCALE,MAX_SCALE);}
  function pinchScale(previousDistance,currentDistance){if(!(previousDistance>0&&currentDistance>0))return 1;return clamp(previousDistance/currentDistance,MIN_SCALE,MAX_SCALE);}
  function anchoredPosition(cameraPosition,anchorPosition,scale,minDistance=1,maxDistance=Number.POSITIVE_INFINITY){
    const vector=anchorPosition.map((value,index)=>value-cameraPosition[index]),distance=Math.hypot(...vector);
    if(!(distance>0)||!vector.every(Number.isFinite))return null;
    const targetDistance=clamp(distance*clamp(scale,MIN_SCALE,MAX_SCALE),Math.max(1,minDistance),Math.max(minDistance,maxDistance));
    const unit=vector.map(value=>value/distance);
    return Object.freeze({position:Object.freeze(anchorPosition.map((value,index)=>value-unit[index]*targetDistance)),distance,targetDistance,scale:targetDistance/distance});
  }
  function viewPlaneAnchor(cameraPosition,rayDirection,planePoint,planeNormal){
    const origin=Array.from(cameraPosition||[],Number),direction=Array.from(rayDirection||[],Number),point=Array.from(planePoint||[],Number),normal=Array.from(planeNormal||[],Number);
    if([origin,direction,point,normal].some(value=>value.length!==3||value.some(item=>!Number.isFinite(item))))return null;
    const denominator=direction.reduce((sum,value,index)=>sum+value*normal[index],0);
    if(Math.abs(denominator)<1e-9)return null;
    const distance=point.reduce((sum,value,index)=>sum+(value-origin[index])*normal[index],0)/denominator;
    if(!(distance>0))return null;
    return Object.freeze(origin.map((value,index)=>value+direction[index]*distance));
  }
  function touchMetrics(touches,rect){if(!touches||touches.length<2)return null;const first=touches[0],second=touches[1],x1=first.clientX-rect.left,y1=first.clientY-rect.top,x2=second.clientX-rect.left,y2=second.clientY-rect.top;return Object.freeze({center:Object.freeze([(x1+x2)/2,(y1+y2)/2]),distance:Math.hypot(x2-x1,y2-y1)});}
  global.PCSPointerAnchoredNavigation=Object.freeze({MIN_SCALE,MAX_SCALE,wheelScale,pinchScale,anchoredPosition,viewPlaneAnchor,touchMetrics});
})(window);
