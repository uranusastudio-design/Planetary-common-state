(function exposeDeepSpaceRegistry(global) {
  "use strict";

  const JPL_ELEMENTS = "https://ssd.jpl.nasa.gov/planets/approx_pos.html";
  const JPL_HORIZONS = "https://ssd.jpl.nasa.gov/horizons/";
  const NASA_SSE = "https://science.nasa.gov/solar-system/";
  const frame = "Heliocentric ecliptic frame; J2000 reference";
  const approximation = "Orbital-element approximation — not mission-navigation precision";
  const J2000_EPOCH = "2000-01-01T12:00:00.000Z";
  const PLANET_VALID_RANGE = Object.freeze({ start:"1800-01-01T00:00:00.000Z", end:"2050-12-31T23:59:59.999Z" });

  // JPL approximate Keplerian elements and rates for 1800–2050. Angles are degrees,
  // semimajor axis is AU, and rates are per Julian century from J2000.
  const planets = [
    ["mercury", "Mercury", 199, 2439.7, 87.969, 58.646, "#aaa49b", [0.38709927,0.20563593,7.00497902,252.2503235,77.45779628,48.33076593], [0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081]],
    ["venus", "Venus", 299, 6051.8, 224.701, -243.025, "#d2a66b", [0.72333566,0.00677672,3.39467605,181.9790995,131.60246718,76.67984255], [0.0000039,-0.00004107,-0.0007889,58517.81538729,0.00268329,-0.27769418]],
    ["earth", "Earth", 399, 6371.0084, 365.256, 0.99726968, "#428dd4", [1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0], [0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0]],
    ["mars", "Mars", 499, 3389.5, 686.98, 1.025957, "#b75b42", [1.52371034,0.0933941,1.84969142,-4.55343205,-23.94362959,49.55953891], [0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343]],
    ["jupiter", "Jupiter", 599, 69911, 4332.589, 0.41354, "#c6a278", [5.202887,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909], [-0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106]],
    ["saturn", "Saturn", 699, 58232, 10759.22, 0.44401, "#d5c17d", [9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448], [-0.0012506,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794]],
    ["uranus", "Uranus", 799, 25362, 30688.5, -0.71833, "#87ced8", [19.18916464,0.04725744,0.77263783,313.23810451,170.9542763,74.01692503], [-0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589]],
    ["neptune", "Neptune", 899, 24622, 60182, 0.67125, "#537bc4", [30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574], [0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664]],
  ];

  const registry = {
    sun: Object.freeze({ id:"sun", name:"Sun", type:"star", parentBodyId:null, naifId:10, radiusKm:695700, orbitalPeriodDays:null, rotationPeriodDays:25.38, coordinateFrame:frame, ephemerisSource:JPL_HORIZONS, orbitalDataSource:JPL_ELEMENTS, textureSource:null, dataStatus:"catalog data", uncertainty:"Solar-system barycentric effects are not represented in the heliocentric exhibition origin.", visualizationScale:"mode-dependent", visualizationStatus:"representative visualization", color:"#f7b94b" }),
  };

  planets.forEach(([id,name,naifId,radiusKm,orbitalPeriodDays,rotationPeriodDays,color,elements,rates]) => {
    const eccentricity=elements[1],semimajorAxisAu=elements[0];
    registry[id] = Object.freeze({ id,name,type:"planet",parentBodyId:"sun",naifId,radiusKm,orbitalPeriodDays,rotationPeriodDays,coordinateFrame:frame,ephemerisSource:JPL_HORIZONS,orbitalDataSource:JPL_ELEMENTS,textureSource:null,dataStatus:"approximate",uncertainty:approximation,visualizationScale:"mode-dependent",visualizationStatus:"representative visualization",color,orbitalElements:Object.freeze({ elements:Object.freeze(elements), rates:Object.freeze(rates), validRange:"1800-2050" }),orbit:Object.freeze({objectId:id,parentBodyId:"sun",dataSource:JPL_ELEMENTS,preferredDataSource:JPL_HORIZONS,epoch:J2000_EPOCH,coordinateFrame:frame,validTimeRange:PLANET_VALID_RANGE,sampleIntervalDays:orbitalPeriodDays/180,precisionStatus:"Orbital-element approximation",renderStatus:"available",fallbackStatus:"active when a matching JPL Horizons cache sample is unavailable",periapsisKm:semimajorAxisAu*(1-eccentricity)*149597870.7,apoapsisKm:semimajorAxisAu*(1+eccentricity)*149597870.7,inclinationDeg:elements[2]}) });
  });

  const satellites = [
    ["moon","Moon","earth",301,1737.4,384400,27.321661,27.321661,5.145,.0554,"#c8c8c4"],
    ["phobos","Phobos","mars",401,11.267,9376,0.31891,0.31891,1.075,.015,"#92877d"],
    ["deimos","Deimos","mars",402,6.2,23463,1.26244,1.26244,1.788,0,"#aaa097"],
    ["io","Io","jupiter",501,1821.6,421700,1.769138,1.769138,0.05,.004,"#d8b24a"],
    ["europa","Europa","jupiter",502,1560.8,671034,3.551181,3.551181,0.47,.009,"#b9aa91"],
    ["ganymede","Ganymede","jupiter",503,2634.1,1070412,7.154553,7.154553,0.2,.001,"#817b70"],
    ["callisto","Callisto","jupiter",504,2410.3,1882709,16.689018,16.689018,0.28,.007,"#514d48"],
    ["titan","Titan","saturn",606,2574.73,1221870,15.945421,15.945421,0.35,.029,"#c87d32"],
    ["enceladus","Enceladus","saturn",602,252.1,238020,1.370218,1.370218,0.02,.005,"#e8f3f5"],
    ["titania","Titania","uranus",703,788.9,435910,8.705872,8.705872,0.34,.002,"#8c8f91"],
    ["triton","Triton","neptune",801,1353.4,354759,5.876854,-5.876854,156.865,0,"#c9b6b3"],
  ];
  satellites.forEach(([id,name,parentBodyId,naifId,radiusKm,meanOrbitalRadiusKm,orbitalPeriodDays,rotationPeriodDays,inclinationDeg,eccentricity,color]) => {
    const orbitalDataSource="Existing PCS celestial registry; NASA/JPL Solar System Dynamics";
    const satelliteFrame=`${parentBodyId}-centered mean orbital plane; J2000 reference`;
    registry[id] = Object.freeze({ id,name,type:"natural-satellite",parentBodyId,naifId,radiusKm,meanOrbitalRadiusKm,orbitalPeriodDays,rotationPeriodDays,inclinationDeg,eccentricity,coordinateFrame:satelliteFrame,ephemerisSource:JPL_HORIZONS,orbitalDataSource,textureSource:`Existing PCS mission imagery registry (${id})`,dataStatus:"catalog data",uncertainty:"Mean-orbit representative visualization; not a navigation ephemeris.",visualizationScale:"parent-system compressed",visualizationStatus:"mission imagery / representative orbit",color,orbit:Object.freeze({objectId:id,parentBodyId,dataSource:orbitalDataSource,preferredDataSource:JPL_HORIZONS,epoch:J2000_EPOCH,coordinateFrame:satelliteFrame,validTimeRange:Object.freeze({start:null,end:null,notice:"Periodic mean elements; no mission-navigation validity interval is asserted."}),sampleIntervalDays:Math.abs(orbitalPeriodDays)/120,precisionStatus:"Orbital-element approximation",renderStatus:"available when the parent planetary system is focused",fallbackStatus:"mean-element approximation",periapsisKm:meanOrbitalRadiusKm*(1-eccentricity),apoapsisKm:meanOrbitalRadiusKm*(1+eccentricity),inclinationDeg}) });
  });

  global.PCSDeepSpaceRegistry = Object.freeze({
    BODY_REGISTRY:Object.freeze(registry),
    PLANET_IDS:Object.freeze(planets.map((item) => item[0])),
    SATELLITE_IDS:Object.freeze(satellites.map((item) => item[0])),
    SOURCES:Object.freeze({ JPL_ELEMENTS, JPL_HORIZONS, NASA_SSE }),
    FRAME:frame,
    PLANET_VALID_RANGE,
  });
})(window);
