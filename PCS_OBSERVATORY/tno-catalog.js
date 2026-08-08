(function exposeTnoCatalog(global){
  "use strict";
  const dataset=global.PCSSolarSystemTnoDataset,SmallBodies=global.PCSSmallBodies;
  if(!dataset||!SmallBodies)return;
  class TnoLayer{
    constructor(viewer,positionMapper){this.viewer=viewer;this.positionMapper=positionMapper;this.collection=viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.records=[];this.points=[];this.mode="exhibition";this.epoch=new Date();this.lod="far";this.moveRemover=viewer.camera.moveEnd.addEventListener(()=>this.updateLod());}
    limit(){return dataset.lod[this.lod]||dataset.lod.far;}
    determineLod(){const distance=Cesium.Cartesian3.magnitude(this.viewer.camera.positionWC),thresholds=this.mode==="scientific"?[1.5e10,7e9]:[6e6,3.5e6];return distance>thresholds[0]?"far":distance>thresholds[1]?"medium":"near";}
    updateLod(force){const next=this.determineLod();if(!force&&next===this.lod)return;this.lod=next;const limit=this.limit();this.points.forEach((point,index)=>{point.show=index<limit;});this.viewer.scene.requestRender();}
    load(records,epoch,mode="exhibition"){this.collection.removeAll();this.records=[...records];this.epoch=new Date(epoch);this.mode=mode;this.points=this.records.map((record,index)=>{const state=SmallBodies.stateAt(record,this.epoch),position=state?this.positionMapper(state):null;if(!position)return null;const diameter=record.diameterKm,pixelSize=Number.isFinite(diameter)?Math.max(2,Math.min(7,2+Math.log10(diameter+1))):index<64?3:2;return this.collection.add({position,pixelSize,color:Cesium.Color.fromCssColorString(index<64?"#a9d7ee":"#6f9ebd").withAlpha(.8),show:false,id:{smallBody:record,smallBodyLayer:"tno-known-catalog"}});}).filter(Boolean);this.updateLod(true);return this.debug();}
    updateEpoch(epoch){this.epoch=new Date(epoch);for(let i=0;i<this.points.length;i+=1){const state=SmallBodies.stateAt(this.records[i],this.epoch);if(state)this.points[i].position=this.positionMapper(state);}this.viewer.scene.requestRender();}
    setMode(mode){this.mode=mode;this.load(this.records,this.epoch,mode);}
    unload(){this.records=[];this.points=[];this.collection.removeAll();}
    dispose(){this.moveRemover?.();this.moveRemover=null;if(this.collection){this.viewer.scene.primitives.remove(this.collection);this.collection=null;}this.records=[];this.points=[];}
    debug(){return Object.freeze({datasetId:dataset.datasetId,knownCatalogRecords:this.records.length,pointCount:this.points.length,visibleCount:this.points.filter(point=>point.show).length,lod:this.lod,deterministic:true,selection:dataset.selection,representativePopulation:dataset.representativePopulation});}
  }
  global.PCSTnoCatalog=Object.freeze({dataset,TnoLayer});
})(window);
