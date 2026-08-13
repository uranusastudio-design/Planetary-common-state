(function exposeSolarSystemLongHorizon(global) {
  "use strict";

  const Core = global.PCSSolarSystemCore;
  if (!Core) return;

  const PROVIDERS = Object.freeze({
    AUTHORITATIVE_EPHEMERIS: "AUTHORITATIVE_EPHEMERIS",
    PCS_NUMERICAL_ANALYSIS: "PCS_NUMERICAL_ANALYSIS",
    UNSUPPORTED: "UNSUPPORTED"
  });
  const AU_KM = 149597870.7;
  const DAY_SECONDS = 86400;
  const UNIX_EPOCH_JD = 2440587.5;
  const DEFAULT_MAX_STEP_DAYS = 4;
  const PUBLIC_MIN_YEAR = -13199;
  const PUBLIC_MAX_YEAR = 20000;
  const EXPERIMENTAL_RESEARCH_MAX_YEAR = 100000;
  const EXPERIMENTAL_RESEARCH_LABEL = "EXPERIMENTAL LONG-HORIZON RECONSTRUCTION";
  const BODY_IDS = Object.freeze(["sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]);
  const dataset = global.PCSSolarSystemLongHorizonDataset || null;
  const cache = new Map();

  function epochFromYear(year) {
    const numeric = Number(year);
    if (!Number.isInteger(numeric) || numeric < PUBLIC_MIN_YEAR || numeric > EXPERIMENTAL_RESEARCH_MAX_YEAR) throw new RangeError("Long-horizon astronomical year must be an integer from -13199 (13200 BCE) through 100000");
    const date = new Date(0);
    date.setUTCFullYear(numeric, 0, 1);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  function publicEpochFromYear(year) {
    const numeric = Number(year);
    if (!Number.isInteger(numeric) || numeric < PUBLIC_MIN_YEAR || numeric > PUBLIC_MAX_YEAR) throw new RangeError("Public long-horizon astronomical year must be an integer from -13199 (13200 BCE) through 20000");
    return epochFromYear(numeric);
  }

  function displayDateToJdTdb(value) {
    const date = Core.validDate(value);
    const quality = Core.timeConversionQuality(date);
    if (quality.status === "validated") return Core.utcToJdTdb(date);
    // Outside the leap-second table, the UI calendar is interpreted directly as
    // a proleptic-Gregorian TDB analysis epoch. It is not a claim about future UTC.
    return date.getTime() / Core.DAY_MS + UNIX_EPOCH_JD;
  }

  function jdTdbToDisplayDate(jdTdb) {
    const date = new Date((Number(jdTdb) - UNIX_EPOCH_JD) * Core.DAY_MS);
    if (!Number.isFinite(date.getTime())) throw new RangeError("Long-horizon JDTDB is outside the JavaScript display calendar");
    return date;
  }

  function segmentForJd(jdTdb) {
    return dataset?.segments?.find(segment => jdTdb >= segment.startJdTdb && jdTdb <= segment.endJdTdb) || null;
  }

  function segmentDisplayValidity(segment, publicOnly = true) {
    if (!segment) return null;
    const publicEndJd = displayDateToJdTdb(epochFromYear(PUBLIC_MAX_YEAR));
    return Object.freeze({
      start: jdTdbToDisplayDate(segment.startJdTdb).toISOString(),
      end: jdTdbToDisplayDate(publicOnly ? Math.min(segment.endJdTdb, publicEndJd) : segment.endJdTdb).toISOString()
    });
  }

  function coverageMetadata() {
    const authoritative = dataset?.segments?.find(segment => segment.provider === PROVIDERS.AUTHORITATIVE_EPHEMERIS) || null;
    const numerical = dataset?.segments?.find(segment => segment.provider === PROVIDERS.PCS_NUMERICAL_ANALYSIS) || null;
    return Object.freeze({
      public: Object.freeze({ minYear: PUBLIC_MIN_YEAR, maxYear: PUBLIC_MAX_YEAR, authoritative: segmentDisplayValidity(authoritative), numerical: segmentDisplayValidity(numerical) }),
      research: Object.freeze({ maxYear: EXPERIMENTAL_RESEARCH_MAX_YEAR, label: EXPERIMENTAL_RESEARCH_LABEL, numerical: segmentDisplayValidity(numerical, false) })
    });
  }

  function resolveSolarSystemTimeProvider(value) {
    const date = Core.validDate(value);
    const jdTdb = displayDateToJdTdb(date);
    const segment = segmentForJd(jdTdb);
    if (!segment) return Object.freeze({ provider: PROVIDERS.UNSUPPORTED, date, jdTdb, segment: null, reason: dataset ? "Outside deployed long-horizon coverage" : "Long-horizon state dataset is not loaded" });
    return Object.freeze({ provider: segment.provider, date, jdTdb, segment, reason: null });
  }

  function nearestAnchor(segment, jdTdb) {
    const anchors = segment.anchors || [];
    if (!anchors.length) return null;
    let low = 0, high = anchors.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (anchors[middle][0] <= jdTdb) low = middle;
      else high = middle;
    }
    if (jdTdb <= anchors[0][0]) return anchors[0];
    if (jdTdb >= anchors[high][0]) return anchors[high];
    return Math.abs(anchors[low][0] - jdTdb) <= Math.abs(anchors[high][0] - jdTdb) ? anchors[low] : anchors[high];
  }

  function accelerations(state, gm) {
    const count = BODY_IDS.length, result = Array.from({ length: count }, () => [0, 0, 0]);
    for (let left = 0; left < count; left += 1) {
      const offsetLeft = left * 6;
      for (let right = left + 1; right < count; right += 1) {
        const offsetRight = right * 6;
        const dx = state[offsetRight] - state[offsetLeft], dy = state[offsetRight + 1] - state[offsetLeft + 1], dz = state[offsetRight + 2] - state[offsetLeft + 2];
        const radiusSquared = dx * dx + dy * dy + dz * dz;
        if (radiusSquared === 0 || (gm[left] === 0 && gm[right] === 0)) continue;
        const inverseRadius3 = 1 / Math.pow(radiusSquared, 1.5);
        const x = dx * inverseRadius3, y = dy * inverseRadius3, z = dz * inverseRadius3;
        result[left][0] += gm[right] * x; result[left][1] += gm[right] * y; result[left][2] += gm[right] * z;
        result[right][0] -= gm[left] * x; result[right][1] -= gm[left] * y; result[right][2] -= gm[left] * z;
      }
    }
    return result;
  }

  function integrate(initialState, deltaDays, options = {}) {
    const state = initialState.slice(), gm = options.gm || dataset?.gmAu3Day2;
    if (!Array.isArray(gm) || gm.length !== BODY_IDS.length) throw new Error("Long-horizon GM array is unavailable");
    const maximumStep = Math.max(0.125, Math.abs(Number(options.maxStepDays) || DEFAULT_MAX_STEP_DAYS));
    const steps = Math.max(1, Math.ceil(Math.abs(deltaDays) / maximumStep));
    const step = deltaDays / steps;
    let acceleration = accelerations(state, gm);
    for (let iteration = 0; iteration < steps; iteration += 1) {
      for (let index = 0; index < BODY_IDS.length; index += 1) {
        const offset = index * 6;
        state[offset + 3] += acceleration[index][0] * step / 2;
        state[offset + 4] += acceleration[index][1] * step / 2;
        state[offset + 5] += acceleration[index][2] * step / 2;
        state[offset] += state[offset + 3] * step;
        state[offset + 1] += state[offset + 4] * step;
        state[offset + 2] += state[offset + 5] * step;
      }
      const next = accelerations(state, gm);
      for (let index = 0; index < BODY_IDS.length; index += 1) {
        const offset = index * 6;
        state[offset + 3] += next[index][0] * step / 2;
        state[offset + 4] += next[index][1] * step / 2;
        state[offset + 5] += next[index][2] * step / 2;
      }
      acceleration = next;
    }
    return state;
  }

  function systemStateAt(value) {
    const resolved = resolveSolarSystemTimeProvider(value);
    if (resolved.provider === PROVIDERS.UNSUPPORTED) return null;
    const key = resolved.jdTdb.toFixed(9);
    if (cache.has(key)) return cache.get(key);
    const anchor = nearestAnchor(resolved.segment, resolved.jdTdb);
    if (!anchor) return null;
    const state = integrate(anchor.slice(1), resolved.jdTdb - anchor[0], { maxStepDays: resolved.segment.browserInterpolationMaxStepDays || DEFAULT_MAX_STEP_DAYS });
    if (!state.every(Number.isFinite)) throw new Error("Long-horizon integration produced a non-finite state");
    const result = Object.freeze({ resolved, anchorJdTdb: anchor[0], propagationDays: resolved.jdTdb - anchor[0], state: Object.freeze(state) });
    cache.set(key, result);
    while (cache.size > 12) cache.delete(cache.keys().next().value);
    return result;
  }

  function getBodyState(bodyId, value) {
    const index = BODY_IDS.indexOf(bodyId), system = systemStateAt(value);
    if (index < 0 || !system) return null;
    const sunOffset = 0, offset = index * 6;
    const positionAu = index === 0 ? [0, 0, 0] : [0, 1, 2].map(axis => system.state[offset + axis] - system.state[sunOffset + axis]);
    const velocityAuPerDay = index === 0 ? [0, 0, 0] : [0, 1, 2].map(axis => system.state[offset + 3 + axis] - system.state[sunOffset + 3 + axis]);
    const segment = system.resolved.segment, publicValidity = segmentDisplayValidity(segment), experimentalValidity = segmentDisplayValidity(segment, false);
    return Object.freeze({
      bodyId,
      epoch: system.resolved.date.toISOString(),
      jdTdb: system.resolved.jdTdb,
      sourceEpochTdb: `${system.anchorJdTdb} JDTDB`,
      coordinateFrame: dataset.referenceFrame,
      positionAu: Object.freeze(positionAu),
      velocityAuPerDay: Object.freeze(velocityAuPerDay),
      heliocentricDistanceAu: Math.hypot(...positionAu),
      dataStatus: system.resolved.provider === PROVIDERS.AUTHORITATIVE_EPHEMERIS ? "long-term-ephemeris-derived" : "model-integrated",
      source: segment.source,
      provider: system.resolved.provider,
      positionMode: segment.positionMode,
      solutionId: segment.id,
      propagationDaysFromAnchor: system.propagationDays,
      integrator: segment.integrator,
      modelVersion: dataset.modelVersion,
      validityRange: `${publicValidity.start} → ${publicValidity.end}`,
      experimentalValidityRange: `${experimentalValidity.start} → ${experimentalValidity.end} · ${EXPERIMENTAL_RESEARCH_LABEL}`,
      uncertainty: segment.uncertainty
    });
  }

  function sampleOrbit(bodyId, value, options = {}) {
    const bodyIndex = BODY_IDS.indexOf(bodyId), center = systemStateAt(value);
    if (bodyIndex <= 0 || !center) return Object.freeze([]);
    const density = Math.max(24, Math.min(720, Number(options.sampleDensity) || 180));
    const pastDays = Math.max(0, Number(options.pastDays) || 0), futureDays = Math.max(0, Number(options.futureDays) || 0), spanDays = pastDays + futureDays;
    if (spanDays === 0) return Object.freeze([]);
    let state = integrate(center.state, -pastDays, { maxStepDays: center.resolved.segment.browserInterpolationMaxStepDays || DEFAULT_MAX_STEP_DAYS });
    const points = [], interval = spanDays / density, offset = bodyIndex * 6;
    for (let index = 0; index <= density; index += 1) {
      if (index > 0) state = integrate(state, interval, { maxStepDays: center.resolved.segment.browserInterpolationMaxStepDays || DEFAULT_MAX_STEP_DAYS });
      const positionAu = [0, 1, 2].map(axis => state[offset + axis] - state[axis]);
      const velocityAuPerDay = [0, 1, 2].map(axis => state[offset + 3 + axis] - state[3 + axis]);
      const date = new Date(center.resolved.date.getTime() + (-pastDays + interval * index) * Core.DAY_MS);
      points.push(Object.freeze({ bodyId, epoch: date.toISOString(), coordinateFrame: dataset.referenceFrame, positionAu: Object.freeze(positionAu), velocityAuPerDay: Object.freeze(velocityAuPerDay), heliocentricDistanceAu: Math.hypot(...positionAu), dataStatus: center.resolved.provider === PROVIDERS.AUTHORITATIVE_EPHEMERIS ? "long-term-ephemeris-derived" : "model-integrated", source: center.resolved.segment.source, provider: center.resolved.provider, positionMode: center.resolved.segment.positionMode, solutionId: center.resolved.segment.id }));
    }
    return Object.freeze(points);
  }

  function solutionMetadata(value, bodyIds = BODY_IDS.slice(1)) {
    const resolved = resolveSolarSystemTimeProvider(value), segment = resolved.segment;
    if (!segment) return null;
    const validity = segmentDisplayValidity(segment);
    return Object.freeze({
      id: segment.id,
      displayEpoch: resolved.date,
      bodyIds,
      source: segment.source,
      catalogEphemeris: segment.catalogEphemeris,
      referenceSystem: dataset.referenceSystem,
      referencePlane: dataset.referencePlane,
      referenceFrame: dataset.referenceFrame,
      ephemerisTimeScale: dataset.timeScale,
      positionMode: segment.positionMode,
      orbitMode: segment.orbitMode,
      lastDataUpdate: dataset.generatedAt,
      qualityStatus: segment.qualityStatus,
      uncertainty: segment.uncertainty,
      coverage: validity,
      validity,
      coherent: true,
      authoritative: resolved.provider === PROVIDERS.AUTHORITATIVE_EPHEMERIS,
      provider: resolved.provider,
      providerSubtype: segment.providerSubtype,
      fidelityLabel: segment.fidelityLabel,
      fidelityDetail: segment.fidelityDetail,
      integrator: segment.integrator,
      modelVersion: dataset.modelVersion,
      diagnostics: segment.diagnostics,
      notice: segment.notice
    });
  }

  function diagnostics(value) {
    const system = systemStateAt(value);
    if (!system) return null;
    return Object.freeze({
      provider: system.resolved.provider,
      segmentId: system.resolved.segment.id,
      displayJdTdb: system.resolved.jdTdb,
      anchorJdTdb: system.anchorJdTdb,
      propagationDaysFromAnchor: system.propagationDays,
      integrator: system.resolved.segment.integrator,
      referenceFrame: dataset.referenceFrame,
      timeScale: dataset.timeScale,
      modelVersion: dataset.modelVersion,
      publicMaxYear: PUBLIC_MAX_YEAR,
      experimentalResearchMaxYear: EXPERIMENTAL_RESEARCH_MAX_YEAR,
      experimentalResearchLabel: EXPERIMENTAL_RESEARCH_LABEL
    });
  }

  global.PCSSolarSystemLongHorizon = Object.freeze({
    PROVIDERS,
    BODY_IDS,
    AU_KM,
    DAY_SECONDS,
    PUBLIC_LIMITS: Object.freeze({ minYear: PUBLIC_MIN_YEAR, maxYear: PUBLIC_MAX_YEAR }),
    RESEARCH_LIMITS: Object.freeze({ maxYear: EXPERIMENTAL_RESEARCH_MAX_YEAR, label: EXPERIMENTAL_RESEARCH_LABEL }),
    dataset,
    epochFromYear,
    publicEpochFromYear,
    coverageMetadata,
    displayDateToJdTdb,
    jdTdbToDisplayDate,
    resolveSolarSystemTimeProvider,
    integrate,
    systemStateAt,
    getBodyState,
    sampleOrbit,
    solutionMetadata,
    diagnostics
  });
})(window);
