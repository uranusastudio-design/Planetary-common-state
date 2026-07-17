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
const WEATHER_PROXY_BASE = IS_LOCAL_DEVELOPMENT
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
  clouds: { label: "Clouds", path: "clouds", opacity: 0.5 },
  rain: { label: "Rain", path: "rain", opacity: 0.6 },
  temp: { label: "Temperature", path: "temp", opacity: 0.6 },
  wind: { label: "Wind", path: "wind", opacity: 0.6 },
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
let translations = {};
const activeWeatherLayers = new Map();

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
  layerControls: document.querySelectorAll("[data-layer-status]"),
  buildTimestamp: document.querySelector("#build-timestamp"),
  languageSelector: document.querySelector("#language-selector"),
  regionSelector: document.querySelector("#region-selector"),
  dataSourceSelector: document.querySelector("#data-source-selector"),
  aiModeSelector: document.querySelector("#ai-mode-selector"),
  activeRegionName: document.querySelector("#active-region-name"),
  navCurrentRegion: document.querySelector("#nav-current-region"),
  regionalModeStatus: document.querySelector("#regional-mode-status"),
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
    updateText(element, `Connected: ${connected} / 4\nWaiting: ${waiting} / 4\nPlanned: future layers`);
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

  earthPcsReference = state.S_demo ?? state.pcs_state?.value ?? state.pcs_state?.status;
  displayValue(selectors.currentState, earthPcsReference);
  displayCoverage(selectors.coverage, state.coverage_count);
  displayValue(selectors.latestYear, state.latest_year, 0);
  displayValue(selectors.projections.L_T, state.projections?.L_T);
  displayValue(selectors.projections.L_C, state.projections?.L_C);
  displayValue(selectors.projections.L_S, state.projections?.L_S);
  displayValue(selectors.projections.L_I, state.projections?.L_I);

  displayProgressBar(selectors.progress.L_T, state.projections?.L_T);
  displayProgressBar(selectors.progress.L_C, state.projections?.L_C);
  displayProgressBar(selectors.progress.L_S, state.projections?.L_S);
  displayProgressBar(selectors.progress.L_I, state.projections?.L_I);

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
  updateText(selectors.navLocalTime, nowDate.toLocaleString());
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
      console.warn("Regional state load failed, using global fallback:", requestedSource, error);
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
    updateText(selectors.regionalModeStatus, "Regional mode selected. Regional data pending.");
  }
}

function setCesiumCameraForRegion(regionId) {
  const region = regionConfig[regionId] ?? regionConfig.global;
  if (!cesiumViewer || !window.Cesium || activeCelestialTargetId !== "earth") {
    return;
  }

  cesiumViewer.camera.cancelFlight();
  cesiumViewer.scene.tweens.removeAll();
  cesiumViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(region.lon, region.lat, region.altitude),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: Cesium.Math.toRadians(0),
    },
  });
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

function clearEarthLayers() {
  [...activeWeatherLayers.keys()].forEach(removeWeatherLayer);
  selectors.weatherLayerControls.forEach((control) => { control.checked = false; });
  clearEarthImagery();
  clearUserLocation();
}

function updatePcsAvailability(config) {
  if (!config || !selectors.currentState) return;
  if (config.id === "earth") {
    updateText(selectors.pcsStateLabel, "Prototype PCS Estimate");
    updateText(selectors.pcsStateNote,
      "This is a prototype estimate from partial Earth observations, not a complete planetary assessment.");
    displayValue(selectors.currentState, earthPcsReference);
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
  selectors.solarSystemControls.forEach((button) => {
    const active = button.dataset.solarTarget === targetId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateText(selectors.observatoryViewLabel, `${target.bodyType === "space" ? "Deep Space" : "3D Celestial"} Observatory`);
  updateText(selectors.observatoryViewTitle, `${target.displayName} — ${target.subtitle}`);
  updateText(selectors.celestialTargetStatus, `${target.displayName} ${target.status.toLowerCase()}`);
  selectors.celestialTargetStatus.className = `status-pill ${target.status === "Active" ? "status-normal" : "status-attention"}`;
  updateText(selectors.solarSystemStatus, `${target.displayName} ${target.status}. ${target.texture}`);
  updateMonitoringScales(targetId);
  selectors.locationPanel?.toggleAttribute("hidden", targetId !== "earth");
  document.querySelectorAll(".layer-control-panel").forEach((panel) => panel.toggleAttribute("hidden", targetId !== "earth"));
  if (selectors.moonPanel) selectors.moonPanel.hidden = targetId !== "moon";
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
  const [lon, lat, altitude] = target.cameraDestination;
  cesiumViewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, altitude), duration: 1.2 });
  if (targetId === "earth") {
    restoreEarthLighting();
    await setEarthImageryMode();
    if (lastUserPosition) showUserLocation(lastUserPosition);
    updateVisitorLayerVisibility();
  } else if (targetId === "moon") {
    moonImageryActive = false;
    moonNumericalActive = false;
    await Promise.allSettled([loadMoonImagery(), loadMoonObservation()]);
    updateMoonStatusMessage();
  } else if (targetId === "sun") {
    solarImageryActive = false;
    solarNumericalActive = false;
    activeSolarObservationPayload = null;
    await loadSunObservation();
    updateSunStatusMessage();
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
  cesiumViewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, Math.max(accuracy * 8, 2500)), duration: 1.8 });
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

  if (selectors.regionSelector) {
    selectors.regionSelector.value = activeRegionId;
    selectors.regionSelector.addEventListener("change", () => {
      const selectedRegion = selectors.regionSelector.value;
      writeStorageValue(REGION_STORAGE_KEY, selectedRegion);
      updateRegionContext(selectedRegion);
      setCesiumCameraForRegion(activeRegionId);
      loadLatestState();
    });
  }

  updateRegionContext(activeRegionId);
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
  });
}

function initializePlaceholderSelectors() {
  selectors.dataSourceSelector?.addEventListener("change", () => {
    updateText(selectors.dataMessage, "Data-source filtering is planned.");
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
    control.addEventListener("click", () => { void setCelestialTarget(control.dataset.solarTarget); });
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
      cesiumViewer.camera.flyTo({
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
      const label = action.replace("-", " ");
      updateText(selectors.timelineStatus, `Timeline ${label} placeholder. Timeline playback will activate after validated time-series data is available.`);
    });
  });

  selectors.timelineSpeed?.addEventListener("change", () => {
    updateText(selectors.timelineStatus, "Timeline speed placeholder. Timeline playback will activate after validated time-series data is available.");
  });

  selectors.soundToggle?.addEventListener("change", () => {
    selectors.soundToggle.checked = false;
    updateText(selectors.audioStatus, "Sound placeholder only. No audio assets loaded.");
  });

  selectors.voiceToggle?.addEventListener("change", () => {
    selectors.voiceToggle.checked = false;
    updateText(selectors.audioStatus, "Voice placeholder only. No audio assets loaded.");
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

      updateText(selectors.layerControlMessage, "Planned layer. No data connected.");
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
  const labels = [...activeWeatherLayers.keys()]
    .map((id) => WEATHER_LAYER_CONFIG[id]?.label ?? id)
    .join(", ");
  updateText(selectors.weatherActiveLayers, labels ? `Active layers: ${labels}` : "Active layers: none");
}

function setWeatherProxyStatus(message) {
  updateText(selectors.weatherProxyStatus, message);
}

function setWeatherTileError(message) {
  updateText(selectors.weatherTileError, message);
}

function addWeatherLayer(layerId) {
  if (!cesiumViewer || !window.Cesium || activeCelestialTargetId !== "earth") {
    setWeatherProxyStatus("Weather proxy: globe not available.");
    return;
  }
  if (activeWeatherLayers.has(layerId)) {
    return;
  }
  const config = WEATHER_LAYER_CONFIG[layerId];
  if (!config) {
    return;
  }
  const tileUrl = buildWeatherTileUrl(config.path);
  try {
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: tileUrl,
      tilingScheme: new Cesium.WebMercatorTilingScheme(),
      credit: "Weather data © OpenWeather",
      minimumLevel: 0,
      maximumLevel: WEATHER_TILE_MAX_ZOOM,
      tileWidth: 256,
      tileHeight: 256,
      enablePickFeatures: false,
    });
    const unsubscribeErrorListener = provider.errorEvent.addEventListener((error) => {
      const statusCode = error.error?.statusCode ? ` (${error.error.statusCode})` : "";
      setWeatherTileError(`Tile error: "${config.label}"${statusCode}. Weather layer remains optional.`);
    });
    const layer = cesiumViewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = config.opacity;
    activeWeatherLayers.set(layerId, { layer, unsubscribeErrorListener });
    setWeatherProxyStatus("Weather proxy: connected");
    setWeatherTileError("");
  } catch (error) {
    setWeatherProxyStatus("Weather proxy: unavailable");
  }
  updateWeatherActiveLayersStatus();
}

function removeWeatherLayer(layerId) {
  if (!cesiumViewer || !activeWeatherLayers.has(layerId)) {
    return;
  }
  const { layer, unsubscribeErrorListener } = activeWeatherLayers.get(layerId);
  unsubscribeErrorListener?.();
  cesiumViewer.imageryLayers.remove(layer, true);
  activeWeatherLayers.delete(layerId);
  if (activeWeatherLayers.size === 0) {
    setWeatherTileError("");
  }
  updateWeatherActiveLayersStatus();
}

async function checkWeatherProxyHealth() {
  if (!selectors.weatherProxyStatus) {
    return;
  }

  setWeatherProxyStatus("Weather proxy: checking...");
  try {
    const response = await fetch(`${WEATHER_PROXY_BASE}/health/openweather`, { cache: "no-store" });
    if (!response.ok) {
      setWeatherProxyStatus("Weather proxy: unavailable");
      return;
    }
    const payload = await response.json().catch((error) => {
      console.warn("[PCS_OBSERVATORY] Weather health response JSON parse failed:", error);
      return {};
    });
    if (payload && payload.key_configured === false) {
      setWeatherProxyStatus("Weather proxy: unavailable (OPENWEATHER_API_KEY missing)");
      return;
    }
    setWeatherProxyStatus("Weather proxy: connected");
  } catch (error) {
    setWeatherProxyStatus("Weather proxy: unavailable");
  }
}

function initializeWeatherLayers() {
  if (!selectors.weatherLayerControls.length) {
    return;
  }

  resetWeatherStatusDisplay();
  selectors.weatherLayerControls.forEach((control) => {
    control.addEventListener("change", () => {
      const layerId = control.dataset.weatherLayer;
      if (control.checked) {
        addWeatherLayer(layerId);
      } else {
        removeWeatherLayer(layerId);
      }
    });
  });
  checkWeatherProxyHealth().catch(() => {
    setWeatherProxyStatus("Weather proxy: unavailable");
  });
}

function resetWeatherStatusDisplay() {
  updateWeatherActiveLayersStatus();
  setWeatherTileError("");
}

async function initializeApp() {
  runSafe("regional mode initialization", initializeRegionalMode);
  runSafe("language selector initialization", initializeLanguageSelector);
  renderClock();
  await runSafeAsync("Cesium globe initialization", initializeCesiumGlobe);
  runSafe("placeholder selector initialization", initializePlaceholderSelectors);
  runSafe("framework controls initialization", initializeFrameworkControls);
  runSafe("layer controls initialization", initializeLayerControls);
  runSafe("weather layer initialization", initializeWeatherLayers);
  await runSafeAsync("visitor network initialization", initializeVisitorNetwork);
  runSafe("build timestamp rendering", renderBuildTimestamp);
  await runSafeAsync("language loading", () => setLanguage(getCurrentLanguage()));
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
    void runSafeAsync("visitor ping", () => postVisitorEvent("/api/visitors/ping"));
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
