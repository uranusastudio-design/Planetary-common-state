import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";

const root=path.resolve(import.meta.dirname,"..");
const output=path.join(root,"assets","deep-space","milky-way-kepler","kepler-observed-stars.json");
const exoplanetTap="https://exoplanetarchive.ipac.caltech.edu/TAP/sync";
const gaiaTap="https://gea.esac.esa.int/tap-server/tap/sync";
const retrievedAt=new Date().toISOString();
const sha256=value=>createHash("sha256").update(value).digest("hex");

async function fetchText(url,options={},attempts=4){
  let lastError;
  for(let attempt=1;attempt<=attempts;attempt+=1){
    try{
      const response=await fetch(url,options);
      if(!response.ok)throw new Error(`${response.status} ${response.statusText}: ${(await response.text()).slice(0,500)}`);
      return await response.text();
    }catch(error){
      lastError=error;
      if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,attempt*1200));
    }
  }
  throw lastError;
}
async function exoplanetQuery(query){
  const url=new URL(exoplanetTap);url.searchParams.set("query",query);url.searchParams.set("format","json");
  const text=await fetchText(url);
  return {records:JSON.parse(text),sha256:sha256(text),query};
}
function parseCsv(text){
  const rows=[];let row=[],field="",quoted=false;
  for(let index=0;index<text.length;index+=1){const character=text[index];if(quoted){if(character==='"'&&text[index+1]==='"'){field+='"';index+=1;}else if(character==='"')quoted=false;else field+=character;}else if(character==='"')quoted=true;else if(character===","){row.push(field);field="";}else if(character==="\n"){row.push(field.replace(/\r$/,"") );rows.push(row);row=[];field="";}else field+=character;}
  if(field||row.length){row.push(field.replace(/\r$/,""));rows.push(row);}
  const header=rows.shift()||[];return rows.filter(values=>values.some(Boolean)).map(values=>Object.fromEntries(header.map((key,index)=>[key,values[index]===""?null:values[index]])));
}
async function gaiaQuery(sourceIds){
  if(!sourceIds.length)return {records:[],sha256:sha256(""),queries:[]};
  const records=[],digests=[],queries=[];
  for(let offset=0;offset<sourceIds.length;offset+=180){
    const batch=sourceIds.slice(offset,offset+180),query=`select source_id,ra,dec,parallax,parallax_error,pmra,pmra_error,pmdec,pmdec_error,radial_velocity,radial_velocity_error,phot_g_mean_mag,ref_epoch from gaiadr3.gaia_source where source_id in (${batch.join(",")})`,url=new URL(gaiaTap);
    url.searchParams.set("REQUEST","doQuery");url.searchParams.set("LANG","ADQL");url.searchParams.set("FORMAT","csv");url.searchParams.set("QUERY",query);
    const text=await fetchText(url);records.push(...parseCsv(text));digests.push(sha256(text));queries.push(query);
  }
  return {records,sha256:sha256(digests.join("\n")),queries};
}
const number=value=>value==null||value===""||!Number.isFinite(Number(value))?null:Number(value);
const compact=object=>Object.fromEntries(Object.entries(object).filter(([,value])=>value!==null&&value!==undefined&&value!==""&&(!Array.isArray(value)||value.length)));
const normalizeName=value=>String(value||"").trim().toLowerCase().replaceAll("−","-").replace(/\s+/g," ");
const hostFromPlanet=value=>String(value||"").replace(/\s+[a-z]$/i,"").trim();
const gaiaId=value=>String(value||"").match(/(\d{16,20})/)?.[1]||null;
const angularDistanceArcsec=(a,b)=>{const degrees=Math.PI/180,dec1=a.dec*degrees,dec2=b.dec*degrees,deltaRa=(a.ra-b.ra)*degrees,cosine=Math.sin(dec1)*Math.sin(dec2)+Math.cos(dec1)*Math.cos(dec2)*Math.cos(deltaRa);return Math.acos(Math.max(-1,Math.min(1,cosine)))/degrees*3600;};

function convexHull(records){
  const valid=records.filter(record=>number(record.ra)!=null&&number(record.dec)!=null),centerDec=valid.reduce((sum,record)=>sum+Number(record.dec),0)/valid.length,scale=Math.cos(centerDec*Math.PI/180),points=valid.map(record=>({kepid:String(record.kepid),ra:Number(record.ra),dec:Number(record.dec),x:Number(record.ra)*scale,y:Number(record.dec)})).sort((a,b)=>a.x-b.x||a.y-b.y);
  const cross=(origin,a,b)=>(a.x-origin.x)*(b.y-origin.y)-(a.y-origin.y)*(b.x-origin.x),lower=[],upper=[];
  for(const point of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),point)<=0)lower.pop();lower.push(point);}
  for(const point of [...points].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),point)<=0)upper.pop();upper.push(point);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)].map(({kepid,ra,dec})=>({kepid,raDeg:ra,decDeg:dec}));
}

const stellarQuery="select kepid,ra,dec,dist,dist_err1,dist_err2,kepmag,teff,teff_err1,teff_err2,logg,logg_err1,logg_err2,radius,radius_err1,radius_err2,mass,mass_err1,mass_err2,nconfp,nkoi,ntce,st_delivname,st_quarters from q1_q17_dr25_ks where MOD(kepid,40)=0 or nkoi>0 or nconfp>0";
const footprintQuery="select kepid,ra,dec from q1_q17_dr25_ks where ra is not null and dec is not null";
const koiQuery="select kepid,kepoi_name,kepler_name,koi_disposition,koi_pdisposition,koi_score,koi_period,koi_period_err1,koi_period_err2,koi_prad,koi_prad_err1,koi_prad_err2,ra,dec,koi_kepmag,koi_delivname,koi_disp_prov from cumulative";
const planetQuery="select hostname,pl_name,ra,dec,sy_dist,sy_disterr1,sy_disterr2,sy_plx,sy_plxerr1,sy_plxerr2,sy_pmra,sy_pmraerr1,sy_pmraerr2,sy_pmdec,sy_pmdecerr1,sy_pmdecerr2,sy_kepmag,gaia_dr3_id,disc_year,disc_refname,pl_orbper,pl_rade,pl_masse from ps where default_flag=1 and disc_facility='Kepler'";
const [stellarResult,footprintResult,koiResult,planetResult]=await Promise.all([exoplanetQuery(stellarQuery),exoplanetQuery(footprintQuery),exoplanetQuery(koiQuery),exoplanetQuery(planetQuery)]);
const sourceIds=[...new Set(planetResult.records.map(record=>gaiaId(record.gaia_dr3_id)).filter(Boolean))].sort();
const gaiaResult=await gaiaQuery(sourceIds),gaiaById=new Map(gaiaResult.records.map(record=>[String(record.source_id),record]));

const koiByKic=new Map(),kicByHost=new Map();
for(const row of koiResult.records){const kepid=String(row.kepid);if(!koiByKic.has(kepid))koiByKic.set(kepid,[]);koiByKic.get(kepid).push(row);if(row.kepler_name)kicByHost.set(normalizeName(hostFromPlanet(row.kepler_name)),kepid);}
const hosts=new Map();
for(const row of planetResult.records){const key=normalizeName(row.hostname);if(!hosts.has(key))hosts.set(key,{hostname:row.hostname,rows:[]});hosts.get(key).rows.push(row);}
for(const host of hosts.values()){
  const first=host.rows[0],parsedKic=String(host.hostname).match(/^KIC\s+(\d+)$/i)?.[1],namedKic=kicByHost.get(normalizeName(host.hostname));let nearest=null;
  if(!parsedKic&&!namedKic&&number(first.ra)!=null&&number(first.dec)!=null){for(const [kepid,rows] of koiByKic){const row=rows[0];if(number(row.ra)==null||number(row.dec)==null)continue;const separation=angularDistanceArcsec({ra:Number(first.ra),dec:Number(first.dec)},{ra:Number(row.ra),dec:Number(row.dec)});if(separation<=2&&(!nearest||separation<nearest.separation))nearest={kepid,separation};}}
  host.kepid=parsedKic||namedKic||nearest?.kepid||null;host.crossMatchSeparationArcsec=nearest?.separation??null;
}
const hostByKic=new Map([...hosts.values()].filter(host=>host.kepid).map(host=>[host.kepid,host]));
const stellarByKic=new Map(stellarResult.records.map(record=>[String(record.kepid),record]));
for(const host of hosts.values())if(host.kepid&&!stellarByKic.has(host.kepid))stellarByKic.set(host.kepid,{kepid:Number(host.kepid),ra:host.rows[0].ra,dec:host.rows[0].dec,dist:host.rows[0].sy_dist,st_delivname:"host-added-from-ps"});

const records=[];
for(const [kepid,stellar] of stellarByKic){
  const koiRows=koiByKic.get(kepid)||[],host=hostByKic.get(kepid),hostRow=host?.rows[0],gaiaSourceId=gaiaId(hostRow?.gaia_dr3_id),gaia=gaiaById.get(gaiaSourceId),confirmedPlanets=(host?.rows||[]).map(row=>compact({name:row.pl_name,periodDays:number(row.pl_orbper),radiusEarth:number(row.pl_rade),massEarth:number(row.pl_masse),discoveryYear:number(row.disc_year),reference:row.disc_refname})),candidatePlanets=koiRows.filter(row=>row.koi_disposition==="CANDIDATE").map(row=>compact({name:row.kepoi_name,status:"PLANET CANDIDATE",score:number(row.koi_score),periodDays:number(row.koi_period),periodErrorPlusDays:number(row.koi_period_err1),periodErrorMinusDays:number(row.koi_period_err2),radiusEarth:number(row.koi_prad),radiusErrorPlusEarth:number(row.koi_prad_err1),radiusErrorMinusEarth:number(row.koi_prad_err2),delivery:row.koi_delivname,dispositionProvenance:row.koi_disp_prov})),falsePositives=koiRows.filter(row=>row.koi_disposition==="FALSE POSITIVE").map(row=>row.kepoi_name),confirmedKois=koiRows.filter(row=>row.koi_disposition==="CONFIRMED").map(row=>row.kepoi_name),distancePc=number(hostRow?.sy_dist)??number(stellar.dist),raDeg=number(gaia?.ra)??number(hostRow?.ra)??number(stellar.ra),decDeg=number(gaia?.dec)??number(hostRow?.dec)??number(stellar.dec),fullVelocity=number(gaia?.pmra)!=null&&number(gaia?.pmdec)!=null&&number(gaia?.radial_velocity)!=null&&distancePc!=null;
  if(raDeg==null||decDeg==null||distancePc==null)continue;
  const confirmedHostNames=(host?.rows||[]).map(row=>hostFromPlanet(row.pl_name)).filter(Boolean),preferredKeplerHost=confirmedHostNames.find(name=>/^Kepler-/i.test(name)),aliases=[`KIC ${kepid}`,...koiRows.map(row=>row.kepoi_name),...koiRows.map(row=>row.kepler_name),host?.hostname,...confirmedHostNames].filter(Boolean),canonicalName=preferredKeplerHost||host?.hostname||koiRows.find(row=>row.kepler_name)?.kepler_name?.replace(/\s+[a-z]$/i,"")||`KIC ${kepid}`;
  records.push(compact({id:`kepler-target:${kepid}`,canonicalName,aliases:[...new Set(aliases)],objectType:confirmedPlanets.length?"Confirmed Exoplanet Host":candidatePlanets.length?"Kepler Planet Candidate Host":"Kepler Observed Target",scientificFidelityLevel:"B",scientificDataCategory:gaiaSourceId?"multi-catalog observation-derived":"observation-derived",kepid,gaiaSourceId,raDeg,decDeg,distancePc,distanceMethod:hostRow?.sy_dist!=null?"NASA Exoplanet Archive composite host distance":"Kepler Q1-Q17 DR25 stellar distance",distanceErrorPlusPc:number(hostRow?.sy_disterr1)??number(stellar.dist_err1),distanceErrorMinusPc:number(hostRow?.sy_disterr2)??number(stellar.dist_err2),parallaxMas:number(gaia?.parallax)??number(hostRow?.sy_plx),parallaxErrorMas:number(gaia?.parallax_error)??number(hostRow?.sy_plxerr1),pmra:number(gaia?.pmra)??number(hostRow?.sy_pmra),pmraError:number(gaia?.pmra_error)??number(hostRow?.sy_pmraerr1),pmdec:number(gaia?.pmdec)??number(hostRow?.sy_pmdec),pmdecError:number(gaia?.pmdec_error)??number(hostRow?.sy_pmdecerr1),radial_velocity:number(gaia?.radial_velocity),radialVelocityError:number(gaia?.radial_velocity_error),referenceEpoch:number(gaia?.ref_epoch)??2000,coordinateFrame:gaiaSourceId?"Gaia-CRF3 / ICRS at J2016.0; original KIC ICRS/J2000 retained":"KIC ICRS/J2000",observationEpoch:"Kepler Q1-Q17 observations, 2009–2013",motionClass:fullVelocity?"catalog-propagatable":"insufficient-6D",velocitySource:fullVelocity?"Gaia DR3 6D astrometry":"Gaia/KIC astrometry; radial velocity unavailable",visualizationStatus:"catalog position marker; size visibility-enhanced",dataStatus:gaiaSourceId?"Kepler + Gaia cross-matched":"Kepler catalog observation",sourceCatalog:gaiaSourceId?"NASA Exoplanet Archive Kepler DR25 + Planetary Systems; ESA Gaia DR3":"NASA Exoplanet Archive Kepler Q1-Q17 DR25 Stellar",kepmag:number(stellar.kepmag)??number(hostRow?.sy_kepmag),gaiaGmag:number(gaia?.phot_g_mean_mag),stellarParameters:compact({teffK:number(stellar.teff),teffErrorPlusK:number(stellar.teff_err1),teffErrorMinusK:number(stellar.teff_err2),logg:number(stellar.logg),loggErrorPlus:number(stellar.logg_err1),loggErrorMinus:number(stellar.logg_err2),radiusSolar:number(stellar.radius),radiusErrorPlusSolar:number(stellar.radius_err1),radiusErrorMinusSolar:number(stellar.radius_err2),massSolar:number(stellar.mass),massErrorPlusSolar:number(stellar.mass_err1),massErrorMinusSolar:number(stellar.mass_err2)}),confirmedPlanets,candidatePlanets,confirmedKois,falsePositives,keplerQuarters:stellar.st_quarters,originalKicCoordinates:compact({raDeg:number(stellar.ra),decDeg:number(stellar.dec),epoch:"J2000"}),crossMatch:gaiaSourceId?compact({method:"NASA Exoplanet Archive PS gaia_dr3_id host association; Gaia DR3 source lookup",gaiaSourceId,kicMethod:host?.crossMatchSeparationArcsec!=null?"2 arcsec positional association to KOI/KIC":"Kepler name or KIC identity",separationArcsec:host?.crossMatchSeparationArcsec}):null,knownLimitations:[fullVelocity?"Linear space motion is limited to ±1 Myr; no Galactic orbit integration is claimed.":"Radial velocity unavailable; 3D velocity is incomplete and PCS does not substitute zero.","Kepler target selection is magnitude-, mission-, and detector-footprint limited; it is not a volume-complete Milky Way sample."]}));
}
records.sort((a,b)=>Number(a.kepid)-Number(b.kepid));
const counts={upstreamKeplerStellar:200038,footprintCoordinateCount:footprintResult.records.length,deployedRecords:records.length,ordinaryTargets:records.filter(record=>!record.confirmedPlanets?.length&&!record.candidatePlanets?.length).length,confirmedHosts:records.filter(record=>record.confirmedPlanets?.length).length,candidateHosts:records.filter(record=>record.candidatePlanets?.length&&!record.confirmedPlanets?.length).length,recordsWithGaiaDr3:records.filter(record=>record.gaiaSourceId).length,full6d:records.filter(record=>record.motionClass==="catalog-propagatable").length,incomplete6d:records.filter(record=>record.motionClass!=="catalog-propagatable").length,confirmedPlanets:records.reduce((sum,record)=>sum+(record.confirmedPlanets?.length||0),0),planetCandidates:records.reduce((sum,record)=>sum+(record.candidatePlanets?.length||0),0),falsePositiveKois:records.reduce((sum,record)=>sum+(record.falsePositives?.length||0),0)};
const bundle={schemaVersion:1,datasetId:"pcs-mw-kepler-observed-stars-v1",generatedAt:retrievedAt,retrievalDate:retrievedAt.slice(0,10),classification:"OBSERVATION-DERIVED / MULTI-CATALOG OBSERVATION-DERIVED",referenceFrameContract:{originalKepler:"ICRS/J2000 catalog coordinates",gaia:"Gaia-CRF3/ICRS J2016.0",render:"PCS Galactocentric frame; original measurements preserved",distanceConvention:"Published Kepler DR25 stellar distance or NASA Exoplanet Archive composite host distance; no inverse-parallax substitution"},samplePolicy:{database:"All Q1-Q17 DR25 targets with KOI/confirmed/false-positive flags plus deterministic MOD(kepid,40)=0 field sample",renderer:"Scale- and device-bounded deterministic subsets; catalog identity never synthesized",ordinaryTargetModulo:40},footprint:{method:"Convex envelope in the local tangent plane of all 200,038 Q1-Q17 DR25 target coordinates; angular observation-footprint guide, not a physical cone or volume",perimeter:convexHull(footprintResult.records)},counts,sources:[{name:"NASA Exoplanet Archive Kepler Stellar Q1-Q17 DR25",table:"q1_q17_dr25_ks",release:"Q1-Q17 DR25 / SOC 9.3",url:"https://exoplanetarchive.ipac.caltech.edu/docs/Kepler_stellar_docs.html"},{name:"NASA Exoplanet Archive KOI Cumulative",table:"cumulative",release:"Cumulative dispositions; includes Q1-Q17 DR25 and supplemental priorities",url:"https://exoplanetarchive.ipac.caltech.edu/docs/PurposeOfKOITable.html"},{name:"NASA Exoplanet Archive Planetary Systems",table:"ps",release:"Current archive snapshot at retrieval date; default Kepler-discovery solutions",url:"https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html"},{name:"ESA Gaia DR3",table:"gaiadr3.gaia_source",release:"Gaia DR3",url:"https://gea.esac.esa.int/archive/documentation/GDR3/"}],queries:{stellar:stellarQuery,footprint:footprintQuery,koi:koiQuery,planets:planetQuery,gaiaBatches:gaiaResult.queries},inputChecksums:{stellarResponse:stellarResult.sha256,footprintResponse:footprintResult.sha256,koiResponse:koiResult.sha256,planetResponse:planetResult.sha256,gaiaResponses:gaiaResult.sha256},knownLimitations:["The deployed catalog is a deterministic scientific subset, not all 200,038 target records.","The footprint is derived from target coordinates and does not encode per-quarter dead modules or detector polygons.","Kepler/KIC coordinates and Gaia coordinates have different reference epochs; both identities and epochs are retained.","Missing radial velocity is null and prevents 3D propagation; it is never interpreted as zero."],records};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(bundle)}\n`);
console.log(JSON.stringify({output,counts,footprintVertices:bundle.footprint.perimeter.length,sha256:sha256(fs.readFileSync(output))},null,2));
