(function exposeVirgoCluster(global){
  "use strict";
  const Coordinates=global.PCSPhase4Coordinates;
  if(!Coordinates)return;
  const BASE="./assets/deep-space/phase-4b/";
  const MAJOR=new Set(["M84","M86","M49","M87","M60"]);
  const COLORS=Object.freeze({cluster:"#ffcf75",member:"#b9d7ff",possible:"#a99bd8",major:"#fff1bd",selected:"#ffffff"});
  const scene=(record,mode)=>new Cesium.Cartesian3(...Coordinates.scenePosition(record.supergalacticCartesianMpc||record.representativeSupergalacticCartesianMpc,mode,"virgo"));
  const names=record=>[record.canonicalName,...(record.aliases||[]),...(record.catalogIds||[])];
  const isMajor=record=>record.aliases?.some(alias=>MAJOR.has(alias));
  class VirgoCatalog{
    constructor(base=BASE){this.base=base;this.abort=null;this.bundle=null;this.cluster=null;this.galaxies=[];this.byId=new Map();}
    async load(){if(this.bundle)return this.bundle;this.abort?.abort();this.abort=new AbortController();const response=await fetch(this.base+"virgo-cluster.json",{signal:this.abort.signal,cache:"force-cache"});if(!response.ok)throw new Error(`Phase 4B catalog missing (${response.status})`);const bundle=await response.json();if(bundle.galaxyCount!==1589||bundle.memberCount!==1028||bundle.possibleMemberCount!==561)throw new Error("Phase 4B catalog count mismatch");this.bundle=bundle;this.cluster=bundle.cluster;this.galaxies=bundle.galaxies;this.byId=new Map([[this.cluster.id,this.cluster],...this.galaxies.map(record=>[record.id,record])]);return bundle;}
    search(term){const needle=String(term||"").trim().toLowerCase();if(!needle)return null;const records=[this.cluster,...this.galaxies].filter(Boolean),exact=record=>names(record).some(value=>String(value).toLowerCase()===needle);return records.find(exact)||records.find(record=>names(record).some(value=>String(value).toLowerCase().includes(needle)))||null;}
    get(id){return this.byId.get(id)||null;}
    unload(){this.abort?.abort();this.abort=null;this.bundle=null;this.cluster=null;this.galaxies=[];this.byId=new Map();}
  }
  class VirgoClusterLayer{
    constructor(viewer){this.viewer=viewer;this.clusterPoint=null;this.majorPoints=null;this.catalogPoints=null;this.labels=null;this.cluster=null;this.galaxies=[];this.mode="exhibition";this.lod="far";this.selectedId=null;this.cameraRemover=null;this.catalogVisible=true;this.labelsVisible=true;}
    load(bundle,mode="exhibition"){
      this.unload();this.mode=mode;this.cluster=bundle.cluster;this.galaxies=bundle.galaxies;this.clusterPoint=this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.majorPoints=this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.catalogPoints=this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.labels=this.viewer.scene.primitives.add(new Cesium.LabelCollection());
      const clusterPosition=scene(this.cluster,mode);this.clusterPoint.add({position:clusterPosition,pixelSize:18,color:Cesium.Color.fromCssColorString(COLORS.cluster),outlineColor:Cesium.Color.BLACK,outlineWidth:3,id:{phase4Object:this.cluster}});
      for(const record of this.galaxies){const position=scene(record,mode),major=isMajor(record),color=record.membershipCode==="M"?COLORS.member:COLORS.possible;this.catalogPoints.add({position,pixelSize:major?7:3,color:Cesium.Color.fromCssColorString(color).withAlpha(record.membershipCode==="M"?.9:.62),outlineColor:Cesium.Color.BLACK,outlineWidth:major?2:0,id:{phase4Object:record}});if(major){this.majorPoints.add({position,pixelSize:11,color:Cesium.Color.fromCssColorString(COLORS.major),outlineColor:Cesium.Color.BLACK,outlineWidth:2,id:{phase4Object:record}});this.labels.add({position,text:record.aliases.find(alias=>MAJOR.has(alias))||record.canonicalName,font:"13px system-ui",fillColor:Cesium.Color.fromCssColorString(COLORS.major),outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(10,-9)});}}
      this.cameraRemover=this.viewer.camera.changed.addEventListener(()=>this.updateLod());this.updateLod(true);return this.debug();
    }
    updateLod(force=false){if(!this.clusterPoint)return this.lod;const center=scene(this.cluster,this.mode),distance=Cesium.Cartesian3.distance(this.viewer.camera.positionWC,center),unit=Coordinates.sceneRadiusMpc(5,this.mode,"virgo"),next=distance>unit*2.2?"far":distance>unit*.55?"mid":"near";if(!force&&next===this.lod)return this.lod;this.setLod(next);return next;}
    setLod(value){this.lod=["far","mid","near"].includes(value)?value:"far";this.clusterPoint.show=this.catalogVisible;this.majorPoints.show=this.catalogVisible;this.catalogPoints.show=this.catalogVisible;this.labels.show=this.labelsVisible&&this.lod!=="far";this.applySelection();this.viewer.scene.requestRender();return this.lod;}
    select(record){this.selectedId=record?.id||null;this.applySelection();this.viewer.scene.requestRender();return record;}
    applySelection(){for(const collection of [this.clusterPoint,this.majorPoints,this.catalogPoints]){for(let i=0;i<(collection?.length||0);i++){const point=collection.get(i),record=point.id?.phase4Object,selected=record?.id===this.selectedId;if(selected){point.show=true;point.pixelSize=record.objectType==="Galaxy Cluster"?20:13;point.color=Cesium.Color.fromCssColorString(COLORS.selected);point.outlineWidth=3;}else if(collection===this.clusterPoint){point.pixelSize=18;point.color=Cesium.Color.fromCssColorString(COLORS.cluster);point.show=this.catalogVisible&&this.lod==="far";}else if(collection===this.majorPoints){point.pixelSize=11;point.color=Cesium.Color.fromCssColorString(COLORS.major);point.show=this.catalogVisible&&this.lod==="mid";}else{point.pixelSize=isMajor(record)?7:3;point.color=Cesium.Color.fromCssColorString(record.membershipCode==="M"?COLORS.member:COLORS.possible).withAlpha(record.membershipCode==="M"?.9:.62);point.show=this.catalogVisible&&this.lod==="near";}}}}
    setLabels(value){this.labelsVisible=Boolean(value);if(this.labels)this.labels.show=this.labelsVisible&&this.lod!=="far";this.viewer.scene.requestRender();}
    setCatalog(value){this.catalogVisible=Boolean(value);this.setLod(this.lod);}
    unload(){this.cameraRemover?.();this.cameraRemover=null;for(const key of ["clusterPoint","majorPoints","catalogPoints","labels"]){if(this[key]){this.viewer.scene.primitives.remove(this[key]);this[key]=null;}}this.cluster=null;this.galaxies=[];this.selectedId=null;this.lod="far";}
    dispose(){this.unload();this.viewer=null;}
    debug(){return {clusterPoints:this.clusterPoint?.length||0,majorPoints:this.majorPoints?.length||0,catalogPoints:this.catalogPoints?.length||0,labels:this.labels?.length||0,lod:this.lod,selectedId:this.selectedId,cameraListenerActive:Boolean(this.cameraRemover),catalogVisible:this.catalogVisible};}
  }
  global.PCSVirgoCluster=Object.freeze({BASE,MAJOR,COLORS,isMajor,scene,VirgoCatalog,VirgoClusterLayer});
})(window);
