export const ADAPTERS=Object.freeze({
  simbad:{adapterId:"simbad-tap-v1",sourceId:"cds-simbad-tap",protocol:"tap",endpoint:"https://simbad.cds.unistra.fr/simbad/sim-tap"},
  vizier:{adapterId:"vizier-tap-v1",sourceId:"cds-vizier-tap",protocol:"tap",endpoint:"https://tapvizier.cds.unistra.fr/TAPVizieR/tap"},
  ned:{adapterId:"ned-tap-v1",sourceId:"nasa-ipac-ned-tap",protocol:"tap",endpoint:"https://ned.ipac.caltech.edu/tap"},
  heasarc:{adapterId:"heasarc-tap-v1",sourceId:"nasa-heasarc-tap",protocol:"tap",endpoint:"https://heasarc.gsfc.nasa.gov/xamin/vo/tap"},
  exoplanetArchive:{adapterId:"nasa-exoplanet-archive-tap-v1",sourceId:"nasa-exoplanet-archive-tap",protocol:"tap",endpoint:"https://exoplanetarchive.ipac.caltech.edu/TAP"},
  mast:{adapterId:"mast-rest-v1",sourceId:"stsci-mast-api",protocol:"mast-rest",endpoint:"https://mast.stsci.edu/api/v0"}
});

export function tapSyncRequest(adapter,adql,{format="json",maxrec=10000}={}){
  if(adapter.protocol!=="tap")throw new Error(`${adapter.adapterId} is not a TAP adapter`);
  if(!String(adql||"").trim().toUpperCase().startsWith("SELECT"))throw new Error("TAP queries must be explicit SELECT statements");
  const params=new URLSearchParams({REQUEST:"doQuery",LANG:"ADQL",FORMAT:format,MAXREC:String(maxrec),QUERY:adql});
  return {url:`${adapter.endpoint}/sync`,method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:params.toString()};
}

export async function fetchTapJson(adapter,adql,options={}){
  const request=tapSyncRequest(adapter,adql,options),response=await fetch(request.url,request);
  if(!response.ok)throw new Error(`${adapter.adapterId} TAP request failed: ${response.status}`);
  const payload=await response.json();
  if(Array.isArray(payload))return payload;
  if(Array.isArray(payload.data)&&Array.isArray(payload.metadata))return payload.data.map(row=>Object.fromEntries(payload.metadata.map((field,index)=>[field.name,row[index]])));
  throw new Error(`${adapter.adapterId} returned an unsupported JSON result shape`);
}

export function mastRequest(service,params={}){
  if(!String(service||"").trim())throw new Error("MAST service is required");
  return {url:`${ADAPTERS.mast.endpoint}/invoke`,method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({request:JSON.stringify({service,params,format:"json"})}).toString()};
}
