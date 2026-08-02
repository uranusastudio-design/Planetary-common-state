(function exposeMilkyWayLayer(global) {
  "use strict";
  const Coordinates = global.PCSPhase3Coordinates;
  if (!Coordinates) return;
  const BASE = "./assets/deep-space/phase-3/";
  const ARM_COLORS = Object.freeze({Per:"#77bce8",Sgr:"#e3bd77",ScN:"#b58be2",CtN:"#72c7ad",Loc:"#d6d6d6",Out:"#7d91bd",GC:"#e49a8e",CrN:"#b7a46e"});

  function armGroups(records) {
    const groups = new Map();
    for (const record of records) {
      if (!record.spiralArmCode || !Array.isArray(record.galactocentricCartesianKpc)) continue;
      if (!groups.has(record.spiralArmCode)) groups.set(record.spiralArmCode, []);
      groups.get(record.spiralArmCode).push(record);
    }
    for (const recordsInArm of groups.values()) recordsInArm.sort((a,b) => Math.atan2(a.galactocentricCartesianKpc[1],a.galactocentricCartesianKpc[0])-Math.atan2(b.galactocentricCartesianKpc[1],b.galactocentricCartesianKpc[0]));
    return groups;
  }
  function splitArmSegments(records, maxGapRad = .62) {
    const segments = []; let segment = [];
    for (const record of records) {
      const angle = Math.atan2(record.galactocentricCartesianKpc[1],record.galactocentricCartesianKpc[0]);
      const previous = segment.at(-1);
      const previousAngle = previous ? Math.atan2(previous.galactocentricCartesianKpc[1],previous.galactocentricCartesianKpc[0]) : angle;
      if (segment.length && angle-previousAngle > maxGapRad) { if(segment.length>1)segments.push(segment); segment=[]; }
      segment.push(record);
    }
    if(segment.length>1)segments.push(segment);
    return segments;
  }
  function ring(radiusKpc, zKpc = 0, samples = 128) { return Array.from({length:samples+1},(_,index)=>{const a=index/samples*Math.PI*2;return [radiusKpc*Math.cos(a),radiusKpc*Math.sin(a),zKpc];}); }
  const scene = (xyz, mode) => new Cesium.Cartesian3(...Coordinates.scenePosition(xyz,mode,"milky-way"));

  class MilkyWayCatalog {
    constructor(base=BASE){this.base=base;this.abort=null;this.registry=null;this.metadata=null;}
    async load(){this.abort?.abort();this.abort=new AbortController();const options={signal:this.abort.signal,cache:"force-cache"};const [registryResponse,metadataResponse]=await Promise.all([fetch(this.base+"milky-way-hmsfr.json",options),fetch(this.base+"catalog-metadata.json",options)]);if(!registryResponse.ok||!metadataResponse.ok)throw new Error(`Milky Way catalog missing (${registryResponse.status}/${metadataResponse.status})`);this.registry=await registryResponse.json();this.metadata=await metadataResponse.json();if(this.registry.recordCount!==199||this.registry.records?.length!==199)throw new Error("Milky Way catalog count mismatch");return {registry:this.registry,metadata:this.metadata};}
    search(term){const needle=String(term||"").trim().toLowerCase();if(!needle)return null;if(["sun","sol"].includes(needle))return MilkyWayLayer.SUN;if(["sagittarius a*","sgr a*","galactic center","galactic centre"].includes(needle))return MilkyWayLayer.SGR_A;return this.registry?.records?.find(record=>record.canonicalName.toLowerCase()===needle||record.sourceId.toLowerCase()===needle||record.aliases.some(alias=>alias.toLowerCase().includes(needle)))||null;}
    unload(){this.abort?.abort();this.abort=null;this.registry=null;this.metadata=null;}
  }

  class MilkyWayLayer {
    static SUN=Object.freeze({id:"milky-way:sun",canonicalName:"Sun",objectType:"star",galactocentricCartesianKpc:[-8.15,0,.0208],dataStatus:"catalog-observation",visualizationStatus:"reference-marker",sourceCatalog:"PCS fixed frame / Reid et al. 2019 R0"});
    static SGR_A=Object.freeze({id:"milky-way:sgr-a-star",canonicalName:"Sagittarius A*",aliases:["Sgr A*","Galactic Center"],objectType:"radio source / Galactic-center marker",raDeg:266.416816625,decDeg:-29.0078249722,distanceKpc:8.15,galactocentricCartesianKpc:[0,0,0],dataStatus:"catalog-observation",visualizationStatus:"reference-marker",sourceCatalog:"SIMBAD; 2011AJ....142...35P"});
    constructor(viewer){this.viewer=viewer;this.points=null;this.lines=null;this.labels=null;this.records=[];this.mode="exhibition";this.reconstruction=true;this.visible=false;}
    load(records,mode="exhibition",options={}){this.unload();this.mode=mode;this.records=[MilkyWayLayer.SUN,MilkyWayLayer.SGR_A,...records];this.points=this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.lines=this.viewer.scene.primitives.add(new Cesium.PolylineCollection());this.labels=this.viewer.scene.primitives.add(new Cesium.LabelCollection());this.addStructure();const cap=options.maxObjects||records.length;for(const record of this.records.slice(0,cap+2)){const landmark=record.id.startsWith("milky-way:");const position=scene(record.galactocentricCartesianKpc,mode);this.points.add({position,pixelSize:landmark?9:3.2,color:Cesium.Color.fromCssColorString(landmark?"#fff4cf":ARM_COLORS[record.spiralArmCode]||"#8eb8cb").withAlpha(landmark?1:.82),outlineColor:Cesium.Color.BLACK,outlineWidth:landmark?2:0,id:{phase3Object:record}});if(landmark)this.labels.add({position,text:record.canonicalName,font:"13px system-ui",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(9,-9)});}
      this.addArmReconstruction(records);this.visible=true;this.viewer.scene.requestRender();return this.debug();}
    addStructure(){for(const radius of [4,8.15,15])this.lines.add({positions:ring(radius).map(x=>scene(x,this.mode)),width:radius===15?1.5:1,material:Cesium.Material.fromType("Color",{color:Cesium.Color.fromCssColorString("#52758a").withAlpha(radius===15?.28:.13)})});const barAngle=27*Math.PI/180,half=2.5;this.lines.add({positions:[[-half*Math.cos(barAngle),-half*Math.sin(barAngle),0],[half*Math.cos(barAngle),half*Math.sin(barAngle),0]].map(x=>scene(x,this.mode)),width:5,material:Cesium.Material.fromType("Color",{color:Cesium.Color.fromCssColorString("#c99b77").withAlpha(.42)})});}
    addArmReconstruction(records){for(const [code,group] of armGroups(records))for(const segment of splitArmSegments(group))this.lines.add({positions:segment.map(record=>scene(record.galactocentricCartesianKpc,this.mode)),width:2.2,material:Cesium.Material.fromType("Color",{color:Cesium.Color.fromCssColorString(ARM_COLORS[code]||"#7799aa").withAlpha(.62)}),id:{phase3Reconstruction:code}});}
    setLabels(value){if(this.labels)this.labels.show=value;this.viewer.scene.requestRender();}
    setReconstruction(value){this.reconstruction=value;if(this.lines)this.lines.show=value;this.viewer.scene.requestRender();}
    show(){for(const collection of [this.points,this.lines,this.labels])if(collection)collection.show=true;this.visible=true;}
    hide(){for(const collection of [this.points,this.lines,this.labels])if(collection)collection.show=false;this.visible=false;}
    unload(){for(const key of ["points","lines","labels"]){if(this[key]){this.viewer.scene.primitives.remove(this[key]);this[key]=null;}}this.records=[];this.visible=false;}
    dispose(){this.unload();this.viewer=null;}
    debug(){return {records:this.records.length,points:this.points?.length||0,lines:this.lines?.length||0,labels:this.labels?.length||0,visible:this.visible,mode:this.mode,reconstruction:this.reconstruction};}
  }
  global.PCSMilkyWay=Object.freeze({ARM_COLORS,armGroups,splitArmSegments,ring,MilkyWayCatalog,MilkyWayLayer});
})(window);
