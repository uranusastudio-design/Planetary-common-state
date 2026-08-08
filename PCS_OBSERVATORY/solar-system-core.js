(function exposeSolarSystemCore(global) {
  "use strict";

  const DAY_MS = 86400000;
  const DISPLAY_TIME_SCALE = "UTC";
  const EPHEMERIS_TIME_SCALE = "TDB";
  const REFERENCE_SYSTEM = "ICRF";
  const REFERENCE_PLANE = "Earth mean ecliptic at J2000.0 (IAU76/80)";
  const REFERENCE_FRAME = `${REFERENCE_SYSTEM}; ${REFERENCE_PLANE}; heliocentric origin`;

  function validDate(value) {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid Solar System display epoch");
    return date;
  }

  class SolarSystemTimeState {
    constructor(value = new Date()) {
      this._displayEpoch = validDate(value);
      this._revision = 0;
      this._reason = "initialize";
    }
    get displayEpoch() { return new Date(this._displayEpoch.getTime()); }
    get revision() { return this._revision; }
    set(value, reason = "user") {
      this._displayEpoch = validDate(value);
      this._revision += 1;
      this._reason = reason;
      return this.snapshot();
    }
    advance(milliseconds, reason = "playback") {
      const amount = Number(milliseconds);
      if (!Number.isFinite(amount)) throw new RangeError("Invalid Solar System time advance");
      return this.set(this._displayEpoch.getTime() + amount, reason);
    }
    snapshot() {
      return Object.freeze({
        displayEpoch: this._displayEpoch.toISOString(),
        displayTimeScale: DISPLAY_TIME_SCALE,
        ephemerisTimeScale: EPHEMERIS_TIME_SCALE,
        revision: this._revision,
        reason: this._reason
      });
    }
  }

  function within(epoch, range) {
    const time = validDate(epoch).getTime();
    const start = range?.start ? Date.parse(range.start) : -Infinity;
    const end = range?.end ? Date.parse(range.end) : Infinity;
    return Number.isFinite(time) && time >= start && time <= end;
  }

  function createSolution(input) {
    const epoch = validDate(input.displayEpoch);
    const coverage = input.coverage ? Object.freeze({ ...input.coverage }) : null;
    return Object.freeze({
      id: String(input.id),
      displayEpoch: epoch.toISOString(),
      displayTimeScale: DISPLAY_TIME_SCALE,
      ephemerisTimeScale: input.ephemerisTimeScale || EPHEMERIS_TIME_SCALE,
      source: input.source || "Unavailable",
      catalogEphemeris: input.catalogEphemeris || "Unavailable",
      referenceSystem: input.referenceSystem || REFERENCE_SYSTEM,
      referencePlane: input.referencePlane || REFERENCE_PLANE,
      referenceFrame: input.referenceFrame || REFERENCE_FRAME,
      positionMode: input.positionMode || "Unavailable",
      orbitMode: input.orbitMode || "Unavailable",
      lastDataUpdate: input.lastDataUpdate || "Not provided",
      qualityStatus: input.qualityStatus || "Unavailable",
      uncertainty: input.uncertainty || "Not provided",
      validity: input.validity ? Object.freeze({ ...input.validity }) : null,
      coverage,
      bodyIds: Object.freeze([...(input.bodyIds || [])]),
      coherent: Boolean(input.coherent),
      authoritative: Boolean(input.authoritative),
      stale: Boolean(input.stale),
      notice: input.notice || null
    });
  }

  global.PCSSolarSystemCore = Object.freeze({
    DAY_MS,
    DISPLAY_TIME_SCALE,
    EPHEMERIS_TIME_SCALE,
    REFERENCE_SYSTEM,
    REFERENCE_PLANE,
    REFERENCE_FRAME,
    SolarSystemTimeState,
    validDate,
    within,
    createSolution
  });
})(window);
