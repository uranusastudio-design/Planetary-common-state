(function exposeLocalGroupLayer(global) {
  "use strict";
  const Coordinates=global.PCSPhase3Coordinates;
  if(!Coordinates)return;
  const BASE="./assets/deep-space/phase-3/";
  const LANDMARK_NAMES=Object.freeze(["The Galaxy","Andromeda","Triangulum","LMC","SMC"]);
  const COLORS=Object.freeze({MW:"#8fc5df",M31:"#d9b98a",Rest:"#a7a9c8"});
  const MILKY_WAY=Object.freeze({id:"local-group:milky-way",canonicalName:"Milky Way",aliases:["The Galaxy","MW"],objectType:"S(B)bc galaxy",distanceKpc:0,distanceMethod:"observer is inside the Milky Way",heliocentricGalacticCartesianKpc:[0,0,0],galactocentricCartesianKpc:[0,0,0],coordinateFrame:Coordinates.FRAME.id,dataStatus:"adopted-reference definition",visualizationStatus:"visibility-enhanced galaxy-scale reference marker",sourceCatalog:"McConnachie 2012 identity; PCS Galactic Center anchor"});
  const isLandmark=record=>LANDMARK_NAMES.includes(record.canonicalName)||record.id===MILKY_WAY.id;
  const scene=(xyz,mode)=>new Cesium.Cartesian3(...Coordinates.scenePosition(xyz,mode,"local-group"));
  const galactocentricRecord=record=>Array.isArray(record.heliocentricGalacticCartesianKpc)?Object.freeze({...record,galactocentricCartesianKpc:Object.freeze(Coordinates.heliocentricGalacticToGalactocentric(record.heliocentricGalacticCartesianKpc)),coordinateFrame:`${record.referenceEpoch||"J2000"} source sky/distance; ${Coordinates.FRAME.id}`}):record;
  function distanceInterval(record){if(!Number.isFinite(record.distanceKpc)||!Array.isArray(record.heliocentricGalacticCartesianKpc))return null;const radius=Math.hypot(...record.heliocentricGalacticCartesianKpc);if(!radius)return null;const low=Math.max(0,record.distanceKpc-(record.distanceErrorMinusKpc||0)),high=record.distanceKpc+(record.distanceErrorPlusKpc||0),unit=record.heliocentricGalacticCartesianKpc.map(value=>value/radius);return {lowKpc:low,highKpc:high,low:unit.map(value=>value*low),high:unit.map(value=>value*high)};}
  function visualMarkerPixels(record,lod="far"){if(isLandmark(record))return record.canonicalName==="Andromeda"?11:9;return lod==="near"?4:lod==="medium"?3:2.2;}

  class LocalGroupCatalog{
    constructor(base=BASE){this.base=base;this.abort=null;this.registry=null;this.records=[];this.metadata=null;}
    async load(options={}){this.abort?.abort();this.abort=new AbortController();const request={signal:this.abort.signal,cache:"force-cache"},[registryResponse,metadataResponse]=await Promise.all([fetch(this.base+"local-group-galaxies.json",request),fetch(this.base+"catalog-metadata.json",request)]);if(!registryResponse.ok||!metadataResponse.ok)throw new Error(`Local Group catalog missing (${registryResponse.status}/${metadataResponse.status})`);this.registry=await registryResponse.json();this.metadata=await metadataResponse.json();if(this.registry.recordCount!==102||this.registry.records?.length!==102)throw new Error("Local Group catalog count mismatch");this.records=this.registry.records.map(galactocentricRecord);const records=options.reduced?this.records.filter(isLandmark):this.records;return {records,metadata:this.metadata,reduced:Boolean(options.reduced)};}
    search(term){const needle=String(term||"").trim().toLowerCase();if(!needle)return null;if(["milky way","mw","the galaxy"].includes(needle))return MILKY_WAY;return this.records.find(record=>record.canonicalName.toLowerCase()===needle||record.sourceId.toLowerCase()===needle||record.aliases.some(alias=>alias.toLowerCase()===needle||alias.toLowerCase().includes(needle)))||null;}
    unload(){this.abort?.abort();this.abort=null;this.registry=null;this.records=[];this.metadata=null;}
  }

  class LocalGroupLayer{
    constructor(viewer){this.viewer=viewer;this.points=null;this.labels=null;this.uncertainties=null;this.records=[];this.mode="exhibition";this.lod="far";this.visible=false;}
    load(records,mode="exhibition",options={}){this.unload();this.mode=mode;this.lod=options.lod||"far";this.records=[MILKY_WAY,...records.filter(record=>record.canonicalName!=="The Galaxy"&&Array.isArray(record.galactocentricCartesianKpc))];this.points=this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.labels=this.viewer.scene.primitives.add(new Cesium.LabelCollection());this.uncertainties=this.viewer.scene.primitives.add(new Cesium.PolylineCollection());for(const record of this.records){const landmark=isLandmark(record),position=scene(record.galactocentricCartesianKpc,mode);this.points.add({position,pixelSize:visualMarkerPixels(record,this.lod),color:Cesium.Color.fromCssColorString(COLORS[record.subgroup]||"#a7a9c8").withAlpha(landmark?1:.7),outlineColor:Cesium.Color.BLACK,outlineWidth:landmark?2:0,id:{phase3Object:record}});if(landmark)this.labels.add({position,text:record.canonicalName==="Andromeda"?"Andromeda (M31)":record.canonicalName==="Triangulum"?"Triangulum (M33)":record.canonicalName,font:"13px system-ui",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(9,-9)});const interval=distanceInterval(record);if(interval&&(interval.highKpc-interval.lowKpc)>0)this.uncertainties.add({positions:[scene(Coordinates.heliocentricGalacticToGalactocentric(interval.low),mode),scene(Coordinates.heliocentricGalacticToGalactocentric(interval.high),mode)],width:1,material:Cesium.Material.fromType("Color",{color:Cesium.Color.WHITE.withAlpha(.22)})});}
      this.uncertainties.show=Boolean(options.showUncertainty);this.visible=true;this.viewer.scene.requestRender();return this.debug();}
    setLabels(value){if(this.labels)this.labels.show=value;this.viewer.scene.requestRender();}
    setCatalog(value){if(this.points)this.points.show=value;this.viewer.scene.requestRender();}
    setUncertainty(value){if(this.uncertainties)this.uncertainties.show=value;this.viewer.scene.requestRender();}
    show(){for(const item of [this.points,this.labels,this.uncertainties])if(item)item.show=true;this.visible=true;}
    hide(){for(const item of [this.points,this.labels,this.uncertainties])if(item)item.show=false;this.visible=false;}
    unload(){for(const key of ["points","labels","uncertainties"]){if(this[key]){this.viewer.scene.primitives.remove(this[key]);this[key]=null;}}this.records=[];this.visible=false;}
    dispose(){this.unload();this.viewer=null;}
    debug(){return {records:this.records.length,points:this.points?.length||0,labels:this.labels?.length||0,uncertainties:this.uncertainties?.length||0,boundary:0,boundaryStatus:"No rigid Local Group boundary is rendered",lod:this.lod,mode:this.mode,visible:this.visible};}
  }
  global.PCSLocalGroup=Object.freeze({LANDMARK_NAMES,MILKY_WAY,isLandmark,galactocentricRecord,distanceInterval,visualMarkerPixels,LocalGroupCatalog,LocalGroupLayer});
})(window);
