(function exposeDeepSpaceEphemeris(global) {
  "use strict";

  const AU_KM = 149597870.7;
  const DAY_MS = 86400000;
  const J2000_MS = Date.parse("2000-01-01T12:00:00Z");
  const registry = global.PCSDeepSpaceRegistry?.BODY_REGISTRY || {};
  const cache = global.PCSDeepSpaceEphemerisCache || {};
  const Core = global.PCSSolarSystemCore;
  const planetIds = global.PCSDeepSpaceRegistry?.PLANET_IDS || [];
  if (!Core) return;

  function normalizeDegrees(value) { return ((value % 360) + 360) % 360; }
  function radians(value) { return value * Math.PI / 180; }
  function validEpoch(epoch) {
    const date = epoch instanceof Date ? new Date(epoch) : new Date(epoch);
    if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid Deep Space epoch");
    return date;
  }
  function solveEccentricAnomaly(meanAnomaly, eccentricity) {
    let estimate = meanAnomaly;
    for (let iteration = 0; iteration < 12; iteration += 1) {
      const delta = (estimate - eccentricity * Math.sin(estimate) - meanAnomaly) / (1 - eccentricity * Math.cos(estimate));
      estimate -= delta;
      if (Math.abs(delta) < 1e-12) break;
    }
    return estimate;
  }

  function getFallbackOrbitalState(bodyId, epoch) {
    const date = validEpoch(epoch);
    const body = registry[bodyId];
    if (!body?.orbitalElements) return null;
    const centuries = (date.getTime() - J2000_MS) / (DAY_MS * 36525);
    const values = body.orbitalElements.elements.map((value, index) => value + body.orbitalElements.rates[index] * centuries);
    const [a,eccentricity,inclination,meanLongitude,longitudePerihelion,longitudeNode] = values;
    const meanAnomaly = radians(normalizeDegrees(meanLongitude - longitudePerihelion));
    const argumentPerihelion = radians(normalizeDegrees(longitudePerihelion - longitudeNode));
    const node = radians(normalizeDegrees(longitudeNode));
    const inc = radians(inclination);
    const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
    const xPrime = a * (Math.cos(eccentricAnomaly) - eccentricity);
    const yPrime = a * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(eccentricAnomaly);
    const cosW = Math.cos(argumentPerihelion), sinW = Math.sin(argumentPerihelion);
    const cosN = Math.cos(node), sinN = Math.sin(node), cosI = Math.cos(inc), sinI = Math.sin(inc);
    const x = (cosW*cosN-sinW*sinN*cosI)*xPrime + (-sinW*cosN-cosW*sinN*cosI)*yPrime;
    const y = (cosW*sinN+sinW*cosN*cosI)*xPrime + (-sinW*sinN+cosW*cosN*cosI)*yPrime;
    const z = sinW*sinI*xPrime + cosW*sinI*yPrime;
    return Object.freeze({ bodyId, epoch:date.toISOString(), coordinateFrame:body.coordinateFrame, positionAu:Object.freeze([x,y,z]), heliocentricDistanceAu:Math.hypot(x,y,z), dataStatus:"approximate", source:body.orbitalDataSource, notice:body.uncertainty });
  }

  function getCachedEphemeris(bodyId, epoch) {
    const date = validEpoch(epoch);
    const samples = cache[bodyId];
    if (!Array.isArray(samples) || !samples.length) return null;
    const closest = samples.reduce((best, sample) => Math.abs(Date.parse(sample.epoch)-date) < Math.abs(Date.parse(best.epoch)-date) ? sample : best);
    if (Math.abs(Date.parse(closest.epoch)-date) > 12 * 60 * 60 * 1000) return null;
    return Object.freeze({ ...closest, bodyId, dataStatus:"ephemeris-derived", source:"NASA/JPL Horizons cached vector", notice:"Cached JPL vector; epoch shown explicitly." });
  }

  function interpolationBracket(bodyId, epoch) {
    const date = validEpoch(epoch),samples=cache[bodyId];
    if (!Array.isArray(samples) || samples.length < 2) return null;
    const ordered=[...samples].sort((a,b)=>Date.parse(a.epoch)-Date.parse(b.epoch)),time=date.getTime();
    if(time<Date.parse(ordered[0].epoch)||time>Date.parse(ordered.at(-1).epoch))return null;
    for(let index=1;index<ordered.length;index+=1){const before=ordered[index-1],after=ordered[index],start=Date.parse(before.epoch),end=Date.parse(after.epoch);if(time>=start&&time<=end)return {before,after,fraction:end===start?0:(time-start)/(end-start)};}
    return null;
  }

  function interpolatedState(bodyId, epoch) {
    const date=validEpoch(epoch),bracket=interpolationBracket(bodyId,date);
    if(!bracket)return null;
    const blend=(a,b)=>a+(b-a)*bracket.fraction,positionAu=bracket.before.positionAu.map((value,index)=>blend(value,bracket.after.positionAu[index])),velocityAuPerDay=bracket.before.velocityAuPerDay?.map((value,index)=>blend(value,bracket.after.velocityAuPerDay[index]));
    return Object.freeze({bodyId,epoch:date.toISOString(),sourceEpochTdb:`Interpolated between ${bracket.before.sourceEpochTdb||bracket.before.epoch} and ${bracket.after.sourceEpochTdb||bracket.after.epoch}`,coordinateFrame:cache.manifest?.referenceFrame||bracket.before.coordinateFrame,positionAu:Object.freeze(positionAu),velocityAuPerDay:velocityAuPerDay?Object.freeze(velocityAuPerDay):undefined,heliocentricDistanceAu:Math.hypot(...positionAu),dataStatus:"ephemeris-derived",source:`${cache.manifest?.source||"NASA/JPL Horizons"} ${cache.manifest?.ephemeris||""}`.trim(),notice:"Cached authoritative vectors; deterministic linear state interpolation."});
  }

  function authoritativeCoverage(bodyIds, epoch) {
    return bodyIds.length>0&&bodyIds.every(bodyId=>Boolean(interpolationBracket(bodyId,epoch)));
  }

  function createDisplaySolution(epoch, bodyIds=planetIds) {
    const date=validEpoch(epoch),ids=[...bodyIds],manifest=cache.manifest||{};
    if(authoritativeCoverage(ids,date))return Core.createSolution({id:`${manifest.datasetId}:interpolated`,displayEpoch:date,bodyIds:ids,source:manifest.source,catalogEphemeris:manifest.ephemeris,referenceSystem:manifest.referenceSystem,referencePlane:manifest.referencePlane,referenceFrame:manifest.referenceFrame,ephemerisTimeScale:manifest.ephemerisTimeScale,positionMode:"Cached ephemeris · interpolated state",orbitMode:"Cached ephemeris samples from the same solution",lastDataUpdate:manifest.lastDataUpdate,qualityStatus:manifest.qualityStatus,uncertainty:manifest.uncertainty,coverage:manifest.coverage,validity:manifest.coverage,coherent:true,authoritative:true,stale:false,notice:"Every eligible major planet is resolved from the same promoted ephemeris dataset and requested Display Epoch."});
    const range=global.PCSDeepSpaceRegistry?.PLANET_VALID_RANGE;
    if(Core.within(date,range))return Core.createSolution({id:"jpl-approximate-elements-1800-2050",displayEpoch:date,bodyIds:ids,source:global.PCSDeepSpaceRegistry.SOURCES.JPL_ELEMENTS,catalogEphemeris:"JPL approximate positions of the major planets (1800–2050)",referenceFrame:Core.REFERENCE_FRAME,positionMode:"Approximate elements · propagated",orbitMode:"Approximate elements · same model as body positions",lastDataUpdate:"Not provided",qualityStatus:"Model-limited fallback; not mission-navigation precision",uncertainty:"JPL supplies no formal covariance with the approximate-element table",validity:range,coherent:true,authoritative:false,stale:false,notice:manifest.promotionStatus==="not-promoted"?"The legacy single-epoch Horizons snapshot is retained for provenance but is not mixed into this coherent fallback solution.":null});
    return Core.createSolution({id:"solar-system-position-unavailable",displayEpoch:date,bodyIds:ids,source:"Unavailable",catalogEphemeris:"Unavailable",referenceFrame:Core.REFERENCE_FRAME,positionMode:"Unavailable",orbitMode:"Unavailable",lastDataUpdate:manifest.lastDataUpdate||"Not provided",qualityStatus:"Requested epoch is outside validated local coverage",uncertainty:"Unavailable",validity:range,coherent:true,authoritative:false,stale:Boolean(manifest.datasetId),notice:"PCS does not silently extrapolate the 1800–2050 approximate-element model outside its published validity interval."});
  }

  function getStateFromSolution(solution, bodyId, epoch=solution?.displayEpoch) {
    const date=validEpoch(epoch);
    if(bodyId==="sun")return Object.freeze({bodyId,epoch:date.toISOString(),coordinateFrame:solution?.referenceFrame||Core.REFERENCE_FRAME,positionAu:Object.freeze([0,0,0]),heliocentricDistanceAu:0,dataStatus:solution?.authoritative?"ephemeris-derived":"catalog data",source:solution?.source||global.PCSDeepSpaceRegistry.SOURCES.JPL_HORIZONS,solutionId:solution?.id});
    if(!solution?.bodyIds?.includes(bodyId)||solution.positionMode==="Unavailable")return null;
    const state=solution.authoritative?interpolatedState(bodyId,date):getFallbackOrbitalState(bodyId,date);
    return state?Object.freeze({...state,coordinateFrame:solution.referenceFrame,source:solution.source,solutionId:solution.id,positionMode:solution.positionMode}):null;
  }

  function getBodyState(bodyId, epoch) {
    const date = validEpoch(epoch);
    const solution=createDisplaySolution(date,planetIds);
    return getStateFromSolution(solution,bodyId,date);
  }

  function getSatelliteRelativeState(bodyId, epoch) {
    const date = validEpoch(epoch);
    const body = registry[bodyId];
    if (!body?.meanOrbitalRadiusKm) return null;
    const period = Math.abs(body.orbitalPeriodDays);
    const direction = body.rotationPeriodDays < 0 || body.inclinationDeg > 90 ? -1 : 1;
    const phase = direction * 2 * Math.PI * ((date.getTime()-J2000_MS)/DAY_MS % period) / period;
    const inc = radians(body.inclinationDeg || 0);
    const radiusAu = body.meanOrbitalRadiusKm / AU_KM;
    return Object.freeze({ bodyId,epoch:date.toISOString(),positionAu:Object.freeze([radiusAu*Math.cos(phase),radiusAu*Math.sin(phase)*Math.cos(inc),radiusAu*Math.sin(phase)*Math.sin(inc)]),dataStatus:"approximate",source:body.orbitalDataSource,notice:body.uncertainty });
  }

  function sampleOrbit(bodyId, centerEpoch, options={}) {
    const body=registry[bodyId],date=validEpoch(centerEpoch);
    if (!body?.orbit || !body.orbitalPeriodDays) return Object.freeze([]);
    const density=Math.max(24,Math.min(720,Number(options.sampleDensity)||180));
    const periodDays=Math.abs(body.orbitalPeriodDays),pastDays=Number.isFinite(options.pastDays)?Math.max(0,options.pastDays):periodDays/2,futureDays=Number.isFinite(options.futureDays)?Math.max(0,options.futureDays):periodDays/2;
    const span=Math.max(pastDays+futureDays,periodDays/density),samples=[];
    const solution=options.solution||null;
    if(solution&&(!Core.within(new Date(date.getTime()-pastDays*DAY_MS),solution.validity)||!Core.within(new Date(date.getTime()+futureDays*DAY_MS),solution.validity)))return Object.freeze([]);
    for(let index=0;index<=density;index+=1){const epoch=new Date(date.getTime()+(-pastDays+span*index/density)*DAY_MS);const state=body.type==="natural-satellite"?getSatelliteRelativeState(bodyId,epoch):solution?getStateFromSolution(solution,bodyId,epoch):getBodyState(bodyId,epoch);if(state)samples.push(Object.freeze({...state,relativeTo:body.parentBodyId||null}));}
    return Object.freeze(samples);
  }

  global.PCSDeepSpaceEphemeris = Object.freeze({ AU_KM, getBodyState, getCachedEphemeris, getFallbackOrbitalState, getSatelliteRelativeState, interpolationBracket, interpolatedState, createDisplaySolution, getStateFromSolution, sampleOrbit });
})(window);
