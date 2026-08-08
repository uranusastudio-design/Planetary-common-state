(function exposeNearbyStars(global){
  "use strict";
  const PC_TO_LY=3.261563777, DEG=Math.PI/180;
  const ICRS_TO_GALACTIC=Object.freeze([
    Object.freeze([-0.0548755604,-0.8734370902,-0.4838350155]),
    Object.freeze([ 0.4941094279,-0.4448296300, 0.7469822445]),
    Object.freeze([-0.8676661490,-0.1980763734, 0.4559837762])]);
  const CONFIG=Object.freeze([
    {id:"10pc",radiusPc:10,maxObjects:1200,mobileMaxObjects:303,magnitudeLimit:20,qualityFilters:["GCNS probability >= 0.5"],loadingMode:"full",pointSizeMode:"photometric",labelPolicy:"landmarks",dataSource:"Gaia EDR3 GCNS",release:"Gaia EDR3 / GCNS v1 · 2020",dataStatus:"catalog astrometry"},
    {id:"25pc",radiusPc:25,maxObjects:5000,mobileMaxObjects:2500,magnitudeLimit:18,qualityFilters:["GCNS probability >= 0.5"],loadingMode:"bounded",pointSizeMode:"photometric",labelPolicy:"landmarks",dataSource:"Gaia EDR3 GCNS",release:"Gaia EDR3 / GCNS v1 · 2020",dataStatus:"catalog astrometry"},
    {id:"50pc",radiusPc:50,maxObjects:8000,mobileMaxObjects:4000,magnitudeLimit:16.5,qualityFilters:["GCNS probability >= 0.5"],loadingMode:"bounded",pointSizeMode:"photometric",labelPolicy:"selected",dataSource:"Gaia EDR3 GCNS",release:"Gaia EDR3 / GCNS v1 · 2020",dataStatus:"catalog astrometry"},
    {id:"100pc",radiusPc:100,maxObjects:10000,mobileMaxObjects:5000,magnitudeLimit:15,qualityFilters:["GCNS probability >= 0.5"],loadingMode:"LOD capped",pointSizeMode:"photometric",labelPolicy:"selected",dataSource:"Gaia EDR3 GCNS",release:"Gaia EDR3 / GCNS v1 · 2020",dataStatus:"catalog astrometry"}
  ]);
  function catalogMetadata(record={}){
    const source=String(record.sourceCatalog||record.release||"Gaia EDR3 / GCNS v1");
    const gaiaDr3=/Gaia DR3/i.test(source),gaiaEdr3=/EDR3|GCNS/i.test(source),hipparcos=/Hipparcos/i.test(source);
    const catalogRelease=gaiaDr3?"2022":gaiaEdr3?"2020":hipparcos?"2007":"Unavailable";
    const complete3d=[record.ra,record.dec,record.parallax,record.pmra,record.pmdec,record.radial_velocity].every(Number.isFinite);
    const tangential=[record.ra,record.dec,record.parallax,record.pmra,record.pmdec].every(Number.isFinite);
    const reference=Number(record.referenceEpoch),referenceEpoch=Number.isFinite(reference)?`J${Number.isInteger(reference)?reference.toFixed(1):reference}`:"Unavailable";
    return {source:gaiaDr3?"Gaia DR3":gaiaEdr3?"Gaia EDR3 / GCNS":hipparcos?"Hipparcos new reduction":source,catalogRelease,referenceEpoch,positionMode:"catalog-epoch",complete3d,tangential,nextCatalog:"Gaia DR4",nextCatalogExpected:"2026 (not before mid-2026)"};
  }
  const multiply=(m,v)=>m.map(row=>row[0]*v[0]+row[1]*v[1]+row[2]*v[2]);
  function icrsToCartesian(ra,dec,distancePc){const a=ra*DEG,d=dec*DEG,c=Math.cos(d);return [distancePc*c*Math.cos(a),distancePc*c*Math.sin(a),distancePc*Math.sin(d)];}
  function icrsToGalactic(ra,dec,distancePc){return multiply(ICRS_TO_GALACTIC,icrsToCartesian(ra,dec,distancePc));}
  function propagate(record,year){const delta=Math.max(-100,Math.min(100,year-record.referenceEpoch));return {ra:record.ra+(record.pmra||0)*delta/(3600000*Math.max(Math.cos(record.dec*DEG),1e-6)),dec:record.dec+(record.pmdec||0)*delta/3600000,clamped:Math.abs(year-record.referenceEpoch)>100,method:"linear astrometric propagation; tangential 5D only when radial velocity is unavailable"};}
  // Deterministic perceptual ramp ordered by the measured BP-RP index. This is
  // deliberately not labelled calibrated sRGB, effective temperature, or a
  // physical photosphere colour; breakpoints and channel equations are tested.
  function colorFor(bpRp){if(!Number.isFinite(bpRp))return [0.78,0.84,1];const t=Math.max(-.5,Math.min(4,bpRp));if(t<.5)return [0.65+t*.3,0.76+t*.2,1];if(t<1.5)return [1,.94-(t-.5)*.2,.78-(t-.5)*.3];return [1,.74-Math.min(.34,(t-1.5)*.12),.48-Math.min(.2,(t-1.5)*.07)];}
  function galacticCartesian(record){
    if(!Array.isArray(record.cartesianPc))return icrsToGalactic(record.ra,record.dec,record.distancePc);
    return /ICRS/i.test(record.coordinateFrame||"")?multiply(ICRS_TO_GALACTIC,record.cartesianPc):record.cartesianPc;
  }
  function scenePosition(record,mode){const xyz=galacticCartesian(record),r=Math.hypot(...xyz)||1,mapped=sceneRadius(r,mode);return xyz.map(v=>v/r*mapped);}
  function sceneRadius(radiusPc,mode){return mode==="scientific"?radiusPc*1e6:(2e6+Math.log10(1+radiusPc)*1.7e7);}
  function mergeRecords(records,landmarks,radiusPc){
    const bySource=new Map(landmarks.filter(x=>x.source_id!=null).map(x=>[String(x.source_id),x]));
    const merged=records.map(record=>Object.assign({},record,bySource.get(String(record.source_id))||{}));
    const present=new Set(merged.map(x=>String(x.source_id)));
    for(const landmark of landmarks){if(landmark.distancePc!=null&&landmark.distancePc<=radiusPc&&!present.has(String(landmark.source_id)))merged.push(landmark);}
    return merged;
  }

  class NearbyStarsCatalog{
    constructor(base="./assets/deep-space/nearby-stars/"){this.base=base;this.cache=new Map();this.landmarks=null;this.abort=null;}
    async load(id){this.abort?.abort();this.abort=new AbortController();if(!this.landmarks)this.landmarks=await this.fetch("landmark-systems.json");if(!this.cache.has(id))this.cache.set(id,await this.fetch(`nearby-stars-${id}.json`));return {tier:this.cache.get(id),landmarks:this.landmarks,reduced:false};}
    async loadReduced(){this.abort?.abort();this.abort=new AbortController();if(!this.landmarks)this.landmarks=await this.fetch("landmark-systems.json");return {tier:{records:[],tier:"landmarks",radiusPc:100},landmarks:this.landmarks,reduced:true};}
    async fetch(file){const response=await fetch(this.base+file,{signal:this.abort.signal,cache:"force-cache"});if(!response.ok)throw new Error(`catalog file missing (${response.status})`);const data=await response.json();if(!Array.isArray(data.records))throw new Error("catalog parse error");return data;}
    unload(){this.abort?.abort();this.abort=null;this.cache.clear();this.landmarks=null;}
  }
  class NearbyStarsLODController{constructor(){this.level="far";}update(radius){this.level=radius<=10?"near":radius<=50?"medium":"far";return this.level;}}
  class NearbyStarsLabelController{constructor(){this.enabled=true;}setEnabled(value){this.enabled=value;}}
  class NearbyStarsSelectionController{constructor(){this.selected=null;}select(record){this.selected=record;}clear(){this.selected=null;}}
  class NearbyStarsLayer{
    constructor(viewer){this.viewer=viewer;this.points=null;this.labels=null;this.guides=null;this.motion=null;this.visible=false;this.records=[];this.pointRecords=[];this.mode="scientific";this.config=null;this.lod=new NearbyStarsLODController();this.selection=new NearbyStarsSelectionController();this.labelController=new NearbyStarsLabelController();}
    load(records,landmarks,config,mode){this.unload();this.mode=mode;this.config=config;const landmarkIds=new Set(landmarks.map(x=>String(x.source_id))),merged=mergeRecords(records,landmarks,config.radiusPc),limit=config.renderMaxObjects||config.maxObjects;this.records=merged.length>limit?[...merged.filter(x=>landmarkIds.has(String(x.source_id))),...merged.filter(x=>!landmarkIds.has(String(x.source_id)))].slice(0,limit):merged;this.points=this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.labels=this.viewer.scene.primitives.add(new Cesium.LabelCollection());this.guides=this.viewer.scene.primitives.add(new Cesium.PolylineCollection());this.motion=this.viewer.scene.primitives.add(new Cesium.PolylineCollection());this.lod.update(config.radiusPc);for(const record of this.records){if(!record.cartesianPc&&!(Number.isFinite(record.ra)&&Number.isFinite(record.dec)&&Number.isFinite(record.distancePc)))continue;const p=scenePosition(record,mode),rgb=colorFor(record.bp_rp),quality=record.dataStatus||"catalog astrometry",point=this.points.add({position:new Cesium.Cartesian3(...p),pixelSize:Math.max(1.5,Math.min(8,6-(record.phot_g_mean_mag||12)*.23)),color:new Cesium.Color(rgb[0],rgb[1],rgb[2],quality.includes("limited")?.45:.82),outlineWidth:0,id:{nearbyStar:record}});this.pointRecords.push([point,record]);if(landmarkIds.has(String(record.source_id))&&record.primaryName)this.labels.add({position:new Cesium.Cartesian3(...p),text:record.primaryName,font:"12px system-ui",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(8,-8),show:this.labelController.enabled});}this.addGuides(config.radiusPc);this.addMotionVectors(landmarks);this.motion.show=false;this.visible=true;this.viewer.scene.requestRender();}
    addGuides(radiusPc){const radii=[1,5,radiusPc].filter((v,i,a)=>v<=radiusPc&&a.indexOf(v)===i);for(const radius of radii){const points=[],mapped=sceneRadius(radius,this.mode);for(let i=0;i<=96;i++){const angle=i*Math.PI*2/96;points.push(new Cesium.Cartesian3(mapped*Math.cos(angle),mapped*Math.sin(angle),0));}this.guides.add({positions:points,width:radius===radiusPc?1.5:1,material:Cesium.Material.fromType("Color",{color:Cesium.Color.CYAN.withAlpha(radius===radiusPc?.35:.15)})});}const axis=sceneRadius(radiusPc,this.mode);for(const pair of [[[ -axis,0,0],[axis,0,0]],[[0,-axis,0],[0,axis,0]],[[0,0,-axis],[0,0,axis]]])this.guides.add({positions:pair.map(v=>new Cesium.Cartesian3(...v)),width:1,material:Cesium.Material.fromType("Color",{color:Cesium.Color.WHITE.withAlpha(.12)})});}
    addMotionVectors(landmarks){for(const record of landmarks){if(!Number.isFinite(record.distancePc)||!Number.isFinite(record.ra)||!Number.isFinite(record.dec)||(record.pmra==null&&record.pmdec==null))continue;const moved=propagate(record,(record.referenceEpoch||2016)+100),end=Object.assign({},record,{ra:moved.ra,dec:moved.dec,cartesianPc:null,coordinateFrame:"ICRS"}),a=scenePosition(record,this.mode),b=scenePosition(end,this.mode);this.motion.add({positions:[new Cesium.Cartesian3(...a),new Cesium.Cartesian3(...b)],width:2,material:Cesium.Material.fromType("Color",{color:Cesium.Color.YELLOW.withAlpha(.8)})});}}
    show(){for(const c of [this.points,this.labels,this.guides])if(c)c.show=true;this.visible=true;}
    hide(){for(const c of [this.points,this.labels,this.guides,this.motion])if(c)c.show=false;this.visible=false;}
    unload(){for(const key of ["points","labels","guides","motion"]){if(this[key]){this.viewer.scene.primitives.remove(this[key]);this[key]=null;}}this.records=[];this.pointRecords=[];this.selection.clear();this.visible=false;}
    dispose(){this.unload();this.viewer=null;}
    setLabels(value){this.labelController.setEnabled(value);if(this.labels)this.labels.show=value;}
    setQuality(value){const colors={"high-confidence astrometry":"#8fb8c4","catalog astrometry":"#8292aa","limited astrometry":"#b3a277","incomplete 6D state":"#a493ad","supplemental Hipparcos":"#c5c5c5","representative only":"#777f82"};for(const [point,record] of this.pointRecords){point.outlineWidth=value?1.25:0;point.outlineColor=Cesium.Color.fromCssColorString(colors[record.dataStatus]||"#788386").withAlpha(.82);}this.viewer.scene.requestRender();}
    setMotion(value){if(this.motion)this.motion.show=value;this.viewer.scene.requestRender();}
    setGuides(value){if(this.guides)this.guides.show=value;this.viewer.scene.requestRender();}
    debug(){return {records:this.records.length,points:this.points?.length||0,labels:this.labels?.length||0,guides:this.guides?.length||0,motion:this.motion?.length||0,lod:this.lod.level,visible:this.visible};}
  }
  global.PCSNearbyStars=Object.freeze({CONFIG,PC_TO_LY,ICRS_TO_GALACTIC,catalogMetadata,icrsToCartesian,icrsToGalactic,propagate,colorFor,galacticCartesian,scenePosition,sceneRadius,mergeRecords,NearbyStarsCatalog,NearbyStarsLayer,NearbyStarsLODController,NearbyStarsSelectionController,NearbyStarsLabelController});
})(window);
