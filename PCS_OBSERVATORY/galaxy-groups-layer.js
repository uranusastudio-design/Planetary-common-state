(function exposeGalaxyGroups(global){
  "use strict";
  const Coordinates=global.PCSPhase4Coordinates;
  if(!Coordinates)return;
  const BASE="./assets/deep-space/phase-4a/";
  const COLORS=Object.freeze({group:"#f3c879",galaxy:"#9bc7ff",selected:"#ffffff"});
  const scene=(xyz,mode)=>new Cesium.Cartesian3(...Coordinates.scenePosition(xyz,mode,"nearby-groups"));
  const isRenderable=record=>Array.isArray(record?.supergalacticCartesianMpc)&&record.supergalacticCartesianMpc.every(Number.isFinite);
  class GalaxyGroupsCatalog{
    constructor(base=BASE){this.base=base;this.abort=null;this.bundle=null;this.groups=[];this.galaxies=[];this.byId=new Map();}
    async load(){this.unload();this.abort=new AbortController();const response=await fetch(this.base+"nearby-galaxy-groups.json",{signal:this.abort.signal,cache:"force-cache"});if(!response.ok)throw new Error(`Phase 4A catalog missing (${response.status})`);const bundle=await response.json();if(bundle.groupCount!==77||bundle.galaxyCount!==456||bundle.renderableGalaxyCount!==228)throw new Error("Phase 4A catalog count mismatch");this.bundle=bundle;this.groups=bundle.groups;this.galaxies=bundle.galaxies;this.byId=new Map([...this.groups,...this.galaxies].map(record=>[record.id,record]));return bundle;}
    groupFor(record){return record?.objectType==="Galaxy Group"?record:this.byId.get(record?.parentStructure)||null;}
    members(groupOrId){const id=typeof groupOrId==="string"?groupOrId:groupOrId?.id;return this.galaxies.filter(record=>record.parentStructure===id);}
    search(term){const needle=String(term||"").trim().toLowerCase();if(!needle)return null;const records=[...this.groups,...this.galaxies],exact=record=>[record.canonicalName,...record.aliases,...record.catalogIds].some(value=>String(value).toLowerCase()===needle);return records.find(exact)||records.find(record=>[record.canonicalName,...record.aliases,...record.catalogIds].some(value=>String(value).toLowerCase().includes(needle)))||null;}
    get(id){return this.byId.get(id)||null;}
    unload(){this.abort?.abort();this.abort=null;this.bundle=null;this.groups=[];this.galaxies=[];this.byId=new Map();}
  }
  class GalaxyGroupsLayer{
    constructor(viewer){this.viewer=viewer;this.groupPoints=null;this.memberPoints=null;this.labels=null;this.groups=[];this.visibleMembers=[];this.mode="exhibition";this.visible=false;this.selectedGroupId=null;}
    load(groups,mode="exhibition"){this.unload();this.mode=mode;this.groups=groups.filter(isRenderable);this.groupPoints=this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.memberPoints=this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.labels=this.viewer.scene.primitives.add(new Cesium.LabelCollection());const labelGroups=this.groups.slice().sort((a,b)=>b.memberCount-a.memberCount).slice(0,18);const labelIds=new Set(labelGroups.map(record=>record.id));for(const record of this.groups){const position=scene(record.supergalacticCartesianMpc,mode),major=record.memberCount>=10;this.groupPoints.add({position,pixelSize:major?10:7,color:Cesium.Color.fromCssColorString(COLORS.group).withAlpha(.95),outlineColor:Cesium.Color.BLACK,outlineWidth:2,id:{phase4Object:record}});if(labelIds.has(record.id))this.labels.add({position,text:record.aliases[0]||record.canonicalName,font:"12px system-ui",fillColor:Cesium.Color.fromCssColorString(COLORS.group),outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(9,-8)});}this.visible=true;this.viewer.scene.requestRender();return this.debug();}
    showMembers(group,members,selectedId=null){
      if(!this.memberPoints)return 0;
      this.memberPoints.removeAll();this.visibleMembers=members.filter(isRenderable);this.selectedGroupId=group?.id||null;
      for(let index=0;index<(this.groupPoints?.length||0);index++){
        const point=this.groupPoints.get(index),record=point.id?.phase4Object,selected=selectedId===this.selectedGroupId&&record?.id===this.selectedGroupId;
        point.pixelSize=selected?14:record?.memberCount>=10?10:7;point.color=Cesium.Color.fromCssColorString(selected?COLORS.selected:COLORS.group).withAlpha(.95);point.outlineWidth=selected?3:2;
      }
      for(const record of this.visibleMembers){const selected=record.id===selectedId;this.memberPoints.add({position:scene(record.supergalacticCartesianMpc,this.mode),pixelSize:selected?12:6,color:Cesium.Color.fromCssColorString(selected?COLORS.selected:COLORS.galaxy),outlineColor:Cesium.Color.BLACK,outlineWidth:selected?3:1,id:{phase4Object:record}});}
      this.viewer.scene.requestRender();return this.visibleMembers.length;
    }
    setLabels(value){if(this.labels)this.labels.show=Boolean(value);this.viewer.scene.requestRender();}
    setCatalog(value){for(const item of [this.groupPoints,this.memberPoints])if(item)item.show=Boolean(value);this.viewer.scene.requestRender();}
    show(){for(const item of [this.groupPoints,this.memberPoints,this.labels])if(item)item.show=true;this.visible=true;this.viewer.scene.requestRender();}
    hide(){for(const item of [this.groupPoints,this.memberPoints,this.labels])if(item)item.show=false;this.visible=false;this.viewer.scene.requestRender();}
    unload(){for(const key of ["groupPoints","memberPoints","labels"]){if(this[key]){this.viewer.scene.primitives.remove(this[key]);this[key]=null;}}this.groups=[];this.visibleMembers=[];this.selectedGroupId=null;this.visible=false;}
    dispose(){this.unload();this.viewer=null;}
    debug(){return {groups:this.groups.length,groupPoints:this.groupPoints?.length||0,memberPoints:this.memberPoints?.length||0,labels:this.labels?.length||0,selectedGroupId:this.selectedGroupId,mode:this.mode,visible:this.visible};}
  }
  global.PCSGalaxyGroups=Object.freeze({BASE,COLORS,isRenderable,scene,GalaxyGroupsCatalog,GalaxyGroupsLayer});
})(window);
