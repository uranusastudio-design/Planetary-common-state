(function exposeMilkyWayKepler(global){
  "use strict";
  const Coordinates=global.PCSPhase3Coordinates;
  if(!Coordinates)return;
  const finite=value=>value!==null&&value!==""&&value!==undefined&&Number.isFinite(Number(value));
  const normalize=value=>String(value||"").trim().toLowerCase().replaceAll("–","-");
  function transformRecord(record,frame){
    const distancePc=Number(record.distancePc),ra=Number(record.raDeg),dec=Number(record.decDeg),heliocentric=Coordinates.icrsToHeliocentricGalactic(ra,dec,distancePc/1000),galactocentric=Coordinates.heliocentricGalacticToGalactocentric(heliocentric,{galcenDistanceKpc:frame.galactocentricDistanceKpc,zSunKpc:frame.sunHeightKpc});
    return Object.freeze({...record,ra,dec,distancePc,heliocentricGalacticCartesianKpc:Object.freeze(heliocentric),galactocentricCartesianKpc:Object.freeze(galactocentric),coordinateFrame:`${record.coordinateFrame}; rendered in ${frame.id}`,sourceId:`KIC ${record.kepid}`,radialVelocityAvailable:finite(record.radial_velocity),velocity3dComplete:[record.pmra,record.pmdec,record.radial_velocity].every(finite),dataStatus:record.dataStatus||"Kepler catalog observation"});
  }
  function transformBundle(bundle,frame){const records=bundle.records.map(record=>transformRecord(record,frame));return Object.freeze({...bundle,records:Object.freeze(records)});}
  function footprintPositions(bundle,frame,distancePc=1200){return Object.freeze(bundle.footprint.perimeter.map(vertex=>Object.freeze(Coordinates.icrsToGalactocentric(vertex.raDeg,vertex.decDeg,distancePc/1000,{galcenDistanceKpc:frame.galactocentricDistanceKpc,zSunKpc:frame.sunHeightKpc}))));}
  function search(records,term){const needle=normalize(term);if(!needle)return null;return records.find(record=>[record.canonicalName,record.kepid,record.gaiaSourceId,...(record.aliases||[])].some(value=>{const candidate=normalize(value);return candidate===needle||candidate.includes(needle);}))||null;}
  function renderPartition(records,{mobile=false,reduced=false}={}){const ordinary=records.filter(record=>!record.confirmedPlanets?.length&&!record.candidatePlanets?.length),confirmed=records.filter(record=>record.confirmedPlanets?.length),candidates=records.filter(record=>!record.confirmedPlanets?.length&&record.candidatePlanets?.length),limit=(values,maximum)=>values.length<=maximum?values:values.filter((_,index)=>index%Math.ceil(values.length/maximum)===0).slice(0,maximum);return Object.freeze({ordinary:Object.freeze(limit(ordinary,mobile?700:reduced?2200:4600)),confirmed:Object.freeze(limit(confirmed,mobile?420:reduced?1000:confirmed.length)),candidates:Object.freeze(limit(candidates,mobile?360:reduced?900:candidates.length))});}
  global.PCSMilkyWayKepler=Object.freeze({transformRecord,transformBundle,footprintPositions,search,renderPartition});
})(typeof window==="undefined"?globalThis:window);
