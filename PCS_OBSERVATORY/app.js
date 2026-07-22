const GLOBAL_STATE_SOURCE = "../PCS_ENGINE/output/latest_state.json";
const REGIONAL_STATE_SOURCE_PREFIX = "../PCS_ENGINE/output/regions";
const REFRESH_INTERVAL_MS = 10000;
const MOON_LIGHTING_REFRESH_INTERVAL_MS = 20 * 60 * 1000;
const VISITOR_STATS_REFRESH_INTERVAL_MS = 30 * 1000;
const VISITOR_LOCATIONS_REFRESH_INTERVAL_MS = 60 * 1000;
const VISITOR_ANALYTICS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const REGION_STORAGE_KEY = "pcs_observatory_region";
const VISITOR_SESSION_STORAGE_KEY = "pcs_visitor_session_id";
const OBSERVATION_HEAT_STORAGE_KEY = "pcs_observation_heat_enabled";
const NETWORK_CONNECTIONS_STORAGE_KEY = "pcs_network_connections_enabled";
const IS_LOCAL_DEVELOPMENT = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const USE_LOCAL_BACKEND = IS_LOCAL_DEVELOPMENT && new URLSearchParams(window.location.search).get("backend") !== "production";
const WEATHER_PROXY_BASE = USE_LOCAL_BACKEND
  ? "http://127.0.0.1:8787"
  : "https://pcs-backend.uranusastudio.workers.dev";
const ASTRONOMY_PROXY_BASE = WEATHER_PROXY_BASE;
const VISITOR_API_BASE = WEATHER_PROXY_BASE;
const LUNAR_IMAGERY_CONFIG = Object.freeze({
  url: `${ASTRONOMY_PROXY_BASE}/api/astronomy/lunar-image`,
  source: "NASA/ASU LROC via USGS Astrogeology",
  product: "LROC WAC Global Mosaic (LOLA-controlled), WMS layer LROC_WAC",
  mosaicDate: "Not published by the WMS service",
  attribution: "ASU/NASA via USGS Astrogeology",
  serviceUrl: "https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map",
});
const PLANET_IMAGERY_CONFIG = Object.freeze({
  mercury: { id: "mercury", displayName: "Mercury", radius: 2439700, sourceAgency: "NASA / USGS Astrogeology", mission: "MESSENGER", instrument: "MDIS", productName: "Mercury MESSENGER MDIS Global Mosaic 250m", productType: "mission-derived global surface mosaic", textureType: "image/jpeg", projection: "equirectangular", renderMode: "globe-texture", attribution: "NASA MESSENGER / USGS Astrogeology Science Center", fallbackColor: "#8d8780", pcsAvailability: false, supportsRings: false, statusLabel: "Mission-derived global mosaic", fallbackMessage: "imagery unavailable — fallback preview active", minimumZoomDistance: 1200000, maximumZoomDistance: 50000000, lighting: false, atmosphereVisibility: false, axialOrientation: 0 },
  venus: { id: "venus", displayName: "Venus", radius: 6051800, sourceAgency: "NASA / USGS Astrogeology", mission: "Magellan", instrument: "SAR / GEDR", productName: "Venus Magellan Global C3-MDIR Colorized Topographic Mosaic 6600m", productType: "radar and topography-derived global mosaic", textureType: "image/jpeg", projection: "equirectangular", renderMode: "globe-texture", textureVersion: "venus-mosaic-2", seamBlendColumns: 2, attribution: "NASA Magellan / PDS Geosciences Node / USGS Astrogeology", fallbackColor: "#c89345", pcsAvailability: false, supportsRings: false, statusLabel: "Radar/topography-derived global mosaic", fallbackMessage: "imagery unavailable — fallback preview active", minimumZoomDistance: 1200000, maximumZoomDistance: 50000000, lighting: false, atmosphereVisibility: false, axialOrientation: 177.4 },
  mars: { id: "mars", displayName: "Mars", radius: 3389500, sourceAgency: "NASA / USGS Astrogeology", mission: "Viking Orbiter", instrument: "VIS", productName: "Mars Viking Global Color Mosaic 925m", productType: "mission-derived global surface mosaic", textureType: "image/jpeg", projection: "simple_cylindrical", renderMode: "globe-texture", attribution: "NASA Viking Orbiter / USGS Astrogeology Science Center", fallbackColor: "#a84f32", pcsAvailability: false, supportsRings: false, statusLabel: "Mission-derived global mosaic", fallbackMessage: "imagery unavailable — fallback preview active", minimumZoomDistance: 900000, maximumZoomDistance: 50000000, lighting: true, atmosphereVisibility: false, axialOrientation: 25.2 },
  jupiter: { id: "jupiter", displayName: "Jupiter", radius: 69911000, sourceAgency: "NASA / JPL Photojournal", mission: "Cassini-Huygens", instrument: "Imaging Science Subsystem", productName: "PIA02873 High Resolution Globe of Jupiter", productType: "atmospheric observation", textureType: "image/jpeg", projection: "observation_disc", renderMode: "observation-disc", attribution: "NASA/JPL/University of Arizona", fallbackColor: "#b58b67", pcsAvailability: false, supportsRings: false, statusLabel: "Observation disc", fallbackMessage: "imagery unavailable — fallback preview active", minimumZoomDistance: 3000000, maximumZoomDistance: 50000000, lighting: false, atmosphereVisibility: false, axialOrientation: 3.1, discRadiusRatio: 0.465 },
  saturn: { id: "saturn", displayName: "Saturn", radius: 58232000, sourceAgency: "NASA / JPL Photojournal", mission: "Cassini-Huygens", instrument: "ISS Narrow Angle Camera", productName: "PIA05389 Saturn and its Rings", productType: "atmospheric observation", textureType: "image/jpeg", projection: "observation_disc", renderMode: "scientific-preview", attribution: "NASA/JPL/Space Science Institute", fallbackColor: "#cbb77b", pcsAvailability: false, supportsRings: true, statusLabel: "Scientific observation preview", fallbackMessage: "imagery unavailable — fallback preview active", minimumZoomDistance: 3500000, maximumZoomDistance: 50000000, lighting: true, atmosphereVisibility: false, axialOrientation: 26.7, ringInnerRadius: 1.25, ringOuterRadius: 2.25, ringOpacity: 0.34 },
  uranus: { id: "uranus", displayName: "Uranus", radius: 25362000, sourceAgency: "NASA / JPL Photojournal", mission: "Voyager 2", instrument: "VG ISS Wide Angle Camera", productName: "PIA00143 Uranus - Final Image", productType: "archival atmospheric observation", textureType: "image/jpeg", projection: "observation_disc", renderMode: "scientific-preview", attribution: "NASA/JPL", fallbackColor: "#78b8c4", pcsAvailability: false, supportsRings: false, statusLabel: "Scientific observation preview", fallbackMessage: "imagery unavailable — fallback preview active", minimumZoomDistance: 3000000, maximumZoomDistance: 50000000, lighting: true, atmosphereVisibility: false, axialOrientation: 97.8 },
  neptune: { id: "neptune", displayName: "Neptune", radius: 24622000, sourceAgency: "NASA / JPL Photojournal", mission: "Voyager 2", instrument: "VG ISS Narrow Angle Camera", productName: "PIA00046 Neptune Full Disk", productType: "archival atmospheric observation", textureType: "image/jpeg", projection: "observation_disc", renderMode: "scientific-preview", attribution: "NASA/JPL", fallbackColor: "#4169b1", pcsAvailability: false, supportsRings: false, statusLabel: "Scientific observation preview", fallbackMessage: "imagery unavailable — fallback preview active", minimumZoomDistance: 3000000, maximumZoomDistance: 50000000, lighting: true, atmosphereVisibility: false, axialOrientation: 28.3 },
});
const SOLAR_IMAGE_MODE_LABELS = Object.freeze({
  "hmi-continuum": "HMI Continuum",
  "hmi-magnetogram": "HMI Magnetogram",
  "aia-171": "AIA 171 Å",
  "aia-193": "AIA 193 Å",
  "aia-304": "AIA 304 Å",
  coronagraph: "Coronagraph",
});
const SPACE_WEATHER_UI_THRESHOLDS = { kp: { medium: 4, high: 5 }, solarWindSpeed: { medium: 500, high: 700 }, xrayFlux: { medium: 1e-6, high: 1e-5 } };
const EARTH_SOURCE_REGISTRY = Object.freeze({
  openweather: { name: "OpenWeather", modes: ["live", "key-required"] },
  nasaGibs: { name: "NASA GIBS", modes: ["imagery", "archive"] },
  usgs: { name: "USGS", modes: ["live", "event"] },
  nasaFirms: { name: "NASA FIRMS", modes: ["event", "key-required"] },
  era5: { name: "ERA5", modes: ["archive", "account-required"] },
  copernicus: { name: "Copernicus", modes: ["imagery", "archive", "account-required"] },
});
const PLANET_EPHEMERIS_TARGETS = new Set(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"]);
const SATELLITE_REGISTRY = window.PCSSatelliteRegistry?.bodies || Object.freeze({});
const SATELLITE_TARGETS = new Set(Object.keys(SATELLITE_REGISTRY).filter((id) => id !== "moon"));
const WEATHER_TILE_MAX_ZOOM = 8;
const EARTH_IMAGERY_CONFIG = {
  highResolution: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    credit: "Earth imagery: Esri, Maxar, Earthstar Geographics, and contributors",
    maximumLevel: 19,
  },
  fallback: { assetPath: "Assets/Textures/NaturalEarthII" },
};
const WEATHER_LAYER_CONFIG = {
  clouds: { id: "clouds", capabilityId: "clouds", kind: "weather", label: "Clouds", path: "clouds", opacity: 0.5, order: 10, legend: ["Clear", "Cloud cover", "Dense cloud"] },
  rain: { id: "rain", capabilityId: "rain", kind: "weather", label: "Rain", path: "rain", opacity: 0.6, order: 20, legend: ["Light", "Moderate", "Heavy"] },
  temp: { id: "temp", capabilityId: "temperature", kind: "weather", label: "Temperature", path: "temperature", opacity: 0.6, order: 30, legend: ["Cold", "Temperate", "Hot"] },
  wind: { id: "wind", capabilityId: "wind", kind: "weather", label: "Wind", path: "wind", opacity: 0.6, order: 40, legend: ["Low", "Moderate", "High"] },
};

const regionConfig = {
  global: {
    id: "global",
    displayName: "Global",
    lat: 20,
    lon: 120,
    altitude: 30000000,
  },
  japan: {
    id: "japan",
    displayName: "Japan",
    lat: 36.2048,
    lon: 138.2529,
    altitude: 6000000,
  },
  taiwan: {
    id: "taiwan",
    displayName: "Taiwan",
    lat: 23.6978,
    lon: 120.9605,
    altitude: 2500000,
  },
  korea: {
    id: "korea",
    displayName: "Korea",
    lat: 36.5,
    lon: 127.8,
    altitude: 3500000,
  },
  canada: {
    id: "canada",
    displayName: "Canada",
    lat: 56.1304,
    lon: -106.3468,
    altitude: 9000000,
  },
  uk: {
    id: "uk",
    displayName: "United Kingdom",
    lat: 55.3781,
    lon: -3.436,
    altitude: 3500000,
  },
  usa: {
    id: "usa",
    displayName: "United States",
    lat: 37.0902,
    lon: -95.7129,
    altitude: 8000000,
  },
  china: {
    id: "china",
    displayName: "China",
    lat: 35.8617,
    lon: 104.1954,
    altitude: 8000000,
  },
  singapore: {
    id: "singapore",
    displayName: "Singapore",
    lat: 1.3521,
    lon: 103.8198,
    altitude: 1500000,
  },
  dubai: {
    id: "dubai",
    displayName: "Dubai",
    lat: 25.2048,
    lon: 55.2708,
    altitude: 1800000,
  },
};

Object.assign(regionConfig, {
  global: { ...regionConfig.global, group: "COUNTRY", timeZone: "UTC", suggestions: ["global-temperature", "precipitation", "tropical-cyclones", "sea-ice"] },
  taiwan: { ...regionConfig.taiwan, group: "COUNTRY", timeZone: "Asia/Taipei", suggestions: ["regional-earthquakes", "regional-coastal", "precipitation", "tropical-cyclones"] },
  japan: { ...regionConfig.japan, group: "COUNTRY", timeZone: "Asia/Tokyo", suggestions: ["regional-earthquakes", "regional-coastal", "precipitation", "sea-ice"] },
  korea: { ...regionConfig.korea, group: "COUNTRY", timeZone: "Asia/Seoul", suggestions: ["precipitation", "regional-earthquakes"] },
  canada: { ...regionConfig.canada, group: "COUNTRY", timeZone: "America/Toronto", suggestions: ["wildfire", "sea-ice", "ndvi"] },
  uk: { ...regionConfig.uk, group: "COUNTRY", timeZone: "Europe/London", suggestions: ["precipitation", "wind"] },
  usa: { ...regionConfig.usa, group: "COUNTRY", timeZone: "America/Chicago", suggestions: ["regional-earthquakes", "regional-coastal", "tropical-cyclones", "wildfire"] },
  china: { ...regionConfig.china, group: "COUNTRY", timeZone: "Asia/Shanghai", suggestions: ["regional-earthquakes", "precipitation", "global-temperature"] },
  singapore: { ...regionConfig.singapore, group: "COUNTRY", timeZone: "Asia/Singapore", suggestions: ["precipitation", "global-temperature"] },
  dubai: { ...regionConfig.dubai, group: "COUNTRY", timeZone: "Asia/Dubai", suggestions: ["global-temperature", "ndvi"] },
  himalaya: { id: "himalaya", displayName: "Tibetan Plateau & Himalaya", group: "CRITICAL REGION", lat: 30.5, lon: 84, altitude: 5000000, timeZone: "Asia/Kathmandu", suggestions: ["regional-earthquakes", "global-temperature", "ndvi"] },
  iceland_glaciers: { id: "iceland_glaciers", displayName: "Iceland Glaciers", group: "CRITICAL REGION", lat: 64.8, lon: -18.8, altitude: 2300000, timeZone: "Atlantic/Reykjavik", suggestions: ["regional-earthquakes", "sea-ice"] },
  new_zealand_glaciers: { id: "new_zealand_glaciers", displayName: "New Zealand Glaciers", group: "CRITICAL REGION", lat: -43.5, lon: 170.2, altitude: 2600000, timeZone: "Pacific/Auckland", suggestions: ["regional-earthquakes", "sea-ice"] },
  alaska_glaciers: { id: "alaska_glaciers", displayName: "Alaska Glaciers", group: "CRITICAL REGION", lat: 61.2, lon: -149.5, altitude: 4500000, timeZone: "America/Anchorage", suggestions: ["regional-earthquakes", "regional-coastal", "sea-ice"] },
  drylands: { id: "drylands", displayName: "Global Drylands & Desertification", group: "CRITICAL REGION", lat: 23, lon: 15, altitude: 16000000, timeZone: "UTC", suggestions: ["ndvi", "global-temperature"] },
  amazon: { id: "amazon", displayName: "Amazon Basin", group: "CRITICAL REGION", lat: -3.5, lon: -62, altitude: 6500000, timeZone: "America/Manaus", suggestions: ["ndvi", "wildfire", "precipitation"] },
  african_savanna: { id: "african_savanna", displayName: "African Savanna", group: "CRITICAL REGION", lat: -2, lon: 25, altitude: 9500000, timeZone: "Africa/Nairobi", suggestions: ["ndvi", "wildfire", "global-temperature"] },
  niagara: { id: "niagara", displayName: "Niagara Falls", group: "CRITICAL REGION", lat: 43.08, lon: -79.07, altitude: 500000, timeZone: "America/Toronto", suggestions: ["precipitation", "global-temperature"] },
  iguazu: { id: "iguazu", displayName: "Iguazú Falls", group: "CRITICAL REGION", lat: -25.69, lon: -54.44, altitude: 500000, timeZone: "America/Argentina/Cordoba", suggestions: ["precipitation", "ndvi"] },
  victoria_falls: { id: "victoria_falls", displayName: "Victoria Falls", group: "CRITICAL REGION", lat: -17.925, lon: 25.856, altitude: 500000, timeZone: "Africa/Harare", suggestions: ["precipitation", "ndvi"] },
  new_year: { id: "new_year", displayName: "Global New Year Observatory", group: "SEASONAL & CIVILIZATION", lat: 20, lon: 0, altitude: 30000000, timeZone: "UTC", suggestions: ["precipitation", "temp", "wind"] },
  taiwan_festivals: { id: "taiwan_festivals", displayName: "Taiwan Seasonal Observatory", group: "SEASONAL & CIVILIZATION", lat: 23.7, lon: 121, altitude: 2500000, timeZone: "Asia/Taipei", suggestions: ["regional-coastal", "precipitation"] },
  japan_seasons: { id: "japan_seasons", displayName: "Japan Seasonal Observatory", group: "SEASONAL & CIVILIZATION", lat: 36.2, lon: 138.3, altitude: 6000000, timeZone: "Asia/Tokyo", suggestions: ["regional-earthquakes", "precipitation"] },
});

const REGION_GROUPS = ["COUNTRY", "CRITICAL REGION", "SEASONAL & CIVILIZATION"];
const REGIONAL_LAYER_CONFIG = {
  "regional-earthquakes": { id: "regional-earthquakes", kind: "regional_earthquakes", label: "Recent earthquakes", opacity: 0.85, order: 70, color: "#ffb74d", legend: ["M2.5–3.9", "M4.0–5.9", "M6.0+"] },
  "regional-coastal": { id: "regional-coastal", kind: "regional_coastal", label: "Coastal stations", opacity: 0.8, order: 75, color: "#4dd0e1", legend: ["Forecast model available", "Observed / predicted available", "Unavailable / authorization required"] },
};

const celestialTargetConfig = {
  earth: { id: "earth", displayName: "Earth", subtitle: "Living Planet", status: "Active", bodyType: "planet", texture: "ArcGIS World Imagery tiled layer", cameraDestination: [120, 20, 30000000], availableMonitoringScales: ["Planet", "Continent", "Country", "City", "Satellite View"], enabledDataDomains: ["earth-system", "weather", "location"], color: "#1565c0" },
  moon: { id: "moon", displayName: "Moon", subtitle: "Lunar Surface", status: "Scientific imagery", bodyType: "moon", texture: "NASA/USGS LROC WAC global mosaic", cameraDestination: [180, 0, 22000000], availableMonitoringScales: ["Global", "Near Side", "Far Side", "Landing Sites", "Satellite View"], enabledDataDomains: ["imagery", "ephemeris"], color: "#9aa3ad" },
  mars: { id: "mars", displayName: "Mars", subtitle: "The Red Planet", status: "Preview", bodyType: "planet", texture: "Preview color texture — not live scientific imagery", cameraDestination: [0, 10, 26000000], availableMonitoringScales: ["Global", "Region", "Crater", "Landing Sites", "Satellite View"], enabledDataDomains: [], color: "#a84f32" },
  venus: { id: "venus", displayName: "Venus", subtitle: "Radar World", status: "Preview", bodyType: "planet", texture: "Preview color texture — not live scientific imagery", cameraDestination: [0, 0, 26000000], availableMonitoringScales: ["Global", "Region", "Radar Surface"], enabledDataDomains: [], color: "#c89345" },
  jupiter: { id: "jupiter", displayName: "Jupiter", subtitle: "Gas Giant", status: "Preview", bodyType: "gas-giant", texture: "Preview color texture — not live scientific imagery", cameraDestination: [0, 0, 34000000], availableMonitoringScales: ["Global", "Atmosphere", "Great Red Spot"], enabledDataDomains: [], color: "#b58b67" },
  saturn: { id: "saturn", displayName: "Saturn", subtitle: "Ringed Giant", status: "Preview", bodyType: "gas-giant", texture: "Preview color texture — not live scientific imagery", cameraDestination: [0, 0, 34000000], availableMonitoringScales: ["Global", "Atmosphere", "Ring System"], enabledDataDomains: [], color: "#cbb77b" },
  "solar-activity": { id: "solar-activity", displayName: "Solar Activity", subtitle: "Heliophysics", status: "Preview", bodyType: "star", texture: "Preview color texture — not live solar imagery", cameraDestination: [0, 0, 38000000], availableMonitoringScales: ["Photosphere", "Sunspots", "Corona", "Solar Wind"], enabledDataDomains: [], color: "#f6a623" },
  "deep-space": { id: "deep-space", displayName: "Deep Space", subtitle: "Beyond the Solar System", status: "Preview", bodyType: "space", texture: "Cesium star field preview — not a scientific sky survey", cameraDestination: [0, 0, 50000000], availableMonitoringScales: ["Solar System", "Nearby Stars", "Galaxy", "Deep Field"], enabledDataDomains: [], color: "#020712" },
};

Object.assign(celestialTargetConfig, {
  sun: { id: "sun", displayName: "Sun", subtitle: "Heliophysics", status: "Observation", bodyType: "star", renderMode: "observation-disc", texture: "Latest available NASA SDO full-disc observation; procedural-emissive is failure fallback only", cameraDestination: [0, 0, 38000000], availableMonitoringScales: ["Photosphere", "Magnetogram", "AIA 171 Å", "AIA 193 Å", "AIA 304 Å", "Coronagraph"], enabledDataDomains: ["solar-imagery", "space-weather", "ephemeris"], color: "#f6a623" },
  mercury: { id: "mercury", displayName: "Mercury", subtitle: "Inner Planet", status: "Scientific imagery", bodyType: "planet", texture: "MESSENGER mission-derived global mosaic; JPL ephemeris remains separate", cameraDestination: [0, 0, 23000000], availableMonitoringScales: ["Global", "Surface", "Caloris Basin", "Craters", "Magnetic Field", "Missions"], enabledDataDomains: ["imagery", "ephemeris"], color: "#8d8780" },
  venus: { id: "venus", displayName: "Venus", subtitle: "Radar World", status: "Scientific imagery", bodyType: "planet", texture: "Magellan radar-derived surface map; not natural visible-light color", cameraDestination: [0, 0, 26000000], availableMonitoringScales: ["Radar Surface", "Topography", "Atmosphere", "Global", "Missions"], enabledDataDomains: ["imagery", "ephemeris"], color: "#c89345" },
  mars: { id: "mars", displayName: "Mars", subtitle: "The Red Planet", status: "Scientific imagery", bodyType: "planet", texture: "Viking optical global color mosaic", cameraDestination: [0, 10, 26000000], availableMonitoringScales: ["Surface", "Topography", "Olympus Mons", "Valles Marineris", "Polar Regions", "Landing Sites", "Missions"], enabledDataDomains: ["imagery", "ephemeris"], color: "#a84f32" },
  jupiter: { id: "jupiter", displayName: "Jupiter", subtitle: "Gas Giant", status: "Archival imagery", bodyType: "gas-giant", texture: "Cassini atmospheric observation disc; no solid surface", cameraDestination: [0, 0, 34000000], availableMonitoringScales: ["Global Atmosphere", "Great Red Spot", "Cloud Bands", "Polar Cyclones", "Auroras", "Juno Mission"], enabledDataDomains: ["imagery", "ephemeris"], color: "#b58b67" },
  saturn: { id: "saturn", displayName: "Saturn", subtitle: "Ringed Giant", status: "Archival imagery", bodyType: "gas-giant", texture: "Cassini atmospheric observation with separate ring primitive", cameraDestination: [0, 0, 34000000], availableMonitoringScales: ["Global Atmosphere", "Ring System", "North Polar Hexagon", "Cloud Bands", "Auroras", "Cassini Mission"], enabledDataDomains: ["imagery", "ephemeris"], color: "#cbb77b" },
  uranus: { id: "uranus", displayName: "Uranus", subtitle: "Ice Giant", status: "Archival imagery", bodyType: "gas-giant", texture: "Voyager 2 atmospheric observation disc", cameraDestination: [0, 0, 36000000], availableMonitoringScales: ["Global Atmosphere", "Rings", "Axial Tilt", "Clouds", "Auroras", "Voyager 2"], enabledDataDomains: ["imagery", "ephemeris"], color: "#78b8c4" },
  neptune: { id: "neptune", displayName: "Neptune", subtitle: "Ice Giant", status: "Archival imagery", bodyType: "gas-giant", texture: "Voyager 2 processed atmospheric observation disc", cameraDestination: [0, 0, 36000000], availableMonitoringScales: ["Global Atmosphere", "Cloud Systems", "Dark Spots", "Winds", "Rings", "Voyager 2"], enabledDataDomains: ["imagery", "ephemeris"], color: "#4169b1" },
});
delete celestialTargetConfig["solar-activity"];

Object.values(SATELLITE_REGISTRY).forEach((satellite) => {
  if (satellite.id === "moon") return;
  celestialTargetConfig[satellite.id] = {
    id: satellite.id,
    displayName: satellite.name,
    subtitle: `${celestialTargetConfig[satellite.parentBodyId]?.displayName || satellite.parentBodyId} system`,
    status: "Visualization",
    bodyType: "natural-satellite",
    texture: satellite.texture,
    cameraDestination: [0, 0, Math.max(satellite.radiusKm * 1000 * 4.2, 32000)],
    availableMonitoringScales: ["Global", "Surface", "Missions"],
    enabledDataDomains: ["verified-static-metadata"],
    color: satellite.fallbackTexture,
  };
});

const REGION_TRANSLATION_KEYS = {
  global: "global",
  japan: "japan",
  taiwan: "taiwan",
  korea: "korea",
  canada: "canada",
  uk: "united_kingdom",
  usa: "united_states",
  china: "china",
  singapore: "singapore",
  dubai: "dubai",
};

let latestStateSignature = "";
let lastJsonUpdateValue = null;
let nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
let cesiumViewer = null;
let activeCelestialTargetId = "earth";
let earthBaseLayer = null;
let earthImageryErrorUnsubscribe = null;
let celestialImageryLayer = null;
let celestialImageryErrorUnsubscribe = null;
let celestialDiscEntity = null;
let celestialSatelliteEntities = [];
let celestialSatellitePrimitives = [];
let satelliteTextureGeneration = 0;
const satelliteTextureCache = new Map();
const satelliteTextureWarnings = new Set();
const MAX_SATELLITE_TEXTURE_CACHE_ENTRIES = 6;
let celestialRingPrimitives = [];
let celestialDataSources = [];
let celestialEventRemovers = [];
let celestialAnimationTimers = [];
let defaultSceneLight = null;
let moonDirectionalLight = null;
let moonLightingActive = false;
let latestMoonEphemeris = null;
let lastMoonLightingTimestamp = null;
let moonLandingSiteEntities = [];
let sunVisualizationActive = false;
let sunVisualizationTextureUrl = null;
let planetImageryRequestController = null;
let planetImageryRequestId = 0;
const planetImageryCache = new Map();
const celestialImageCache = new Map();
const MAX_CELESTIAL_IMAGE_CACHE_ENTRIES = 6;
let earthPcsReference = null;
let moonImageryActive = false;
let moonNumericalActive = false;
let solarImageryActive = false;
let solarNumericalActive = false;
let activeSolarImageMode = "hmi-continuum";
let activeSolarObservationPayload = null;
let visitorDataSource = null;
let visitorHeatDataSource = null;
let visitorNetworkDataSource = null;
let visitorLocationByEntityId = new Map();
let visitorSessionId = null;
let visitorAnalyticsRange = "24h";
let latestVisitorAnalytics = null;
let latestVisitorAnalyticsAt = 0;
let userLocationEntity = null;
let userAccuracyEntity = null;
let lastUserPosition = null;
let activeRegionId = "global";
let activeRegionalObservation = null;
let regionalObservationGeneration = 0;
let regionalObservationAbortController = null;
let translations = {};
const activeEarthLayers = new Map();
const earthLayerCapabilityMatrix = new Map();
let earthLayerRuntime = null;
let latestLayerSnapshotSucceededAt = null;
let latestLayerSnapshotFailed = false;
let layerSnapshotTimer = null;
const LAYER_SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
const LAYER_SNAPSHOT_STALE_MS = 20 * 60 * 1000;
let cameraTransitionOperational = false;
let cameraTransitionFailed = false;
let latestActiveAlertCount = 0;
let latestRuntimeStatus = null;
let timelineFrames = [];
let timelineFrameIndex = 0;
let timelinePlaybackTimer = null;

const selectors = {
  currentState: document.querySelector("#current-state"),
  pcsStateLabel: document.querySelector("#pcs-state-label"),
  pcsStateNote: document.querySelector("#pcs-state-note"),
  coverage: document.querySelector("#coverage"),
  latestYear: document.querySelector("#latest-year"),
  lastJsonUpdate: document.querySelector("#last-json-update"),
  localBrowserTime: document.querySelector("#local-browser-time"),
  autoRefreshCountdown: document.querySelector("#auto-refresh-countdown"),
  projections: {
    L_T: document.querySelector("#projection-thermal"),
    L_C: document.querySelector("#projection-chemical"),
    L_S: document.querySelector("#projection-structural"),
    L_I: document.querySelector("#projection-informational"),
    L_F: document.querySelector("#projection-flow"),
  },
  progress: {
    L_T: document.querySelector("#progress-thermal"),
    L_C: document.querySelector("#progress-chemical"),
    L_S: document.querySelector("#progress-structural"),
    L_I: document.querySelector("#progress-informational"),
  },
  dataMessage: document.querySelector("#data-message"),
  cesiumGlobe: document.querySelector("#cesium-globe"),
  cesiumFallback: document.querySelector("#cesium-fallback"),
  observatoryViewLabel: document.querySelector("#observatory-view-label"),
  observatoryViewTitle: document.querySelector("#observatory-view-title"),
  celestialTargetStatus: document.querySelector("#celestial-target-status"),
  layerControlMessage: document.querySelector("#layer-control-message"),
  pcsLayerList: document.querySelector("#pcs-layer-list"),
  layerConnectorHealth: document.querySelector("#layer-connector-health"),
  layerControls: document.querySelectorAll("[data-layer-status]"),
  buildTimestamp: document.querySelector("#build-timestamp"),
  languageSelector: document.querySelector("#language-selector"),
  regionSelector: document.querySelector("#region-selector"),
  dataSourceSelector: document.querySelector("#data-source-selector"),
  aiModeSelector: document.querySelector("#ai-mode-selector"),
  activeRegionName: document.querySelector("#active-region-name"),
  navCurrentRegion: document.querySelector("#nav-current-region"),
  regionalModeStatus: document.querySelector("#regional-mode-status"),
  regionalObservationTitle: document.querySelector("#regional-observation-title"),
  regionalObservationStatus: document.querySelector("#regional-observation-status"),
  regionalLocalTime: document.querySelector("#regional-local-time"),
  regionalSuggestions: document.querySelector("#regional-suggestions"),
  regionalLegends: document.querySelector("#regional-legends"),
  regionalWeather: document.querySelector("#regional-weather"),
  regionalCoastal: document.querySelector("#regional-coastal"),
  regionalHazards: document.querySelector("#regional-hazards"),
  regionalSeasonal: document.querySelector("#regional-seasonal"),
  regionalSources: document.querySelector("#regional-sources"),
  regionalLayerControls: document.querySelectorAll('[data-pcs-layer^="regional-"]'),
  regionalOpacityControls: document.querySelectorAll('[data-pcs-opacity^="regional-"]'),
  navLocalTime: document.querySelector("#nav-local-time"),
  navUtcTime: document.querySelector("#nav-utc-time"),
  aiCopilotMessage: document.querySelector("#ai-copilot-message"),
  solarSystemControls: document.querySelectorAll("[data-solar-target]"),
  solarSystemStatus: document.querySelector("#solar-system-status"),
  observatoryModeControls: document.querySelectorAll("[data-observatory-mode]"),
  observatoryModeStatus: document.querySelector("#observatory-mode-status"),
  monitoringScaleControls: document.querySelector("#monitoring-scale-controls"),
  monitoringScaleStatus: document.querySelector("#monitoring-scale-status"),
  locationPanel: document.querySelector("#location-panel"),
  locateMe: document.querySelector("#locate-me"),
  locationStatus: document.querySelector("#location-status"),
  locationCoordinates: document.querySelector("#location-coordinates"),
  locationLatitude: document.querySelector("#location-latitude"),
  locationLongitude: document.querySelector("#location-longitude"),
  locationAccuracy: document.querySelector("#location-accuracy"),
  timelineControls: document.querySelectorAll("[data-timeline-action]"),
  timelineStatus: document.querySelector("#timeline-status"),
  timelineSpeed: document.querySelector("#timeline-speed"),
  soundToggle: document.querySelector("#sound-toggle"),
  voiceToggle: document.querySelector("#voice-toggle"),
  audioStatus: document.querySelector("#audio-status"),
  weatherLayerControls: document.querySelectorAll("[data-weather-layer]"),
  weatherProxyStatus: document.querySelector("#weather-proxy-status"),
  weatherActiveLayers: document.querySelector("#weather-active-layers"),
  weatherTileError: document.querySelector("#weather-tile-error"),
  weatherOpacityControls: document.querySelectorAll("[data-weather-opacity]"),
  weatherLegends: document.querySelector("#weather-legends"),
  weatherLayerMetadata: document.querySelectorAll("[data-weather-metadata]"),
  domainGrid: document.querySelector("#domain-readiness-grid"),
  domainReadinessStatus: document.querySelector("#domain-readiness-status"),
  connectedDatasetCount: document.querySelector("#connected-dataset-count"),
  connectedDatasetList: document.querySelector("#connected-dataset-list"),
  dailyBriefList: document.querySelector("#daily-brief-list"),
  dailyBriefStatus: document.querySelector("#daily-brief-status"),
  moreIntelligenceList: document.querySelector("#more-intelligence-list"),
  massGatheringList: document.querySelector("#mass-gathering-list"),
  evidenceLedgerList: document.querySelector("#evidence-ledger-list"),
  pcsApiStatus: document.querySelector("#pcs-api-status"),
  systemModules: document.querySelectorAll("[data-system-module]"),
  animationStatuses: document.querySelectorAll("[data-animation-status]"),
  animationDetails: document.querySelectorAll("[data-animation-detail]"),
  evidenceExplorerForm: document.querySelector("#evidence-explorer-form"),
  evidenceEvent: document.querySelector("#evidence-event"),
  evidencePrimaryRegion: document.querySelector("#evidence-primary-region"),
  evidenceComparisonRegion: document.querySelector("#evidence-comparison-region"),
  evidenceWindowStart: document.querySelector("#evidence-window-start"),
  evidenceWindowEnd: document.querySelector("#evidence-window-end"),
  evidenceBaselineStart: document.querySelector("#evidence-baseline-start"),
  evidenceBaselineEnd: document.querySelector("#evidence-baseline-end"),
  evidenceVariables: document.querySelector("#evidence-variables"),
  evidenceResults: document.querySelector("#evidence-explorer-results"),
  evidenceCausalStatus: document.querySelector("#evidence-causal-status"),
  visitorDetails: document.querySelector("#visitor-network-details"),
  visitorOnline: document.querySelector("#visitor-online"),
  visitorToday: document.querySelector("#visitor-today"),
  visitorTotal: document.querySelector("#visitor-total"),
  visitorUnique: document.querySelector("#visitor-unique"),
  visitorCountries: document.querySelector("#visitor-countries"),
  visitorLatest: document.querySelector("#visitor-latest"),
  visitorUpdated: document.querySelector("#visitor-updated"),
  visitorRecentRegions: document.querySelector("#visitor-recent-regions"),
  visitorNetworkStatus: document.querySelector("#visitor-network-status"),
  visitorAnalyticsStatus: document.querySelector("#visitor-analytics-status"),
  visitorRangeTabs: document.querySelectorAll("[data-visitor-range]"),
  visitorHeatToggle: document.querySelector("#visitor-heat-toggle"),
  visitorNetworkToggle: document.querySelector("#visitor-network-toggle"),
  visitorTrendChart: document.querySelector("#visitor-trend-chart"),
  visitorCountryRanking: document.querySelector("#visitor-country-ranking"),
  moonPanel: document.querySelector("#moon-observation-panel"),
  moonError: document.querySelector("#moon-error"),
  moonPhaseGraphic: document.querySelector("#moon-phase-graphic"),
  moonValues: document.querySelectorAll("[data-moon-value]"),
  moonImageryValues: document.querySelectorAll("[data-moon-imagery-value]"),
  moonProvenance: document.querySelector("#moon-provenance"),
  solarPanel: document.querySelector("#solar-observation-panel"),
  solarError: document.querySelector("#solar-error"),
  solarImage: document.querySelector("#solar-scientific-image"),
  solarImageError: document.querySelector("#solar-image-error"),
  solarImageControls: document.querySelectorAll("[data-solar-image-mode]"),
  solarImageValues: document.querySelectorAll("[data-solar-image-value]"),
  solarValues: document.querySelectorAll("[data-solar-value]"),
  solarAlertCount: document.querySelector("#solar-alert-count"),
  solarAlertList: document.querySelector("#solar-alert-list"),
  solarProvenance: document.querySelector("#solar-provenance"),
  sunValues: document.querySelectorAll("[data-sun-value]"),
  sunEphemerisTime: document.querySelector("#sun-ephemeris-time"),
  planetPanel: document.querySelector("#planet-observation-panel"),
  planetTitle: document.querySelector("#planet-observation-title"),
  planetError: document.querySelector("#planet-error"),
  planetValues: document.querySelectorAll("[data-planet-value]"),
  planetMeta: document.querySelectorAll("[data-planet-meta]"),
  planetImageryValues: document.querySelectorAll("[data-planet-imagery-value]"),
  planetImageryStatus: document.querySelector("#planet-imagery-status"),
  planetScientificPreview: document.querySelector("#planet-scientific-preview"),
  planetScientificImage: document.querySelector("#planet-scientific-image"),
  planetScientificPreviewNote: document.querySelector("#planet-scientific-preview-note"),
  satellitePanel: document.querySelector("#satellite-observation-panel"),
  satelliteTitle: document.querySelector("#satellite-observation-title"),
  satelliteDescription: document.querySelector("#satellite-description"),
  satelliteValues: document.querySelectorAll("[data-satellite-value]"),
  satelliteHighlights: document.querySelector("#satellite-highlights"),
  satelliteDataSource: document.querySelector("#satellite-data-source"),
  celestialSystems: document.querySelectorAll("[data-celestial-system]"),
};

function t(key) {
  return translations[key] ?? window.PCSI18n?.translate(key, key) ?? key;
}

function readStorageValue(key, fallbackValue) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ?? fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function writeStorageValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage write failures; UI should stay functional.
  }
}

function getCurrentLanguage() {
  return window.PCSI18n?.getLanguage() ?? "en";
}

async function setLanguage(lang) {
  if (!window.PCSI18n) return;
  await window.PCSI18n.setLanguage(lang);
}

function translateUI() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (key && translations[key]) {
      element.textContent = translations[key];
    }
  });
  updateRegionContext(activeRegionId);
  updateText(selectors.aiCopilotMessage, t("ai_copilot_inactive"));
}

function regionLabel(regionId) {
  const key = REGION_TRANSLATION_KEYS[regionId];
  return key ? t(key) : regionConfig[regionId]?.displayName ?? regionConfig.global.displayName;
}

function stateSourceForRegion(regionId) {
  if (regionId === "global") {
    return GLOBAL_STATE_SOURCE;
  }
  return `${REGIONAL_STATE_SOURCE_PREFIX}/${regionId}_state.json`;
}

function formatDisplayValue(value, digits = 3) {
  if (value === null || typeof value === "undefined" || Number.isNaN(value)) {
    return "Waiting for data";
  }

  if (typeof value === "number") {
    return value.toFixed(digits);
  }

  return String(value);
}

function formatTimestamp(value) {
  if (value === null || typeof value === "undefined") {
    return "Waiting for data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function updateText(element, value) {
  if (!element) {
    return;
  }

  if (element.textContent !== value) {
    element.textContent = value;
  }
}

function displayValue(element, value, digits = 3) {
  const isMissing = value === null || typeof value === "undefined" || Number.isNaN(value);
  updateText(element, formatDisplayValue(value, digits));
  element?.classList.toggle("is-missing", isMissing);
}

function displayCoverage(element, value) {
  const isMissing = value === null || typeof value === "undefined" || Number.isNaN(value);
  if (isMissing) {
    updateText(element, "Waiting for data");
  } else {
    const connected = Number(value);
    const waiting = Math.max(0, 4 - connected);
    updateText(element, `Connected: ${connected} / 4\nUnavailable: ${waiting} / 4`);
  }
  element?.classList.toggle("is-missing", isMissing);
}

function displayProgressBar(element, value) {
  if (!element) {
    return;
  }

  if (value === null || typeof value === "undefined" || Number.isNaN(Number(value))) {
    element.style.transform = "scaleX(0)";
    element.classList.add("is-missing");
    return;
  }

  const clampedValue = Math.max(0, Math.min(1, Number(value)));
  element.style.transform = `scaleX(${clampedValue})`;
  element.classList.remove("is-missing");
}
function renderState(state, source, fallbackToGlobal = false) {
  const stateSignature = JSON.stringify(state);
  latestStateSignature = stateSignature;
  lastJsonUpdateValue = state.metadata?.generated_at_utc ?? state.timestamp ?? null;

  earthPcsReference = null;
  updateText(selectors.currentState, "UNAVAILABLE");
  selectors.currentState?.classList.add("is-missing");
  displayCoverage(selectors.coverage, state.coverage_count);
  displayValue(selectors.latestYear, state.latest_year, 0);
  Object.values(selectors.projections).forEach((element) => { updateText(element, "UNAVAILABLE"); element?.classList.add("is-missing"); });
  Object.values(selectors.progress).forEach((element) => displayProgressBar(element, null));

  updateText(selectors.lastJsonUpdate, formatTimestamp(lastJsonUpdateValue));
  if (fallbackToGlobal) {
    updateText(selectors.dataMessage, `${t("regional_data_pending")}. Using global fallback from ${GLOBAL_STATE_SOURCE}`);
  } else {
    updateText(selectors.dataMessage, `JSON load status: loaded from ${source}`);
  }
  updatePcsAvailability(celestialTargetConfig[activeCelestialTargetId]);
}

function normalizeDashboardData(rawData) {
  // latest_state is the canonical PCS_ENGINE envelope.
  // state/data support backward-compatible wrappers used by earlier pipeline outputs.
  return rawData?.latest_state ?? rawData?.state ?? rawData?.data ?? rawData;
}

function renderConnectionFailure(error, source) {
  console.error("Failed to load PCS data:", error);
  latestStateSignature = "";
  lastJsonUpdateValue = "DATA CONNECTION FAILED";

  [
    selectors.currentState,
    selectors.coverage,
    selectors.latestYear,
    selectors.lastJsonUpdate,
    selectors.projections.L_T,
    selectors.projections.L_C,
    selectors.projections.L_S,
    selectors.projections.L_I,
  ].forEach((element) => {
    updateText(element, "DATA CONNECTION FAILED");
    element?.classList.add("is-missing");
  });

  Object.values(selectors.progress).forEach((element) => {
    displayProgressBar(element, null);
  });

  updateText(selectors.dataMessage, `DATA CONNECTION FAILED: ${source}`);
}

function renderClock() {
  const now = Date.now();
  const nowDate = new Date(now);
  const secondsRemaining = Math.max(0, Math.ceil((nextRefreshAt - now) / 1000));

  updateText(selectors.localBrowserTime, nowDate.toLocaleString());
  const region = regionConfig[activeRegionId] || regionConfig.global;
  const regionalTime = new Intl.DateTimeFormat(getCurrentLanguage(), { timeZone: region.timeZone || "UTC", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(nowDate);
  updateText(selectors.navLocalTime, regionalTime);
  updateText(selectors.regionalLocalTime, `Local time · ${regionalTime} · ${region.timeZone || "UTC"}`);
  updateText(selectors.navUtcTime, nowDate.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC"));
  updateText(selectors.lastJsonUpdate, formatTimestamp(lastJsonUpdateValue));
  updateText(selectors.autoRefreshCountdown, `Next refresh in ${secondsRemaining}s`);
}

async function updateDashboardData() {
  const requestedSource = stateSourceForRegion(activeRegionId);

  try {
    const response = await fetch(requestedSource, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`State file unavailable: ${response.status}`);
    }

    const rawData = await response.json();
    const state = normalizeDashboardData(rawData);
    renderState(state, requestedSource);
  } catch (error) {
    if (activeRegionId !== "global") {
      // Regional mode falls back to global latest_state when regional output is unavailable.
      try {
        const fallbackResponse = await fetch(GLOBAL_STATE_SOURCE, { cache: "no-store" });
        if (!fallbackResponse.ok) {
          throw new Error(`Failed to load regional and global state data (${requestedSource}).`);
        }
        const fallbackRaw = await fallbackResponse.json();
        const fallbackState = normalizeDashboardData(fallbackRaw);
        renderState(fallbackState, GLOBAL_STATE_SOURCE, true);
      } catch (fallbackError) {
        renderConnectionFailure(fallbackError, GLOBAL_STATE_SOURCE);
      }
    } else {
      renderConnectionFailure(error, requestedSource);
    }
  } finally {
    nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
    renderClock();
  }
}

const loadLatestState = updateDashboardData;

function updateRegionContext(regionId) {
  const region = regionConfig[regionId] ?? regionConfig.global;
  activeRegionId = region.id;
  const label = regionLabel(region.id);
  updateText(selectors.activeRegionName, label);
  updateText(selectors.navCurrentRegion, label);

  if (region.id === "global") {
    updateText(selectors.regionalModeStatus, "Global mode selected.");
  } else {
    updateText(selectors.regionalModeStatus, `${region.group || "COUNTRY"} profile selected. Regional observations update independently.`);
  }
  updateText(selectors.regionalObservationTitle, label);
  updateText(selectors.regionalSuggestions, `Suggested, not forced: ${(region.suggestions || []).map((id) => REGIONAL_LAYER_CONFIG[id]?.label || layerDisplayName(id)).join(", ") || "none"}.`);
}

function rebuildRegionSelector() {
  if (!selectors.regionSelector) return;
  const groups = REGION_GROUPS.map((groupName) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = groupName;
    Object.values(regionConfig).filter((region) => region.group === groupName).forEach((region) => {
      const option = document.createElement("option"); option.value = region.id; option.textContent = regionLabel(region.id); optgroup.append(option);
    });
    return optgroup;
  });
  selectors.regionSelector.replaceChildren(...groups);
  selectors.regionSelector.value = activeRegionId;
}

function regionalStatusLine(name, status, detail = "") {
  const line = document.createElement("p"); line.className = "regional-status-line";
  const strong = document.createElement("strong"); strong.textContent = name;
  line.append(strong, document.createTextNode(`${status || "UNAVAILABLE"}${detail ? ` · ${detail}` : ""}`));
  return line;
}

function renderRegionalWeather(payload) {
  if (!selectors.regionalWeather) return;
  const heading = document.createElement("h3"); heading.textContent = "Weather · OBSERVED vs FORECAST";
  const observed = payload.weather?.observed || []; const forecast = payload.weather?.forecast || [];
  const observedStatus = regionalStatusLine("OBSERVED", observed.length ? "AVAILABLE" : "UNAVAILABLE", observed.length ? `${observed.length} variables` : "No station observation adapter is configured; model output is not relabeled as observed.");
  const point = payload.weather?.observation_point;
  const forecastStatus = regionalStatusLine("FORECAST", forecast.some((item) => item.status === "AVAILABLE") ? "AVAILABLE" : "UNAVAILABLE", `Open-Meteo weather and CAMS air-quality grids · ${point?.name || "profile center"} (${point?.lat ?? "?"}, ${point?.lon ?? "?"})`);
  const grid = document.createElement("dl"); grid.className = "regional-data-grid";
  forecast.forEach((item) => {
    const wrap = document.createElement("div"); const dt = document.createElement("dt"); const dd = document.createElement("dd");
    dt.textContent = `${item.label} · ${item.data_class}`;
    dd.textContent = item.status === "AVAILABLE" ? `${item.value} ${item.unit}` : item.status;
    const meta = document.createElement("small"); meta.textContent = `Provider: ${item.provider} · Valid: ${formatPcsTime(item.valid_time)} · Retrieved: ${formatPcsTime(item.retrieval_time)} · Quality: ${item.quality} · Uncertainty: ${item.uncertainty}`;
    dd.append(document.createElement("br"), meta); wrap.append(dt, dd); grid.append(wrap);
  });
  selectors.regionalWeather.replaceChildren(heading, observedStatus, forecastStatus, grid);
}

function renderRegionalCoastal(payload) {
  if (!selectors.regionalCoastal) return;
  const heading = document.createElement("h3"); heading.textContent = "Tide & coastal observation";
  const note = regionalStatusLine("Provider status", payload.coastal?.status || "UNAVAILABLE", payload.coastal?.navigation_warning || payload.coastal?.reason || "No coastal profile");
  const list = document.createElement("div");
  (payload.coastal?.stations || []).forEach((station) => {
    const details = document.createElement("details"); const summary = document.createElement("summary"); summary.textContent = `${station.name} · ${station.status}`;
    const rows = document.createElement("div"); rows.className = "regional-data-grid";
    const values = [station.modelled_sea_level, station.wave_height, station.sea_surface_temperature, station.predicted_tide, station.observed_water_level, station.storm_surge_residual, station.tsunami_alert];
    values.forEach((item, index) => {
      if (!item) return; const names = ["MODELLED_SEA_LEVEL_FORECAST", "Wave height", "Sea-surface temperature", "PREDICTED_TIDE", "OBSERVED_WATER_LEVEL", "STORM_SURGE_RESIDUAL", "Tsunami alert"];
      const row = document.createElement("div"); const title = document.createElement("dt"); const value = document.createElement("dd");
      title.textContent = names[index]; value.textContent = item.value !== null && item.value !== undefined ? `${item.value} ${item.unit || ""} · ${item.status}` : item.status || "UNAVAILABLE";
      const meta = document.createElement("small"); meta.textContent = `Provider: ${item.provider || station.authority || "Unavailable"} · Time: ${formatPcsTime(item.observation_time || item.prediction_time || item.valid_time)} · Datum: ${item.datum || "UNAVAILABLE"} · ${item.uncertainty || item.reason || "No published uncertainty"}`;
      value.append(document.createElement("br"), meta); row.append(title, value); rows.append(row);
    });
    details.append(summary, rows); list.append(details);
  });
  if (!list.childElementCount) list.append(regionalStatusLine("Stations", "UNAVAILABLE", "No station positions are invented."));
  selectors.regionalCoastal.replaceChildren(heading, note, list);
}

function renderRegionalHazards(payload) {
  if (!selectors.regionalHazards) return;
  const heading = document.createElement("h3"); heading.textContent = "Earthquake, tsunami & tropical cyclone";
  const earthquake = regionalStatusLine("Earthquakes", payload.earthquakes?.status, `${payload.earthquakes?.events?.length || 0} USGS events · ${formatPcsTime(payload.earthquakes?.retrieved_at)}`);
  const list = document.createElement("div");
  (payload.earthquakes?.events || []).slice(0, 8).forEach((event) => list.append(regionalStatusLine(`M${event.magnitude ?? "?"} · ${event.place}`, event.reviewed_status?.toUpperCase(), `${event.depth_km ?? "?"} km · ${formatPcsTime(event.time)} · tsunami linkage ${event.tsunami_flag ? "YES" : "NO"} · ${event.source}`)));
  const tsunami = regionalStatusLine("Tsunami alert", payload.alerts?.tsunami?.status, payload.alerts?.tsunami?.reason);
  const cyclone = regionalStatusLine("Cyclones", payload.tropical_cyclones?.status, `${payload.tropical_cyclones?.source} · ${payload.tropical_cyclones?.normalized_model}`);
  selectors.regionalHazards.replaceChildren(heading, earthquake, list, tsunami, cyclone);
}

function renderRegionalSeasonal(payload) {
  if (!selectors.regionalSeasonal) return;
  const heading = document.createElement("h3"); heading.textContent = "Seasonal & civilization";
  const list = document.createElement("div");
  (payload.seasonal || []).forEach((item) => list.append(regionalStatusLine(item.name, item.status, item.data_status)));
  (payload.features || []).forEach((item) => list.append(regionalStatusLine(item.name, item.status, item.provider || item.reason)));
  (payload.new_year_cities || []).forEach((city) => list.append(regionalStatusLine(city.name, "COUNTDOWN", `${city.local_time} · ${city.countdown_seconds}s · event ${city.public_event_status} · aggregate crowd ${city.aggregate_crowd_status}`)));
  if (!list.childElementCount) list.append(regionalStatusLine("Seasonal feeds", "UNAVAILABLE", "Profile contains no current validated seasonal feed."));
  selectors.regionalSeasonal.replaceChildren(heading, list);
}

function renderRegionalObservation(payload) {
  activeRegionalObservation = payload;
  selectors.regionalObservationStatus.textContent = "AVAILABLE"; selectors.regionalObservationStatus.className = "status-pill status-normal";
  renderRegionalWeather(payload); renderRegionalCoastal(payload); renderRegionalHazards(payload); renderRegionalSeasonal(payload);
  if (selectors.regionalSources) selectors.regionalSources.replaceChildren(...(payload.sources || []).map((source) => { const item = document.createElement("li"); item.textContent = source; return item; }));
}

async function loadRegionalObservation(regionId = activeRegionId) {
  const generation = ++regionalObservationGeneration;
  regionalObservationAbortController?.abort(); regionalObservationAbortController = new AbortController(); activeRegionalObservation = null;
  selectors.regionalObservationStatus.textContent = "LOADING"; selectors.regionalObservationStatus.className = "status-pill status-muted";
  [selectors.regionalWeather, selectors.regionalCoastal, selectors.regionalHazards, selectors.regionalSeasonal].forEach((element) => { if (element) element.replaceChildren(regionalStatusLine("Data", "LOADING", "Previous region data cleared")); });
  try {
    const response = await fetch(`${WEATHER_PROXY_BASE}/api/regional/observation?region=${encodeURIComponent(regionId)}`, { cache: "no-store", signal: regionalObservationAbortController.signal });
    if (!response.ok) throw new Error(`Regional API ${response.status}`); const payload = await response.json();
    if (generation !== regionalObservationGeneration || regionId !== activeRegionId) return { ok: false, stale: true };
    renderRegionalObservation(payload); return { ok: true, payload };
  } catch (error) {
    if (error?.name === "AbortError") return { ok: false, aborted: true };
    if (generation === regionalObservationGeneration) { selectors.regionalObservationStatus.textContent = "UNAVAILABLE"; selectors.regionalObservationStatus.className = "status-pill status-alert"; selectors.regionalWeather.replaceChildren(regionalStatusLine("Regional API", "UNAVAILABLE", error.message)); }
    return { ok: false, error: error.message };
  }
}

function setCesiumCameraForRegion(regionId) {
  const region = regionConfig[regionId] ?? regionConfig.global;
  if (!cesiumViewer || !window.Cesium || activeCelestialTargetId !== "earth") {
    if (selectors.regionalModeStatus) selectors.regionalModeStatus.dataset.cameraAction = "unavailable";
    return;
  }

  flyToWithRuntime({
    destination: Cesium.Cartesian3.fromDegrees(region.lon, region.lat, region.altitude),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: Cesium.Math.toRadians(0),
    },
    duration: 1.6,
  });
  if (selectors.regionalModeStatus) {
    selectors.regionalModeStatus.dataset.cameraAction = "flyTo";
    selectors.regionalModeStatus.dataset.lastFlyToRegion = region.id;
    selectors.regionalModeStatus.dataset.lastFlyToLatitude = String(region.lat);
    selectors.regionalModeStatus.dataset.lastFlyToLongitude = String(region.lon);
  }
}

function showCesiumFallback(message) {
  updateText(selectors.cesiumFallback, message);
  selectors.cesiumFallback?.classList.add("is-error");
}

function showObservatoryMessage(message, type = "info") {
  updateText(selectors.cesiumFallback, message);
  selectors.cesiumFallback?.classList.toggle("is-error", type === "error" || type === "warning");
}

function calculateMoonSunDirection(ephemeris) {
  return window.PCSMoonLighting?.calculateMoonSunDirection(ephemeris) || null;
}

function applyMoonLighting(ephemeris) {
  if (!cesiumViewer || activeCelestialTargetId !== "moon" || !window.Cesium) return false;
  const geometry = calculateMoonSunDirection(ephemeris);
  if (!geometry) {
    clearMoonLighting();
    return false;
  }
  const source = geometry.moon_to_sun_display_direction;
  moonDirectionalLight = new Cesium.DirectionalLight({
    // Cesium expects the direction in which rays travel, opposite Moon-to-Sun.
    direction: Cesium.Cartesian3.normalize(new Cesium.Cartesian3(-source.x, -source.y, -source.z), new Cesium.Cartesian3()),
    color: new Cesium.Color(1.0, 0.985, 0.94, 1.0),
    intensity: 1.2,
  });
  cesiumViewer.scene.light = moonDirectionalLight;
  cesiumViewer.scene.globe.enableLighting = true;
  moonLightingActive = true;
  lastMoonLightingTimestamp = ephemeris.calculation_time || ephemeris.observed_at || new Date().toISOString();
  return true;
}

function updateMoonPhaseLighting(ephemeris = latestMoonEphemeris) {
  if (!ephemeris || activeCelestialTargetId !== "moon") return false;
  return applyMoonLighting(ephemeris);
}

function clearMoonLighting() {
  if (cesiumViewer && !cesiumViewer.isDestroyed() && moonDirectionalLight && cesiumViewer.scene.light === moonDirectionalLight) {
    cesiumViewer.scene.light = defaultSceneLight || new Cesium.SunLight();
  }
  moonDirectionalLight = null;
  moonLightingActive = false;
  lastMoonLightingTimestamp = null;
}

function restoreEarthLighting() {
  if (!cesiumViewer || cesiumViewer.isDestroyed()) return;
  clearMoonLighting();
  cesiumViewer.scene.light = defaultSceneLight || cesiumViewer.scene.light;
  cesiumViewer.scene.globe.enableLighting = true;
}

function clearMoonLandingSites() {
  if (cesiumViewer && !cesiumViewer.isDestroyed()) {
    moonLandingSiteEntities.forEach((entity) => cesiumViewer.entities.remove(entity));
  }
  moonLandingSiteEntities = [];
}

function showMoonLandingSites() {
  clearMoonLandingSites();
  if (!cesiumViewer || activeCelestialTargetId !== "moon") return;
  const sites = [
    ["Apollo 11", -156.527, 0.674], ["Apollo 12", 156.579, -3.013],
    ["Apollo 14", 162.529, -3.645], ["Apollo 15", -176.367, 26.132],
    ["Apollo 16", -164.499, -8.973], ["Apollo 17", -149.229, 20.191],
  ];
  moonLandingSiteEntities = sites.map(([name, longitude, latitude]) => cesiumViewer.entities.add({
    name,
    position: Cesium.Cartesian3.fromDegrees(longitude, latitude, 18000),
    point: { pixelSize: 8, color: Cesium.Color.CYAN, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    label: { text: name, font: "12px sans-serif", fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 3, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -18), disableDepthTestDistance: Number.POSITIVE_INFINITY },
  }));
}

function clearEarthImagery() {
  earthImageryErrorUnsubscribe?.();
  earthImageryErrorUnsubscribe = null;
  if (earthBaseLayer && cesiumViewer && !cesiumViewer.isDestroyed()) {
    cesiumViewer.imageryLayers.remove(earthBaseLayer, true);
  }
  earthBaseLayer = null;
}

function clearCelestialScene() {
  satelliteTextureGeneration += 1;
  celestialImageryErrorUnsubscribe?.();
  celestialImageryErrorUnsubscribe = null;
  celestialEventRemovers.forEach((removeListener) => removeListener?.());
  celestialEventRemovers = [];
  celestialAnimationTimers.forEach((timerId) => {
    window.clearInterval(timerId);
    window.clearTimeout(timerId);
  });
  celestialAnimationTimers = [];
  if (celestialImageryLayer && cesiumViewer && !cesiumViewer.isDestroyed()) {
    cesiumViewer.imageryLayers.remove(celestialImageryLayer, true);
  }
  celestialImageryLayer = null;
  if (celestialDiscEntity && cesiumViewer && !cesiumViewer.isDestroyed()) {
    cesiumViewer.entities.remove(celestialDiscEntity);
  }
  celestialDiscEntity = null;
  if (cesiumViewer && !cesiumViewer.isDestroyed()) {
    celestialSatelliteEntities.forEach((entity) => cesiumViewer.entities.remove(entity));
  }
  celestialSatelliteEntities = [];
  if (cesiumViewer && !cesiumViewer.isDestroyed()) {
    celestialSatellitePrimitives.forEach((primitive) => cesiumViewer.scene.primitives.remove(primitive));
  }
  celestialSatellitePrimitives = [];
  if (cesiumViewer && !cesiumViewer.isDestroyed()) {
    celestialRingPrimitives.forEach((primitive) => cesiumViewer.scene.primitives.remove(primitive));
    celestialDataSources.forEach((dataSource) => cesiumViewer.dataSources.remove(dataSource, true));
  }
  celestialRingPrimitives = [];
  celestialDataSources = [];
  if (selectors.planetScientificPreview) selectors.planetScientificPreview.hidden = true;
  if (selectors.planetScientificImage) {
    selectors.planetScientificImage.removeAttribute("src");
    selectors.planetScientificImage.alt = "";
  }
  sunVisualizationActive = false;
}

function clearCelestialImagery() {
  clearCelestialScene();
}

function cancelPlanetImageryLoad() {
  planetImageryRequestId += 1;
  planetImageryRequestController?.abort();
  planetImageryRequestController = null;
}

function planetProductTypeLabel(value) {
  return ({
    global_mosaic: "Global scientific mosaic",
    radar_map: "Radar-derived surface map",
    radar_topography_map: "Radar/topography-derived surface map",
    atmosphere_map: "Reconstructed global atmosphere map",
    observation_disc: "Mission observation image",
    ring_texture: "Mission-derived ring texture",
  })[value] || value || "Unavailable";
}

function renderPlanetImageryMetadata(config, result = null, unavailable = false) {
  const date = result?.observed_at || result?.product_date || config.imageryDate || config.productDate;
  const values = {
    source: result?.source || config.sourceAgency,
    mission: result?.mission || config.mission,
    instrument: result?.instrument || config.instrument || "Not published",
    product: result?.product || config.productName,
    product_type: planetProductTypeLabel(result?.product_type) || config.productType,
    projection: result?.projection || config.projection,
    date: date ? String(date).slice(0, 10) : "Not published",
    status: unavailable ? "Scientific imagery unavailable" : config.statusLabel,
    attribution: result?.attribution || config.attribution,
  };
  selectors.planetImageryValues.forEach((element) => {
    element.textContent = values[element.dataset.planetImageryValue] || "Unavailable";
  });
}

function showPlanetImageryFallback(targetId) {
  const config = PLANET_IMAGERY_CONFIG[targetId];
  if (!config || !cesiumViewer) return;
  const fallbackMessage = targetId === "mercury" ? "Mercury imagery unavailable" : config.fallbackMessage;
  clearCelestialScene();
  cesiumViewer.scene.globe.show = true;
  cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(targetId === "mercury" ? "#777777" : config.fallbackColor);
  renderPlanetaryRings(config);
  renderPlanetImageryMetadata(config, null, true);
  updateText(selectors.planetImageryStatus, fallbackMessage);
  updateText(selectors.solarSystemStatus, fallbackMessage);
  showObservatoryMessage(fallbackMessage, "warning");
}

function preloadPlanetImage(url) {
  const cached = celestialImageCache.get(url);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.promise;
  }
  const entry = { lastUsed: Date.now(), promise: null };
  entry.promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.onload = () => {
      entry.lastUsed = Date.now();
      resolve(image);
    };
    image.onerror = () => {
      celestialImageCache.delete(url);
      reject(new Error("planet image failed to load"));
    };
    image.src = url;
  });
  celestialImageCache.set(url, entry);
  trimCelestialImageCache(url);
  return entry.promise;
}

function trimCelestialImageCache(protectedKey) {
  if (celestialImageCache.size > MAX_CELESTIAL_IMAGE_CACHE_ENTRIES) {
    const removable = [...celestialImageCache.entries()]
      .filter(([key]) => key !== protectedKey)
      .sort((left, right) => left[1].lastUsed - right[1].lastUsed)[0];
    if (removable) celestialImageCache.delete(removable[0]);
  }
}

function maximumSafeCelestialTextureWidth() {
  const canvas = cesiumViewer?.scene?.canvas;
  const webgl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
  const rendererLimit = webgl ? Number(webgl.getParameter(webgl.MAX_TEXTURE_SIZE)) : 2048;
  const deviceMemory = Number(navigator.deviceMemory) || 4;
  const mobile = window.matchMedia("(max-width: 820px)").matches;
  const memoryLimit = mobile || deviceMemory <= 2 ? 2048 : deviceMemory <= 4 ? 4096 : 8192;
  return Math.min(rendererLimit, memoryLimit, 8192);
}

function loadCelestialTextureVariant(variant) {
  if (variant.image_url) return preloadPlanetImage(variant.image_url);
  if (variant.assembly !== "horizontal" || !Array.isArray(variant.tile_urls) || variant.tile_urls.length < 2) {
    return Promise.reject(new Error("unsupported celestial texture assembly"));
  }
  const cacheKey = `horizontal:${variant.tile_urls.join("|")}`;
  const cached = celestialImageCache.get(cacheKey);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.promise;
  }
  const entry = { lastUsed: Date.now(), promise: null };
  entry.promise = Promise.all(variant.tile_urls.map(preloadPlanetImage)).then((tiles) => {
    const canvas = document.createElement("canvas");
    canvas.width = variant.width;
    canvas.height = variant.height;
    const context = canvas.getContext("2d", { alpha: false });
    const tileWidth = variant.width / tiles.length;
    tiles.forEach((tile, index) => context.drawImage(tile, index * tileWidth, 0, tileWidth, variant.height));
    entry.lastUsed = Date.now();
    return canvas;
  }).catch((error) => {
    celestialImageCache.delete(cacheKey);
    throw error;
  });
  celestialImageCache.set(cacheKey, entry);
  trimCelestialImageCache(cacheKey);
  return entry.promise;
}

function selectCelestialTextureSequence(metadata) {
  const variants = Array.isArray(metadata.texture_variants)
    ? metadata.texture_variants
      .filter((variant) => Number.isFinite(Number(variant.width))
        && (variant.image_url || (variant.assembly === "horizontal" && variant.tile_urls?.length)))
      .sort((left, right) => left.width - right.width)
    : [];
  if (!variants.length) return [{ image_url: metadata.image_url, width: null, height: null, quality: "native" }];
  const preview = variants[0];
  const safeWidth = maximumSafeCelestialTextureWidth();
  const full = variants.filter((variant) => variant.width <= safeWidth).at(-1) || preview;
  return full.width === preview.width ? [preview] : [preview, full];
}

function selectPrimaryObservationProduct(bodyId, preferredMode = null) {
  if (bodyId === "sun") {
    const fallbackOrder = ["hmi-continuum", "aia-193", "aia-171", "aia-304"];
    return [...new Set([preferredMode, ...fallbackOrder].filter((mode) => SOLAR_IMAGE_MODE_LABELS[mode]))];
  }
  if (bodyId === "jupiter") return [PLANET_IMAGERY_CONFIG.jupiter.productName];
  return [];
}

function createCircularAlphaTexture(image, radiusRatio = 0.465) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const size = Math.min(sourceWidth, sourceHeight);
  const sourceX = Math.round((sourceWidth - size) / 2);
  const sourceY = Math.round((sourceHeight - size) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.clearRect(0, 0, size, size);
  context.drawImage(image, sourceX, sourceY, size, size, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size);
  const center = (size - 1) / 2;
  const radius = size * radiusRatio;
  const feather = Math.max(2, size * 0.004);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - center, y - center);
      const alphaIndex = (y * size + x) * 4 + 3;
      if (distance >= radius) pixels.data[alphaIndex] = 0;
      else if (distance > radius - feather) {
        pixels.data[alphaIndex] = Math.round(pixels.data[alphaIndex] * (radius - distance) / feather);
      }
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function renderObservationDisc(config, image, metadata) {
  if (!cesiumViewer || cesiumViewer.isDestroyed()) return false;
  clearCelestialScene();
  cesiumViewer.scene.globe.show = false;
  cesiumViewer.scene.globe.enableLighting = false;
  cesiumViewer.scene.skyAtmosphere.show = false;
  const radiusRatio = config.discRadiusRatio || 0.465;
  const texture = createCircularAlphaTexture(image, radiusRatio);
  const displaySize = window.matchMedia("(max-width: 820px)").matches ? 360 : 720;
  celestialDiscEntity = cesiumViewer.entities.add({
    name: `${config.displayName} observation disc`,
    position: Cesium.Cartesian3.ZERO,
    billboard: {
      image: texture,
      width: displaySize,
      height: displaySize,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1000000, 1.08, 50000000, 0.82),
    },
  });
  const observedAt = formatAstronomyValue(metadata.observed_at || metadata.product_date);
  if (config.id === "sun") {
    const message = `Live / latest available solar observation — ${metadata.instrument}, ${metadata.wavelength}. Observation time: ${observedAt}. Source: ${metadata.source}. Observation disc — not a complete 3D solar surface.`;
    updateText(selectors.solarSystemStatus, message);
    showObservatoryMessage(message, "info");
  } else {
    updateText(selectors.planetImageryStatus, "Observation disc — not used as a global texture.");
    updateText(selectors.solarSystemStatus,
      `${metadata.product}. Observation disc — not used as a global texture. ${metadata.attribution}`);
  }
  return true;
}

async function validateCelestialTexture(config, metadata, preloadedImage = null) {
  const image = preloadedImage || await preloadPlanetImage(metadata.image_url);
  const projection = String(metadata.projection || config.projection || "").toLowerCase();
  const globalProjection = ["equirectangular", "simple_cylindrical", "simple cylindrical"].includes(projection);
  const textureWidth = image.naturalWidth || image.width;
  const textureHeight = image.naturalHeight || image.height;
  const aspectRatio = textureWidth / textureHeight;
  if (config.renderMode === "globe-texture" && !globalProjection) {
    return { valid: false, reason: "unsupported projection", image, aspectRatio };
  }
  if (config.renderMode === "globe-texture" && Math.abs(aspectRatio - 2) > 0.02) {
    return { valid: false, reason: "unsupported projection — global texture must be 2:1", image, aspectRatio };
  }
  return { valid: true, image, aspectRatio };
}

function createRingGeometry(innerRadius, outerRadius, segments = 192) {
  const positions = new Float64Array((segments + 1) * 2 * 3);
  const indices = new Uint32Array(segments * 6);
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const offset = index * 6;
    positions.set([0, cosine * innerRadius, sine * innerRadius, 0, cosine * outerRadius, sine * outerRadius], offset);
    if (index < segments) {
      const vertex = index * 2;
      indices.set([vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2], index * 6);
    }
  }
  return new Cesium.Geometry({
    attributes: { position: new Cesium.GeometryAttribute({
      componentDatatype: Cesium.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    }) },
    indices,
    primitiveType: Cesium.PrimitiveType.TRIANGLES,
    boundingSphere: Cesium.BoundingSphere.fromVertices(positions),
  });
}

function renderPlanetaryRings(config) {
  if (!config.supportsRings || !config.ringInnerRadius || !cesiumViewer) return;
  const normalizedRadius = 6378137;
  const tilt = Cesium.Math.toRadians(config.axialOrientation || 0);
  const bands = [
    [config.ringInnerRadius, config.ringInnerRadius + 0.18, 0.18],
    [config.ringInnerRadius + 0.24, config.ringOuterRadius - 0.22, config.ringOpacity || 0.3],
    [config.ringOuterRadius - 0.16, config.ringOuterRadius, 0.14],
  ];
  bands.forEach(([inner, outer, opacity]) => {
    const geometry = createRingGeometry(inner * normalizedRadius, outer * normalizedRadius);
    const instance = new Cesium.GeometryInstance({
      geometry,
      attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(0.82, 0.74, 0.55, opacity)) },
    });
    const primitive = cesiumViewer.scene.primitives.add(new Cesium.Primitive({
      geometryInstances: instance,
      appearance: new Cesium.PerInstanceColorAppearance({ flat: true, translucent: true, closed: false }),
      asynchronous: false,
      modelMatrix: Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationY(tilt)),
    }));
    celestialRingPrimitives.push(primitive);
  });
}

function createSeamSafeGlobalTexture(image, blendColumns = 2) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const columns = Math.max(1, Math.min(blendColumns, Math.floor(width / 4)));
  for (let y = 0; y < height; y += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      const leftInner = (y * width + columns) * 4 + channel;
      const rightInner = (y * width + width - columns - 1) * 4 + channel;
      const seamValue = Math.round((pixels.data[leftInner] + pixels.data[rightInner]) / 2);
      for (let column = 0; column < columns; column += 1) {
        const amount = columns === 1 ? 1 : 1 - column / columns;
        const left = (y * width + column) * 4 + channel;
        const right = (y * width + width - column - 1) * 4 + channel;
        pixels.data[left] = Math.round(pixels.data[left] * (1 - amount) + seamValue * amount);
        pixels.data[right] = Math.round(pixels.data[right] * (1 - amount) + seamValue * amount);
      }
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

async function renderGlobalBodyTexture(config, metadata, image, requestId) {
  if (metadata.use_preloaded_image) {
    if (requestId !== planetImageryRequestId || activeCelestialTargetId !== config.id) return false;
    cesiumViewer.scene.globe.show = false;
    celestialDiscEntity = cesiumViewer.entities.add({
      name: `${config.displayName} validated global texture`,
      position: Cesium.Cartesian3.ZERO,
      ellipsoid: {
        radii: Cesium.Ellipsoid.WGS84.radii,
        material: new Cesium.ImageMaterialProperty({ image, transparent: false }),
        outline: false,
      },
    });
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    updateText(selectors.planetImageryStatus, `Validated ${width} x ${height} 2:1 global texture active.`);
    return true;
  }
  if (config.seamBlendColumns) {
    const textureCanvas = createSeamSafeGlobalTexture(image, config.seamBlendColumns);
    if (requestId !== planetImageryRequestId || activeCelestialTargetId !== config.id) return false;
    cesiumViewer.scene.globe.show = false;
    celestialDiscEntity = cesiumViewer.entities.add({
      name: `${config.displayName} validated global texture`,
      position: Cesium.Cartesian3.ZERO,
      ellipsoid: {
        radii: Cesium.Ellipsoid.WGS84.radii,
        material: new Cesium.ImageMaterialProperty({
          image: textureCanvas,
          transparent: false,
        }),
        outline: false,
      },
    });
    updateText(selectors.planetImageryStatus, "Validated 2:1 global texture active on ellipsoid material.");
    return true;
  }
  const textureSource = metadata.image_url;
  const provider = await Cesium.SingleTileImageryProvider.fromUrl(textureSource, {
    rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
    credit: `${metadata.attribution} — ${metadata.product}`,
  });
  if (requestId !== planetImageryRequestId || activeCelestialTargetId !== config.id) return false;
  celestialImageryLayer = cesiumViewer.imageryLayers.addImageryProvider(provider, 0);
  celestialImageryErrorUnsubscribe = provider.errorEvent.addEventListener(() => {
    if (activeCelestialTargetId === config.id) showPlanetImageryFallback(config.id);
  });
  cesiumViewer.scene.globe.show = true;
  celestialImageryLayer.minificationFilter = Cesium.TextureMinificationFilter.LINEAR;
  celestialImageryLayer.magnificationFilter = Cesium.TextureMagnificationFilter.LINEAR;
  updateText(selectors.planetImageryStatus, "Validated 2:1 global texture active.");
  return true;
}

function releaseActiveCelestialTexture() {
  celestialImageryErrorUnsubscribe?.();
  celestialImageryErrorUnsubscribe = null;
  if (celestialImageryLayer && cesiumViewer && !cesiumViewer.isDestroyed()) {
    cesiumViewer.imageryLayers.remove(celestialImageryLayer, true);
  }
  celestialImageryLayer = null;
  if (celestialDiscEntity && cesiumViewer && !cesiumViewer.isDestroyed()) {
    cesiumViewer.entities.remove(celestialDiscEntity);
  }
  celestialDiscEntity = null;
}

function renderScientificPreview(config, metadata, image) {
  cesiumViewer.scene.globe.show = true;
  cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(config.fallbackColor);
  renderPlanetaryRings(config);
  if (selectors.planetScientificPreview && selectors.planetScientificImage) {
    selectors.planetScientificImage.src = metadata.image_url;
    selectors.planetScientificImage.alt = `${config.displayName} — ${metadata.product} scientific observation preview`;
    selectors.planetScientificImage.width = image.naturalWidth;
    selectors.planetScientificImage.height = image.naturalHeight;
    selectors.planetScientificPreview.hidden = false;
    updateText(selectors.planetScientificPreviewNote,
      `${metadata.projection}: non-global observation imagery — not used as a globe texture. ${metadata.attribution}`);
  }
  updateText(selectors.planetImageryStatus, "Scientific Observation Preview active — unsupported as a global texture.");
  return true;
}

async function applyPlanetTexture(config, metadata, requestId, preloadedImage = null) {
  const validation = await validateCelestialTexture(config, metadata, preloadedImage);
  if (requestId !== planetImageryRequestId || activeCelestialTargetId !== config.id) return false;
  if (!validation.valid) {
    updateText(selectors.planetImageryStatus, validation.reason);
    return renderScientificPreview(config, metadata, validation.image);
  }
  if (config.renderMode === "globe-texture") return renderGlobalBodyTexture(config, metadata, validation.image, requestId);
  if (config.renderMode === "observation-disc") {
    const rendered = renderObservationDisc(config, validation.image, metadata);
    if (selectors.planetScientificPreview && selectors.planetScientificImage) {
      selectors.planetScientificImage.src = metadata.image_url;
      selectors.planetScientificImage.alt = `${config.displayName} — ${metadata.product}`;
      selectors.planetScientificPreview.hidden = false;
      updateText(selectors.planetScientificPreviewNote,
        `${metadata.projection}: Observation disc — not used as a global texture. ${metadata.attribution}`);
    }
    return rendered;
  }
  if (config.renderMode === "scientific-preview") return renderScientificPreview(config, metadata, validation.image);
  showPlanetImageryFallback(config.id);
  return false;
}

async function loadPlanetImagery(targetId) {
  const config = PLANET_IMAGERY_CONFIG[targetId];
  if (!config || !cesiumViewer) return false;
  clearCelestialImagery();
  const requestId = planetImageryRequestId;
  planetImageryRequestController = new AbortController();
  renderPlanetImageryMetadata(config);
  updateText(selectors.solarSystemStatus, `Loading ${config.displayName} scientific imagery…`);
  try {
    let metadata = planetImageryCache.get(targetId);
    if (!metadata) {
      const versionQuery = config.textureVersion ? `?v=${encodeURIComponent(config.textureVersion)}` : "";
      const response = await fetch(`${ASTRONOMY_PROXY_BASE}/api/astronomy/planet-image/${targetId}${versionQuery}`, {
        signal: planetImageryRequestController.signal,
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("planet metadata unavailable");
      metadata = await response.json();
      if (!metadata.success || !metadata.image_url) throw new Error("planet image unavailable");
      planetImageryCache.set(targetId, metadata);
    }
    if (requestId !== planetImageryRequestId || activeCelestialTargetId !== targetId) return false;
    const textureSequence = selectCelestialTextureSequence(metadata);
    const previewTexture = textureSequence[0];
    const usesProgressiveTextures = Array.isArray(metadata.texture_variants);
    const previewMetadata = {
      ...metadata,
      image_url: previewTexture.image_url || metadata.image_url,
      use_preloaded_image: usesProgressiveTextures,
    };
    const previewImage = await loadCelestialTextureVariant(previewTexture);
    const applied = await applyPlanetTexture(config, previewMetadata, requestId, previewImage);
    if (!applied) return false;
    renderPlanetImageryMetadata(config, metadata);
    const fullTexture = textureSequence[1];
    if (fullTexture && requestId === planetImageryRequestId && activeCelestialTargetId === targetId) {
      updateText(selectors.planetImageryStatus,
        `${previewTexture.width} x ${previewTexture.height} preview active; loading ${fullTexture.width} x ${fullTexture.height} texture…`);
      try {
        const fullImage = await loadCelestialTextureVariant(fullTexture);
        if (requestId === planetImageryRequestId && activeCelestialTargetId === targetId) {
          releaseActiveCelestialTexture();
          await applyPlanetTexture(config, {
            ...metadata,
            image_url: fullTexture.image_url || metadata.image_url,
            use_preloaded_image: true,
          }, requestId, fullImage);
        }
      } catch {
        if (requestId === planetImageryRequestId && activeCelestialTargetId === targetId && !celestialImageryLayer && !celestialDiscEntity) {
          await applyPlanetTexture(config, previewMetadata, requestId, previewImage);
        }
        updateText(selectors.planetImageryStatus,
          `${previewTexture.width} x ${previewTexture.height} validated texture active; higher-resolution texture unavailable.`);
      }
    }
    if (config.renderMode !== "observation-disc") {
      updateText(selectors.solarSystemStatus, `${config.statusLabel} active. JPL numerical observations remain separate.`);
    }
    showObservatoryMessage(`${config.displayName} ${config.statusLabel.toLowerCase()} active.`);
    return true;
  } catch (error) {
    if (error.name === "AbortError" || requestId !== planetImageryRequestId) return false;
    showPlanetImageryFallback(targetId);
    return false;
  }
}

function updateMoonStatusMessage() {
  if (activeCelestialTargetId !== "moon") return;
  if (moonImageryActive && moonLightingActive) {
    const message = "NASA/USGS lunar imagery active; illumination follows current ephemeris.";
    updateText(selectors.solarSystemStatus, message);
    showObservatoryMessage(message);
  } else {
    const message = "Scientific lunar imagery or phase geometry unavailable — preview mode active.";
    updateText(selectors.solarSystemStatus, message);
    showObservatoryMessage(message, "warning");
  }
}

function updateSunStatusMessage() {
  if (activeCelestialTargetId !== "sun") return;
  const message = solarImageryActive && activeSolarObservationPayload
    ? `Live / latest available solar observation — ${activeSolarObservationPayload.instrument}, ${activeSolarObservationPayload.wavelength}. Observation time: ${formatAstronomyValue(activeSolarObservationPayload.observed_at)}. Source: ${activeSolarObservationPayload.source}. Observation disc — not a complete 3D solar surface.`
    : "Solar observation imagery unavailable. Procedural-emissive fallback active — visualization only.";
  updateText(selectors.solarSystemStatus, message);
  showObservatoryMessage(message, solarImageryActive || sunVisualizationActive ? "info" : "warning");
  if (!solarImageryActive && solarNumericalActive) {
    updateText(selectors.solarImageError, "Live numerical observations active; latest solar imagery unavailable.");
  }
}

function sunHash3(x, y, z) {
  let hash = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

function sunSmoothStep(value) {
  return value * value * (3 - 2 * value);
}

function sunValueNoise3(x, y, z) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const tx = sunSmoothStep(x - x0);
  const ty = sunSmoothStep(y - y0);
  const tz = sunSmoothStep(z - z0);
  const interpolate = (start, end, amount) => start + (end - start) * amount;
  const x00 = interpolate(sunHash3(x0, y0, z0), sunHash3(x0 + 1, y0, z0), tx);
  const x10 = interpolate(sunHash3(x0, y0 + 1, z0), sunHash3(x0 + 1, y0 + 1, z0), tx);
  const x01 = interpolate(sunHash3(x0, y0, z0 + 1), sunHash3(x0 + 1, y0, z0 + 1), tx);
  const x11 = interpolate(sunHash3(x0, y0 + 1, z0 + 1), sunHash3(x0 + 1, y0 + 1, z0 + 1), tx);
  return interpolate(interpolate(x00, x10, ty), interpolate(x01, x11, ty), tz);
}

function sunMultiScaleNoise(x, y, z) {
  let total = 0;
  let weight = 0.54;
  let scale = 3.15;
  let normalization = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    total += sunValueNoise3(x * scale + 17.3, y * scale - 8.7, z * scale + 31.1) * weight;
    normalization += weight;
    scale *= 2.07;
    weight *= 0.48;
  }
  return total / normalization;
}

function createSunVisualizationTexture() {
  if (sunVisualizationTextureUrl) return sunVisualizationTextureUrl;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const pixels = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      const longitude = x / (canvas.width - 1) * Math.PI * 2;
      const latitude = (y / (canvas.height - 1) - 0.5) * Math.PI;
      const latitudeRadius = Math.cos(latitude);
      const sphereX = latitudeRadius * Math.cos(longitude);
      const sphereY = Math.sin(latitude);
      const sphereZ = latitudeRadius * Math.sin(longitude);
      const noise = sunMultiScaleNoise(sphereX, sphereY, sphereZ);
      const disturbance = (noise - 0.5) * 2;
      pixels.data[index] = Math.round(252 + disturbance * 3);
      pixels.data[index + 1] = Math.round(203 + disturbance * 18);
      pixels.data[index + 2] = Math.round(92 + disturbance * 15);
      pixels.data[index + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  sunVisualizationTextureUrl = canvas.toDataURL("image/png");
  return sunVisualizationTextureUrl;
}

function renderSunLimbGlow() {
  if (!cesiumViewer || cesiumViewer.isDestroyed()) return;
  const radii = Cesium.Ellipsoid.WGS84.radii;
  const glowScale = 1.012;
  celestialDiscEntity = cesiumViewer.entities.add({
    name: "Procedural solar limb glow",
    position: Cesium.Cartesian3.ZERO,
    ellipsoid: {
      radii: new Cesium.Cartesian3(radii.x * glowScale, radii.y * glowScale, radii.z * glowScale),
      material: new Cesium.Color(1, 0.72, 0.28, 0.055),
      outline: false,
    },
  });
}

async function loadSunVisualization() {
  if (!cesiumViewer || activeCelestialTargetId !== "sun") return false;
  clearCelestialImagery();
  cesiumViewer.scene.globe.show = true;
  cesiumViewer.scene.globe.enableLighting = false;
  cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#f6a623");
  try {
    const provider = await Cesium.SingleTileImageryProvider.fromUrl(createSunVisualizationTexture(), {
      rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
      credit: "PCS procedural photospheric visualization — not a live observation",
    });
    if (activeCelestialTargetId !== "sun") return false;
    celestialImageryLayer = cesiumViewer.imageryLayers.addImageryProvider(provider, 0);
    celestialImageryLayer.minificationFilter = Cesium.TextureMinificationFilter.LINEAR;
    celestialImageryLayer.magnificationFilter = Cesium.TextureMagnificationFilter.LINEAR;
    celestialImageryLayer.contrast = 0.94;
    celestialImageryLayer.saturation = 0.88;
    renderSunLimbGlow();
    celestialImageryErrorUnsubscribe = provider.errorEvent.addEventListener(() => {
      if (activeCelestialTargetId !== "sun") return;
      clearCelestialImagery();
      cesiumViewer.scene.globe.show = true;
      cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#f6a623");
      updateSunStatusMessage();
    });
    sunVisualizationActive = true;
    updateSunStatusMessage();
    return true;
  } catch {
    sunVisualizationActive = false;
    updateSunStatusMessage();
    return false;
  }
}

function renderMoonImageryMetadata(status) {
  const values = {
    source: LUNAR_IMAGERY_CONFIG.source,
    product: LUNAR_IMAGERY_CONFIG.product,
    mosaic_date: LUNAR_IMAGERY_CONFIG.mosaicDate,
    status,
    attribution: LUNAR_IMAGERY_CONFIG.attribution,
  };
  selectors.moonImageryValues.forEach((element) => {
    element.textContent = values[element.dataset.moonImageryValue] || "Unavailable";
  });
}

async function loadMoonImagery() {
  moonImageryActive = false;
  clearCelestialImagery();
  renderMoonImageryMetadata("Loading");
  try {
    const provider = await Cesium.SingleTileImageryProvider.fromUrl(LUNAR_IMAGERY_CONFIG.url, {
      rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90),
      credit: `${LUNAR_IMAGERY_CONFIG.attribution} · ${LUNAR_IMAGERY_CONFIG.product}`,
    });
    if (activeCelestialTargetId !== "moon") return false;
    celestialImageryLayer = cesiumViewer.imageryLayers.addImageryProvider(provider, 0);
    celestialImageryErrorUnsubscribe = provider.errorEvent.addEventListener(() => {
      if (activeCelestialTargetId !== "moon") return;
      moonImageryActive = false;
      clearCelestialImagery();
      renderMoonImageryMetadata("Unavailable — preview sphere active");
      updateMoonStatusMessage();
    });
    moonImageryActive = true;
    renderMoonImageryMetadata("Validated scientific imagery active");
    updateMoonStatusMessage();
    return true;
  } catch {
    renderMoonImageryMetadata("Unavailable — preview sphere active");
    updateMoonStatusMessage();
    return false;
  }
}

async function setEarthImageryMode(mode = "highResolution") {
  if (!cesiumViewer || !window.Cesium) return;
  clearEarthImagery();
  try {
    let provider;
    if (mode === "highResolution") {
      const config = EARTH_IMAGERY_CONFIG.highResolution;
      provider = new Cesium.UrlTemplateImageryProvider({
        url: config.url, credit: config.credit, maximumLevel: config.maximumLevel,
        tilingScheme: new Cesium.WebMercatorTilingScheme(), enablePickFeatures: false,
      });
      earthImageryErrorUnsubscribe = provider.errorEvent.addEventListener(() => {
        if (activeCelestialTargetId === "earth") void setEarthImageryMode("fallback");
      });
    } else {
      provider = await Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl(EARTH_IMAGERY_CONFIG.fallback.assetPath),
      );
    }
    if (activeCelestialTargetId !== "earth") return;
    earthBaseLayer = cesiumViewer.imageryLayers.addImageryProvider(provider, 0);
    showObservatoryMessage(mode === "fallback"
      ? "High-resolution imagery unavailable — fallback layer active."
      : "High-resolution tiled Earth imagery active. Visualization only.", mode === "fallback" ? "warning" : "info");
  } catch (error) {
    if (mode !== "fallback") return setEarthImageryMode("fallback");
    showObservatoryMessage("Earth imagery unavailable. Base globe remains active.", "error");
  }
}

async function initializeCesiumGlobe() {
  if (!selectors.cesiumGlobe) {
    return;
  }

  if (!window.Cesium) {
    showCesiumFallback("3D Earth unavailable. PCS data display remains operational.");
    return;
  }

  try {
    cesiumViewer = new Cesium.Viewer(selectors.cesiumGlobe, {
      animation: false,
      baseLayer: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      shouldAnimate: false,
      timeline: false,
      vrButton: false,
    });

    defaultSceneLight = cesiumViewer.scene.light;
    cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#1565c0");
    cesiumViewer.scene.globe.maximumScreenSpaceError = window.matchMedia("(max-width: 820px)").matches ? 2 : 1;
    cesiumViewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2);
    cesiumViewer.scene.skyAtmosphere.show = true;
    cesiumViewer.scene.globe.enableLighting = true;
    const cameraController = cesiumViewer.scene.screenSpaceCameraController;
    cameraController.minimumZoomDistance = 100;
    cameraController.maximumZoomDistance = 50000000;
    cameraController.enableRotate = true;
    cameraController.enableTranslate = true;
    cameraController.enableZoom = true;
    cameraController.inertiaZoom = 0;
    setCesiumCameraForRegion(activeRegionId);
    ensureVisitorDataSources();

    await setEarthImageryMode();
  } catch (error) {
    showCesiumFallback("3D Earth unavailable. PCS data display remains operational.");
  }
}

function seedFromString(value) {
  let seed = 2166136261;
  for (const character of value) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function withAlpha(hexColor, alpha) {
  const value = hexColor.replace("#", "");
  const normalized = value.length === 3 ? [...value].map((part) => part + part).join("") : value;
  const number = Number.parseInt(normalized, 16);
  return `rgba(${(number >> 16) & 255},${(number >> 8) & 255},${number & 255},${alpha})`;
}

function drawWrappedEllipse(context, canvas, x, y, radiusX, radiusY, rotation, fillStyle, strokeStyle = null) {
  [-canvas.width, 0, canvas.width].forEach((offset) => {
    context.beginPath();
    context.ellipse(x + offset, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    context.fillStyle = fillStyle;
    context.fill();
    if (strokeStyle) {
      context.strokeStyle = strokeStyle;
      context.lineWidth = Math.max(1, Math.min(radiusX, radiusY) * 0.14);
      context.stroke();
    }
  });
}

function drawScientificMottling(context, canvas, profile, random, count, radiusRange, opacity) {
  const palette = profile.palette;
  for (let index = 0; index < count; index += 1) {
    const radius = radiusRange[0] + random() * (radiusRange[1] - radiusRange[0]);
    drawWrappedEllipse(context, canvas, random() * canvas.width, random() * canvas.height,
      radius * (0.7 + random() * 1.2), radius * (0.35 + random() * 0.7), random() * Math.PI,
      withAlpha(palette[1 + (index % Math.max(1, palette.length - 1))], opacity * (0.35 + random() * 0.65)));
  }
}

function drawConfiguredSurfaceFeatures(context, canvas, profile, random) {
  const palette = profile.palette;
  const craterScale = profile.craterScale || [3, 24];
  for (let index = 0; index < (profile.craterDensity || 0); index += 1) {
    const radius = craterScale[0] + random() * (craterScale[1] - craterScale[0]);
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    drawWrappedEllipse(context, canvas, x, y, radius, radius * (0.72 + random() * 0.24), random() * Math.PI,
      withAlpha(palette[Math.min(2, palette.length - 1)], 0.2 + random() * 0.28), "rgba(12,13,15,.42)");
    drawWrappedEllipse(context, canvas, x - radius * 0.17, y - radius * 0.16, radius * 0.72, radius * 0.48, 0,
      "rgba(8,10,12,.16)");
  }

  context.lineCap = "round";
  context.lineJoin = "round";
  for (let index = 0; index < (profile.fractures || 0); index += 1) {
    const y = random() * canvas.height;
    const widthRange = profile.fractureWidth || profile.canyonWidth || [2, 11];
    const lineWidth = widthRange[0] + random() * (widthRange[1] - widthRange[0]);
    context.beginPath();
    context.moveTo(-16, y);
    context.bezierCurveTo(canvas.width * 0.25, y + random() * 150 - 75,
      canvas.width * 0.72, y + random() * 190 - 95, canvas.width + 16, y);
    context.strokeStyle = withAlpha(palette[palette.length - 1], 0.45 + random() * 0.38);
    context.lineWidth = lineWidth;
    context.stroke();
    context.strokeStyle = "rgba(38,28,28,.34)";
    context.lineWidth = Math.max(1, lineWidth * 0.34);
    context.stroke();
  }

  for (let index = 0; index < (profile.banding || 0); index += 1) {
    const y = random() * canvas.height;
    context.beginPath();
    context.moveTo(0, y);
    for (let segment = 1; segment <= 16; segment += 1) {
      context.lineTo((canvas.width / 16) * segment, y + Math.sin(segment * 1.7 + index) * (5 + random() * 15));
    }
    context.strokeStyle = withAlpha(palette[(index + 1) % palette.length], 0.16 + random() * 0.2);
    context.lineWidth = 9 + random() * 34;
    context.stroke();
  }

  for (let index = 0; index < (profile.volcanicCenters || 0); index += 1) {
    const dark = index % 4 !== 0;
    drawWrappedEllipse(context, canvas, random() * canvas.width, random() * canvas.height,
      7 + random() * 38, 4 + random() * 23, random() * Math.PI,
      dark ? "rgba(82,26,18,.72)" : "rgba(247,230,137,.78)", dark ? "rgba(36,18,15,.45)" : null);
  }

  for (let index = 0; index < (profile.groovedTerrain || 0); index += 1) {
    const x = random() * canvas.width;
    const width = 22 + random() * 66;
    context.fillStyle = withAlpha(palette[palette.length - 1], 0.13 + random() * 0.16);
    context.fillRect(x, 0, width, canvas.height);
    context.fillRect(x - canvas.width, 0, width, canvas.height);
  }

  if (profile.largeBasin || profile.radialBasin) {
    const x = canvas.width * (profile.radialBasin ? 0.67 : 0.28);
    const y = canvas.height * (profile.radialBasin ? 0.48 : 0.55);
    const rings = profile.radialBasin ? 5 : 2;
    for (let ring = rings; ring >= 1; ring -= 1) {
      const radius = canvas.height * (0.055 + ring * 0.045);
      drawWrappedEllipse(context, canvas, x, y, radius * 1.18, radius, 0,
        withAlpha(palette[palette.length - 1], 0.06 + (rings - ring) * 0.04), withAlpha(palette[palette.length - 1], 0.42));
    }
  }

  if (profile.tigerStripes) {
    context.strokeStyle = withAlpha(palette[palette.length - 1], 0.82);
    context.lineWidth = 7;
    for (let stripe = 0; stripe < profile.tigerStripes; stripe += 1) {
      const x = canvas.width * (0.58 + stripe * 0.025);
      context.beginPath();
      context.moveTo(x, canvas.height * 0.7);
      context.bezierCurveTo(x - 20, canvas.height * 0.8, x + 24, canvas.height * 0.9, x - 8, canvas.height);
      context.stroke();
    }
  }

  if (profile.polarContrast) {
    const polarGradient = context.createLinearGradient(0, 0, 0, canvas.height);
    polarGradient.addColorStop(0, "rgba(243,231,215,.42)");
    polarGradient.addColorStop(0.48, "rgba(243,231,215,0)");
    polarGradient.addColorStop(1, "rgba(137,91,89,.34)");
    context.fillStyle = polarGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  for (let index = 0; index < (profile.darkJets || 0); index += 1) {
    const x = random() * canvas.width;
    const y = canvas.height * (0.55 + random() * 0.36);
    context.strokeStyle = "rgba(55,48,49,.48)";
    context.lineWidth = 2 + random() * 5;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 10 + random() * 54, y - 8 - random() * 30);
    context.stroke();
  }

  if (profile.haze) {
    context.fillStyle = `rgba(215,125,48,${profile.haze})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function createSatelliteCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context || canvas.width === 0 || canvas.height === 0) throw new Error("satellite texture canvas unavailable");
  return { canvas, context };
}

function canvasToLoadedSatelliteImage(canvas, metadata) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("satellite texture canvas encoding failed"));
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        resolve({
        image,
        bodyId: metadata.bodyId,
        sourceType: metadata.sourceType,
        sourceLabel: metadata.sourceLabel,
        status: "ready",
        isFallback: metadata.isFallback,
        width: image.naturalWidth,
        height: image.naturalHeight,
        dispose() {
          URL.revokeObjectURL(objectUrl);
          image.removeAttribute("src");
        },
        });
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("encoded satellite texture did not decode"));
      };
      image.src = objectUrl;
    }, "image/png");
  });
}

async function createScientificSatelliteTexture(bodyConfig, options = {}) {
  const profile = bodyConfig.visualizationProfile;
  if (!profile) throw new Error("satellite visualization profile missing");
  const lowPerformanceMode = options.lowPerformanceMode ?? window.matchMedia("(max-width: 820px)").matches;
  const { canvas, context } = createSatelliteCanvas(lowPerformanceMode ? 1024 : 2048, lowPerformanceMode ? 512 : 1024);
  const random = seededRandom(seedFromString(profile.seed || bodyConfig.id));
  context.fillStyle = profile.palette[0];
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawScientificMottling(context, canvas, profile, random, Math.round(70 * profile.mottling), [canvas.width * 0.035, canvas.width * 0.13], 0.18);
  drawScientificMottling(context, canvas, profile, random, Math.round(260 * profile.mottling), [8, 55], 0.15);
  drawScientificMottling(context, canvas, profile, random, Math.round(980 * profile.roughness), [1.5, 9], 0.1);
  drawConfiguredSurfaceFeatures(context, canvas, profile, random);
  context.drawImage(canvas, 0, 0, 3, canvas.height, canvas.width - 3, 0, 3, canvas.height);
  return canvasToLoadedSatelliteImage(canvas, {
    bodyId: bodyConfig.id,
    sourceType: "procedural-scientific",
    sourceLabel: bodyConfig.textureProvider?.sourceLabel || "PCS scientific procedural approximation",
    isFallback: false,
  });
}

async function createSatelliteFallbackTexture(bodyConfig) {
  const { canvas, context } = createSatelliteCanvas(512, 256);
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#77797a");
  gradient.addColorStop(0.5, "#989a9a");
  gradient.addColorStop(1, "#686a6b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,.06)";
  context.fillRect(0, canvas.height * 0.34, canvas.width, canvas.height * 0.22);
  return canvasToLoadedSatelliteImage(canvas, {
    bodyId: bodyConfig.id,
    sourceType: "simplified-fallback",
    sourceLabel: "PCS simplified non-scientific fallback",
    isFallback: true,
  });
}

function logSatelliteTextureWarning({ bodyId, stage, source, error, fallbackApplied }) {
  const warningKey = `${bodyId}:${stage}:${source}`;
  if (satelliteTextureWarnings.has(warningKey)) return;
  satelliteTextureWarnings.add(warningKey);
  console.warn("[PCS Satellite Texture]", { bodyId, stage, source, error, fallbackApplied });
}

function disposeSatelliteTexture(textureResult) {
  textureResult?.dispose?.();
}

function cacheSatelliteTexture(bodyId, result) {
  satelliteTextureCache.delete(bodyId);
  satelliteTextureCache.set(bodyId, result);
  while (satelliteTextureCache.size > MAX_SATELLITE_TEXTURE_CACHE_ENTRIES) {
    const eviction = [...satelliteTextureCache.entries()].find(([cachedBodyId]) => cachedBodyId !== activeCelestialTargetId);
    if (!eviction) break;
    satelliteTextureCache.delete(eviction[0]);
    disposeSatelliteTexture(eviction[1]);
  }
  return result;
}

function loadSatelliteTextureUrl(bodyConfig, url, sourceType, sourceLabel) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    if (new URL(url, document.baseURI).origin !== window.location.origin) image.crossOrigin = "anonymous";
    image.onload = () => resolve({
      image, bodyId: bodyConfig.id, sourceType, sourceLabel, status: "ready", isFallback: false,
      width: image.naturalWidth, height: image.naturalHeight, metadata: bodyConfig.missionImagery,
      dispose() { image.removeAttribute("src"); },
    });
    image.onerror = () => reject(new Error(`satellite texture failed to load: ${url}`));
    image.src = new URL(url, document.baseURI).href;
  });
}

async function getSatelliteTexture(bodyId, options = {}) {
  const cached = satelliteTextureCache.get(bodyId);
  if (cached) return cacheSatelliteTexture(bodyId, cached);
  const bodyConfig = SATELLITE_REGISTRY[bodyId];
  if (!bodyConfig) {
    logSatelliteTextureWarning({ bodyId, stage: "registry-lookup", source: "registry", error: "body not found", fallbackApplied: false });
    throw new Error(`unknown satellite: ${bodyId}`);
  }
  const candidates = [
    bodyConfig.publicTextureUrl && { url: bodyConfig.publicTextureUrl, type: "public-texture", label: bodyConfig.publicTextureSource || "Public planetary imagery" },
    bodyConfig.localTextureUrl && { url: bodyConfig.localTextureUrl, type: "mission-imagery", label: bodyConfig.localTextureSource || "Mission imagery texture" },
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return cacheSatelliteTexture(bodyId, await loadSatelliteTextureUrl(bodyConfig, candidate.url, candidate.type, candidate.label));
    } catch (error) {
      logSatelliteTextureWarning({ bodyId, stage: "texture-load", source: candidate.url, error, fallbackApplied: false });
    }
  }
  logSatelliteTextureWarning({ bodyId, stage: "fallback", source: "mission-imagery", error: "all mission imagery candidates failed", fallbackApplied: true });
  return cacheSatelliteTexture(bodyId, await createSatelliteFallbackTexture(bodyConfig));
}

function applySatelliteTexture(target, textureResult, requestContext) {
  const stillActive = requestContext.generation === satelliteTextureGeneration
    && activeCelestialTargetId === requestContext.bodyId
    && target
    && cesiumViewer
    && !cesiumViewer.isDestroyed();
  if (!stillActive) {
    logSatelliteTextureWarning({ bodyId: requestContext.bodyId, stage: "async-stale", source: textureResult?.sourceType, error: "request superseded", fallbackApplied: false });
    return false;
  }
  if (!textureResult?.image || !textureResult.width || !textureResult.height) {
    throw new Error("satellite texture result has no decoded image");
  }
  target.material = Cesium.Material.fromType("Image", {
    image: textureResult.image,
    repeat: new Cesium.Cartesian2(1, 1),
    color: Cesium.Color.WHITE,
  });
  return true;
}

async function updateSatelliteTexture(body, targetAppearance) {
  const generation = ++satelliteTextureGeneration;
  const requestContext = { generation, bodyId: body.id };
  try {
    const result = await getSatelliteTexture(body.id);
    if (!targetAppearance) {
      if (generation !== satelliteTextureGeneration || activeCelestialTargetId !== body.id) return null;
      return result;
    }
    return applySatelliteTexture(targetAppearance, result, requestContext) ? result : null;
  } catch (error) {
    if (generation !== satelliteTextureGeneration || activeCelestialTargetId !== body.id) return null;
    logSatelliteTextureWarning({ bodyId: body.id, stage: "material-apply", source: "mission-imagery", error, fallbackApplied: true });
    const fallback = await createSatelliteFallbackTexture(body);
    if (!targetAppearance) return fallback;
    if (!applySatelliteTexture(targetAppearance, fallback, requestContext)) {
      disposeSatelliteTexture(fallback);
      return null;
    }
    return fallback;
  }
}

function satelliteTexturePresentation(textureResult) {
  if (!textureResult) return { source: "Preparing texture…", type: "Loading", status: "Loading", accuracy: "Visualization-only texture" };
  if (textureResult.sourceType === "public-texture") return { source: textureResult.sourceLabel, type: "Public planetary imagery", status: "Public planetary imagery", accuracy: "Source: NASA / JPL / USGS" };
  if (textureResult.sourceType === "mission-imagery") return { source: textureResult.sourceLabel, type: "Mission imagery texture", status: "Mission-derived global map", accuracy: "Public planetary imagery; coverage and processing are documented below" };
  if (textureResult.isFallback) return { source: textureResult.sourceLabel, type: "Simplified non-scientific fallback", status: "Mission imagery unavailable — Using simplified non-scientific fallback", accuracy: "Texture unavailable; no scientific surface details are represented" };
  return { source: textureResult.sourceLabel, type: "Unknown texture source", status: "Texture source unavailable", accuracy: "Not verified" };
}

function renderSatelliteInformation(satellite, textureResult = null) {
  const parentName = celestialTargetConfig[satellite.parentBodyId]?.displayName || satellite.parentBodyId;
  const texturePresentation = satellite.id === "moon"
    ? { source: "NASA / USGS LROC WAC", type: "Public planetary imagery", status: satellite.visualizationStatus, accuracy: "Verified global lunar mosaic in the existing Moon renderer" }
    : satelliteTexturePresentation(textureResult);
  const imagery = satellite.missionImagery || textureResult?.metadata || {};
  const values = {
    name: satellite.name,
    parent: parentName,
    type: "Natural satellite",
    radius: `${satellite.radiusKm.toLocaleString()} km (verified)`,
    distance: `${satellite.meanOrbitalRadiusKm.toLocaleString()} km (approximate mean)`,
    orbit: `${satellite.orbitalPeriodDays.toLocaleString()} Earth days (approximate mean)`,
    rotation: `${satellite.rotationPeriodDays.toLocaleString()} Earth days; synchronous (approximate)`,
    elements: `Inclination ${satellite.inclinationDeg}°; eccentricity ${satellite.eccentricity} (approximate mean)`,
    surface: satellite.surfaceAtmosphereSummary,
    missions: satellite.majorMissions.join(", "),
    visualizationSource: texturePresentation.source,
    mission: imagery.mission,
    instrument: imagery.instrument,
    productId: imagery.productId,
    projection: imagery.projection,
    colorMode: imagery.colorMode,
    coverage: imagery.coverage,
    textureResolution: textureResult?.isFallback ? `${textureResult.width} × ${textureResult.height}` : imagery.deployedResolution,
    processingStatus: imagery.processingNotes,
    textureType: texturePresentation.type,
    visualization: texturePresentation.status,
    scientificAccuracy: satellite.renderProfile?.shapeAxesKm
      ? `${texturePresentation.accuracy}; approximate shape visualization, not a high-resolution shape model`
      : texturePresentation.accuracy,
  };
  updateText(selectors.satelliteTitle, `${satellite.name} Observation`);
  updateText(selectors.satelliteDescription, satellite.description);
  selectors.satelliteValues.forEach((element) => {
    const value = values[element.dataset.satelliteValue];
    element.textContent = value || "";
    element.closest("div")?.toggleAttribute("hidden", !value);
  });
  selectors.satelliteHighlights?.replaceChildren(...satellite.scientificHighlights.map((highlight) => {
    const item = document.createElement("li");
    item.textContent = highlight;
    return item;
  }));
  if (selectors.satelliteDataSource) {
    selectors.satelliteDataSource.textContent = satellite.dataSource;
    selectors.satelliteDataSource.href = satellite.dataSourceUrl;
  }
}

async function renderSatellite(satellite) {
  if (!cesiumViewer || !window.Cesium) return false;
  const profile = satellite.renderProfile;
  const radiusMeters = satellite.radiusKm * 1000;
  const startTime = Cesium.JulianDate.now();
  cesiumViewer.scene.globe.show = false;
  cesiumViewer.scene.skyAtmosphere.show = false;
  cesiumViewer.scene.globe.enableLighting = false;
  const shapeAxesMeters = profile?.shapeAxesKm?.map((value) => value * 1000);
  const radii = shapeAxesMeters
    ? new Cesium.Cartesian3(...shapeAxesMeters)
    : new Cesium.Cartesian3(radiusMeters, radiusMeters, radiusMeters);
  renderSatelliteInformation(satellite);
  const textureResult = await updateSatelliteTexture(satellite, null);
  if (!textureResult) return false;
  const appearance = new Cesium.MaterialAppearance({
    material: Cesium.Material.fromType("Image", {
      image: textureResult.image,
      repeat: new Cesium.Cartesian2(1, 1),
      color: Cesium.Color.WHITE,
    }),
    materialSupport: Cesium.MaterialAppearance.MaterialSupport.TEXTURED,
    translucent: false,
    closed: true,
    flat: true,
    faceForward: true,
  });
  const primitive = cesiumViewer.scene.primitives.add(new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.EllipsoidGeometry({
        radii,
        stackPartitions: 96,
        slicePartitions: 96,
        vertexFormat: Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
      }),
    }),
    appearance,
    asynchronous: false,
    releaseGeometryInstances: true,
    modelMatrix: Cesium.Matrix4.clone(Cesium.Matrix4.IDENTITY),
  }));
  celestialSatellitePrimitives.push(primitive);
  const removeRotationListener = cesiumViewer.clock.onTick.addEventListener((clock) => {
    if (activeCelestialTargetId !== satellite.id || primitive.isDestroyed()) return;
    const seconds = Cesium.JulianDate.secondsDifference(clock.currentTime, startTime);
    const rotation = Cesium.Matrix3.fromRotationZ((seconds / 45) * Math.PI * 2);
    primitive.modelMatrix = Cesium.Matrix4.fromRotationTranslation(rotation, Cesium.Cartesian3.ZERO, primitive.modelMatrix);
  });
  celestialEventRemovers.push(removeRotationListener);
  const cameraController = cesiumViewer.scene.screenSpaceCameraController;
  cameraController.minimumZoomDistance = radiusMeters * 1.12;
  cameraController.maximumZoomDistance = radiusMeters * 60;
  flyToWithRuntime({
    destination: new Cesium.Cartesian3(radiusMeters * 4.2, 0, radiusMeters * 0.32),
    orientation: { direction: new Cesium.Cartesian3(-1, 0, -0.08), up: Cesium.Cartesian3.UNIT_Z },
    duration: 1.2,
  });
  renderSatelliteInformation(satellite, textureResult);
  if (profile?.atmosphereHaloColor && activeCelestialTargetId === satellite.id) {
    celestialSatelliteEntities.push(cesiumViewer.entities.add({
      name: `${satellite.name} dense-atmosphere visualization`,
      position: Cesium.Cartesian3.ZERO,
      ellipsoid: {
        radii: new Cesium.Cartesian3(radiusMeters * 1.035, radiusMeters * 1.035, radiusMeters * 1.035),
        material: Cesium.Color.fromCssColorString(profile.atmosphereHaloColor).withAlpha(0.13),
      },
    }));
  }
  updateText(selectors.solarSystemStatus,
    `${satellite.name} visualization active. ${textureResult.sourceLabel}; ${textureResult.width} × ${textureResult.height}. Physical radius is verified and inter-body distance is not rendered to scale.`);
  showObservatoryMessage(`${satellite.name} texture ready — ${textureResult.isFallback ? "simplified non-scientific fallback" : "mission imagery"}.`);
  cesiumViewer.scene.requestRender();
  return true;
}

function updateMonitoringScales(targetId) {
  const target = celestialTargetConfig[targetId];
  if (!target || !selectors.monitoringScaleControls) return;
  selectors.monitoringScaleControls.replaceChildren(...target.availableMonitoringScales.map((label, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `framework-button${index === 0 ? " is-active" : ""}`;
    button.dataset.observatoryMode = label.toLowerCase().replaceAll(" ", "-");
    button.textContent = label;
    button.setAttribute("aria-pressed", String(index === 0));
    return button;
  }));
  updateText(selectors.observatoryModeStatus, `${target.availableMonitoringScales[0]} scale active for ${target.displayName}.`);
  updateText(selectors.monitoringScaleStatus, `${target.availableMonitoringScales[0]} active`);
}

function updateCelestialNavigation(targetId) {
  const selectedSatellite = SATELLITE_REGISTRY[targetId];
  const selectedParentId = selectedSatellite?.parentBodyId || null;
  selectors.solarSystemControls.forEach((button) => {
    const active = button.dataset.solarTarget === targetId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  selectors.celestialSystems.forEach((system) => {
    const parentId = system.dataset.celestialSystem;
    system.classList.toggle("has-active-satellite", parentId === selectedParentId);
    if (parentId === selectedParentId) {
      system.classList.add("is-expanded");
      system.querySelector("[data-satellite-submenu]")?.removeAttribute("hidden");
      system.querySelector(":scope > [data-solar-target]")?.setAttribute("aria-expanded", "true");
    }
  });
}

function toggleCelestialSystem(parentButton) {
  const system = parentButton.closest("[data-celestial-system]");
  const submenu = system?.querySelector("[data-satellite-submenu]");
  if (!system || !submenu) return;
  const expanded = !system.classList.contains("is-expanded");
  system.classList.toggle("is-expanded", expanded);
  submenu.toggleAttribute("hidden", !expanded);
  parentButton.setAttribute("aria-expanded", String(expanded));
}

function flyToWithRuntime(options) {
  if (!cesiumViewer || cesiumViewer.isDestroyed()) return false;
  const originalComplete = options.complete;
  const originalCancel = options.cancel;
  try {
    cesiumViewer.camera.flyTo({
      ...options,
      complete: () => {
        cameraTransitionOperational = true;
        cameraTransitionFailed = false;
        originalComplete?.();
        refreshAnimationStatus();
      },
      cancel: () => {
        originalCancel?.();
        refreshAnimationStatus();
      },
    });
    return true;
  } catch (error) {
    cameraTransitionFailed = true;
    refreshAnimationStatus();
    return false;
  }
}

function clearEarthLayers() {
  [...activeEarthLayers.keys()].forEach(removeWeatherLayer);
  selectors.weatherLayerControls.forEach((control) => { control.checked = false; });
  clearEarthImagery();
  clearUserLocation();
}

function updatePcsAvailability(config) {
  if (!config || !selectors.currentState) return;
  if (config.id === "earth") {
    updateText(selectors.pcsStateLabel, "PCS State");
    updateText(selectors.pcsStateNote,
      "UNAVAILABLE — component definitions, normalization, weights, and validation method are not scientifically configured.");
    updateText(selectors.currentState, "UNAVAILABLE");
    return;
  }
  updateText(selectors.pcsStateLabel, "Earth PCS Reference");
  updateText(selectors.currentState, "N/A");
  updateText(selectors.pcsStateNote, "N/A — planetary PCS model not implemented. PCS_ENGINE remains Earth-derived and unchanged.");
}

async function setCelestialTarget(targetId) {
  const target = celestialTargetConfig[targetId];
  if (!target || !cesiumViewer || !window.Cesium || targetId === activeCelestialTargetId) return;
  showObservatoryMessage(`Loading ${target.displayName}…`);
  cancelPlanetImageryLoad();
  if (activeCelestialTargetId === "moon") {
    clearMoonLighting();
    clearMoonLandingSites();
  }
  if (activeCelestialTargetId === "earth") clearEarthLayers();
  else clearCelestialImagery();
  activeCelestialTargetId = targetId;
  updateVisitorLayerVisibility();
  updatePcsAvailability(target);
  updateCelestialNavigation(targetId);
  updateText(selectors.observatoryViewLabel, `${target.bodyType === "space" ? "Deep Space" : "3D Celestial"} Observatory`);
  updateText(selectors.observatoryViewTitle, `${target.displayName} — ${target.subtitle}`);
  updateText(selectors.celestialTargetStatus, `${target.displayName} ${target.status.toLowerCase()}`);
  selectors.celestialTargetStatus.className = `status-pill ${target.status === "Active" ? "status-normal" : "status-attention"}`;
  updateText(selectors.solarSystemStatus, `${target.displayName} ${target.status}. ${target.texture}`);
  updateMonitoringScales(targetId);
  selectors.locationPanel?.toggleAttribute("hidden", targetId !== "earth");
  document.querySelectorAll(".layer-control-panel").forEach((panel) => panel.toggleAttribute("hidden", targetId !== "earth"));
  if (selectors.moonPanel) selectors.moonPanel.hidden = targetId !== "moon";
  if (selectors.satellitePanel) selectors.satellitePanel.hidden = !SATELLITE_REGISTRY[targetId];
  if (selectors.solarPanel) selectors.solarPanel.hidden = targetId !== "sun";
  if (selectors.planetPanel) selectors.planetPanel.hidden = !PLANET_EPHEMERIS_TARGETS.has(targetId);
  cesiumViewer.scene.globe.show = target.bodyType !== "space";
  cesiumViewer.scene.skyAtmosphere.show = targetId === "earth";
  cesiumViewer.scene.globe.enableLighting = targetId === "earth";
  cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(target.color);
  const imageryConfig = PLANET_IMAGERY_CONFIG[targetId];
  const cameraController = cesiumViewer.scene.screenSpaceCameraController;
  cameraController.minimumZoomDistance = imageryConfig?.minimumZoomDistance || 100;
  cameraController.maximumZoomDistance = imageryConfig?.maximumZoomDistance || 50000000;
  if (imageryConfig) {
    cesiumViewer.scene.globe.enableLighting = imageryConfig.lighting;
    cesiumViewer.scene.skyAtmosphere.show = imageryConfig.atmosphereVisibility;
  }
  if (!SATELLITE_TARGETS.has(targetId)) {
    const [lon, lat, altitude] = target.cameraDestination;
    flyToWithRuntime({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, altitude), duration: 1.2 });
  }
  if (targetId === "earth") {
    restoreEarthLighting();
    await setEarthImageryMode();
    if (lastUserPosition) showUserLocation(lastUserPosition);
    updateVisitorLayerVisibility();
  } else if (targetId === "moon") {
    moonImageryActive = false;
    moonNumericalActive = false;
    renderSatelliteInformation(SATELLITE_REGISTRY.moon);
    await Promise.allSettled([loadMoonImagery(), loadMoonObservation()]);
    updateMoonStatusMessage();
  } else if (targetId === "sun") {
    solarImageryActive = false;
    solarNumericalActive = false;
    activeSolarObservationPayload = null;
    await loadSunObservation();
    updateSunStatusMessage();
  } else if (SATELLITE_TARGETS.has(targetId)) {
    await renderSatellite(SATELLITE_REGISTRY[targetId]);
  } else if (PLANET_EPHEMERIS_TARGETS.has(targetId)) {
    await Promise.allSettled([loadPlanetImagery(targetId), loadPlanetObservation(targetId)]);
  }
}

function clearUserLocation() {
  if (!cesiumViewer) return;
  if (userLocationEntity) cesiumViewer.entities.remove(userLocationEntity);
  if (userAccuracyEntity) cesiumViewer.entities.remove(userAccuracyEntity);
  userLocationEntity = userAccuracyEntity = null;
}

function showUserLocation(position) {
  if (!cesiumViewer || activeCelestialTargetId !== "earth") return;
  clearUserLocation();
  lastUserPosition = position;
  const { latitude, longitude, accuracy } = position.coords;
  const center = Cesium.Cartesian3.fromDegrees(longitude, latitude, 10);
  userAccuracyEntity = cesiumViewer.entities.add({ position: center, ellipse: { semiMajorAxis: accuracy, semiMinorAxis: accuracy, material: Cesium.Color.CYAN.withAlpha(0.14), outline: true, outlineColor: Cesium.Color.CYAN.withAlpha(0.65) } });
  userLocationEntity = cesiumViewer.entities.add({ position: center, point: { pixelSize: 12, color: Cesium.Color.CYAN, outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY }, label: { text: "You are here", font: "14px sans-serif", fillColor: Cesium.Color.WHITE, showBackground: true, backgroundColor: Cesium.Color.BLACK.withAlpha(0.7), pixelOffset: new Cesium.Cartesian2(0, -28), disableDepthTestDistance: Number.POSITIVE_INFINITY } });
  updateText(selectors.locationLatitude, latitude.toFixed(6));
  updateText(selectors.locationLongitude, longitude.toFixed(6));
  updateText(selectors.locationAccuracy, `${Math.round(accuracy)} m`);
  selectors.locationCoordinates.hidden = false;
  updateText(selectors.locationStatus, "Location found on this device. Select Locate Me again to fly to it.");
}

function flyToUserLocation() {
  if (!lastUserPosition || !cesiumViewer || activeCelestialTargetId !== "earth") return;
  const { longitude, latitude, accuracy } = lastUserPosition.coords;
  flyToWithRuntime({ destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, Math.max(accuracy * 8, 2500)), duration: 1.8 });
}

function requestUserLocation() {
  if (lastUserPosition) { flyToUserLocation(); return; }
  if (!navigator.geolocation) { updateText(selectors.locationStatus, "Location is not supported by this browser."); return; }
  updateText(selectors.locationStatus, "Requesting device location…");
  const onError = (error) => {
    const messages = { 1: "Location permission was denied.", 2: "Position is unavailable.", 3: "Location request timed out." };
    updateText(selectors.locationStatus, messages[error.code] || "Location could not be determined.");
  };
  navigator.geolocation.getCurrentPosition(showUserLocation, (error) => {
    if (error.code === 2 || error.code === 3) navigator.geolocation.getCurrentPosition(showUserLocation, onError, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    else onError(error);
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}

function initializeRegionalMode() {
  const storedRegion = readStorageValue(REGION_STORAGE_KEY, "global");
  activeRegionId = regionConfig[storedRegion] ? storedRegion : "global";
  rebuildRegionSelector();

  if (selectors.regionSelector) {
    selectors.regionSelector.value = activeRegionId;
    selectors.regionSelector.addEventListener("change", () => {
      const selectedRegion = selectors.regionSelector.value;
      writeStorageValue(REGION_STORAGE_KEY, selectedRegion);
      earthLayerRuntime?.deactivate("regional-earthquakes");
      earthLayerRuntime?.deactivate("regional-coastal");
      updateRegionContext(selectedRegion);
      setCesiumCameraForRegion(activeRegionId);
      loadLatestState();
      void loadRegionalObservation(selectedRegion);
    });
  }

  updateRegionContext(activeRegionId);
  rebuildRegionSelector();
  void loadRegionalObservation(activeRegionId);
}

function initializeLanguageSelector() {
  if (!selectors.languageSelector) {
    return;
  }

  selectors.languageSelector.value = getCurrentLanguage();
  selectors.languageSelector.addEventListener("change", () => {
    setLanguage(selectors.languageSelector.value);
  });

  window.addEventListener("pcs:languagechange", (event) => {
    const language = event.detail?.language ?? "en";
    translations = event.detail?.translations ?? {};
    selectors.languageSelector.value = language;
    document.documentElement.lang = language;
    translateUI();
    void runSafeAsync("PCS evidence panels language refresh", loadPcsEvidencePanels);
  });
}

function initializePlaceholderSelectors() {
  selectors.dataSourceSelector?.addEventListener("change", () => {
    updateText(selectors.dataMessage, "Source registry selection does not alter raw observations.");
  });

  selectors.aiModeSelector?.addEventListener("change", () => {
    updateText(selectors.aiCopilotMessage, "AI mode selected. AI Copilot is not active yet.");
  });
}

function formatAstronomyValue(value, unit, digits = 1) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  if (typeof value === "number") return `${value.toLocaleString(undefined, { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ""}`;
  if (/^\d{4}-\d\d-\d\dT/.test(String(value))) return new Date(value).toLocaleString();
  return String(value);
}

function setObservationBadge(status, stale = false) {
  const badge = selectors.celestialTargetStatus;
  if (!badge) return;
  badge.textContent = stale ? "Delayed · stale" : status === "live" ? "Live" : status === "delayed" ? "Delayed" : "Unavailable";
  badge.className = `status-pill ${status === "live" && !stale ? "status-normal" : status === "delayed" || stale ? "status-muted" : "status-alert"}`;
}

function renderProvenance(container, provenance, payload) {
  if (!container) return;
  container.replaceChildren();
  Object.entries(provenance || {}).forEach(([field, item]) => {
    const entry = document.createElement("div");
    entry.className = "provenance-entry";
    entry.textContent = `${field}: ${item.source || "Unavailable"} · ${item.type || "unknown"} · ${item.unit || "unit unavailable"} · observation/calculation: ${formatAstronomyValue(item.time)} · retrieved: ${formatAstronomyValue(payload.retrieved_at)} · status: ${payload.stale ? "stale" : payload.status}`;
    container.append(entry);
  });
}

function drawMoonPhase(fraction) {
  const canvas = selectors.moonPhaseGraphic;
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const size = canvas.width, radius = size * 0.42, center = size / 2;
  context.clearRect(0, 0, size, size);
  const phase = window.PCSMoonLighting?.normalizePhaseFraction(fraction);
  const illumination = window.PCSMoonLighting?.calculateIlluminatedFraction(phase, null);
  if (phase !== null && illumination !== null) {
    const pixels = context.createImageData(size, size);
    const cosine = illumination * 2 - 1;
    const lateral = Math.sqrt(Math.max(0, 1 - cosine * cosine)) * (phase < 0.5 ? 1 : -1);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const nx = (x + 0.5 - center) / radius;
        const ny = (y + 0.5 - center) / radius;
        const radial = nx * nx + ny * ny;
        if (radial > 1) continue;
        const nz = Math.sqrt(1 - radial);
        const lit = nx * lateral + nz * cosine > 0;
        const index = (y * size + x) * 4;
        const shade = lit ? Math.round(205 + nz * 38) : Math.round(10 + nz * 9);
        pixels.data[index] = shade;
        pixels.data[index + 1] = lit ? shade : shade + 3;
        pixels.data[index + 2] = lit ? Math.min(255, shade + 8) : shade + 9;
        pixels.data[index + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
  }
  context.strokeStyle = "rgba(210,225,239,.5)"; context.lineWidth = 2; context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2); context.stroke();
}

async function fetchAstronomy(path) {
  const response = await fetch(`${ASTRONOMY_PROXY_BASE}${path}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.error || "data unavailable");
  return payload;
}

async function loadMoonObservation() {
  updateText(selectors.moonError, "");
  try {
    const payload = await fetchAstronomy("/api/astronomy/moon"), data = payload.data || {};
    const units = { moon_age_days: "days", illumination_percent: "%", earth_distance_km: "km" };
    selectors.moonValues.forEach((element) => { const field = element.dataset.moonValue; element.textContent = formatAstronomyValue(data[field], units[field], field === "earth_distance_km" ? 0 : 2); });
    drawMoonPhase(data.phase_fraction); renderProvenance(selectors.moonProvenance, data.provenance, payload); setObservationBadge(payload.status, payload.stale);
    latestMoonEphemeris = data;
    updateMoonPhaseLighting(data);
    moonNumericalActive = true;
  } catch { updateText(selectors.moonError, "Moon ephemeris temporarily unavailable"); moonNumericalActive = false; latestMoonEphemeris = null; clearMoonLighting(); setObservationBadge("unavailable"); drawMoonPhase(null); }
  updateMoonStatusMessage();
}

function statusCategory(value, thresholds) {
  if (!Number.isFinite(value)) return "";
  return value >= thresholds.high ? "status-category-high" : value >= thresholds.medium ? "status-category-medium" : "status-category-low";
}

function renderAlerts(payload) {
  const alerts = Array.isArray(payload?.data) ? payload.data : [];
  latestActiveAlertCount = alerts.length;
  updateText(selectors.solarAlertCount, String(alerts.length)); selectors.solarAlertList?.replaceChildren();
  alerts.forEach((alert) => { const entry = document.createElement("article"); entry.className = "alert-entry"; entry.textContent = `${alert.title || "NOAA alert"}\n${alert.severity || "information"} · ${formatAstronomyValue(alert.issued_at)}\n${alert.summary || "No summary supplied."}`; selectors.solarAlertList?.append(entry); });
}

function renderSolarImageMetadata(payload) {
  const values = {
    instrument: payload.instrument,
    wavelength: payload.wavelength,
    observed_at: formatAstronomyValue(payload.observed_at),
    source: payload.source,
    status: payload.status,
  };
  selectors.solarImageValues.forEach((element) => {
    element.textContent = values[element.dataset.solarImageValue] || "Unavailable";
  });
}

function preloadScientificImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image could not be decoded"));
    image.src = url;
  });
}

async function loadSolarImage(mode = activeSolarImageMode) {
  const preferredMode = SOLAR_IMAGE_MODE_LABELS[mode] ? mode : "hmi-continuum";
  const candidates = selectPrimaryObservationProduct("sun", preferredMode);
  solarImageryActive = false;
  activeSolarObservationPayload = null;
  updateText(selectors.solarImageError, `Loading ${SOLAR_IMAGE_MODE_LABELS[preferredMode]}…`);
  if (selectors.solarImage) {
    selectors.solarImage.hidden = true;
    selectors.solarImage.removeAttribute("src");
  }
  for (const candidate of candidates) {
    activeSolarImageMode = candidate;
    selectors.solarImageControls.forEach((control) => {
      const active = control.dataset.solarImageMode === activeSolarImageMode;
      control.classList.toggle("is-active", active);
      control.setAttribute("aria-pressed", String(active));
    });
    try {
      const payload = await fetchAstronomy(`/api/space-weather/solar-image?mode=${encodeURIComponent(candidate)}`);
      const image = await preloadScientificImage(payload.image_url);
      if (activeCelestialTargetId !== "sun" || payload.mode !== candidate) return false;
      selectors.solarImage.src = payload.image_url;
      selectors.solarImage.alt = `${payload.instrument} ${payload.wavelength} solar observation from ${formatAstronomyValue(payload.observed_at)}`;
      selectors.solarImage.hidden = false;
      updateText(selectors.solarImageError,
        candidate === preferredMode ? "" : `${SOLAR_IMAGE_MODE_LABELS[preferredMode]} unavailable; ${SOLAR_IMAGE_MODE_LABELS[candidate]} fallback active.`);
      renderSolarImageMetadata(payload);
      renderObservationDisc(celestialTargetConfig.sun, image, payload);
      activeSolarObservationPayload = payload;
      solarImageryActive = true;
      updateSunStatusMessage();
      return true;
    } catch {
      // Try the next validated full-disc product before using the procedural fallback.
    }
  }
  updateText(selectors.solarImageError, "HMI and AIA full-disc observations unavailable; procedural fallback active.");
  renderSolarImageMetadata({ status: "unavailable" });
  await loadSunVisualization();
  updateSunStatusMessage();
  return false;
}

async function loadSolarObservation() {
  updateText(selectors.solarError, "");
  const [summaryResult, alertsResult] = await Promise.allSettled([fetchAstronomy("/api/space-weather/summary"), fetchAstronomy("/api/space-weather/alerts")]);
  if (summaryResult.status === "rejected") { updateText(selectors.solarError, "NOAA space-weather data temporarily unavailable"); solarNumericalActive = false; setObservationBadge("unavailable"); if (alertsResult.status === "fulfilled") renderAlerts(alertsResult.value); updateSunStatusMessage(); return; }
  const payload = summaryResult.value, data = payload.data || {};
  const units = { solar_wind_speed_km_s: "km/s", solar_wind_density_p_cm3: "p/cm³", imf_bz_nt: "nT", xray_flux_w_m2: "W/m²" };
  selectors.solarValues.forEach((element) => {
    const field = element.dataset.solarValue, value = field === "source_status" ? `${payload.status}${payload.partial ? " · partial" : ""}${payload.stale ? " · stale" : ""}` : data[field];
    element.textContent = formatAstronomyValue(value, units[field], field === "xray_flux_w_m2" ? 8 : 2); element.classList.remove("status-category-low", "status-category-medium", "status-category-high");
    let category = "";
    if (field === "kp_index") category = statusCategory(data[field], SPACE_WEATHER_UI_THRESHOLDS.kp);
    if (field === "solar_wind_speed_km_s") category = statusCategory(data[field], SPACE_WEATHER_UI_THRESHOLDS.solarWindSpeed);
    if (field === "xray_flux_w_m2") category = statusCategory(data[field], SPACE_WEATHER_UI_THRESHOLDS.xrayFlux);
    if (category) element.classList.add(category);
  });
  renderProvenance(selectors.solarProvenance, data.provenance, payload); setObservationBadge(payload.status, payload.stale);
  solarNumericalActive = true;
  if (alertsResult.status === "fulfilled") renderAlerts(alertsResult.value);
  updateSunStatusMessage();
}

function renderBodyValues(elements, data) {
  const units = {
    earth_distance_km: "km", sun_distance_km: "km", light_time_minutes: "min",
    apparent_magnitude: "mag", illumination_percent: "%", phase_angle_deg: "deg",
  };
  elements.forEach((element) => {
    const field = element.dataset.planetValue || element.dataset.sunValue;
    element.textContent = formatAstronomyValue(data?.[field], units[field], field?.endsWith("_km") ? 0 : 3);
  });
}

async function loadPlanetObservation(body) {
  updateText(selectors.planetError, "");
  updateText(selectors.planetTitle, `${celestialTargetConfig[body].displayName} Observation`);
  try {
    const payload = await fetchAstronomy(`/api/astronomy/body/${body}`);
    if (activeCelestialTargetId !== body) return;
    renderBodyValues(selectors.planetValues, payload.data || {});
    selectors.planetMeta.forEach((element) => {
      const field = element.dataset.planetMeta;
      const value = field === "source" ? payload.source : payload[field];
      element.textContent = formatAstronomyValue(value);
    });
    setObservationBadge(payload.status, payload.stale || payload.status === "stale");
    const imageryConfig = PLANET_IMAGERY_CONFIG[body];
    if (imageryConfig?.renderMode === "observation-disc") {
      const imagery = planetImageryCache.get(body);
      updateText(selectors.solarSystemStatus,
        `${imagery?.product || imageryConfig.productName}. Observation disc — not used as a global texture. JPL ephemeris ${payload.status}; observation time ${formatAstronomyValue(payload.observed_at)}.`);
    } else {
      updateText(selectors.solarSystemStatus, `${celestialTargetConfig[body].displayName} ephemeris ${payload.status}. Observation time ${formatAstronomyValue(payload.observed_at)}.`);
    }
  } catch {
    if (activeCelestialTargetId !== body) return;
    selectors.planetValues.forEach((element) => { element.textContent = "Unavailable"; });
    selectors.planetMeta.forEach((element) => { element.textContent = "Unavailable"; });
    updateText(selectors.planetError, `${celestialTargetConfig[body].displayName} ephemeris temporarily unavailable`);
    setObservationBadge("unavailable");
  }
}

async function loadSunObservation() {
  const [, , ephemerisResult] = await Promise.allSettled([
    loadSolarImage(activeSolarImageMode),
    loadSolarObservation(),
    fetchAstronomy("/api/astronomy/body/sun"),
  ]);
  if (activeCelestialTargetId !== "sun") return;
  if (ephemerisResult.status === "fulfilled") {
    renderBodyValues(selectors.sunValues, ephemerisResult.value.data || {});
    updateText(selectors.sunEphemerisTime, formatAstronomyValue(ephemerisResult.value.observed_at));
  } else {
    selectors.sunValues.forEach((element) => { element.textContent = "Unavailable"; });
    updateText(selectors.sunEphemerisTime, "Unavailable");
  }
  if (ephemerisResult.status === "fulfilled") solarNumericalActive = true;
  updateSunStatusMessage();
}

function initializeFrameworkControls() {
  selectors.solarSystemControls.forEach((control) => {
    control.setAttribute("aria-pressed", String(control.dataset.solarTarget === "earth"));
    control.addEventListener("click", () => {
      if (control.closest("[data-celestial-system]") && !SATELLITE_REGISTRY[control.dataset.solarTarget]) {
        toggleCelestialSystem(control);
      }
      void setCelestialTarget(control.dataset.solarTarget);
    });
  });
  selectors.solarImageControls.forEach((control) => {
    control.setAttribute("aria-pressed", String(control.dataset.solarImageMode === activeSolarImageMode));
    control.addEventListener("click", () => { void loadSolarImage(control.dataset.solarImageMode); });
  });

  selectors.monitoringScaleControls?.addEventListener("click", (event) => {
    const control = event.target.closest("[data-observatory-mode]");
    if (!control) return;
    selectors.monitoringScaleControls.querySelectorAll("[data-observatory-mode]").forEach((button) => {
      const active = button === control;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    updateText(selectors.observatoryModeStatus, `${control.textContent} scale active for ${celestialTargetConfig[activeCelestialTargetId].displayName}.`);
    updateText(selectors.monitoringScaleStatus, `${control.textContent} active`);
    if (activeCelestialTargetId === "moon" && cesiumViewer) {
      const mode = control.dataset.observatoryMode;
      clearMoonLandingSites();
      if (mode === "landing-sites") showMoonLandingSites();
      const view = mode === "far-side"
        ? { lon: 0, lat: 0, altitude: 16000000 }
        : mode === "landing-sites"
          ? { lon: -156.53, lat: 0.67, altitude: 4500000 }
          : { lon: 180, lat: 0, altitude: mode === "satellite-view" ? 7000000 : 16000000 };
      flyToWithRuntime({
        destination: Cesium.Cartesian3.fromDegrees(view.lon, view.lat, view.altitude),
        duration: 1.1,
      });
      updateText(selectors.observatoryModeStatus, `${control.textContent} active for Moon. Orientation is simplified; physical libration is not implemented.`);
    }
  });

  selectors.locateMe?.addEventListener("click", requestUserLocation);

  selectors.timelineControls.forEach((control) => {
    control.addEventListener("click", () => {
      const action = control.dataset.timelineAction || "timeline";
      if (!timelineFrames.length) { updateText(selectors.timelineStatus, `${pcsStatusLabel("waiting_for_time_series")}. ${t("validated_timeline_unavailable")}`); return; }
      const showFrame = () => {
        const frame = timelineFrames[timelineFrameIndex];
        updateText(selectors.timelineStatus, `${pcsStatusLabel("active")} · ${timelineFrameIndex + 1}/${timelineFrames.length} · ${formatPcsTime(frame?.occurred_at)} · ${frame?.description || frame?.milestone_type || ""}`);
      };
      if (action === "pause") { clearInterval(timelinePlaybackTimer); timelinePlaybackTimer = null; showFrame(); return; }
      if (action === "step-back") timelineFrameIndex = (timelineFrameIndex - 1 + timelineFrames.length) % timelineFrames.length;
      if (action === "step-forward") timelineFrameIndex = (timelineFrameIndex + 1) % timelineFrames.length;
      if (action === "play") {
        clearInterval(timelinePlaybackTimer);
        const speed = Math.max(0.5, Number(selectors.timelineSpeed?.value) || 1);
        timelinePlaybackTimer = setInterval(() => { timelineFrameIndex = (timelineFrameIndex + 1) % timelineFrames.length; showFrame(); }, 2000 / speed);
      }
      showFrame();
    });
  });

  selectors.timelineSpeed?.addEventListener("change", () => {
    updateText(selectors.timelineStatus, timelineFrames.length ? `${t("timeline_speed")}: ${selectors.timelineSpeed.value}×` : `${pcsStatusLabel("waiting_for_time_series")}. ${t("validated_timeline_unavailable")}`);
  });

  selectors.soundToggle?.addEventListener("change", () => {
    selectors.soundToggle.checked = false;
    updateText(selectors.audioStatus, "NOT_CONFIGURED. No audio assets loaded.");
  });

  selectors.voiceToggle?.addEventListener("change", () => {
    selectors.voiceToggle.checked = false;
    updateText(selectors.audioStatus, "NOT_CONFIGURED. No voice assets loaded.");
  });
}

function initializeLayerControls() {
  if (!selectors.layerControls.length) {
    return;
  }

  selectors.layerControls.forEach((control) => {
    control.addEventListener("change", () => {
      if (!control.checked) {
        updateText(selectors.layerControlMessage, "Select a layer to view connection status.");
        return;
      }

      const status = control.dataset.layerStatus;

      if (status === "connected") {
        updateText(selectors.layerControlMessage, "Layer selected. Visualization overlay is not implemented in this milestone.");
        return;
      }

      if (status === "waiting") {
        updateText(selectors.layerControlMessage, "Dataset not connected yet.");
        return;
      }

      updateText(selectors.layerControlMessage, "UNAVAILABLE. No provider-backed observation is connected.");
    });
  });
}

function renderBuildTimestamp() {
  updateText(selectors.buildTimestamp, document.lastModified || "Static prototype");
}

function visitorApiUrl(path) {
  return `${VISITOR_API_BASE}${path}`;
}

function setVisitorMetric(element, value) {
  updateText(element, value === null || typeof value === "undefined" ? "—" : String(value));
}

function setVisitorUnavailable() {
  [
    selectors.visitorOnline,
    selectors.visitorToday,
    selectors.visitorTotal,
    selectors.visitorUnique,
    selectors.visitorCountries,
    selectors.visitorLatest,
    selectors.visitorUpdated,
  ].forEach((element) => updateText(element, "Unavailable"));
  updateText(selectors.visitorNetworkStatus, "Unavailable");
}

function getVisitorSessionId() {
  const existing = readStorageValue(VISITOR_SESSION_STORAGE_KEY, "");
  if (existing) return existing;
  let generated = "";
  if (window.crypto?.randomUUID) {
    generated = window.crypto.randomUUID();
  } else if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    generated = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } else {
    generated = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  }
  writeStorageValue(VISITOR_SESSION_STORAGE_KEY, generated);
  return generated;
}

async function postVisitorEvent(path) {
  if (!visitorSessionId) return null;
  const response = await fetch(visitorApiUrl(path), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: visitorSessionId }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Visitor API failed: ${path}`);
  return response.json();
}

function formatVisitorNumber(value) {
  return typeof value === "number" ? value.toLocaleString() : "—";
}

function formatVisitorPlace(location) {
  if (!location) return "—";
  if (location.city && location.country) return `${location.city}, ${location.country}`;
  if (location.city) return location.city;
  if (location.country) return location.country;
  return "Unknown Region";
}

function formatVisitorLocalTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function refreshVisitorStats() {
  try {
    const response = await fetch(visitorApiUrl("/api/visitors/stats"), { cache: "no-store" });
    if (!response.ok) throw new Error("visitor_stats_unavailable");
    const stats = await response.json();
    setVisitorMetric(selectors.visitorOnline, formatVisitorNumber(stats.online));
    setVisitorMetric(selectors.visitorToday, formatVisitorNumber(stats.todayVisits));
    setVisitorMetric(selectors.visitorTotal, formatVisitorNumber(stats.totalVisits));
    setVisitorMetric(selectors.visitorUnique, formatVisitorNumber(stats.uniqueSessions));
    setVisitorMetric(selectors.visitorCountries, formatVisitorNumber(stats.countries));
    setVisitorMetric(selectors.visitorLatest, formatVisitorPlace(stats.latestVisitor));
    setVisitorMetric(selectors.visitorUpdated, formatVisitorLocalTime(stats.lastUpdated));
    updateText(selectors.visitorNetworkStatus, "PCS Global Observatory Network active.");
  } catch (error) {
    setVisitorUnavailable();
  }
}

function updateVisitorLayerVisibility() {
  const isEarth = activeCelestialTargetId === "earth";
  const heatEnabled = readStorageValue(OBSERVATION_HEAT_STORAGE_KEY, "false") === "true";
  const networkEnabled = readStorageValue(NETWORK_CONNECTIONS_STORAGE_KEY, "false") === "true";
  if (visitorDataSource) visitorDataSource.show = isEarth;
  if (visitorHeatDataSource) visitorHeatDataSource.show = isEarth && heatEnabled;
  if (visitorNetworkDataSource) visitorNetworkDataSource.show = isEarth && networkEnabled;
}

function ensureVisitorDataSources() {
  if (!cesiumViewer || !window.Cesium) return;
  if (!visitorDataSource) {
    visitorDataSource = new Cesium.CustomDataSource("visitorDataSource");
    cesiumViewer.dataSources.add(visitorDataSource);
  }
  if (!visitorHeatDataSource) {
    visitorHeatDataSource = new Cesium.CustomDataSource("visitorHeatDataSource");
    cesiumViewer.dataSources.add(visitorHeatDataSource);
  }
  if (!visitorNetworkDataSource) {
    visitorNetworkDataSource = new Cesium.CustomDataSource("visitorNetworkDataSource");
    cesiumViewer.dataSources.add(visitorNetworkDataSource);
  }
  updateVisitorLayerVisibility();
}

function renderVisitorLocations(locations = []) {
  ensureVisitorDataSources();
  if (!visitorDataSource || !window.Cesium) return;
  visitorDataSource.entities.removeAll();
  visitorLocationByEntityId = new Map();
  locations.slice(0, 100).forEach((location, index) => {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const count = Math.max(1, Number(location.count || 1));
    const id = `visitor-location-${index}`;
    visitorDataSource.entities.add({
      id,
      name: formatVisitorPlace(location),
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
      point: {
        pixelSize: Math.min(11, 5 + Math.log2(count + 1) * 1.6),
        color: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.82),
        outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
        outlineWidth: 1.5,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    visitorLocationByEntityId.set(id, location);
  });
  updateVisitorLayerVisibility();
}

function renderRecentVisitorRegions(locations = []) {
  if (!selectors.visitorRecentRegions) return;
  const items = locations.slice(0, 5).map((location) => {
    const item = document.createElement("li");
    item.textContent = formatVisitorPlace(location);
    return item;
  });
  if (!items.length) {
    const item = document.createElement("li");
    item.textContent = "—";
    items.push(item);
  }
  selectors.visitorRecentRegions.replaceChildren(...items);
}

async function refreshVisitorLocations() {
  try {
    const response = await fetch(visitorApiUrl("/api/visitors/locations"), { cache: "no-store" });
    if (!response.ok) throw new Error("visitor_locations_unavailable");
    const payload = await response.json();
    const locations = Array.isArray(payload.locations) ? payload.locations : [];
    renderVisitorLocations(locations);
    renderRecentVisitorRegions(locations);
  } catch (error) {
    updateText(selectors.visitorNetworkStatus, "Visitor locations unavailable; keeping previous markers.");
  }
}

function renderVisitorTrendChart(trend = [], range = "24h") {
  if (!selectors.visitorTrendChart) return;
  if (!trend.length) {
    updateText(selectors.visitorTrendChart, "—");
    return;
  }
  const width = 260;
  const height = 112;
  const pad = 16;
  const maxValue = Math.max(1, ...trend.map((bucket) => Math.max(bucket.visits || 0, bucket.uniqueSessions || 0)));
  const pointsFor = (key) => trend.map((bucket, index) => {
    const x = trend.length <= 1 ? pad : pad + (index / (trend.length - 1)) * (width - pad * 2);
    const y = height - pad - ((bucket[key] || 0) / maxValue) * (height - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const labels = [trend[0], trend[trend.length - 1]].filter(Boolean).map((bucket) => {
    const date = new Date(bucket.time);
    return range === "24h"
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
  });
  selectors.visitorTrendChart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="rgba(159,183,213,.36)"></line>
      <polyline points="${pointsFor("visits")}" fill="none" stroke="#22d3ee" stroke-width="2"></polyline>
      <polyline points="${pointsFor("uniqueSessions")}" fill="none" stroke="#9d7cff" stroke-width="1.5" opacity=".86"></polyline>
    </svg>
    <div class="visitor-section-heading"><small>${labels[0] || ""}</small><small>${labels[1] || ""}</small></div>
    <small><span style="color:#22d3ee">Visits</span> / <span style="color:#9d7cff">Unique sessions</span></small>`;
}

function renderVisitorCountryRanking(countries = []) {
  if (!selectors.visitorCountryRanking) return;
  const items = countries.slice(0, 5).map((country, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${index + 1}. ${country.country || country.countryCode}</strong> <span>${formatVisitorNumber(country.visits)} visits</span><br><small>${formatVisitorNumber(country.uniqueSessions)} unique sessions</small>`;
    return item;
  });
  if (!items.length) {
    const item = document.createElement("li");
    item.textContent = "—";
    items.push(item);
  }
  selectors.visitorCountryRanking.replaceChildren(...items);
}

function renderVisitorHeat(heatLocations = []) {
  ensureVisitorDataSources();
  if (!visitorHeatDataSource || !window.Cesium) return;
  visitorHeatDataSource.entities.removeAll();
  heatLocations.slice(0, 100).forEach((location, index) => {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const weight = Math.max(1, Math.min(100, Number(location.weight || 1)));
    const alpha = Math.min(0.34, 0.08 + weight / 380);
    visitorHeatDataSource.entities.add({
      id: `visitor-heat-${index}`,
      position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
      point: {
        pixelSize: Math.min(26, 8 + Math.sqrt(weight) * 2.1),
        color: Cesium.Color.fromCssColorString("#0ea5e9").withAlpha(alpha),
        outlineColor: Cesium.Color.fromCssColorString("#7dd3fc").withAlpha(alpha + 0.12),
        outlineWidth: 1,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
  });
  updateVisitorLayerVisibility();
}

function renderVisitorNetwork(heatLocations = []) {
  ensureVisitorDataSources();
  if (!visitorNetworkDataSource || !window.Cesium) return;
  visitorNetworkDataSource.entities.removeAll();
  const locations = heatLocations
    .filter((location) => Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude)))
    .slice(0, 20);
  if (locations.length < 2) {
    updateVisitorLayerVisibility();
    return;
  }
  const totalWeight = locations.reduce((total, location) => total + Math.max(1, Number(location.weight || 1)), 0);
  const hubLon = locations.reduce((total, location) => total + Number(location.longitude) * Math.max(1, Number(location.weight || 1)), 0) / totalWeight;
  const hubLat = locations.reduce((total, location) => total + Number(location.latitude) * Math.max(1, Number(location.weight || 1)), 0) / totalWeight;
  const hub = Cesium.Cartesian3.fromDegrees(hubLon, hubLat, 150000);
  locations.forEach((location, index) => {
    const weight = Math.max(1, Math.min(100, Number(location.weight || 1)));
    visitorNetworkDataSource.entities.add({
      id: `visitor-network-${index}`,
      name: "PCS Observatory Network",
      polyline: {
        positions: [Cesium.Cartesian3.fromDegrees(Number(location.longitude), Number(location.latitude), 30000), hub],
        width: Math.min(2.2, 0.8 + Math.sqrt(weight) / 12),
        arcType: Cesium.ArcType.GEODESIC,
        material: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.18),
      },
    });
  });
  updateVisitorLayerVisibility();
}

async function refreshVisitorAnalytics(range = visitorAnalyticsRange) {
  try {
    const response = await fetch(visitorApiUrl(`/api/visitors/analytics?range=${encodeURIComponent(range)}`), { cache: "no-store" });
    if (!response.ok) throw new Error("visitor_analytics_unavailable");
    const analytics = await response.json();
    latestVisitorAnalytics = analytics;
    latestVisitorAnalyticsAt = Date.now();
    visitorAnalyticsRange = analytics.range || range;
    renderVisitorTrendChart(analytics.trend || [], visitorAnalyticsRange);
    renderVisitorCountryRanking(analytics.countryRanking || []);
    renderVisitorHeat(analytics.heatLocations || []);
    renderVisitorNetwork(analytics.heatLocations || []);
    updateText(selectors.visitorAnalyticsStatus, "Updated");
  } catch (error) {
    updateText(selectors.visitorAnalyticsStatus, "Unavailable");
    if (latestVisitorAnalytics) {
      renderVisitorTrendChart(latestVisitorAnalytics.trend || [], latestVisitorAnalytics.range || visitorAnalyticsRange);
      renderVisitorCountryRanking(latestVisitorAnalytics.countryRanking || []);
    }
  }
}

function initializeVisitorControls() {
  if (selectors.visitorDetails) {
    selectors.visitorDetails.open = !window.matchMedia("(max-width: 820px)").matches;
  }
  if (selectors.visitorHeatToggle) {
    selectors.visitorHeatToggle.checked = readStorageValue(OBSERVATION_HEAT_STORAGE_KEY, "false") === "true";
    selectors.visitorHeatToggle.addEventListener("change", () => {
      writeStorageValue(OBSERVATION_HEAT_STORAGE_KEY, String(selectors.visitorHeatToggle.checked));
      if (!selectors.visitorHeatToggle.checked) visitorHeatDataSource?.entities.removeAll();
      else renderVisitorHeat(latestVisitorAnalytics?.heatLocations || []);
      updateVisitorLayerVisibility();
    });
  }
  if (selectors.visitorNetworkToggle) {
    selectors.visitorNetworkToggle.checked = readStorageValue(NETWORK_CONNECTIONS_STORAGE_KEY, "false") === "true";
    selectors.visitorNetworkToggle.addEventListener("change", () => {
      writeStorageValue(NETWORK_CONNECTIONS_STORAGE_KEY, String(selectors.visitorNetworkToggle.checked));
      if (!selectors.visitorNetworkToggle.checked) visitorNetworkDataSource?.entities.removeAll();
      else renderVisitorNetwork(latestVisitorAnalytics?.heatLocations || []);
      updateVisitorLayerVisibility();
    });
  }
  selectors.visitorRangeTabs.forEach((button) => {
    button.addEventListener("click", () => {
      visitorAnalyticsRange = button.dataset.visitorRange || "24h";
      selectors.visitorRangeTabs.forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      void runSafeAsync("visitor analytics range refresh", () => refreshVisitorAnalytics(visitorAnalyticsRange));
    });
  });
}

async function initializeVisitorNetwork() {
  initializeVisitorControls();
  ensureVisitorDataSources();
  visitorSessionId = getVisitorSessionId();
  try {
    await postVisitorEvent("/api/visitors/register");
  } catch (error) {
    updateText(selectors.visitorNetworkStatus, "Unavailable");
  }
  await Promise.allSettled([
    refreshVisitorStats(),
    refreshVisitorLocations(),
    refreshVisitorAnalytics(visitorAnalyticsRange),
  ]);
}

async function pingVisitorPresence() {
  try {
    await postVisitorEvent("/api/visitors/ping");
  } catch {
    updateText(selectors.visitorNetworkStatus, "Visitor presence ping unavailable; retrying automatically.");
  }
}

function reportStartupError(label, error) {
  console.error(`[PCS_OBSERVATORY] ${label} failed:`, error);
  const currentMessage = selectors.dataMessage?.textContent || "";
  if (!currentMessage.includes("Initialization warning")) {
    updateText(selectors.dataMessage, `Initialization warning: ${label}. Core UI remains available.`);
  }
}

function runSafe(label, operation) {
  try {
    operation();
  } catch (error) {
    reportStartupError(label, error);
  }
}

async function runSafeAsync(label, operation) {
  try {
    await operation();
  } catch (error) {
    reportStartupError(label, error);
  }
}

function buildWeatherTileUrl(layerPath) {
  return `${WEATHER_PROXY_BASE}/tiles/openweather/${layerPath}/{z}/{x}/{y}.png`;
}

function updateWeatherActiveLayersStatus() {
  const labels = [...activeEarthLayers.keys()]
    .map((id) => earthLayerRuntime?.registry.get(id)?.label ?? WEATHER_LAYER_CONFIG[id]?.label ?? id)
    .join(", ");
  updateText(selectors.weatherActiveLayers, labels ? `Active layers: ${labels}` : "Active layers: none");
  if (selectors.weatherActiveLayers) {
    selectors.weatherActiveLayers.dataset.activeLayerCount = String(activeEarthLayers.size);
    selectors.weatherActiveLayers.dataset.activeResourceCount = String([...activeEarthLayers.values()].reduce((count, entry) => count + (entry.layer ? 1 : 0) + (entry.entities?.length || 0) + (entry.dataSources?.length || 0), 0));
    const viewer = earthLayerRuntime?.viewerProvider?.();
    if (viewer && !viewer.isDestroyed()) {
      selectors.weatherActiveLayers.dataset.cesiumImageryLayerCount = String(viewer.imageryLayers.length);
      selectors.weatherActiveLayers.dataset.cesiumEntityCount = String(viewer.entities.values.length);
      selectors.weatherActiveLayers.dataset.cesiumDataSourceCount = String(viewer.dataSources.length);
      selectors.weatherActiveLayers.dataset.cesiumImageryOrder = [...activeEarthLayers.entries()]
        .filter(([, entry]) => entry.layer)
        .sort((left, right) => viewer.imageryLayers.indexOf(left[1].layer) - viewer.imageryLayers.indexOf(right[1].layer))
        .map(([id]) => id)
        .join(",");
    }
  }
  refreshAnimationStatus();
}

function setWeatherProxyStatus(message) {
  updateText(selectors.weatherProxyStatus, message);
}

function setWeatherTileError(message) {
  updateText(selectors.weatherTileError, message);
}

function resetWeatherStatusDisplay() {
  updateWeatherActiveLayersStatus();
  setWeatherTileError("");
}

function weatherControl(layerId) {
  return [...selectors.weatherLayerControls].find((control) => control.dataset.weatherLayer === layerId) || null;
}

function weatherOpacityControl(layerId) {
  return [...selectors.weatherOpacityControls].find((control) => control.dataset.weatherOpacity === layerId) || null;
}

function earthLayerControl(layerId) {
  return weatherControl(layerId) || document.querySelector(`[data-pcs-layer="${CSS.escape(layerId)}"]`);
}

function earthLayerOpacityControl(layerId) {
  return weatherOpacityControl(layerId) || document.querySelector(`[data-pcs-opacity="${CSS.escape(layerId)}"]`);
}

function updateWeatherLayerMetadata(layerId, status, observationTime = null, retrievalTime = null, reason = null) {
  const source = weatherControl(layerId)?.closest(".weather-layer")?.querySelector("small");
  if (!source) return;
  const times = [
    observationTime ? `observed ${formatPcsTime(observationTime)}` : "observation time not supplied",
    retrievalTime ? `retrieved ${formatPcsTime(retrievalTime)}` : null,
  ].filter(Boolean).join("; ");
  source.textContent = `OpenWeather · ${status}${times ? ` · ${times}` : ""}${reason ? ` · ${reason}` : ""}`;
}

function updateLayerCapabilityRuntime(layerId, runtimeStatus, failureReason = null, timestamps = {}) {
  const config = WEATHER_LAYER_CONFIG[layerId];
  const capabilityId = config?.capabilityId || layerId;
  const current = earthLayerCapabilityMatrix.get(capabilityId) || { layer_id: capabilityId };
  earthLayerCapabilityMatrix.set(capabilityId, {
    ...current,
    runtime_status: runtimeStatus,
    failure_reason: failureReason,
    latest_observation_time: timestamps.observationTime || current.latest_observation_time || null,
    latest_retrieval_time: timestamps.retrievalTime || current.latest_retrieval_time || null,
  });
  if (config) updateWeatherLayerMetadata(layerId, runtimeStatus, timestamps.observationTime, timestamps.retrievalTime, failureReason);
  const providerStatus = document.querySelector(`[data-pcs-layer-entry="${CSS.escape(capabilityId)}"] [data-pcs-provider-status]`);
  if (providerStatus) {
    const layer = earthLayerCapabilityMatrix.get(capabilityId);
    providerStatus.textContent = `${runtimeStatus} · ${layer.provider || "Provider unavailable"} · ${layerValueText(layer)}`;
  }
  const wrapper = document.querySelector(`[data-pcs-layer-entry="${CSS.escape(capabilityId)}"]`);
  const mapObservation = wrapper?.querySelector("[data-pcs-map-observation]");
  const mapObservationEnd = wrapper?.querySelector("[data-pcs-map-observation-end]");
  const mapRetrieval = wrapper?.querySelector("[data-pcs-map-retrieval]");
  if (mapObservation && timestamps.observationTime) mapObservation.textContent = formatPcsTime(timestamps.observationTime);
  if (mapObservationEnd && timestamps.observationEndTime) mapObservationEnd.textContent = formatPcsTime(timestamps.observationEndTime);
  if (mapRetrieval && timestamps.retrievalTime) mapRetrieval.textContent = formatPcsTime(timestamps.retrievalTime);
}

function renderWeatherLegend(config, visible) {
  const host = config.kind === "weather"
    ? selectors.weatherLegends
    : config.kind.startsWith("regional_")
      ? selectors.regionalLegends
      : document.querySelector(`[data-pcs-layer-entry="${CSS.escape(config.id)}"] [data-scientific-legend]`);
  if (!host) return;
  let legend = host.querySelector(`[data-weather-legend="${config.id}"]`);
  if (!legend) {
    legend = document.createElement("div");
    legend.className = "weather-legend";
    legend.dataset.weatherLegend = config.id;
    const label = document.createElement("span");
    label.textContent = `${config.label}: ${(config.legend || []).join(" · ")}`;
    legend.append(label);
    if (config.legendUrl) {
      const image = document.createElement("img");
      image.className = "scientific-legend-image";
      image.src = config.legendUrl;
      image.alt = `${config.label} legend`;
      legend.append(image);
    } else {
      const scale = document.createElement("span");
      scale.className = "weather-legend-scale";
      scale.setAttribute("aria-hidden", "true");
      legend.append(scale);
    }
    host.append(legend);
  }
  legend.hidden = !visible;
}

async function validateWeatherTile(config) {
  const response = await fetch(`${WEATHER_PROXY_BASE}/tiles/openweather/${config.path}/1/1/1.png`, { cache: "default" });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} from ${config.label} tile proxy`);
    error.status = response.status;
    throw error;
  }
  const contentType = response.headers.get("content-type") || "";
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!contentType.startsWith("image/") || bytes.length < 4 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    throw new Error(`${config.label} tile proxy returned a non-PNG response`);
  }
  const observationHeader = response.headers.get("x-pcs-observation-time");
  return {
    observationTime: observationHeader && observationHeader !== "unavailable" ? observationHeader : null,
    retrievalTime: response.headers.get("x-pcs-retrieved-at") || new Date().toISOString(),
  };
}

let gibsCapabilitiesPromise = null;

function directXmlChildText(element, localName) {
  return element ? [...element.children].find((child) => child.localName === localName)?.textContent?.trim() || null : null;
}

async function resolveGibsDefinition(config) {
  if (!gibsCapabilitiesPromise) {
    gibsCapabilitiesPromise = fetch(config.capabilitiesUrl, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(`NASA GIBS capabilities returned HTTP ${response.status}`);
      return new DOMParser().parseFromString(await response.text(), "application/xml");
    }).catch((error) => {
      gibsCapabilitiesPromise = null;
      throw error;
    });
  }
  const xml = await gibsCapabilitiesPromise;
  const layer = [...xml.getElementsByTagNameNS("*", "Layer")].find((item) => directXmlChildText(item, "Identifier") === config.gibsLayer);
  if (!layer) throw new Error(`NASA GIBS layer ${config.gibsLayer} is unavailable`);
  const time = [...layer.getElementsByTagNameNS("*", "Dimension")].find((item) => directXmlChildText(item, "Identifier") === "Time");
  const observationTime = directXmlChildText(time, "Default");
  if (!observationTime) throw new Error(`NASA GIBS did not publish a current time for ${config.gibsLayer}`);
  let observationEndTime = null;
  if (config.compositeDays) {
    const end = new Date(observationTime);
    end.setUTCDate(end.getUTCDate() + config.compositeDays - 1);
    observationEndTime = end.toISOString();
  }
  return { observationTime, observationEndTime, retrievalTime: new Date().toISOString() };
}

async function validateImageResource(url, label) {
  const response = await fetch(url, { cache: "default" });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} from ${label}`);
    error.status = response.status;
    throw error;
  }
  const contentType = response.headers.get("content-type") || "";
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!contentType.startsWith("image/") || bytes.length < 4 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) throw new Error(`${label} returned a non-PNG response`);
}

function escapeLayerText(value) {
  return String(value ?? "Unavailable").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function layerEntityDescription(rows) {
  return `<table>${rows.map(([label, value]) => `<tr><th>${escapeLayerText(label)}</th><td>${escapeLayerText(value)}</td></tr>`).join("")}</table>`;
}

function entityColor(config, opacity) {
  return Cesium.Color.fromCssColorString(config.color || "#ff7043").withAlpha(opacity);
}

function applyEntityOpacity(entry, config, opacity) {
  const color = entityColor(config, opacity);
  [...(entry.entities || []), ...(entry.dataSources || []).flatMap((source) => source.entities?.values || [])].forEach((entity) => {
    if (entity.point) entity.point.color = color;
    if (entity.label) entity.label.fillColor = color;
    if (entity.billboard) entity.billboard.color = Cesium.Color.WHITE.withAlpha(opacity);
    if (entity.polyline) entity.polyline.material = color;
    if (entity.polygon) entity.polygon.material = color.withAlpha(Math.min(opacity, 0.35));
    if (entity.ellipse) entity.ellipse.material = color.withAlpha(Math.min(opacity, 0.25));
  });
}

class CesiumLayerRuntimeController {
  constructor(viewerProvider) {
    this.viewerProvider = viewerProvider;
    this.registry = new Map();
    this.lastActivationError = null;
  }

  register(config) {
    this.registry.set(config.id, config);
    renderWeatherLegend(config, activeEarthLayers.has(config.id));
  }

  get activeCount() {
    return activeEarthLayers.size;
  }

  synchronizeControl(layerId, active) {
    const control = earthLayerControl(layerId);
    const opacity = earthLayerOpacityControl(layerId);
    if (control) control.checked = active;
    if (opacity) opacity.disabled = !active;
    if (opacity && !active) delete opacity.dataset.appliedOpacity;
    const config = this.registry.get(layerId);
    if (config) renderWeatherLegend(config, active);
  }

  preserveOrder() {
    const viewer = this.viewerProvider();
    if (!viewer || viewer.isDestroyed()) return;
    [...activeEarthLayers.entries()]
      .filter(([, entry]) => entry.layer)
      .sort((left, right) => (this.registry.get(left[0])?.order || 0) - (this.registry.get(right[0])?.order || 0))
      .forEach(([, entry]) => viewer.imageryLayers.raiseToTop(entry.layer));
  }

  async createImageryEntry(config, viewer) {
    let timestamps;
    let url;
    let credit;
    let maximumLevel;
    if (config.kind === "weather") {
      timestamps = await validateWeatherTile(config);
      url = buildWeatherTileUrl(config.path);
      credit = "Weather data · OpenWeather";
      maximumLevel = WEATHER_TILE_MAX_ZOOM;
    } else {
      timestamps = await resolveGibsDefinition(config);
      const encodedTime = encodeURIComponent(timestamps.observationTime);
      url = `${config.tileBaseUrl}/${config.gibsLayer}/default/${encodedTime}/${config.matrixSet}/{z}/{y}/{x}.png`;
      await validateImageResource(url.replace("{z}", "1").replace("{y}", "1").replace("{x}", "1"), `${config.label} NASA GIBS tile`);
      credit = `Scientific imagery · ${config.product}`;
      maximumLevel = config.maximumLevel;
    }
    const provider = new Cesium.UrlTemplateImageryProvider({
      url, tilingScheme: new Cesium.WebMercatorTilingScheme(), credit, minimumLevel: 0, maximumLevel,
      tileWidth: 256, tileHeight: 256, enablePickFeatures: false,
    });
    const layer = viewer.imageryLayers.addImageryProvider(provider);
    return { kind: "imagery", layer, provider, timestamps };
  }

  createStationEntry(config, viewer) {
    const visualization = config.record.visualization;
    const entity = viewer.entities.add({
      id: `pcs-science-${config.id}-${visualization.station_id}`,
      name: `${visualization.station_name} · ${config.label}`,
      position: Cesium.Cartesian3.fromDegrees(visualization.longitude, visualization.latitude, visualization.altitude_m || 0),
      point: { pixelSize: 12, color: entityColor(config, config.opacity), outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: `${visualization.station_name}\n${layerValueText(config.record)}`, font: "12px sans-serif", fillColor: entityColor(config, config.opacity), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -24), disableDepthTestDistance: Number.POSITIVE_INFINITY },
      description: layerEntityDescription([
        ["Product", visualization.product], ["Value", layerValueText(config.record)], ["Observation time", formatPcsTime(config.record.latest_observation_time)],
        ["Retrieved", formatPcsTime(config.record.latest_retrieval_time)], ["Datum", visualization.datum || "Not applicable"], ["Uncertainty", config.record.uncertainty],
      ]),
    });
    return { kind: "entities", entities: [entity], dataSources: [], timestamps: { observationTime: config.record.latest_observation_time, retrievalTime: config.record.latest_retrieval_time } };
  }

  async createCycloneEntry(config, viewer) {
    const storms = (config.record.details?.storms || []).filter((storm) => Number.isFinite(storm.latitude) && Number.isFinite(storm.longitude));
    if (!storms.length) {
      const error = new Error("NOAA NHC reports no active storm center with usable coordinates.");
      error.runtimeStatus = "UNAVAILABLE";
      throw error;
    }
    const entities = storms.map((storm) => viewer.entities.add({
      id: `pcs-storm-${storm.id}`,
      name: `${storm.name} · ${storm.classification?.regional_name || "tropical cyclone"}`,
      position: Cesium.Cartesian3.fromDegrees(storm.longitude, storm.latitude),
      point: { pixelSize: 15, color: entityColor(config, config.opacity), outlineColor: Cesium.Color.WHITE, outlineWidth: 3, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: `${storm.name} · ${storm.classification?.regional_name || "cyclone"}\n${storm.intensity_kt ?? "?"} kt`, font: "bold 13px sans-serif", fillColor: entityColor(config, config.opacity), outlineColor: Cesium.Color.BLACK, outlineWidth: 3, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -28), disableDepthTestDistance: Number.POSITIVE_INFINITY },
      description: layerEntityDescription([
        ["Classification", storm.classification?.regional_name], ["Intensity", `${storm.intensity_kt ?? "Unavailable"} kt`], ["Pressure", `${storm.pressure_hpa ?? "Unavailable"} hPa`],
        ["Advisory", storm.advisory_number], ["Advisory time", formatPcsTime(storm.advisory_time)], ["Source", storm.source], ["Uncertainty", storm.uncertainty],
      ]),
    }));
    const gisUrls = [...new Set(storms.flatMap((storm) => Object.values(storm.gis || {})).filter(Boolean))];
    const settled = await Promise.allSettled(gisUrls.map((url) => Cesium.KmlDataSource.load(`${WEATHER_PROXY_BASE}/api/layers/nhc-gis?url=${encodeURIComponent(url)}`, { camera: viewer.scene.camera, canvas: viewer.scene.canvas, clampToGround: false })));
    const dataSources = [];
    for (const result of settled) if (result.status === "fulfilled") dataSources.push(await viewer.dataSources.add(result.value));
    return { kind: "entities", entities, dataSources, timestamps: { observationTime: config.record.latest_observation_time, retrievalTime: config.record.latest_retrieval_time } };
  }

  createFireEntry(config, viewer) {
    const detections = config.record.details?.detections || [];
    if (!detections.length) {
      const error = new Error("NASA FIRMS returned no usable fire detections.");
      error.runtimeStatus = config.record.runtime_status === "AUTH_REQUIRED" ? "AUTH_REQUIRED" : "UNAVAILABLE";
      throw error;
    }
    const entities = detections.map((detection, index) => viewer.entities.add({
      id: `pcs-fire-${index}-${detection.latitude}-${detection.longitude}`,
      name: `${detection.satellite} ${detection.instrument} fire detection`,
      position: Cesium.Cartesian3.fromDegrees(detection.longitude, detection.latitude),
      point: { pixelSize: 6, color: entityColor(config, config.opacity), outlineColor: Cesium.Color.YELLOW, outlineWidth: 1 },
      description: layerEntityDescription([["Acquired", formatPcsTime(detection.observation_time)], ["Satellite", detection.satellite], ["Sensor", detection.instrument], ["Confidence", detection.confidence], ["Status", detection.status]]),
    }));
    return { kind: "entities", entities, dataSources: [], timestamps: { observationTime: config.record.latest_observation_time, retrievalTime: config.record.latest_retrieval_time } };
  }

  async regionalPayload() {
    if (activeRegionalObservation?.profile_id === activeRegionId) return activeRegionalObservation;
    const result = await loadRegionalObservation(activeRegionId);
    if (!result.ok || !activeRegionalObservation) throw new Error(result.error || "Regional observations are unavailable.");
    return activeRegionalObservation;
  }

  async createRegionalEarthquakeEntry(config, viewer) {
    const payload = await this.regionalPayload(); const events = payload.earthquakes?.events || [];
    if (!events.length) { const error = new Error("USGS returned no qualifying earthquake points for this profile."); error.runtimeStatus = "UNAVAILABLE"; throw error; }
    const entities = events.map((event) => viewer.entities.add({
      id: `pcs-regional-earthquake-${event.id}`, name: `M${event.magnitude ?? "?"} · ${event.place}`,
      position: Cesium.Cartesian3.fromDegrees(event.longitude, event.latitude, -Math.max(0, Number(event.depth_km) || 0) * 1000),
      point: { pixelSize: Math.max(7, Math.min(20, 4 + (Number(event.magnitude) || 0) * 2)), color: entityColor(config, config.opacity), outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      description: layerEntityDescription([["Magnitude", event.magnitude], ["Depth", `${event.depth_km} km`], ["Time", formatPcsTime(event.time)], ["Official intensity CDI / MMI", `${event.intensity_cdi ?? "Unavailable"} / ${event.intensity_mmi ?? "Unavailable"}`], ["Reviewed status", event.reviewed_status], ["Tectonic context", event.tectonic_context || "Unavailable"], ["Tsunami linkage flag", event.tsunami_flag ? "YES · follow official warning authority" : "NO"], ["Source", event.source], ["Cluster label", "None · PCS does not infer foreshock/aftershock clusters"]]),
    }));
    return { kind: "entities", entities, dataSources: [], timestamps: { observationTime: events[0]?.time, retrievalTime: payload.earthquakes?.retrieved_at } };
  }

  async createRegionalCoastalEntry(config, viewer) {
    const payload = await this.regionalPayload(); const stations = payload.coastal?.stations || [];
    if (!stations.length) { const error = new Error("This regional profile has no configured coastal station positions."); error.runtimeStatus = "UNAVAILABLE"; throw error; }
    const entities = stations.map((station) => viewer.entities.add({
      id: `pcs-regional-coastal-${activeRegionId}-${station.id}`, name: `${station.name} coastal station`, position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat),
      point: { pixelSize: 11, color: entityColor(config, station.status === "AVAILABLE" ? config.opacity : 0.35), outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: station.name, font: "12px sans-serif", fillColor: entityColor(config, config.opacity), outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -21), disableDepthTestDistance: Number.POSITIVE_INFINITY },
      description: layerEntityDescription([["Station authority", station.authority], ["Model sea level", station.modelled_sea_level?.status === "AVAILABLE" ? `${station.modelled_sea_level.value} ${station.modelled_sea_level.unit} · global MSL` : "Unavailable"], ["PREDICTED_TIDE", station.predicted_tide?.status], ["OBSERVED_WATER_LEVEL", station.observed_water_level?.status], ["STORM_SURGE_RESIDUAL", station.storm_surge_residual?.status], ["Wave height", station.wave_height?.status === "AVAILABLE" ? `${station.wave_height.value} ${station.wave_height.unit}` : "Unavailable"], ["Sea-surface temperature", station.sea_surface_temperature?.status === "AVAILABLE" ? `${station.sea_surface_temperature.value} ${station.sea_surface_temperature.unit}` : "Unavailable"], ["Observation / forecast time", formatPcsTime(station.observation_time)], ["Navigation warning", payload.coastal.navigation_warning]]),
    }));
    return { kind: "entities", entities, dataSources: [], timestamps: { observationTime: stations[0]?.observation_time, retrievalTime: payload.retrieved_at } };
  }

  async createEntry(config, viewer) {
    if (["weather", "gibs_wmts"].includes(config.kind)) return this.createImageryEntry(config, viewer);
    if (config.kind === "station") return this.createStationEntry(config, viewer);
    if (config.kind === "tropical_cyclones") return this.createCycloneEntry(config, viewer);
    if (config.kind === "fire_detections") return this.createFireEntry(config, viewer);
    if (config.kind === "regional_earthquakes") return this.createRegionalEarthquakeEntry(config, viewer);
    if (config.kind === "regional_coastal") return this.createRegionalCoastalEntry(config, viewer);
    throw new Error(`Unsupported Cesium layer kind: ${config.kind}`);
  }

  async activate(layerId) {
    const config = this.registry.get(layerId);
    const viewer = this.viewerProvider();
    if (!config) return this.activationFailure(layerId, "Layer is not registered.");
    if (!viewer || viewer.isDestroyed() || !window.Cesium || activeCelestialTargetId !== "earth") return this.activationFailure(layerId, "Earth Cesium globe is not available.");
    if (activeEarthLayers.has(layerId)) {
      this.synchronizeControl(layerId, true);
      return { ok: true, duplicatePrevented: true, resource: activeEarthLayers.get(layerId) };
    }
    try {
      const entry = await this.createEntry(config, viewer);
      const opacity = Number(earthLayerOpacityControl(layerId)?.value) || config.opacity;
      entry.opacity = opacity;
      if (entry.layer) entry.layer.alpha = opacity;
      else applyEntityOpacity(entry, config, opacity);
      const opacityControl = earthLayerOpacityControl(layerId);
      if (opacityControl) opacityControl.dataset.appliedOpacity = String(opacity);
      if (entry.provider) entry.unsubscribeErrorListener = entry.provider.errorEvent.addEventListener((error) => {
        const code = error.error?.statusCode || error.statusCode || null;
        if (config.kind === "gibs_wmts" && code === 404) {
          error.retry = false;
          return;
        }
        const message = `${config.label} tile failed${code ? ` with HTTP ${code}` : ""}`;
        this.deactivate(layerId, { preserveError: true });
        updateLayerCapabilityRuntime(layerId, [401, 403].includes(code) ? "AUTH_REQUIRED" : "ERROR", message);
        this.activationFailure(layerId, message);
      });
      activeEarthLayers.set(layerId, entry);
      this.lastActivationError = null;
      this.synchronizeControl(layerId, true);
      this.preserveOrder();
      updateLayerCapabilityRuntime(layerId, "ACTIVE", null, entry.timestamps);
      if (config.kind === "weather") setWeatherProxyStatus("Weather proxy: connected");
      setWeatherTileError("");
      updateWeatherActiveLayersStatus();
      return { ok: true, resource: entry, timestamps: entry.timestamps };
    } catch (error) {
      const reason = error?.message || `${config.label} activation failed`;
      const status = error?.runtimeStatus || ([401, 403].includes(error?.status) ? "AUTH_REQUIRED" : "ERROR");
      updateLayerCapabilityRuntime(layerId, status, reason);
      return this.activationFailure(layerId, reason);
    }
  }

  activationFailure(layerId, reason) {
    this.lastActivationError = { layerId, reason, at: new Date().toISOString() };
    this.synchronizeControl(layerId, false);
    setWeatherTileError(`Activation failed: ${reason}`);
    updateWeatherActiveLayersStatus();
    return { ok: false, layerId, error: reason };
  }

  deactivate(layerId, options = {}) {
    const entry = activeEarthLayers.get(layerId);
    const viewer = this.viewerProvider();
    if (entry) {
      entry.unsubscribeErrorListener?.();
      if (viewer && !viewer.isDestroyed()) {
        if (entry.layer) viewer.imageryLayers.remove(entry.layer, true);
        (entry.entities || []).forEach((entity) => viewer.entities.remove(entity));
        (entry.dataSources || []).forEach((source) => viewer.dataSources.remove(source, true));
      }
      activeEarthLayers.delete(layerId);
    }
    this.synchronizeControl(layerId, false);
    if (!options.preserveError) {
      const config = this.registry.get(layerId);
      updateLayerCapabilityRuntime(layerId, config?.availableStatus || "AVAILABLE");
      if (!activeEarthLayers.size) setWeatherTileError("");
    }
    updateWeatherActiveLayersStatus();
    return { ok: true, removed: Boolean(entry) };
  }

  deactivateAll() {
    [...activeEarthLayers.keys()].forEach((layerId) => this.deactivate(layerId));
  }

  updateOpacity(layerId, opacity) {
    const entry = activeEarthLayers.get(layerId);
    const config = this.registry.get(layerId);
    const value = Math.max(0, Math.min(1, Number(opacity)));
    if (!entry || !config || !Number.isFinite(value)) return { ok: false, error: "Layer is not active." };
    if (entry.layer) entry.layer.alpha = value;
    else applyEntityOpacity(entry, config, value);
    entry.opacity = value;
    const control = earthLayerOpacityControl(layerId);
    if (control) control.dataset.appliedOpacity = String(value);
    return { ok: true, opacity: value };
  }
}

async function checkWeatherProxyHealth() {
  if (!selectors.weatherProxyStatus) return { ok: false, error: "Weather controls unavailable" };
  setWeatherProxyStatus("Weather proxy: checking...");
  try {
    const response = await fetch(`${WEATHER_PROXY_BASE}/health/openweather`, { cache: "no-store" });
    const payload = response.ok ? await response.json() : {};
    if (!response.ok || payload.key_configured === false || payload.upstream_ok === false) {
      const authRequired = payload.key_configured === false;
      const reason = authRequired ? "OPENWEATHER_API_KEY is not configured" : payload.error_message || `HTTP ${response.status}`;
      selectors.weatherLayerControls.forEach((control) => { control.disabled = true; control.checked = false; });
      Object.keys(WEATHER_LAYER_CONFIG).forEach((layerId) => updateLayerCapabilityRuntime(layerId, authRequired ? "AUTH_REQUIRED" : "ERROR", reason));
      setWeatherProxyStatus(`Weather proxy: ${authRequired ? "authentication required" : "unavailable"} (${reason})`);
      return { ok: false, error: reason };
    }
    selectors.weatherLayerControls.forEach((control) => { control.disabled = false; });
    Object.keys(WEATHER_LAYER_CONFIG).forEach((layerId) => {
      if (!activeEarthLayers.has(layerId)) updateLayerCapabilityRuntime(layerId, "AVAILABLE");
    });
    setWeatherProxyStatus("Weather proxy: connected");
    return { ok: true };
  } catch (error) {
    const reason = error?.message || "Weather health request failed";
    selectors.weatherLayerControls.forEach((control) => { control.disabled = true; control.checked = false; });
    Object.keys(WEATHER_LAYER_CONFIG).forEach((layerId) => updateLayerCapabilityRuntime(layerId, "ERROR", reason));
    setWeatherProxyStatus(`Weather proxy: unavailable (${reason})`);
    return { ok: false, error: reason };
  }
}

async function addWeatherLayer(layerId) {
  return earthLayerRuntime?.activate(layerId) || { ok: false, layerId, error: "Layer runtime is not initialized." };
}

function removeWeatherLayer(layerId) {
  return earthLayerRuntime?.deactivate(layerId) || { ok: true, removed: false };
}

function initializeWeatherLayers() {
  if (!selectors.weatherLayerControls.length) return;
  earthLayerRuntime = new CesiumLayerRuntimeController(() => cesiumViewer);
  window.PCSEarthLayerRuntime = earthLayerRuntime;
  Object.values(WEATHER_LAYER_CONFIG).forEach((config) => earthLayerRuntime.register(config));
  Object.values(REGIONAL_LAYER_CONFIG).forEach((config) => earthLayerRuntime.register(config));
  resetWeatherStatusDisplay();
  selectors.weatherLayerControls.forEach((control) => {
    control.addEventListener("change", async () => {
      const layerId = control.dataset.weatherLayer;
      if (control.checked) {
        control.disabled = true;
        const result = await addWeatherLayer(layerId);
        control.disabled = false;
        if (!result.ok) control.checked = false;
      } else removeWeatherLayer(layerId);
    });
  });
  selectors.weatherOpacityControls.forEach((control) => {
    control.addEventListener("input", () => earthLayerRuntime.updateOpacity(control.dataset.weatherOpacity, control.value));
  });
  selectors.regionalLayerControls.forEach((control) => {
    control.addEventListener("change", async () => {
      const layerId = control.dataset.pcsLayer;
      if (control.checked) {
        control.disabled = true; const result = await earthLayerRuntime.activate(layerId); control.disabled = false;
        if (!result.ok) control.checked = false;
      } else earthLayerRuntime.deactivate(layerId);
    });
  });
  selectors.regionalOpacityControls.forEach((control) => control.addEventListener("input", () => earthLayerRuntime.updateOpacity(control.dataset.pcsOpacity, control.value)));
  void checkWeatherProxyHealth();
}

function pcsStatusClass(status) {
  if (["connected", "live", "observed", "validated", "confirmed"].includes(status)) return "active";
  if (["delayed", "partial", "inferred", "estimated", "partially_confirmed"].includes(status)) return "waiting";
  return "unavailable";
}

function pcsStatusLabel(status) {
  const normalized = normalizedStatus(status);
  const key = `status_${normalized}`;
  const translated = t(key);
  return translated === key ? normalized.toUpperCase().replaceAll("_", " ") : translated;
}

function formatPcsTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(getCurrentLanguage());
}

function createDefinitionRow(label, value) {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const definition = document.createElement("dd");
  term.textContent = label;
  definition.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
  wrapper.append(term, definition);
  return wrapper;
}

function normalizedStatus(status) {
  return String(status || "unavailable").toLowerCase().replaceAll(" ", "_");
}

function layerDisplayName(id) {
  const key = `layer_${String(id).replaceAll("-", "_")}`;
  const translated = t(key);
  return translated === key ? String(id).replaceAll("-", " ") : translated;
}

function layerValueText(layer) {
  if (layer.value === null || layer.value === undefined) return pcsStatusLabel(normalizedStatus(layer.data_state));
  return `${Number.isFinite(Number(layer.value)) ? Number(layer.value).toLocaleString(getCurrentLanguage(), { maximumFractionDigits: 3 }) : layer.value}${layer.unit ? ` ${layer.unit}` : ""}`;
}

function scientificLayerConfig(layer, index) {
  const visualization = layer.visualization || {};
  const legends = {
    station: ["Station observation", visualization.units || layer.unit || "units unavailable"],
    tropical_cyclones: ["Depression", "Tropical storm", "Hurricane / Typhoon / Cyclone", "NHC forecast uncertainty"],
    fire_detections: ["VIIRS active-fire detection", "confidence in feature details"],
  };
  const colors = { "sea-level": "#29b6f6", co2: "#ab47bc", "tropical-cyclones": "#ef5350", wildfire: "#ff6d00" };
  return {
    id: layer.id, capabilityId: layer.id, kind: visualization.kind, label: layerDisplayName(layer.id), record: layer,
    opacity: 0.65, order: 100 + index, color: colors[layer.id] || "#00acc1",
    legend: legends[visualization.kind] || [visualization.units || "Provider color scale", visualization.product || layer.dataset],
    legendUrl: visualization.legend_url || null, availableStatus: layer.runtime_status === "DELAYED" ? "DELAYED" : "AVAILABLE",
    capabilitiesUrl: visualization.capabilities_url, tileBaseUrl: visualization.tile_base_url, gibsLayer: visualization.layer,
    matrixSet: visualization.matrix_set, maximumLevel: visualization.maximum_level, compositeDays: visualization.composite_days || null, product: visualization.product || layer.dataset,
  };
}

function compactLayerDetails(layer) {
  const details = layer.details || {};
  return Object.entries(details)
    .filter(([key]) => !["storms", "detections"].includes(key))
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value}`)
    .join(" · ") || null;
}

function compactVisualizationDetails(visualization = {}) {
  return Object.entries(visualization || {})
    .filter(([key]) => !["kind", "capabilities_url", "tile_base_url", "legend_url", "layer", "matrix_set", "format", "maximum_level", "product", "units"].includes(key))
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value}`)
    .join(" · ") || null;
}

function createRuntimeMetadataRow(label, dataAttribute, value) {
  const row = createDefinitionRow(label, value);
  const definition = row.querySelector("dd");
  if (definition) definition.dataset[dataAttribute] = "";
  return row;
}

function renderPcsLayers(payload) {
  if (!selectors.pcsLayerList) return;
  const layers = (Array.isArray(payload.layers) ? payload.layers : []).map((layer) => {
    const activeEntry = activeEarthLayers.get(layer.id);
    if (!activeEntry) return layer;
    return {
      ...layer,
      runtime_status: "ACTIVE",
      latest_observation_time: activeEntry.timestamps?.observationTime || layer.latest_observation_time,
      latest_retrieval_time: activeEntry.timestamps?.retrievalTime || layer.latest_retrieval_time,
      failure_reason: null,
    };
  });
  layers.forEach((layer) => earthLayerCapabilityMatrix.set(layer.layer_id || layer.id, { ...layer }));
  Object.entries(WEATHER_LAYER_CONFIG).forEach(([layerId, config]) => {
    const capability = earthLayerCapabilityMatrix.get(config.capabilityId);
    if (!capability || activeEarthLayers.has(layerId)) return;
    updateLayerCapabilityRuntime(layerId, capability.runtime_status, capability.failure_reason, {
      observationTime: capability.latest_observation_time,
      retrievalTime: capability.latest_retrieval_time,
    });
  });
  const weatherCapabilityIds = new Set(["clouds", "rain", "temperature", "wind"]);
  const earthScienceLayers = layers.filter((layer) => !weatherCapabilityIds.has(layer.id));
  selectors.pcsLayerList.replaceChildren(...earthScienceLayers.map((layer, index) => {
    const config = layer.cesium_renderer_available ? scientificLayerConfig(layer, index) : null;
    const blocked = ["AUTH_REQUIRED", "ERROR", "UNAVAILABLE", "METADATA_ONLY"].includes(layer.runtime_status);
    const wrapper = document.createElement("section");
    wrapper.className = `layer-entry pcs-provider-layer ${pcsStatusClass(normalizedStatus(layer.runtime_status))}`;
    wrapper.dataset.pcsLayerEntry = layer.id;
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.pcsLayer = layer.id;
    checkbox.disabled = !config || blocked;
    checkbox.checked = activeEarthLayers.has(layer.id);
    checkbox.setAttribute("aria-label", `${layerDisplayName(layer.id)} Cesium layer`);
    const summary = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = layerDisplayName(layer.id);
    const status = document.createElement("small");
    status.dataset.pcsProviderStatus = "";
    status.textContent = `${layer.runtime_status || "METADATA_ONLY"} · ${layer.provider} · ${layerValueText(layer)}`;
    summary.append(title, status);
    label.append(checkbox, summary);
    const opacity = document.createElement("input");
    opacity.type = "range";
    opacity.min = "0";
    opacity.max = "1";
    opacity.step = "0.05";
    opacity.className = "weather-opacity-input";
    opacity.value = String(activeEarthLayers.get(layer.id)?.opacity ?? config?.opacity ?? 0.65);
    opacity.dataset.pcsOpacity = layer.id;
    opacity.setAttribute("aria-label", `${layerDisplayName(layer.id)} opacity`);
    opacity.disabled = !activeEarthLayers.has(layer.id);
    const legendHost = document.createElement("div");
    legendHost.className = "weather-legends scientific-legends";
    legendHost.dataset.scientificLegend = "";
    const details = document.createElement("details");
    details.className = "layer-provider-details";
    const detailsSummary = document.createElement("summary");
    detailsSummary.textContent = "Provider metadata";
    const metadata = document.createElement("dl");
    metadata.className = "layer-metadata";
    metadata.append(
      createDefinitionRow(t("provider"), layer.provider), createDefinitionRow(t("dataset"), layer.dataset),
      createDefinitionRow(t("endpoint"), layer.data_endpoint || layer.endpoint), createDefinitionRow(t("observation_time"), formatPcsTime(layer.latest_observation_time || layer.observation_time)),
      createDefinitionRow(t("retrieval_time"), formatPcsTime(layer.latest_retrieval_time || layer.retrieved_at)), createDefinitionRow(t("data_latency"), layer.latency === null ? pcsStatusLabel("unavailable") : `${layer.latency} min`),
      createDefinitionRow(t("spatial_resolution"), layer.spatial_resolution), createDefinitionRow(t("temporal_resolution"), layer.temporal_resolution),
      createDefinitionRow(t("data_state"), pcsStatusLabel(normalizedStatus(layer.data_state))), createDefinitionRow(t("data_quality"), layer.data_quality || layer.quality_flag),
      createDefinitionRow(t("uncertainty"), layer.uncertainty), createDefinitionRow(t("license"), layer.license),
      createDefinitionRow("Source type", layer.source_type), createDefinitionRow("Visualization", layer.visualization_type),
      createDefinitionRow("Spatial data available", layer.spatial_data_available), createDefinitionRow("Time series available", layer.time_series_available),
      createDefinitionRow("Cesium renderer available", layer.cesium_renderer_available), createDefinitionRow("Checkbox connected", layer.checkbox_connected),
      createDefinitionRow("Legend available", layer.legend_available), createDefinitionRow("Opacity control available", layer.opacity_control_available),
      createDefinitionRow("Runtime status", layer.runtime_status), createDefinitionRow("Failure reason", layer.failure_reason),
      createDefinitionRow("Value semantics", layer.data_state === "OBSERVED" ? "Provider-observed or provider-published; no PCS calculation" : layer.data_state),
      createDefinitionRow("Scientific details", compactLayerDetails(layer)), createDefinitionRow("Map product", layer.visualization?.product),
      createDefinitionRow("Map units", layer.visualization?.units), createDefinitionRow("Visualization details", compactVisualizationDetails(layer.visualization)), createDefinitionRow("Authentication requirement", layer.authentication_requirement),
      createRuntimeMetadataRow("Map observation time", "pcsMapObservation", layer.cesium_renderer_available ? "Resolved from provider when loaded" : null),
      createRuntimeMetadataRow("Map observation end", "pcsMapObservationEnd", layer.visualization?.composite_days ? "Resolved from composite length when loaded" : null),
      createRuntimeMetadataRow("Map retrieval time", "pcsMapRetrieval", layer.cesium_renderer_available ? "Resolved when loaded" : null),
      createDefinitionRow("Last successful request", formatPcsTime(layer.last_successful_request)), createDefinitionRow("Planned adapter interface", layer.planned_adapter_interface),
    );
    details.append(detailsSummary, metadata);
    if (config) {
      checkbox.addEventListener("change", async () => {
        if (checkbox.checked) {
          checkbox.disabled = true;
          const result = await earthLayerRuntime.activate(layer.id);
          checkbox.disabled = blocked;
          if (!result.ok) checkbox.checked = false;
        } else earthLayerRuntime.deactivate(layer.id);
        updateText(selectors.layerControlMessage, checkbox.checked ? `${layerDisplayName(layer.id)} · ACTIVE` : t("select_layer_status"));
      });
      opacity.addEventListener("input", () => earthLayerRuntime.updateOpacity(layer.id, opacity.value));
    }
    wrapper.append(label);
    if (config) wrapper.append(opacity, legendHost);
    wrapper.append(details);
    return wrapper;
  }));
  earthScienceLayers.forEach((layer, index) => {
    if (!layer.cesium_renderer_available || !layer.visualization?.kind) return;
    const config = scientificLayerConfig(layer, index);
    earthLayerRuntime?.register(config);
    earthLayerRuntime?.synchronizeControl(layer.id, activeEarthLayers.has(layer.id));
  });
  if (selectors.layerConnectorHealth) selectors.layerConnectorHealth.replaceChildren(...layers.map((layer) => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = `${layer.provider} · ${layer.dataset}`;
    const badge = document.createElement("span");
    badge.className = `status-pill status-${["ACTIVE", "AVAILABLE"].includes(layer.runtime_status) ? "normal" : "muted"}`;
    badge.textContent = layer.runtime_status || "UNAVAILABLE";
    item.title = layer.failure_reason || layer.data_quality || "";
    item.append(name, badge);
    return item;
  }));
  latestLayerSnapshotSucceededAt = payload.generated_at || new Date().toISOString();
  latestLayerSnapshotFailed = false;
  refreshAnimationStatus();
}

function renderResidualState(state) {
  (state?.components || []).forEach((component) => {
    const ids = { thermal: "L_T", chemical: "L_C", structural: "L_S", informational: "L_I", flow: "L_F" };
    updateText(selectors.projections[ids[component.component]], component.value === null ? pcsStatusLabel("unavailable") : String(component.value));
    const host = document.querySelector(`[data-residual-reason="${component.component}"]`);
    if (!host) return;
    const details = document.createElement("details"); details.className = "residual-readiness-details";
    const summary = document.createElement("summary"); summary.textContent = pcsStatusLabel(component.readiness_state);
    const list = document.createElement("dl"); list.className = "evidence-grid";
    const fields = [
      ["connected_datasets", (component.connected_datasets || []).map((item) => `${item.provider}: ${item.dataset}`).join("; ")],
      ["required_datasets", (component.required_datasets || []).map((item) => item.id).join(", ")],
      ["missing_datasets", (component.missing_datasets || []).map((item) => item.id).join(", ")],
      ["spatial_coverage", component.spatial_coverage], ["temporal_coverage", component.temporal_coverage],
      ["formula_version", component.formula_version], ["baseline_period", component.baseline_period],
      ["normalization_method", component.normalization_method], ["weights", component.weights],
      ["uncertainty", component.uncertainty], ["validation_method", component.validation_method],
      ["last_calculated_at", component.last_calculated_at], ["validation_status", component.validation_status],
      ["unavailable_reason", component.unavailable_reason],
    ];
    fields.forEach(([label, value]) => list.append(createDefinitionRow(t(label), value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length) ? pcsStatusLabel("unavailable") : typeof value === "string" ? value : JSON.stringify(value))));
    details.append(summary, list); host.replaceChildren(details);
  });
  updateText(document.querySelector("#total-l-status"), `L(t): ${state?.total_l_t?.status || "UNAVAILABLE"} — ${state?.total_l_t?.unavailable_reason || t("residual_unavailable_reason")}`);
}

function renderSystemStatus(payload) {
  latestRuntimeStatus = payload.runtime || null;
  selectors.systemModules.forEach((container) => {
    const module = container.dataset.systemModule;
    const list = document.createElement("ul"); list.className = "system-module-list";
    const add = (label, value) => { const item = document.createElement("li"); item.textContent = `${label}: ${value ?? pcsStatusLabel("unavailable")}`; list.append(item); };
    if (module === "observation") (payload.observation?.variables || []).forEach((item) => add(`${item.provider} · ${item.dataset}`, `${layerValueText(item)} · ${formatPcsTime(item.observation_time)} · ${item.quality_flag} · ${item.uncertainty || t("not_reported")}`));
    if (module === "connectors") (payload.connectors || []).forEach((item) => add(`${item.provider} · ${item.dataset}`, `${item.status} · ${item.latency === null ? "—" : `${item.latency} min`} · ${item.last_successful_retrieval || "—"} · ${item.error_details || t("none")}`));
    if (module === "validation") Object.entries(payload.validation || {}).forEach(([key, value]) => add(key, Array.isArray(value) ? value.join(", ") : value));
    if (module === "engine") (payload.engine || []).forEach((item) => add(item.id.replaceAll("_", " "), item.status));
    if (module === "pcs_state") (payload.pcs_state?.components || []).forEach((item) => add(item.component, `${item.data_state} · ${item.reason}`));
    if (module === "data_flow") add(t("data_flow"), (payload.data_flow || []).join(" → "));
    if (module === "review") {
      add(t("ai_proposal_status"), payload.review?.ai_proposal?.review_status || "NO_PROPOSAL");
      add(t("human_review_status"), payload.review?.human_review_status || "NOT_REVIEWED");
      add(t("model_version"), payload.review?.ai_proposal?.model_version || pcsStatusLabel("unavailable"));
      (payload.review?.review_history || []).forEach((item) => add(formatPcsTime(item.reviewed_at), `${item.reviewer_type} · ${item.status} · ${item.warning_rule_version || "—"}`));
    }
    if (!list.children.length) add(t("empty_state"), pcsStatusLabel("unavailable"));
    container.replaceChildren(list);
  });
  renderResidualState(payload.pcs_state);
  refreshAnimationStatus();
}

function refreshAnimationStatus() {
  const lastSnapshotMs = latestLayerSnapshotSucceededAt ? new Date(latestLayerSnapshotSucceededAt).getTime() : 0;
  const snapshotConfigured = Boolean(layerSnapshotTimer);
  const dataUpdateStatus = !snapshotConfigured ? "NOT_CONFIGURED"
    : latestLayerSnapshotFailed ? "ERROR"
      : lastSnapshotMs && Date.now() - lastSnapshotMs <= LAYER_SNAPSHOT_STALE_MS ? "ACTIVE" : "STALE";
  const status = {
    earth_rotation: latestRuntimeStatus?.earth_rotation?.status || "DISABLED",
    layer_activation: earthLayerRuntime?.lastActivationError ? "ERROR" : activeEarthLayers.size ? "ACTIVE" : "DISABLED",
    alert_pulse: latestActiveAlertCount > 0 ? "ACTIVE" : "NO_ACTIVE_ALERT",
    data_update: latestRuntimeStatus?.data_update?.status || dataUpdateStatus,
    timeline_playback: latestRuntimeStatus?.timeline_playback?.status === "ACTIVE" ? "ACTIVE" : "WAITING_FOR_TIME_SERIES",
    camera_transition: cameraTransitionFailed ? "ERROR" : cameraTransitionOperational ? "ACTIVE" : "NOT_CONFIGURED",
  };
  selectors.animationStatuses.forEach((element) => updateText(element, status[element.dataset.animationStatus]));
  const details = {
    earth_rotation: latestRuntimeStatus?.earth_rotation?.reason,
    layer_activation: `${activeEarthLayers.size} ${t("active_layer_count")}`,
    alert_pulse: `${latestActiveAlertCount} ${t("active_advisories")}`,
    data_update: latestRuntimeStatus?.data_update ? `${t("last_successful_update")}: ${formatPcsTime(latestRuntimeStatus.data_update.last_successful_update)} · ${t("next_expected_update")}: ${formatPcsTime(latestRuntimeStatus.data_update.next_expected_update)} · ${latestRuntimeStatus.data_update.scheduled_run_result || "—"}` : null,
    timeline_playback: latestRuntimeStatus?.timeline_playback ? `${formatPcsTime(latestRuntimeStatus.timeline_playback.available_start_time)} — ${formatPcsTime(latestRuntimeStatus.timeline_playback.available_end_time)} · ${latestRuntimeStatus.timeline_playback.frame_count || 0} ${t("frames")}` : null,
    camera_transition: cameraTransitionOperational ? t("camera_transition_verified") : null,
  };
  selectors.animationDetails.forEach((element) => updateText(element, details[element.dataset.animationDetail] || ""));
}

function renderDomainReadiness(payload) {
  if (!selectors.domainGrid) return;
  const cards = (payload.domains || []).map((domain) => {
    const card = document.createElement("article");
    const statuses = domain.datasets.map((dataset) => dataset.status);
    const status = statuses.includes("live") ? "live" : statuses.includes("delayed") ? "delayed" : domain.connected ? "partial" : "unavailable";
    card.className = `domain-card ${pcsStatusClass(status)}`;
    card.title = domain.datasets.map((dataset) => `${dataset.provider}: ${dataset.dataset}`).join("\n");
    const heading = document.createElement("h3");
    heading.textContent = domain.id.replaceAll("_", " ");
    const badge = document.createElement("span");
    badge.textContent = pcsStatusLabel(status);
    const count = document.createElement("strong");
    count.textContent = `${domain.connected} / ${domain.total} ${t("datasets_connected")}`;
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = t("dataset_list");
    details.append(summary);
    domain.datasets.forEach((dataset) => {
      const item = document.createElement("section");
      item.className = "dataset-readiness-item";
      const title = document.createElement("b");
      title.textContent = `${dataset.provider} · ${dataset.dataset}`;
      const itemBadge = document.createElement("span");
      itemBadge.className = `pcs-evidence-tag ${pcsStatusClass(dataset.status)}`;
      itemBadge.textContent = pcsStatusLabel(dataset.status);
      const metadata = document.createElement("dl");
      metadata.append(
        createDefinitionRow(t("last_update"), formatPcsTime(dataset.timestamp)),
        createDefinitionRow(t("data_latency"), dataset.latency === null ? "—" : `${dataset.latency} min`),
        createDefinitionRow(t("validation_status"), dataset.validation_status),
        createDefinitionRow(t("data_quality"), dataset.quality_flag),
        createDefinitionRow(t("availability"), dataset.availability),
      );
      item.append(title, itemBadge, metadata);
      details.append(item);
    });
    card.append(heading, badge, count, details);
    return card;
  });
  selectors.domainGrid.replaceChildren(...cards);
  const connected = (payload.datasets || []).filter((dataset) => ["connected", "live", "delayed", "partial"].includes(dataset.status)).length;
  updateText(selectors.domainReadinessStatus, `${t("connected_datasets")}: ${connected} / ${(payload.datasets || []).length}`);
  updateText(selectors.connectedDatasetCount, `${connected} / ${(payload.datasets || []).length}`);
  if (selectors.connectedDatasetList) {
    selectors.connectedDatasetList.replaceChildren(...(payload.datasets || []).filter((dataset) => ["connected", "live", "delayed", "partial"].includes(dataset.status)).map((dataset) => {
      const item = document.createElement("li");
      item.textContent = `${dataset.provider}: ${dataset.dataset} (${pcsStatusLabel(dataset.status)})`;
      return item;
    }));
  }
}

function appendRetrospectiveField(list, labelKey, value, status = null) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const definition = document.createElement("dd");
  term.textContent = t(labelKey);
  const missing = value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length);
  definition.textContent = missing ? "—" : typeof value === "string" ? value : JSON.stringify(value);
  const badge = document.createElement("span");
  badge.className = `pcs-evidence-tag ${pcsStatusClass(status || (missing ? "unavailable" : "observed"))}`;
  badge.textContent = pcsStatusLabel(status || (missing ? "unavailable" : "observed"));
  row.append(term, badge, definition);
  list.append(row);
}

function renderDailyBrief(events, target = selectors.dailyBriefList) {
  if (!target) return;
  const items = events.map((event) => {
    const details = document.createElement("details");
    details.className = "pcs-event-card";
    const summary = document.createElement("summary");
    summary.textContent = `${event.title} · ${event.region}`;
    const meta = document.createElement("p");
    meta.textContent = `${event.event_type} · ${formatPcsTime(event.observed_event_time || event.published_at)}`;
    const analysisTitle = document.createElement("h3");
    analysisTitle.textContent = "PCS RETROSPECTIVE ANALYSIS";
    const list = document.createElement("dl");
    const analysis = event.retrospective_analysis || {};
    appendRetrospectiveField(list, "event_outcome", event.event_summary, event.observed_event_time ? "observed" : "unavailable");
    appendRetrospectiveField(list, "event_timeline", event.timeline, event.timeline?.length ? "observed" : "unavailable");
    appendRetrospectiveField(list, "earliest_signal", analysis.earliest_detectable_time, analysis.earliest_detectable_time ? "observed" : "unavailable");
    appendRetrospectiveField(list, "precursor_window", analysis.precursor_window_start && analysis.precursor_window_end ? `${analysis.precursor_window_start} — ${analysis.precursor_window_end}` : null);
    appendRetrospectiveField(list, "causal_chain", analysis.causal_chain, analysis.causal_chain?.length ? "inferred" : "unavailable");
    appendRetrospectiveField(list, "amplification_factors", analysis.amplification_factors);
    appendRetrospectiveField(list, "human_exposure", analysis.exposure_factors, analysis.exposure_factors?.length ? "estimated" : "unavailable");
    appendRetrospectiveField(list, "pcs_observability", analysis.pcs_observability, "observed");
    appendRetrospectiveField(list, "missing_data", analysis.missing_data, "unavailable");
    appendRetrospectiveField(list, "candidate_warning_rule", analysis.proposed_warning_rules, "unvalidated");
    appendRetrospectiveField(list, "intervention_points", analysis.proposed_interventions, "unvalidated");
    appendRetrospectiveField(list, "validation_status", analysis.validation_status, analysis.validation_status || "unvalidated");
    appendRetrospectiveField(list, "lead_time", analysis.estimated_lead_time_hours === null || analysis.estimated_lead_time_hours === undefined ? null : `${analysis.estimated_lead_time_hours} h`);
    appendRetrospectiveField(list, "confidence", analysis.analyst_confidence);
    const ledgerLink = document.createElement("a");
    ledgerLink.href = "#pcs-evidence-ledger";
    ledgerLink.textContent = t("evidence_ledger_link");
    details.append(summary, meta, analysisTitle, list, ledgerLink);
    return details;
  });
  target.replaceChildren(...items);
}

function createBriefCard(item) {
  const card = document.createElement("article");
  card.className = "pcs-ledger-entry brief-item";
  const title = document.createElement("strong"); title.textContent = item.title;
  const badge = document.createElement("span"); badge.className = "pcs-evidence-tag active"; badge.textContent = item.data_state || "PUBLICATION_METADATA";
  const summary = document.createElement("p"); summary.textContent = item.summary || t("summary_unavailable");
  const metadata = document.createElement("dl");
  metadata.append(
    createDefinitionRow(t("source"), `${item.source_name} · ${item.source_type} · ${item.reliability}`),
    createDefinitionRow(t("published_at"), formatPcsTime(item.published_at)),
    createDefinitionRow(t("category"), item.category), createDefinitionRow(t("region"), item.region),
    createDefinitionRow(t("event_type"), item.event_type), createDefinitionRow(t("pcs_domain_mapping"), (item.pcs_domains || []).join(", ") || "—"),
    createDefinitionRow(t("event_candidate"), item.event_candidate ? "YES" : `NO · ${item.event_candidate_reason}`),
    createDefinitionRow(t("data_state"), item.data_state || "PUBLICATION_METADATA"),
  );
  const link = document.createElement("a"); link.href = item.source_url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = t("open_source");
  card.append(title, badge, summary, metadata, link); return card;
}

function renderDailyBriefPayload(payload, eventDetails) {
  updateText(selectors.dailyBriefStatus, `${payload.operational_status || "UNAVAILABLE"} · ${t("brief_item_count")}: ${payload.counts?.brief_items ?? 0} · ${t("event_candidate_count")}: ${payload.counts?.event_candidates ?? 0} · ${t("retrospective_count")}: ${payload.counts?.retrospective_analyses ?? 0}`);
  selectors.dailyBriefList?.replaceChildren(...(payload.primary || []).map(createBriefCard));
  if (selectors.moreIntelligenceList) {
    const temporary = document.createElement("div");
    renderDailyBrief(eventDetails || [], temporary);
    selectors.moreIntelligenceList.replaceChildren(...(payload.more_intelligence || []).map(createBriefCard), ...temporary.children);
  }
}

function renderEvidenceLedger(entries) {
  if (!selectors.evidenceLedgerList) return;
  const items = entries.map((entry) => {
    const item = document.createElement("article");
    item.className = "pcs-ledger-entry"; item.id = `ledger-${entry.analysis_id}`;
    const title = document.createElement("strong");
    title.textContent = `${entry.region} · ${entry.event_type}`;
    const badge = document.createElement("span");
    badge.className = `pcs-evidence-tag ${pcsStatusClass(entry.result)}`;
    badge.textContent = pcsStatusLabel(entry.result);
    const details = document.createElement("details");
    const summary = document.createElement("summary"); summary.textContent = t("ledger_record_details");
    const list = document.createElement("dl"); list.className = "evidence-grid";
    const fields = ["analysis_id", "issued_at", "region", "event_type", "expected_event_window", "input_data_snapshot", "precursor_signals", "causal_chain", "warning_rule_version", "confidence", "proposed_actions", "actual_event", "official_confirmation_time", "news_publication_time", "lead_time_hours", "false_positive", "false_negative", "partial_hit", "data_missing", "retrospective_score", "lessons_learned", "model_revision", "reviewed_at"];
    fields.forEach((field) => {
      const value = entry[field];
      list.append(createDefinitionRow(t(field), value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length) ? pcsStatusLabel("unavailable") : typeof value === "object" ? JSON.stringify(value) : String(value)));
    });
    details.append(summary, list); item.append(title, badge, details);
    return item;
  });
  selectors.evidenceLedgerList.replaceChildren(...items);
}

function renderMassGatherings(rows) {
  if (!selectors.massGatheringList) return;
  selectors.massGatheringList.replaceChildren(...rows.map((row) => {
    const item = document.createElement("article");
    item.className = "pcs-ledger-entry";
    const title = document.createElement("strong");
    title.textContent = `${row.city} · ${row.event_name}`;
    const badge = document.createElement("span");
    badge.className = `pcs-evidence-tag ${pcsStatusClass(row.data_status)}`;
    badge.textContent = pcsStatusLabel(row.data_status);
    const note = document.createElement("p");
    note.textContent = `${row.source} · ${row.source_limitations || ""}`;
    item.append(title, badge, note);
    return item;
  }));
}

function evidenceParameters() {
  const parameters = new URLSearchParams();
  if (selectors.evidenceEvent?.value) parameters.set("event_id", selectors.evidenceEvent.value);
  if (selectors.evidencePrimaryRegion?.value) parameters.set("primary_region", selectors.evidencePrimaryRegion.value);
  if (selectors.evidenceComparisonRegion?.value) parameters.set("comparison_region", selectors.evidenceComparisonRegion.value);
  if (selectors.evidenceWindowStart?.value) parameters.set("window_start", selectors.evidenceWindowStart.value);
  if (selectors.evidenceWindowEnd?.value) parameters.set("window_end", selectors.evidenceWindowEnd.value);
  if (selectors.evidenceBaselineStart?.value) parameters.set("baseline_start", selectors.evidenceBaselineStart.value);
  if (selectors.evidenceBaselineEnd?.value) parameters.set("baseline_end", selectors.evidenceBaselineEnd.value);
  String(selectors.evidenceVariables?.value || "").split(",").map((value) => value.trim()).filter(Boolean).forEach((value) => parameters.append("variable", value));
  return parameters;
}

function renderEvidenceExplorer(payload) {
  if (!selectors.evidenceResults) return;
  if (selectors.evidenceEvent && !selectors.evidenceEvent.options.length) {
    selectors.evidenceEvent.replaceChildren(...(payload.events || []).map((event) => {
      const option = document.createElement("option"); option.value = event.id; option.textContent = `${event.title} · ${event.region}`; return option;
    }));
  }
  if (!payload.selection) { updateText(selectors.evidenceCausalStatus, "NOT_ESTABLISHED"); return; }
  timelineFrames = payload.timeline_frames || []; timelineFrameIndex = 0;
  const grid = document.createElement("dl"); grid.className = "evidence-grid";
  grid.append(
    createDefinitionRow(t("observed_variables"), (payload.observed_variables || []).map((item) => `${item.provider}: ${item.dataset}`).join("; ") || pcsStatusLabel("unavailable")),
    createDefinitionRow(t("calculated_variables"), (payload.calculated_variables || []).map((item) => `${item.variable}: ${item.anomaly}`).join("; ") || pcsStatusLabel("insufficient_data")),
    createDefinitionRow(t("missing_variables"), (payload.missing_variables || []).map((item) => item.variable || item).join(", ") || t("none")),
    createDefinitionRow(t("anomalies"), (payload.anomalies || []).length ? JSON.stringify(payload.anomalies) : pcsStatusLabel("insufficient_data")),
    createDefinitionRow(t("temporal_correlation"), `${payload.temporal_correlation?.status}: ${payload.temporal_correlation?.value ?? "—"}`),
    createDefinitionRow(t("spatial_overlap"), `${payload.spatial_overlap?.status}: ${payload.spatial_overlap?.value ?? "—"}`),
    createDefinitionRow(t("lead_time"), `${payload.lead_time?.status || "INSUFFICIENT_DATA"}: ${payload.lead_time?.value ?? "—"}`),
    createDefinitionRow(t("uncertainty"), `${payload.uncertainty?.status || "INSUFFICIENT_DATA"}: ${payload.uncertainty?.value ?? "—"}`),
    createDefinitionRow(t("data_completeness"), payload.data_completeness?.value === null || payload.data_completeness?.value === undefined ? pcsStatusLabel("insufficient_data") : `${(payload.data_completeness.value * 100).toFixed(1)}% (${payload.data_completeness.status})`),
    createDefinitionRow(t("inferred_relationships"), (payload.inferred_relationships || []).length ? JSON.stringify(payload.inferred_relationships) : t("none")),
    createDefinitionRow(t("source_list"), (payload.source_list || []).map((item) => `${item.provider}: ${item.dataset}`).join("; ") || pcsStatusLabel("unavailable")),
    createDefinitionRow(t("validation_state"), payload.validation_state),
  );
  selectors.evidenceResults.replaceChildren(grid);
  if (payload.evidence_ledger_url) {
    const link = document.createElement("a"); link.href = "#pcs-evidence-ledger"; link.textContent = t("evidence_ledger_link"); selectors.evidenceResults.append(link);
  }
  updateText(selectors.evidenceCausalStatus, payload.causal_status || "NOT_ESTABLISHED");
}

async function loadEvidenceExplorer(withSelection = false) {
  const query = withSelection ? `?${evidenceParameters()}` : "";
  const response = await fetch(`${WEATHER_PROXY_BASE}/api/evidence-explorer${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("evidence_explorer_unavailable");
  renderEvidenceExplorer(await response.json());
}

function initializeEvidenceExplorer() {
  selectors.evidenceExplorerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void runSafeAsync("Evidence Explorer query", () => loadEvidenceExplorer(true));
  });
}

async function loadLayerCapabilitySnapshot() {
  try {
    const response = await fetch(`${WEATHER_PROXY_BASE}/api/layers`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Layer capability endpoint returned HTTP ${response.status}`);
    const payload = await response.json();
    renderPcsLayers(payload);
    latestLayerSnapshotSucceededAt = payload.generated_at || new Date().toISOString();
    latestLayerSnapshotFailed = false;
    refreshAnimationStatus();
    return { ok: true, payload };
  } catch (error) {
    latestLayerSnapshotFailed = true;
    refreshAnimationStatus();
    updateText(selectors.layerControlMessage, `Layer capability audit unavailable: ${error?.message || "request failed"}`);
    return { ok: false, error: error?.message || "Layer capability request failed" };
  }
}

function initializeLayerSnapshotRuntime() {
  if (layerSnapshotTimer) clearInterval(layerSnapshotTimer);
  layerSnapshotTimer = setInterval(() => { void loadLayerCapabilitySnapshot(); }, LAYER_SNAPSHOT_INTERVAL_MS);
  refreshAnimationStatus();
}

async function loadPcsEvidencePanels() {
  updateText(selectors.pcsApiStatus, t("loading"));
  try {
    const [readinessResponse, eventsResponse, ledgerResponse, gatheringsResponse, briefResponse, systemResponse] = await Promise.all([
      fetch(`${WEATHER_PROXY_BASE}/api/domain-readiness`),
      fetch(`${WEATHER_PROXY_BASE}/api/events?limit=20`),
      fetch(`${WEATHER_PROXY_BASE}/api/evidence-ledger`),
      fetch(`${WEATHER_PROXY_BASE}/api/mass-gatherings`),
      fetch(`${WEATHER_PROXY_BASE}/api/daily-brief`),
      fetch(`${WEATHER_PROXY_BASE}/api/system-status`),
    ]);
    if (![readinessResponse, eventsResponse, ledgerResponse, gatheringsResponse, briefResponse, systemResponse].every((response) => response.ok)) throw new Error("pcs_api_unavailable");
    const [readiness, eventList, ledger, gatherings, brief, system] = await Promise.all([readinessResponse.json(), eventsResponse.json(), ledgerResponse.json(), gatheringsResponse.json(), briefResponse.json(), systemResponse.json()]);
    const eventDetails = await Promise.all((eventList.events || []).map(async (event) => {
      const response = await fetch(`${WEATHER_PROXY_BASE}/api/events/${encodeURIComponent(event.id)}`);
      return response.ok ? response.json() : event;
    }));
    renderDomainReadiness(readiness);
    renderPcsLayers({ generated_at: system.generated_at, layers: system.observation?.variables || [] });
    renderDailyBriefPayload(brief, eventDetails);
    renderSystemStatus(system);
    renderEvidenceLedger(ledger.entries || []);
    renderMassGatherings(gatherings.data || []);
    updateText(selectors.pcsApiStatus, `${t("last_update")}: ${formatPcsTime(readiness.generated_at)}`);
    refreshAnimationStatus();
  } catch (error) {
    updateText(selectors.pcsApiStatus, t("pcs_api_unavailable"));
  }
}

async function initializeApp() {
  runSafe("regional mode initialization", initializeRegionalMode);
  runSafe("language selector initialization", initializeLanguageSelector);
  renderClock();
  await runSafeAsync("Cesium globe initialization", initializeCesiumGlobe);
  runSafe("animation status initialization", refreshAnimationStatus);
  runSafe("placeholder selector initialization", initializePlaceholderSelectors);
  runSafe("framework controls initialization", initializeFrameworkControls);
  runSafe("layer controls initialization", initializeLayerControls);
  runSafe("Evidence Explorer initialization", initializeEvidenceExplorer);
  runSafe("weather layer initialization", initializeWeatherLayers);
  runSafe("layer snapshot runtime initialization", initializeLayerSnapshotRuntime);
  await loadLayerCapabilitySnapshot();
  await runSafeAsync("visitor network initialization", initializeVisitorNetwork);
  await runSafeAsync("PCS evidence panels initialization", loadPcsEvidencePanels);
  await runSafeAsync("Evidence Explorer event loading", () => loadEvidenceExplorer(false));
  runSafe("build timestamp rendering", renderBuildTimestamp);
  await runSafeAsync("language loading", () => setLanguage(getCurrentLanguage()));
  await runSafeAsync("PCS evidence panels translation refresh", loadPcsEvidencePanels);
  await runSafeAsync("dashboard data loading", () => loadLatestState());
}

window.addEventListener("error", (event) => {
  reportStartupError("runtime error", event.error ?? new Error(String(event.message)));
});
window.addEventListener("unhandledrejection", (event) => {
  reportStartupError("unhandled promise rejection", event.reason ?? new Error("Unknown rejection"));
});

initializeApp().catch((error) => {
  reportStartupError("app initialization", error);
});
window.addEventListener("resize", () => {
  if (cesiumViewer) {
    runSafe("Cesium resize", () => cesiumViewer.resize());
  }
});
setInterval(() => runSafe("clock rendering", renderClock), 1000);
setInterval(() => {
  void runSafeAsync("auto dashboard refresh", () => loadLatestState());
}, REFRESH_INTERVAL_MS);
setInterval(() => {
  if (activeCelestialTargetId === "moon") {
    void runSafeAsync("Moon ephemeris and lighting refresh", () => loadMoonObservation());
  }
}, MOON_LIGHTING_REFRESH_INTERVAL_MS);
setInterval(() => {
  if (document.visibilityState === "visible") {
    void pingVisitorPresence();
    void runSafeAsync("visitor stats refresh", refreshVisitorStats);
  }
}, VISITOR_STATS_REFRESH_INTERVAL_MS);
setInterval(() => {
  if (document.visibilityState === "visible") {
    void runSafeAsync("visitor locations refresh", refreshVisitorLocations);
  }
}, VISITOR_LOCATIONS_REFRESH_INTERVAL_MS);
setInterval(() => {
  if (document.visibilityState === "visible") {
    void runSafeAsync("visitor analytics refresh", () => refreshVisitorAnalytics(visitorAnalyticsRange));
  }
}, VISITOR_ANALYTICS_REFRESH_INTERVAL_MS);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  void runSafeAsync("visitor visibility stats refresh", refreshVisitorStats);
  void runSafeAsync("visitor visibility locations refresh", refreshVisitorLocations);
  if (Date.now() - latestVisitorAnalyticsAt > VISITOR_ANALYTICS_REFRESH_INTERVAL_MS) {
    void runSafeAsync("visitor visibility analytics refresh", () => refreshVisitorAnalytics(visitorAnalyticsRange));
  }
});
