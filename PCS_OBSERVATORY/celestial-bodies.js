(function exposeSatelliteRegistry(global) {
  "use strict";

  const JPL_PHYSICAL_PARAMETERS_URL = "https://ssd.jpl.nasa.gov/sats/phys_par/";
  const JPL_MEAN_ELEMENTS_URL = "https://ssd.jpl.nasa.gov/sats/elem/";
  const NASA_SCIENCE_BASE_URL = "https://science.nasa.gov";

  const sharedQuality = Object.freeze({
    radiusKm: "verified",
    meanOrbitalRadiusKm: "approximate",
    orbitalPeriodDays: "approximate",
    rotationPeriodDays: "approximate",
    inclinationDeg: "approximate",
    eccentricity: "approximate",
    texture: "visual-only",
    fallbackTexture: "visual-only",
  });

  const proceduralProvider = Object.freeze({
    type: "procedural-scientific",
    version: "20260717-satellite-textures",
    sourceLabel: "PCS scientific procedural approximation",
  });

  const textureProfiles = Object.freeze({
    phobos: Object.freeze({ seed: "phobos-iau", palette: ["#272421", "#4b443d", "#80766a"], mottling: 0.86, roughness: 0.92, craterDensity: 76, craterScale: [5, 54], fractures: 3, largeBasin: true, shapeAxesKm: [13.5, 11, 9] }),
    deimos: Object.freeze({ seed: "deimos-iau", palette: ["#39342f", "#686159", "#928a80"], mottling: 0.68, roughness: 0.52, craterDensity: 31, craterScale: [4, 29], fractures: 1, shapeAxesKm: [7.5, 6, 5.5] }),
    io: Object.freeze({ seed: "io-galileo", palette: ["#f2dfa0", "#d7a82c", "#e67824", "#6f2719"], mottling: 0.82, roughness: 0.44, craterDensity: 0, volcanicCenters: 52, banding: 12 }),
    europa: Object.freeze({ seed: "europa-galileo", palette: ["#f0ead8", "#d9d2bd", "#b58a70", "#7f4939"], mottling: 0.42, roughness: 0.28, craterDensity: 4, fractures: 54, fractureWidth: [2, 7] }),
    ganymede: Object.freeze({ seed: "ganymede-galileo", palette: ["#393a3a", "#696760", "#aaa694", "#d0c9b4"], mottling: 0.84, roughness: 0.72, craterDensity: 48, craterScale: [4, 35], fractures: 25, groovedTerrain: 15 }),
    callisto: Object.freeze({ seed: "callisto-galileo", palette: ["#242321", "#423e3a", "#8e877d", "#d1c7b4"], mottling: 0.9, roughness: 0.86, craterDensity: 138, craterScale: [3, 34], radialBasin: true }),
    titan: Object.freeze({ seed: "titan-cassini", palette: ["#713617", "#a95420", "#c87932", "#e2a658"], mottling: 0.62, roughness: 0.24, craterDensity: 0, banding: 18, haze: 0.36 }),
    enceladus: Object.freeze({ seed: "enceladus-cassini", palette: ["#c9d9de", "#e9f2f1", "#ffffff", "#78aabc"], mottling: 0.34, roughness: 0.24, craterDensity: 18, craterScale: [3, 18], fractures: 28, tigerStripes: 6 }),
    titania: Object.freeze({ seed: "titania-voyager", palette: ["#44494b", "#74797b", "#aeb2b3", "#d1d0ca"], mottling: 0.7, roughness: 0.64, craterDensity: 43, craterScale: [4, 30], fractures: 21, canyonWidth: [4, 13] }),
    triton: Object.freeze({ seed: "triton-voyager", palette: ["#9b7775", "#c5aaa5", "#d9c7ba", "#eee3d5"], mottling: 0.66, roughness: 0.38, craterDensity: 14, craterScale: [3, 21], banding: 8, polarContrast: true, darkJets: 19 }),
  });

  const bodies = [
    {
      id: "moon", name: "Moon", parentBodyId: "earth", type: "natural-satellite",
      radiusKm: 1737.4, meanOrbitalRadiusKm: 384400, orbitalPeriodDays: 27.322,
      rotationPeriodDays: 27.322, inclinationDeg: 5.16, eccentricity: 0.0554,
      texture: "NASA/USGS LROC WAC global mosaic (existing implementation)",
      textureProvider: "existing-moon-renderer", material: "existing-moon-imagery-layer",
      fallbackTexture: "neutral gray Cesium globe base color",
      description: "Earth's synchronously rotating natural satellite, shown with the existing LROC-based renderer.",
      surfaceAtmosphereSummary: "Rocky, impact-cratered surface with an extremely tenuous exosphere.",
      scientificHighlights: ["Records early Solar System impacts", "Drives Earth's principal ocean tides", "Only natural satellite visited by humans"],
      majorMissions: ["Apollo", "Lunar Reconnaissance Orbiter", "Artemis"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science; USGS Astrogeology",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/moon/facts/`,
      orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "verified scientific global mosaic; orbital display not implemented",
      dataQuality: sharedQuality,
    },
    {
      id: "phobos", name: "Phobos", parentBodyId: "mars", type: "natural-satellite",
      radiusKm: 11.08, meanOrbitalRadiusKm: 9375, orbitalPeriodDays: 0.3187,
      rotationPeriodDays: 0.3187, inclinationDeg: 1.1, eccentricity: 0.015,
      texture: "procedural dark regolith visualization", fallbackTexture: "#5f574e",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.phobos,
      localVisualizationTextureUrl: "./assets/moons/phobos-scientific.svg",
      description: "The larger, innermost Martian moon; its irregular shape and Stickney crater dominate its appearance.",
      surfaceAtmosphereSummary: "Dark, dusty, heavily cratered regolith; no substantial atmosphere.",
      scientificHighlights: ["Orbits Mars about three times per day", "Slowly spiraling inward", "Stickney is its dominant impact crater"],
      majorMissions: ["Mariner 9", "Viking", "Mars Express", "MMX (planned)"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/mars/moons/facts/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural visualization texture; irregular shape approximate; not live observation",
      dataQuality: sharedQuality,
    },
    {
      id: "deimos", name: "Deimos", parentBodyId: "mars", type: "natural-satellite",
      radiusKm: 6.2, meanOrbitalRadiusKm: 23457, orbitalPeriodDays: 1.2625,
      rotationPeriodDays: 1.2625, inclinationDeg: 1.8, eccentricity: 0.000,
      texture: "procedural smooth dark regolith visualization", fallbackTexture: "#777067",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.deimos,
      localVisualizationTextureUrl: "./assets/moons/deimos-scientific.svg",
      description: "Mars' smaller and more distant moon, with a smoother-looking blanket of regolith.",
      surfaceAtmosphereSummary: "Small, irregular, cratered body softened visually by loose regolith; no substantial atmosphere.",
      scientificHighlights: ["Smaller of Mars' two moons", "Less irregular in appearance than Phobos", "Tidally locked to Mars"],
      majorMissions: ["Viking", "Mars Reconnaissance Orbiter", "Mars Express"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/mars/moons/deimos/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural visualization texture; irregular shape approximate; not live observation",
      dataQuality: sharedQuality,
    },
    {
      id: "io", name: "Io", parentBodyId: "jupiter", type: "natural-satellite",
      radiusKm: 1821.49, meanOrbitalRadiusKm: 421800, orbitalPeriodDays: 1.762732,
      rotationPeriodDays: 1.762732, inclinationDeg: 0.0, eccentricity: 0.004,
      texture: "procedural sulfur-color visualization", fallbackTexture: "#d9a62e",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.io,
      localVisualizationTextureUrl: "./assets/moons/io-scientific.svg",
      description: "Jupiter's volcanic moon, reshaped by intense tidal heating.",
      surfaceAtmosphereSummary: "Sulfur-rich yellow-orange volcanic terrain with a very thin sulfur-dioxide atmosphere.",
      scientificHighlights: ["Most volcanically active world known", "Tidal heating drives continual resurfacing", "Linked to Jupiter's magnetosphere"],
      majorMissions: ["Voyager", "Galileo", "Juno"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/jupiter/jupiter-moons/io/facts/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural visualization texture; colors scientifically inspired; not live observation",
      dataQuality: sharedQuality,
    },
    {
      id: "europa", name: "Europa", parentBodyId: "jupiter", type: "natural-satellite",
      radiusKm: 1560.80, meanOrbitalRadiusKm: 671100, orbitalPeriodDays: 3.525463,
      rotationPeriodDays: 3.525463, inclinationDeg: 0.5, eccentricity: 0.009,
      texture: "procedural ice-and-lineae visualization", fallbackTexture: "#d9d2bd",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.europa,
      localVisualizationTextureUrl: "./assets/moons/europa-scientific.svg",
      description: "An icy Galilean moon with strong evidence for a global ocean beneath its crust.",
      surfaceAtmosphereSummary: "Bright water-ice surface crossed by reddish-brown lineae; tenuous oxygen atmosphere.",
      scientificHighlights: ["Strong evidence for a subsurface ocean", "Young, fractured ice shell", "Priority target for habitability studies"],
      majorMissions: ["Voyager", "Galileo", "Juno", "Europa Clipper"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/jupiter/jupiter-moons/europa/europa-facts/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural visualization texture; lineae are representative, not mapped features",
      dataQuality: sharedQuality,
    },
    {
      id: "ganymede", name: "Ganymede", parentBodyId: "jupiter", type: "natural-satellite",
      radiusKm: 2631.20, meanOrbitalRadiusKm: 1070400, orbitalPeriodDays: 7.155588,
      rotationPeriodDays: 7.155588, inclinationDeg: 0.2, eccentricity: 0.001,
      texture: "procedural mixed ice-rock visualization", fallbackTexture: "#817b70",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.ganymede,
      localVisualizationTextureUrl: "./assets/moons/ganymede-scientific.svg",
      description: "The Solar System's largest moon and the only moon known to generate an intrinsic magnetic field.",
      surfaceAtmosphereSummary: "Alternating dark ancient terrain and brighter grooved ice-rich regions; tenuous oxygen atmosphere.",
      scientificHighlights: ["Largest moon in the Solar System", "Has an intrinsic magnetic field", "Evidence supports a deep subsurface ocean"],
      majorMissions: ["Voyager", "Galileo", "Juno", "JUICE"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/jupiter/jupiter-moons/ganymede/facts/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural visualization texture; terrain distribution approximate",
      dataQuality: sharedQuality,
    },
    {
      id: "callisto", name: "Callisto", parentBodyId: "jupiter", type: "natural-satellite",
      radiusKm: 2410.30, meanOrbitalRadiusKm: 1882700, orbitalPeriodDays: 16.690440,
      rotationPeriodDays: 16.690440, inclinationDeg: 0.3, eccentricity: 0.007,
      texture: "procedural cratered dark-ice visualization", fallbackTexture: "#514d48",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.callisto,
      localVisualizationTextureUrl: "./assets/moons/callisto-scientific.svg",
      description: "An ancient, dark Galilean moon whose surface preserves a dense impact record.",
      surfaceAtmosphereSummary: "Dark ice-rock surface densely marked by bright impact scars; extremely tenuous atmosphere.",
      scientificHighlights: ["One of the most heavily cratered worlds", "Ancient surface shows little internal recycling", "Possible salty subsurface ocean"],
      majorMissions: ["Voyager", "Galileo", "JUICE"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/jupiter/jupiter-moons/callisto/facts/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural visualization texture; craters are representative, not mapped features",
      dataQuality: sharedQuality,
    },
    {
      id: "titan", name: "Titan", parentBodyId: "saturn", type: "natural-satellite",
      radiusKm: 2574.76, meanOrbitalRadiusKm: 1221900, orbitalPeriodDays: 15.945448,
      rotationPeriodDays: 15.945448, inclinationDeg: 0.3, eccentricity: 0.029,
      texture: "procedural haze visualization", fallbackTexture: "#c87d32",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.titan,
      localVisualizationTextureUrl: "./assets/moons/titan-scientific.svg",
      description: "Saturn's largest moon, wrapped in a dense nitrogen atmosphere and an active methane cycle.",
      surfaceAtmosphereSummary: "Surface of water ice and hydrocarbons beneath opaque orange nitrogen-methane haze.",
      scientificHighlights: ["Only moon with a dense atmosphere", "Methane clouds, rain, rivers, lakes and seas", "Complex organic chemistry"],
      majorMissions: ["Voyager", "Cassini-Huygens", "Dragonfly (planned)"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/saturn/moons/titan/facts/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural opaque-atmosphere visualization; surface not directly represented",
      dataQuality: sharedQuality,
    },
    {
      id: "enceladus", name: "Enceladus", parentBodyId: "saturn", type: "natural-satellite",
      radiusKm: 252.10, meanOrbitalRadiusKm: 238400, orbitalPeriodDays: 1.370218,
      rotationPeriodDays: 1.370218, inclinationDeg: 0.0, eccentricity: 0.005,
      texture: "procedural high-albedo ice visualization", fallbackTexture: "#e8f3f5",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.enceladus,
      localVisualizationTextureUrl: "./assets/moons/enceladus-scientific.svg",
      description: "A bright ocean moon whose south-polar fractures vent water-rich plumes into space.",
      surfaceAtmosphereSummary: "Exceptionally reflective water-ice surface with south-polar tiger-stripe fractures and plume material.",
      scientificHighlights: ["Water-rich plumes expose ocean material", "Global subsurface ocean", "Evidence for hydrothermal activity"],
      majorMissions: ["Voyager", "Cassini"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/saturn/moons/enceladus/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural visualization texture; tiger stripes are representative, not mapped features",
      dataQuality: sharedQuality,
    },
    {
      id: "titania", name: "Titania", parentBodyId: "uranus", type: "natural-satellite",
      radiusKm: 788.9, meanOrbitalRadiusKm: 436298, orbitalPeriodDays: 8.705869,
      rotationPeriodDays: 8.705869, inclinationDeg: 0.1, eccentricity: 0.002,
      texture: "procedural gray ice-rock visualization", fallbackTexture: "#8c8f91",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.titania,
      localVisualizationTextureUrl: "./assets/moons/titania-scientific.svg",
      description: "Uranus' largest moon, with fault valleys indicating past tectonic extension.",
      surfaceAtmosphereSummary: "Neutral gray ice-rock surface cut by large canyons and fault valleys; no substantial atmosphere.",
      scientificHighlights: ["Largest moon of Uranus", "Long fault valleys cross the crust", "Voyager 2 saw signs of past geologic activity"],
      majorMissions: ["Voyager 2"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/uranus/moons/titania/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural visualization texture; canyon positions are representative",
      dataQuality: sharedQuality,
    },
    {
      id: "triton", name: "Triton", parentBodyId: "neptune", type: "natural-satellite",
      radiusKm: 1352.60, meanOrbitalRadiusKm: 354800, orbitalPeriodDays: 5.876994,
      rotationPeriodDays: 5.876994, inclinationDeg: 157.3, eccentricity: 0.000,
      texture: "procedural nitrogen-ice visualization", fallbackTexture: "#c9b6b3",
      textureProvider: proceduralProvider, material: "Cesium MaterialAppearance image material", visualizationProfile: textureProfiles.triton,
      localVisualizationTextureUrl: "./assets/moons/triton-scientific.svg",
      description: "Neptune's captured, retrograde moon, with a young nitrogen-ice surface and active geysers.",
      surfaceAtmosphereSummary: "Pale nitrogen-ice crust with pink-gray terrain and a thin nitrogen-methane atmosphere.",
      scientificHighlights: ["Retrograde orbit suggests capture", "Voyager 2 observed active nitrogen geysers", "One of the coldest known Solar System surfaces"],
      majorMissions: ["Voyager 2"],
      dataSource: "NASA/JPL Solar System Dynamics; NASA Science",
      dataSourceUrl: `${NASA_SCIENCE_BASE_URL}/neptune/moons/triton/`, orbitalDataSourceUrl: JPL_MEAN_ELEMENTS_URL,
      physicalDataSourceUrl: JPL_PHYSICAL_PARAMETERS_URL,
      visualizationStatus: "procedural visualization texture; color regions are representative, not a global mapped product",
      dataQuality: sharedQuality,
    },
  ];

  const missionImageryRegistry = global.PCSMissionImageryRegistry || {};
  if (Object.keys(missionImageryRegistry).length !== 11) {
    throw new Error("PCS mission imagery registry must load before the satellite registry");
  }
  const renderProfiles = Object.freeze({
    phobos: Object.freeze({ shapeAxesKm: Object.freeze([13.5, 11, 9]) }),
    deimos: Object.freeze({ shapeAxesKm: Object.freeze([7.5, 6, 5.5]) }),
    titan: Object.freeze({ atmosphereHaloColor: "#d98a45" }),
  });

  bodies.forEach((body) => {
    const imagery = missionImageryRegistry[body.id];
    if (!imagery) throw new Error(`Missing mission imagery registry entry: ${body.id}`);
    body.missionImagery = imagery;
    if (body.id === "moon") return;
    body.texture = imagery.textureType;
    body.textureProvider = Object.freeze({
      type: "mission-imagery",
      sourceLabel: imagery.credit,
    });
    body.localTextureUrl = imagery.localPath;
    body.localTextureSource = imagery.credit;
    body.fallbackTexture = "#77797a";
    body.fallbackTextureLabel = "neutral non-scientific fallback";
    body.material = "Cesium image material using local mission-derived texture";
    body.renderProfile = renderProfiles[body.id] || Object.freeze({});
    body.visualizationStatus = `${imagery.textureType}; ${imagery.coverage}; not an inter-body distance model`;
    delete body.localVisualizationTextureUrl;
    delete body.visualizationProfile;
  });

  const registry = Object.freeze(Object.fromEntries(bodies.map((body) => [body.id, Object.freeze(body)])));
  const hierarchy = Object.freeze({
    earth: Object.freeze(["moon"]), mars: Object.freeze(["phobos", "deimos"]),
    jupiter: Object.freeze(["io", "europa", "ganymede", "callisto"]),
    saturn: Object.freeze(["titan", "enceladus"]), uranus: Object.freeze(["titania"]),
    neptune: Object.freeze(["triton"]),
  });

  global.PCSSatelliteRegistry = Object.freeze({ bodies: registry, hierarchy });
})(window);
