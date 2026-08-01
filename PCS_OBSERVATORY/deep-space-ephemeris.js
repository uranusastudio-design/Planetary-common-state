(function exposeDeepSpaceEphemeris(global) {
  "use strict";

  const AU_KM = 149597870.7;
  const DAY_MS = 86400000;
  const J2000_MS = Date.parse("2000-01-01T12:00:00Z");
  const registry = global.PCSDeepSpaceRegistry?.BODY_REGISTRY || {};
  const cache = global.PCSDeepSpaceEphemerisCache || {};

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

  function getBodyState(bodyId, epoch) {
    const date = validEpoch(epoch);
    if (bodyId === "sun") return Object.freeze({ bodyId,epoch:date.toISOString(),coordinateFrame:global.PCSDeepSpaceRegistry.FRAME,positionAu:Object.freeze([0,0,0]),heliocentricDistanceAu:0,dataStatus:"catalog data",source:global.PCSDeepSpaceRegistry.SOURCES.JPL_HORIZONS });
    return getCachedEphemeris(bodyId, date) || getFallbackOrbitalState(bodyId, date);
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

  global.PCSDeepSpaceEphemeris = Object.freeze({ AU_KM, getBodyState, getCachedEphemeris, getFallbackOrbitalState, getSatelliteRelativeState });
})(window);
