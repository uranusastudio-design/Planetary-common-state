(function exposeDeepSpaceEphemerisCache(global) {
  "use strict";
  // NASA/JPL Horizons DE441 geometric vectors, Sun-centered, J2000 ecliptic,
  // AU and AU/day. Generated 2026-08-01 through the official Horizons API.
  const epoch = "2026-08-01T00:00:00.000Z";
  const sample = (positionAu, velocityAuPerDay) => Object.freeze([{ epoch, sourceEpochTdb:"2026-Aug-01 00:00:00.0000 TDB", coordinateFrame:"Heliocentric ecliptic frame; J2000 reference", positionAu:Object.freeze(positionAu), velocityAuPerDay:Object.freeze(velocityAuPerDay), heliocentricDistanceAu:Math.hypot(...positionAu) }]);
  global.PCSDeepSpaceEphemerisCache = Object.freeze({
    manifest:Object.freeze({
      datasetId:"pcs-horizons-de441-legacy-2026-08-01",
      source:"NASA/JPL Horizons",
      ephemeris:"DE441",
      sourceUrl:"https://ssd.jpl.nasa.gov/api/horizons.api",
      queryMode:"VECTORS",
      center:"500@10",
      referenceSystem:"ICRF",
      referencePlane:"Earth mean ecliptic at J2000.0 (IAU76/80)",
      referenceFrame:"ICRF; Earth mean ecliptic at J2000.0 (IAU76/80); heliocentric origin",
      outputUnits:"AU-D",
      vectorCorrection:"NONE",
      ephemerisTimeScale:"TDB",
      coverage:Object.freeze({start:epoch,end:epoch}),
      sampleCountPerBody:1,
      lastDataUpdate:"2026-08-01",
      promotionStatus:"not-promoted",
      qualityStatus:"Legacy single-epoch snapshot; insufficient for coherent interpolation or orbit rendering",
      uncertainty:"No formal covariance supplied for major-planet vectors"
    }),
    mercury:sample([.3526006261607103,.005708002497932161,-.03187284942001208],[-.005889484909563799,.02938781974201591,.002941850281808375]),
    venus:sample([-.1645937419271417,-.7072482140890558,-.0002198836356424883],[.01956312701417751,-.004667145366660487,-.001192896797914102]),
    earth:sample([.6307189330803126,-.7952013625186592,.00004366682930385191],[.01319753175635243,.01062044060527175,-.000001353470088421704]),
    mars:sample([.8844818761152162,1.186221826468503,.003171014634460265],[-.01068612887106594,.009557354618010782,.0004623193228392399]),
    jupiter:sample([-3.125607230507371,4.263503869039211,.05222055594318276],[-.006179536000025472,-.00411264276011214,.0001553322065300755]),
    saturn:sample([9.335741908631771,1.432187261979191,-.3965601633382455],[-.001155170737015442,.005500511182026794,-.00004984994423230708]),
    uranus:sample([9.145302932027755,17.16834168300373,-.05481873948255346],[-.00350652975027698,.001663888424231569,.00005160049760898675]),
    neptune:sample([29.84740429162109,1.187845611455259,-.7122823470142],[-.0001515496963198258,.003152791939553519,-.00006160518121027027]),
  });
})(window);
