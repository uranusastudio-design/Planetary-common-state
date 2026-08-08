export const SBDB_QUERY_ENDPOINT="https://ssd-api.jpl.nasa.gov/sbdb_query.api";
export const SBDB_LOOKUP_ENDPOINT="https://ssd-api.jpl.nasa.gov/sbdb.api";
export const ORBIT_FIELDS=Object.freeze(["spkid","full_name","pdes","name","H","diameter","e","a","q","i","om","w","ma","tp","epoch","per","ad","n","class","condition_code","data_arc","n_obs_used","sigma_e","sigma_a","sigma_q","sigma_i","sigma_om","sigma_w","sigma_ma","sigma_tp","sigma_per"]);

export function buildMainBeltQuery({absoluteMagnitudeLimit=13}={}){
  const url=new URL(SBDB_QUERY_ENDPOINT);
  url.searchParams.set("fields",ORBIT_FIELDS.join(","));url.searchParams.set("sb-class","MBA");
  url.searchParams.set("sb-cdata",JSON.stringify({AND:[`H|LT|${Number(absoluteMagnitudeLimit)}`]}));
  url.searchParams.set("sort","H,pdes");url.searchParams.set("full-prec","true");
  return Object.freeze({url:url.toString(),selection:Object.freeze({orbitClass:"MBA",absoluteMagnitude:`H < ${Number(absoluteMagnitudeLimit)}`,sort:"H,pdes",deterministic:true})});
}

export function buildOrbitClassQuery(orbitClass){const value=String(orbitClass||"").trim();if(!value)throw new TypeError("SBDB orbit class is required");const url=new URL(SBDB_QUERY_ENDPOINT);url.searchParams.set("fields",ORBIT_FIELDS.join(","));url.searchParams.set("sb-class",value);url.searchParams.set("sort","H,pdes");url.searchParams.set("full-prec","true");return Object.freeze({url:url.toString(),selection:Object.freeze({orbitClass:value,sort:"H,pdes",deterministic:true})});}

export function buildLookupQuery(name){const value=String(name||"").trim();if(!value)throw new TypeError("SBDB lookup name is required");const url=new URL(SBDB_LOOKUP_ENDPOINT);url.searchParams.set("sstr",value);url.searchParams.set("phys-par","true");url.searchParams.set("full-prec","true");return url.toString();}

const finiteOrNull=value=>value==null||value===""?null:(Number.isFinite(Number(value))?Number(value):null);
export function normalizeQueryResponse(payload){
  if(payload?.signature?.source!=="NASA/JPL SBDB (Small-Body DataBase) Query API")throw new Error("Unexpected SBDB Query API signature");
  const fields=payload.fields||[],index=Object.fromEntries(fields.map((field,i)=>[field,i]));
  return Object.freeze((payload.data||[]).map(row=>Object.freeze({
    spkid:String(row[index.spkid]),fullName:String(row[index.full_name]||"").trim(),designation:String(row[index.pdes]),name:row[index.name]||null,
    absoluteMagnitude:finiteOrNull(row[index.H]),diameterKm:finiteOrNull(row[index.diameter]),orbitClass:row[index.class],
    elements:Object.freeze({e:finiteOrNull(row[index.e]),a:finiteOrNull(row[index.a]),q:finiteOrNull(row[index.q]),i:finiteOrNull(row[index.i]),om:finiteOrNull(row[index.om]),w:finiteOrNull(row[index.w]),ma:finiteOrNull(row[index.ma]),tp:finiteOrNull(row[index.tp]),epochJdTdb:finiteOrNull(row[index.epoch]),periodDays:finiteOrNull(row[index.per]),aphelionAu:finiteOrNull(row[index.ad]),meanMotionDegPerDay:finiteOrNull(row[index.n])}),
    uncertainty:Object.freeze({e:finiteOrNull(row[index.sigma_e]),aAu:finiteOrNull(row[index.sigma_a]),qAu:finiteOrNull(row[index.sigma_q]),iDeg:finiteOrNull(row[index.sigma_i]),omDeg:finiteOrNull(row[index.sigma_om]),wDeg:finiteOrNull(row[index.sigma_w]),maDeg:finiteOrNull(row[index.sigma_ma]),tpDays:finiteOrNull(row[index.sigma_tp]),periodDays:finiteOrNull(row[index.sigma_per])}),
    conditionCode:row[index.condition_code]??null,dataArcDays:finiteOrNull(row[index.data_arc]),observationsUsed:finiteOrNull(row[index.n_obs_used])
  })));
}

export function normalizeLookupResponse(payload,classification="dwarf planet"){
  if(payload?.signature?.source!=="NASA/JPL Small-Body Database (SBDB) API")throw new Error("Unexpected SBDB lookup API signature");
  const element=Object.fromEntries((payload.orbit?.elements||[]).map(item=>[item.name,item]));
  const physical=Object.fromEntries((payload.phys_par||[]).map(item=>[item.name,item]));
  const value=name=>finiteOrNull(element[name]?.value),sigma=name=>finiteOrNull(element[name]?.sigma);
  return Object.freeze({spkid:String(payload.object.spkid),fullName:payload.object.fullname,name:payload.object.shortname.replace(/^\d+\s+/,""),designation:payload.object.des,classification,orbitClass:payload.object.orbit_class?.code||null,orbitClassName:payload.object.orbit_class?.name||null,orbitId:payload.object.orbit_id||null,absoluteMagnitude:finiteOrNull(physical.H?.value),diameterKm:finiteOrNull(physical.diameter?.value),elements:Object.freeze({e:value("e"),a:value("a"),q:value("q"),i:value("i"),om:value("om"),w:value("w"),ma:value("ma"),tp:value("tp"),epochJdTdb:finiteOrNull(payload.orbit.epoch),periodDays:value("per"),aphelionAu:value("ad"),meanMotionDegPerDay:value("n")}),uncertainty:Object.freeze({e:sigma("e"),aAu:sigma("a"),qAu:sigma("q"),iDeg:sigma("i"),omDeg:sigma("om"),wDeg:sigma("w"),maDeg:sigma("ma"),tpDays:sigma("tp"),periodDays:sigma("per")}),conditionCode:payload.orbit.condition_code??null,dataArcDays:finiteOrNull(payload.orbit.data_arc),observationsUsed:finiteOrNull(payload.orbit.n_obs_used),source:"NASA/JPL SBDB",referenceFrame:`${payload.orbit.equinox||"J2000"} ecliptic heliocentric osculating elements`,solutionEpochTimeScale:"TDB"});
}
