(function exposeCometCatalog(global){
  "use strict";
  const dataset=global.PCSSolarSystemCometDataset,meteorShowers=global.PCSSolarSystemMeteorShowerDataset,SmallBodies=global.PCSSmallBodies;
  if(!dataset||!meteorShowers||!SmallBodies)return;
  class CometLayer{
    constructor(viewer,positionMapper){this.viewer=viewer;this.positionMapper=positionMapper;this.collection=viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());this.records=[];this.points=[];this.epoch=new Date();}
    load(records,epoch){this.collection.removeAll();this.records=[...records];this.epoch=new Date(epoch);this.points=this.records.map(record=>{const state=SmallBodies.stateAt(record,this.epoch),position=state?this.positionMapper(state):null;if(!position)return null;return this.collection.add({position,pixelSize:5,color:Cesium.Color.fromCssColorString("#8ce8dc").withAlpha(.9),id:{smallBody:record,smallBodyLayer:"priority-comet-catalog"}});}).filter(Boolean);this.viewer.scene.requestRender();return this.debug();}
    updateEpoch(epoch){this.epoch=new Date(epoch);for(let i=0;i<this.points.length;i+=1){const state=SmallBodies.stateAt(this.records[i],this.epoch);this.points[i].show=Boolean(state);if(state)this.points[i].position=this.positionMapper(state);}this.viewer.scene.requestRender();}
    unload(){this.records=[];this.points=[];this.collection.removeAll();}
    dispose(){if(this.collection){this.viewer.scene.primitives.remove(this.collection);this.collection=null;}this.records=[];this.points=[];}
    debug(){return Object.freeze({datasetId:dataset.datasetId,catalogRecords:this.records.length,pointCount:this.points.length,visibleCount:this.points.filter(point=>point.show!==false).length,epochSupported:SmallBodies.isEpochSupported(this.epoch),deployedEpochRange:SmallBodies.deployedEpochRange,deterministic:true,selection:dataset.selection,positionMode:dataset.positionMode});}
  }
  global.PCSCometCatalog=Object.freeze({dataset,meteorShowers,CometLayer});
})(window);
