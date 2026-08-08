(function exposeSolarSystemCore(global) {
  "use strict";

  const DAY_MS = 86400000;
  const DISPLAY_TIME_SCALE = "UTC";
  const EPHEMERIS_TIME_SCALE = "TDB";
  const REFERENCE_SYSTEM = "ICRF";
  const REFERENCE_PLANE = "Earth mean ecliptic at J2000.0 (IAU76/80)";
  const REFERENCE_FRAME = `${REFERENCE_SYSTEM}; ${REFERENCE_PLANE}; heliocentric origin`;
  const UNIX_EPOCH_JD_UTC = 2440587.5;
  const J2000_JD_TDB = 2451545.0;
  const NAIF_LSK = Object.freeze({
    id: "naif0012.tls",
    source: "NASA/JPL NAIF generic kernels",
    url: "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls",
    deltaTaSeconds: 32.184,
    kSeconds: 1.657e-3,
    eccentricityTerm: 1.671e-2,
    meanAnomaly: Object.freeze([6.239996, 1.99096871e-7]),
    firstSupportedUtc: "1972-01-01T00:00:00.000Z",
    // IERS Bulletin C 71 announced no leap second at the end of June 2026.
    // A future Bulletin C can invalidate this operational horizon.
    validatedThroughUtc: "2026-12-31T23:59:59.999Z"
  });
  const LEAP_SECONDS = Object.freeze([
    ["1972-01-01",10],["1972-07-01",11],["1973-01-01",12],["1974-01-01",13],
    ["1975-01-01",14],["1976-01-01",15],["1977-01-01",16],["1978-01-01",17],
    ["1979-01-01",18],["1980-01-01",19],["1981-07-01",20],["1982-07-01",21],
    ["1983-07-01",22],["1985-07-01",23],["1988-01-01",24],["1990-01-01",25],
    ["1991-01-01",26],["1992-07-01",27],["1993-07-01",28],["1994-07-01",29],
    ["1996-01-01",30],["1997-07-01",31],["1999-01-01",32],["2006-01-01",33],
    ["2009-01-01",34],["2012-07-01",35],["2015-07-01",36],["2017-01-01",37]
  ].map(([date,seconds])=>Object.freeze({effectiveUtc:`${date}T00:00:00.000Z`,seconds})));

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

  function taiMinusUtc(epoch) {
    const date=validDate(epoch),time=date.getTime();
    if(time<Date.parse(NAIF_LSK.firstSupportedUtc))return null;
    let value=null;
    for(const item of LEAP_SECONDS){if(time<Date.parse(item.effectiveUtc))break;value=item.seconds;}
    return value;
  }

  function utcToJdTdb(epoch) {
    const date=validDate(epoch),deltaAt=taiMinusUtc(date);
    if(deltaAt===null)throw new RangeError(`UTC to TDB conversion is unsupported before ${NAIF_LSK.firstSupportedUtc}`);
    const jdUtc=date.getTime()/DAY_MS+UNIX_EPOCH_JD_UTC;
    let ephemerisSeconds=(jdUtc-J2000_JD_TDB)*86400+NAIF_LSK.deltaTaSeconds+deltaAt;
    for(let iteration=0;iteration<2;iteration+=1){
      const mean=NAIF_LSK.meanAnomaly[0]+NAIF_LSK.meanAnomaly[1]*ephemerisSeconds;
      const eccentric=mean+NAIF_LSK.eccentricityTerm*Math.sin(mean);
      const deltaEt=NAIF_LSK.deltaTaSeconds+deltaAt+NAIF_LSK.kSeconds*Math.sin(eccentric);
      ephemerisSeconds=(jdUtc-J2000_JD_TDB)*86400+deltaEt;
    }
    return J2000_JD_TDB+ephemerisSeconds/86400;
  }

  function timeConversionQuality(epoch) {
    const date=validDate(epoch);
    if(date.getTime()<Date.parse(NAIF_LSK.firstSupportedUtc))return Object.freeze({status:"unavailable",notice:"UTC→TDB is unavailable before the first leap-second entry in naif0012.tls."});
    if(date.getTime()>Date.parse(NAIF_LSK.validatedThroughUtc))return Object.freeze({status:"future-leap-second-unverified",notice:`${NAIF_LSK.id} has no announced leap second beyond the validated operational horizon; refresh the LSK before authoritative synchronization.`});
    return Object.freeze({status:"validated",notice:`UTC→TDB uses ${NAIF_LSK.id} DELTET constants and leap-second table.`});
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
    NAIF_LSK,
    LEAP_SECONDS,
    SolarSystemTimeState,
    validDate,
    within,
    taiMinusUtc,
    utcToJdTdb,
    timeConversionQuality,
    createSolution
  });
})(window);
