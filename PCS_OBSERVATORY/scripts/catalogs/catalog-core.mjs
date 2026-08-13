import crypto from "node:crypto";

export const SCHEMA_VERSION="pcs-known-astronomical-objects-v1";
export const NORMALIZATION_VERSION="pcs-known-object-normalization-v1";
export const PIPELINE_STATES=Object.freeze(["FETCHED","NORMALIZED","CROSS_MATCHED","VALIDATED","REVIEW_PENDING","APPROVED","PUBLISHED"]);
export const OBJECT_CLASSES=Object.freeze(["nebula","star-cluster","stellar-object","black-hole","exoplanetary-system","transient-remnant","galactic-structure"]);
export const EVIDENCE_CLASSES=Object.freeze(["MEASURED","CATALOG-DERIVED","RECONSTRUCTED","REPRESENTATIVE"]);
export const FIDELITY_LEVELS=Object.freeze(["LA","LB","LC","LD","LE"]);
export const GEOMETRY_STATUSES=Object.freeze(["MEASURED_POSITION","OBSERVED_ANGULAR_EXTENT","RECONSTRUCTED_3D","REPRESENTATIVE_VISUALIZATION","UNAVAILABLE"]);
export const WAVELENGTHS=Object.freeze(["Radio","Microwave","Infrared","Visible","Ultraviolet","X-ray","Gamma-ray"]);

const textOrNull=value=>value==null||String(value).trim()===""?null:String(value).trim();
const numberOrNull=value=>value==null||value===""?null:Number(value);
const unique=values=>[...new Set((values||[]).filter(value=>value!=null).map(value=>String(value).trim()).filter(Boolean))];
const normalizeCatalogId=value=>String(value||"").normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase("en-US");
export const normalizeAlias=value=>normalizeCatalogId(value).replace(/[‐‑‒–—]/g,"-").replace(/\s*([+*])\s*/g,"$1");
export const sha256=value=>crypto.createHash("sha256").update(typeof value==="string"?value:JSON.stringify(value)).digest("hex");

const nullableObject=value=>value&&typeof value==="object"&&!Array.isArray(value)?structuredClone(value):null;
const catalogIdentifiers=value=>(value||[]).map(item=>({catalog:String(item?.catalog||"").trim(),identifier:String(item?.identifier||"").trim()})).filter(item=>item.catalog&&item.identifier).filter((item,index,all)=>all.findIndex(other=>normalizeCatalogId(other.catalog)===normalizeCatalogId(item.catalog)&&normalizeCatalogId(other.identifier)===normalizeCatalogId(item.identifier))===index);

export function normalizeRecord(raw,context={}){
  const sourceIds=unique([...(raw.dataSources||[]),context.sourceId]);
  return {
    pcsObjectId:String(raw.pcsObjectId||"").trim(),officialName:String(raw.officialName||"").trim(),commonName:textOrNull(raw.commonName),aliases:unique(raw.aliases),
    objectClass:String(raw.objectClass||"").trim(),objectSubtype:textOrNull(raw.objectSubtype),catalogIdentifiers:catalogIdentifiers(raw.catalogIdentifiers),
    raDeg:numberOrNull(raw.raDeg),decDeg:numberOrNull(raw.decDeg),coordinateFrame:textOrNull(raw.coordinateFrame),coordinateEpoch:textOrNull(raw.coordinateEpoch),
    distance:numberOrNull(raw.distance),distanceLower:numberOrNull(raw.distanceLower),distanceUpper:numberOrNull(raw.distanceUpper),distanceUnit:textOrNull(raw.distanceUnit),distanceMethod:textOrNull(raw.distanceMethod),
    parallaxMas:numberOrNull(raw.parallaxMas),properMotionRaMasYr:numberOrNull(raw.properMotionRaMasYr),properMotionDecMasYr:numberOrNull(raw.properMotionDecMasYr),radialVelocityKmS:numberOrNull(raw.radialVelocityKmS),redshift:numberOrNull(raw.redshift),
    physicalSize:nullableObject(raw.physicalSize),angularSize:nullableObject(raw.angularSize),mass:nullableObject(raw.mass),massMethod:textOrNull(raw.massMethod),age:nullableObject(raw.age),temperatureK:numberOrNull(raw.temperatureK),spectralType:textOrNull(raw.spectralType),
    hostStructure:textOrNull(raw.hostStructure),parentObject:textOrNull(raw.parentObject),associatedObjects:unique(raw.associatedObjects),discoveryDate:textOrNull(raw.discoveryDate),discoveryMethod:textOrNull(raw.discoveryMethod),
    observationStatus:String(raw.observationStatus||"").trim(),evidenceClass:String(raw.evidenceClass||"").trim(),scientificFidelity:String(raw.scientificFidelity||"").trim(),wavelengths:unique(raw.wavelengths),geometryStatus:String(raw.geometryStatus||"UNAVAILABLE").trim(),
    lastUpdated:String(raw.lastUpdated||context.retrievedAt||"").trim(),dataSources:sourceIds,researchReferences:unique(raw.researchReferences),knownLimitations:unique(raw.knownLimitations),
    ...(raw.blackHoleStatus!==undefined?{blackHoleStatus:textOrNull(raw.blackHoleStatus)}:{})
  };
}

const finiteOrNull=value=>value===null||Number.isFinite(value);
export function validateRecord(record,{sourceIds=new Set()}={}){
  const errors=[];
  if(!/^pcs:[a-z0-9][a-z0-9:-]+$/.test(record.pcsObjectId||""))errors.push("pcsObjectId must be a stable lowercase PCS identifier");
  if(!record.officialName)errors.push("officialName is required");
  if(!OBJECT_CLASSES.includes(record.objectClass))errors.push(`unsupported objectClass: ${record.objectClass}`);
  if(!EVIDENCE_CLASSES.includes(record.evidenceClass))errors.push(`unsupported evidenceClass: ${record.evidenceClass}`);
  if(!FIDELITY_LEVELS.includes(record.scientificFidelity))errors.push(`unsupported scientificFidelity: ${record.scientificFidelity}`);
  if(!GEOMETRY_STATUSES.includes(record.geometryStatus))errors.push(`unsupported geometryStatus: ${record.geometryStatus}`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(record.lastUpdated||""))errors.push("lastUpdated must be YYYY-MM-DD");
  if(record.raDeg===null!== (record.decDeg===null))errors.push("RA and Dec must either both be available or both be null");
  if(record.raDeg!==null&&(record.raDeg<0||record.raDeg>=360))errors.push("RA must be in [0, 360) degrees");
  if(record.decDeg!==null&&(record.decDeg< -90||record.decDeg>90))errors.push("Dec must be in [-90, 90] degrees");
  if(record.raDeg!==null&&(!record.coordinateFrame||!record.coordinateEpoch))errors.push("available coordinates require frame and epoch");
  for(const field of ["distance","distanceLower","distanceUpper","parallaxMas","properMotionRaMasYr","properMotionDecMasYr","radialVelocityKmS","redshift","temperatureK"])if(!finiteOrNull(record[field]))errors.push(`${field} must be finite or null`);
  if(record.distance!==null&&record.distance<0)errors.push("distance cannot be negative");
  if(record.distanceLower!==null&&record.distance!==null&&record.distanceLower>record.distance)errors.push("distanceLower exceeds distance");
  if(record.distanceUpper!==null&&record.distance!==null&&record.distanceUpper<record.distance)errors.push("distanceUpper is below distance");
  if(record.distance!==null&&!(["pc","kpc","Mpc"].includes(record.distanceUnit)&&record.distanceMethod))errors.push("available distance requires unit and method");
  if(record.distance===null&&record.distanceUnit!==null)errors.push("distanceUnit must be null when distance is unavailable");
  if(!record.observationStatus)errors.push("observationStatus is required");
  if(!Array.isArray(record.dataSources)||record.dataSources.length===0)errors.push("at least one data source is required");
  for(const id of record.dataSources||[])if(sourceIds.size&&!sourceIds.has(id))errors.push(`unknown sourceId: ${id}`);
  for(const wavelength of record.wavelengths||[])if(!WAVELENGTHS.includes(wavelength))errors.push(`unsupported wavelength: ${wavelength}`);
  if(record.evidenceClass==="REPRESENTATIVE"&&record.catalogIdentifiers.length)errors.push("representative objects cannot claim catalog identifiers");
  if(record.objectClass!=="black-hole"&&record.blackHoleStatus)errors.push("blackHoleStatus is restricted to black-hole records");
  if(record.objectClass==="black-hole"&&!(["CONFIRMED","DYNAMICALLY_SUPPORTED","STRONG_CANDIDATE","CANDIDATE","UNCERTAIN"].includes(record.blackHoleStatus)))errors.push("black-hole records require an approved blackHoleStatus");
  return {valid:errors.length===0,errors};
}

const identifierKeys=record=>record.catalogIdentifiers.map(item=>`${normalizeCatalogId(item.catalog)}:${normalizeCatalogId(item.identifier)}`);
function mergeNullable(existing,incoming,field,conflicts){
  if(existing[field]===null&&incoming[field]!==null)existing[field]=incoming[field];
  else if(existing[field]!==null&&incoming[field]!==null&&JSON.stringify(existing[field])!==JSON.stringify(incoming[field]))conflicts.push({pcsObjectId:existing.pcsObjectId,field,existing:existing[field],incoming:incoming[field]});
}
export function crossMatchRecords(records){
  const byIdentifier=new Map(),objects=[],conflicts=[];
  for(const candidate of records){
    const matched=identifierKeys(candidate).map(key=>byIdentifier.get(key)).find(Boolean);
    if(!matched){const copy=structuredClone(candidate);objects.push(copy);for(const key of identifierKeys(copy))byIdentifier.set(key,copy);continue;}
    for(const field of ["raDeg","decDeg","coordinateFrame","coordinateEpoch","distance","distanceLower","distanceUpper","distanceUnit","distanceMethod","parallaxMas","properMotionRaMasYr","properMotionDecMasYr","radialVelocityKmS","redshift","physicalSize","angularSize","mass","massMethod","age","temperatureK","spectralType","hostStructure","parentObject","discoveryDate","discoveryMethod","blackHoleStatus"])mergeNullable(matched,candidate,field,conflicts);
    matched.aliases=unique([...matched.aliases,candidate.officialName,candidate.commonName,...candidate.aliases]);matched.catalogIdentifiers=catalogIdentifiers([...matched.catalogIdentifiers,...candidate.catalogIdentifiers]);matched.associatedObjects=unique([...matched.associatedObjects,...candidate.associatedObjects]);matched.dataSources=unique([...matched.dataSources,...candidate.dataSources]);matched.researchReferences=unique([...matched.researchReferences,...candidate.researchReferences]);matched.knownLimitations=unique([...matched.knownLimitations,...candidate.knownLimitations]);
    for(const key of identifierKeys(matched))byIdentifier.set(key,matched);
  }
  return {objects,conflicts};
}

export function buildAliasIndex(records){
  const index={},conflicts=[];
  for(const record of records){
    const names=unique([record.officialName,record.commonName,...record.aliases,...record.catalogIdentifiers.map(item=>`${item.catalog} ${item.identifier}`)]);
    for(const name of names){const key=normalizeAlias(name);if(!key)continue;if(index[key]&&index[key]!==record.pcsObjectId)conflicts.push({alias:name,normalizedAlias:key,objectIds:[index[key],record.pcsObjectId].sort()});else index[key]=record.pcsObjectId;}
  }
  return {index,conflicts:conflicts.filter((item,pos,all)=>all.findIndex(other=>other.normalizedAlias===item.normalizedAlias&&JSON.stringify(other.objectIds)===JSON.stringify(item.objectIds))===pos)};
}

export function buildRelationshipGraph(records,edges=[]){
  const ids=new Set(records.map(record=>record.pcsObjectId)),resolved=[],unresolved=[];
  const candidates=[...edges];
  for(const record of records){if(record.parentObject)candidates.push({from:record.pcsObjectId,predicate:"part-of",to:record.parentObject,evidenceClass:record.evidenceClass,sourceIds:record.dataSources});for(const target of record.associatedObjects)candidates.push({from:record.pcsObjectId,predicate:"associated-with",to:target,evidenceClass:record.evidenceClass,sourceIds:record.dataSources});}
  for(const edge of candidates){const normalized={from:String(edge.from||""),predicate:String(edge.predicate||""),to:String(edge.to||""),evidenceClass:String(edge.evidenceClass||""),sourceIds:unique(edge.sourceIds)};if(ids.has(normalized.from)&&ids.has(normalized.to)&&normalized.predicate)resolved.push(normalized);else unresolved.push({...normalized,reason:!ids.has(normalized.from)?"missing source object":!ids.has(normalized.to)?"missing target object":"missing predicate"});}
  return {resolved:resolved.filter((edge,index,all)=>all.findIndex(item=>item.from===edge.from&&item.predicate===edge.predicate&&item.to===edge.to)===index),unresolved};
}

export function ingestRecords(rawRecords,{sourceRegistry,sourceId,mapRow=value=>value,retrievedAt}){
  const sourceIds=new Set(sourceRegistry.sources.map(source=>source.sourceId));if(!sourceIds.has(sourceId))throw new Error(`Adapter source is not registered: ${sourceId}`);
  const normalized=[],rejected=[];
  for(let index=0;index<rawRecords.length;index++){try{const record=normalizeRecord(mapRow(rawRecords[index],index),{sourceId,retrievedAt});const result=validateRecord(record,{sourceIds});if(result.valid)normalized.push(record);else rejected.push({index,reason:"schema-validation",errors:result.errors});}catch(error){rejected.push({index,reason:"adapter-error",errors:[error.message]});}}
  const matched=crossMatchRecords(normalized),aliases=buildAliasIndex(matched.objects),relationships=buildRelationshipGraph(matched.objects);
  return {inputCount:rawRecords.length,importedCount:matched.objects.length,rejectedCount:rejected.length,unresolvedCount:matched.conflicts.length+aliases.conflicts.length+relationships.unresolved.length,objects:matched.objects,rejected,identityConflicts:matched.conflicts,aliasIndex:aliases.index,aliasConflicts:aliases.conflicts,relationships};
}

export function catalogDiff(previous,next){
  const before=new Map(previous.objects.map(record=>[record.pcsObjectId,record])),after=new Map(next.objects.map(record=>[record.pcsObjectId,record]));
  return {added:[...after.keys()].filter(id=>!before.has(id)).sort(),removed:[...before.keys()].filter(id=>!after.has(id)).sort(),changed:[...after.keys()].filter(id=>before.has(id)&&sha256(before.get(id))!==sha256(after.get(id))).sort()};
}

export function assertPromotionReceipt({candidate,validation,diff,receipt}){
  const expected={candidateChecksum:sha256(candidate),validationChecksum:sha256(validation),diffChecksum:sha256(diff)};
  if(receipt?.decision!=="APPROVED")throw new Error("Promotion requires an APPROVED human review receipt");
  for(const [field,value] of Object.entries(expected))if(receipt[field]!==value)throw new Error(`Review receipt ${field} does not match the reviewed artifact`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(receipt.decisionDate||""))throw new Error("Review receipt requires a decision date");
  if(!receipt.catalogVersion||!receipt.reviewer)throw new Error("Review receipt requires catalogVersion and reviewer");
  return true;
}
