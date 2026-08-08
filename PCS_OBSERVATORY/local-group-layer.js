(function exposeLocalGroupLayer(global) {
  "use strict";
  const Coordinates=global.PCSPhase3Coordinates;
  if(!Coordinates)return;
  const BASE="./assets/deep-space/phase-3/";
  const LANDMARK_NAMES=Object.freeze(["The Galaxy","Andromeda","Triangulum","LMC","SMC"]);
  const COLORS=Object.freeze({MW:"#8fc5df",M31:"#d9b98a",Rest:"#a7a9c8"});
  const MILKY_WAY=Object.freeze({id:"local-group:milky-way",canonicalName:"Milky Way",aliases:["The Galaxy","MW"],objectType:"S(B)bc galaxy",distanceKpc:0,distanceMethod:"observer is inside the Milky Way",heliocentricGalacticCartesianKpc:[0,0,0],dataStatus:"catalog-observation",visualizationStatus:"reference-marker",sourceCatalog:"McConnachie 2012 identity; PCS observer origin"});
  const isLandmark=record=>LANDMARK_NAMES.includes(record.canonicalName)||record.id===MILKY_WAY.id;
  const scene=(xyz,mode)=>new Cesium.Cartesian3(...Coordinates.scenePosition(xyz,mode,"local-group"));
  function distanceInterval(record){if(!Number.isFinite(record.distanceKpc)||!Array.isArray(record.heliocentricGalacticCartesianKpc))return null;const radius=Math.hypot(...record.heliocentricGalacticCartesianKpc);if(!radius)return null;const low=Math.max(0,record.distanceKpc-(record.distanceErrorMinusKpc||0)),high=record.distanceKpc+(record.distanceErrorPlusKpc||0),unit=record.heliocentricGalacticCartesianKpc.map(value=>value/radius);return {lowKpc:low,highKpc:high,low:unit.map(value=>value*low),high:unit.map(value=>value*high)};}
  function visualMarkerPixels(record,lod="far"){if(isLandmark(record))return record.canonicalName==="Andromeda"?11:9;return lod==="near"?4:lod==="medium"?3:2.2;}

  class LocalGroupCatalog{
    constructor(base=BASE){this.base=base;this.abort=null;this.registry=null;this.metadata=null;}
    async load(options={}){this.abort?.abort();this.abort=new AbortController();const request={signal:this.abort.signal,cache:"force-cache"},[registryResponse,metadataResponse]=await Promise.all([fetch(this.base+"local-group-galaxies.json",request),fetch(this.base+"catalog-metadata.json",request)]);if(!registryResponse.ok||!metadataResponse.ok)throw new Error(`Local Group catalog missing (${registryResponse.status}/${metadataResponse.status})`);this.registry=await registryResponse.json();this.metadata=await metadataResponse.json();if(this.registry.recordCount!==102||this.registry.records?.length!==102)throw new Error("Local Group catalog count mismatch");const records=options.reduced?this.registry.records.filter(isLandmark):this.registry.records;return {records,metadata:this.metadata,reduced:Boolean(options.reduced)};}
    search(term){const needle=String(term||"").trim().toLowerCase();if(!needle)return null;if(["milky way","mw","the galaxy"].includes(needle))return MILKY_WAY;return this.registry?.records?.find(record=>record.canonicalName.toLowerCase()===needle||record.sourceId.toLowerCase()===needle||record.aliases.some(alias=>alias.toLowerCase()===needle||alias.toLowerCase().includes(needle)))||null;}
    unload(){this.abort?.abort();this.abort=null;this.registry=null;this.metadata=null;}
  }

  class LocalGroupLayer{
    constructor(viewer){this.viewer=viewer;this.points=null;this.labels=null;this.uncertainties=null;this.boundary=null;this.records=[];this.pointRecords=[];this.mode="exhibition";this.lod="far";this.visible=false;}
    load(records,mode="exhibition",options={}){this.unload();this.mode=mode;this.lod=options.lod||"far";this.records=[MILKY_WAY,...records.filter(record=>record.canonicalName!=="The Galaxy"&&Array.isArray(record.heliocentricGalacticCartesianKpc))];this.points=this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.labels=this.viewer.scene.primitives.add(new Cesium.LabelCollection());this.uncertainties=this.viewer.scene.primitives.add(new Cesium.PolylineCollection());this.boundary=this.viewer.scene.primitives.add(new Cesium.PolylineCollection());for(const record of this.records){const landmark=isLandmark(record),position=scene(record.heliocentricGalacticCartesianKpc,mode),point=this.points.add({position,pixelSize:visualMarkerPixels(record,this.lod),color:Cesium.Color.fromCssColorString(COLORS[record.subgroup]||"#a7a9c8").withAlpha(landmark?1:.7),outlineColor:Cesium.Color.BLACK,outlineWidth:landmark?2:0,id:{phase3Object:record}});this.pointRecords.push([point,record,landmark]);if(landmark)this.labels.add({position,text:record.canonicalName==="Andromeda"?"Andromeda (M31)":record.canonicalName==="Triangulum"?"Triangulum (M33)":record.canonicalName,font:"13px system-ui",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(9,-9)});const interval=distanceInterval(record);if(interval&&(interval.highKpc-interval.lowKpc)>0)this.uncertainties.add({positions:[scene(interval.low,mode),scene(interval.high,mode)],width:1,material:Cesium.Material.fromType("Color",{color:Cesium.Color.WHITE.withAlpha(.22)})});}
      const radius=1500,samples=128;this.boundary.add({positions:Array.from({length:samples+1},(_,index)=>{const angle=index/samples*Math.PI*2;return scene([radius*Math.cos(angle),radius*Math.sin(angle),0],mode);}),width:1.5,material:Cesium.Material.fromType("Color",{color:Cesium.Color.fromCssColorString("#61758d").withAlpha(.28)})});this.uncertainties.show=Boolean(options.showUncertainty);this.visible=true;this.viewer.scene.requestRender();return this.debug();}
    setLabels(value){if(this.labels)this.labels.show=value;this.viewer.scene.requestRender();}
    setCatalog(value){if(this.points)this.points.show=value;this.viewer.scene.requestRender();}
    setUncertainty(value){if(this.uncertainties)this.uncertainties.show=value;this.viewer.scene.requestRender();}
    show(){for(const item of [this.points,this.labels,this.uncertainties,this.boundary])if(item)item.show=true;this.visible=true;}
    hide(){for(const item of [this.points,this.labels,this.uncertainties,this.boundary])if(item)item.show=false;this.visible=false;}
    unload(){for(const key of ["points","labels","uncertainties","boundary"]){if(this[key]){this.viewer.scene.primitives.remove(this[key]);this[key]=null;}}this.records=[];this.pointRecords=[];this.visible=false;}
    dispose(){this.unload();this.viewer=null;}
    motionStreakCandidates(){if(this.lod!=="far")return [];return this.pointRecords.map(([point,record,landmark])=>({id:String(record.id||record.sourceId),kind:"phase3",record,position:point.position,screenPosition:(scene,result)=>point.computeScreenSpacePosition(scene,result),color:point.color,prominence:point.pixelSize,distance:record.distanceKpc,landmark,eligible:true}));}
    debug(){return {records:this.records.length,points:this.points?.length||0,labels:this.labels?.length||0,uncertainties:this.uncertainties?.length||0,boundary:this.boundary?.length||0,lod:this.lod,mode:this.mode,visible:this.visible};}
  }
  global.PCSLocalGroup=Object.freeze({LANDMARK_NAMES,MILKY_WAY,isLandmark,distanceInterval,visualMarkerPixels,LocalGroupCatalog,LocalGroupLayer});
})(window);
