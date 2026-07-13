const GLOBAL_STATE_SOURCE = "../PCS_ENGINE/output/latest_state.json";
const REGIONAL_STATE_SOURCE_PREFIX = "../PCS_ENGINE/output/regions";
const REFRESH_INTERVAL_MS = 10000;
const LANGUAGE_STORAGE_KEY = "pcs_observatory_language";
const REGION_STORAGE_KEY = "pcs_observatory_region";
const WEATHER_PROXY_BASE = "https://pcs-backend.uranusastudio.workers.dev";
const ASTRONOMY_PROXY_BASE = WEATHER_PROXY_BASE;
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
  moon: { id: "moon", displayName: "Moon", subtitle: "Lunar Surface", status: "Preview", bodyType: "moon", texture: "Preview color texture — not live scientific imagery", cameraDestination: [0, 0, 22000000], availableMonitoringScales: ["Global", "Near Side", "Far Side", "Landing Sites", "Satellite View"], enabledDataDomains: [], color: "#9aa3ad" },
  mars: { id: "mars", displayName: "Mars", subtitle: "The Red Planet", status: "Preview", bodyType: "planet", texture: "Preview color texture — not live scientific imagery", cameraDestination: [0, 10, 26000000], availableMonitoringScales: ["Global", "Region", "Crater", "Landing Sites", "Satellite View"], enabledDataDomains: [], color: "#a84f32" },
  venus: { id: "venus", displayName: "Venus", subtitle: "Radar World", status: "Preview", bodyType: "planet", texture: "Preview color texture — not live scientific imagery", cameraDestination: [0, 0, 26000000], availableMonitoringScales: ["Global", "Region", "Radar Surface"], enabledDataDomains: [], color: "#c89345" },
  jupiter: { id: "jupiter", displayName: "Jupiter", subtitle: "Gas Giant", status: "Preview", bodyType: "gas-giant", texture: "Preview color texture — not live scientific imagery", cameraDestination: [0, 0, 34000000], availableMonitoringScales: ["Global", "Atmosphere", "Great Red Spot"], enabledDataDomains: [], color: "#b58b67" },
  saturn: { id: "saturn", displayName: "Saturn", subtitle: "Ringed Giant", status: "Preview", bodyType: "gas-giant", texture: "Preview color texture — not live scientific imagery", cameraDestination: [0, 0, 34000000], availableMonitoringScales: ["Global", "Atmosphere", "Ring System"], enabledDataDomains: [], color: "#cbb77b" },
  "solar-activity": { id: "solar-activity", displayName: "Solar Activity", subtitle: "Heliophysics", status: "Preview", bodyType: "star", texture: "Preview color texture — not live solar imagery", cameraDestination: [0, 0, 38000000], availableMonitoringScales: ["Photosphere", "Sunspots", "Corona", "Solar Wind"], enabledDataDomains: [], color: "#f6a623" },
  "deep-space": { id: "deep-space", displayName: "Deep Space", subtitle: "Beyond the Solar System", status: "Preview", bodyType: "space", texture: "Cesium star field preview — not a scientific sky survey", cameraDestination: [0, 0, 50000000], availableMonitoringScales: ["Solar System", "Nearby Stars", "Galaxy", "Deep Field"], enabledDataDomains: [], color: "#020712" },
};

Object.assign(celestialTargetConfig, {
  sun: { id: "sun", displayName: "Sun", subtitle: "Heliophysics", status: "Live", bodyType: "star", texture: "Preview only; NOAA and JPL data panels are live", cameraDestination: [0, 0, 38000000], availableMonitoringScales: ["Overview", "Photosphere", "Sunspots", "Corona", "Solar Wind"], enabledDataDomains: ["space-weather", "ephemeris"], color: "#f6a623" },
  mercury: { id: "mercury", displayName: "Mercury", subtitle: "Inner Planet", status: "Live", bodyType: "planet", texture: "Preview color texture; JPL ephemeris is live", cameraDestination: [0, 0, 23000000], availableMonitoringScales: ["Global", "Surface", "Craters", "Ephemeris"], enabledDataDomains: ["ephemeris"], color: "#8d8780" },
  venus: { id: "venus", displayName: "Venus", subtitle: "Radar World", status: "Live", bodyType: "planet", texture: "Preview color texture; JPL ephemeris is live", cameraDestination: [0, 0, 26000000], availableMonitoringScales: ["Global", "Atmosphere", "Radar Surface", "Ephemeris"], enabledDataDomains: ["ephemeris"], color: "#c89345" },
  mars: { id: "mars", displayName: "Mars", subtitle: "The Red Planet", status: "Live", bodyType: "planet", texture: "Preview color texture; JPL ephemeris is live", cameraDestination: [0, 10, 26000000], availableMonitoringScales: ["Global", "Surface", "Atmosphere", "Landing Sites", "Ephemeris"], enabledDataDomains: ["ephemeris"], color: "#a84f32" },
  jupiter: { id: "jupiter", displayName: "Jupiter", subtitle: "Gas Giant", status: "Live", bodyType: "gas-giant", texture: "Preview color texture; JPL ephemeris is live", cameraDestination: [0, 0, 34000000], availableMonitoringScales: ["Global", "Atmosphere", "Great Red Spot", "Ephemeris"], enabledDataDomains: ["ephemeris"], color: "#b58b67" },
  saturn: { id: "saturn", displayName: "Saturn", subtitle: "Ringed Giant", status: "Live", bodyType: "gas-giant", texture: "Preview color texture; JPL ephemeris is live", cameraDestination: [0, 0, 34000000], availableMonitoringScales: ["Global", "Atmosphere", "Ring System", "Ephemeris"], enabledDataDomains: ["ephemeris"], color: "#cbb77b" },
  uranus: { id: "uranus", displayName: "Uranus", subtitle: "Ice Giant", status: "Live", bodyType: "gas-giant", texture: "Preview color texture; JPL ephemeris is live", cameraDestination: [0, 0, 36000000], availableMonitoringScales: ["Global", "Atmosphere", "Ring System", "Ephemeris"], enabledDataDomains: ["ephemeris"], color: "#78b8c4" },
  neptune: { id: "neptune", displayName: "Neptune", subtitle: "Ice Giant", status: "Live", bodyType: "gas-giant", texture: "Preview color texture; JPL ephemeris is live", cameraDestination: [0, 0, 36000000], availableMonitoringScales: ["Global", "Atmosphere", "Storm Systems", "Ephemeris"], enabledDataDomains: ["ephemeris"], color: "#4169b1" },
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
let userLocationEntity = null;
let userAccuracyEntity = null;
let lastUserPosition = null;
let activeRegionId = "global";
let translations = {};
const activeWeatherLayers = new Map();

const selectors = {
  currentState: document.querySelector("#current-state"),
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
  moonPanel: document.querySelector("#moon-observation-panel"),
  moonError: document.querySelector("#moon-error"),
  moonPhaseGraphic: document.querySelector("#moon-phase-graphic"),
  moonValues: document.querySelectorAll("[data-moon-value]"),
  moonProvenance: document.querySelector("#moon-provenance"),
  solarPanel: document.querySelector("#solar-observation-panel"),
  solarError: document.querySelector("#solar-error"),
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
};

function t(key) {
  return translations[key] ?? key;
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
  return readStorageValue(LANGUAGE_STORAGE_KEY, "en");
}

async function loadLanguage(lang) {
  try {
    const response = await fetch(`i18n/${lang}.json`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Language file unavailable: ${lang}`);
    }
    return await response.json();
  } catch (error) {
    if (lang !== "en") {
      return loadLanguage("en");
    }
    return {};
  }
}

async function setLanguage(lang) {
  const selectedLanguage = lang || "en";
  writeStorageValue(LANGUAGE_STORAGE_KEY, selectedLanguage);
  translations = await loadLanguage(selectedLanguage);
  if (selectors.languageSelector) {
    selectors.languageSelector.value = selectedLanguage;
  }
  document.documentElement.lang = selectedLanguage;
  translateUI();
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

  displayValue(selectors.currentState, state.S_demo ?? state.pcs_state?.value ?? state.pcs_state?.status);
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

function clearEarthImagery() {
  earthImageryErrorUnsubscribe?.();
  earthImageryErrorUnsubscribe = null;
  if (earthBaseLayer && cesiumViewer && !cesiumViewer.isDestroyed()) {
    cesiumViewer.imageryLayers.remove(earthBaseLayer, true);
  }
  earthBaseLayer = null;
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

async function setCelestialTarget(targetId) {
  const target = celestialTargetConfig[targetId];
  if (!target || !cesiumViewer || !window.Cesium || targetId === activeCelestialTargetId) return;
  showObservatoryMessage(`Loading ${target.displayName}…`);
  if (activeCelestialTargetId === "earth") clearEarthLayers();
  activeCelestialTargetId = targetId;
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
  const [lon, lat, altitude] = target.cameraDestination;
  cesiumViewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, altitude), duration: 1.2 });
  if (targetId === "earth") {
    await setEarthImageryMode();
    if (lastUserPosition) showUserLocation(lastUserPosition);
  }
  else showObservatoryMessage(`${target.displayName} preview loaded. No live scientific planetary imagery is displayed.`);
  if (targetId === "moon") await loadMoonObservation();
  if (targetId === "sun") await loadSunObservation();
  if (PLANET_EPHEMERIS_TARGETS.has(targetId)) await loadPlanetObservation(targetId);
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
  const size = canvas.width, radius = size * 0.42;
  context.clearRect(0, 0, size, size); context.save(); context.beginPath(); context.arc(size / 2, size / 2, radius, 0, Math.PI * 2); context.clip();
  context.fillStyle = "#101722"; context.fillRect(0, 0, size, size);
  if (Number.isFinite(fraction)) {
    const illumination = (1 - Math.cos(Math.PI * 2 * fraction)) / 2, waxing = fraction < 0.5;
    context.fillStyle = "#f2f0d8"; context.beginPath(); context.arc(size / 2, size / 2, radius, -Math.PI / 2, Math.PI / 2, waxing);
    context.ellipse(size / 2, size / 2, Math.abs(1 - 2 * illumination) * radius, radius, 0, Math.PI / 2, Math.PI * 1.5, illumination > 0.5 ? !waxing : waxing); context.fill();
  }
  context.restore(); context.strokeStyle = "rgba(210,225,239,.5)"; context.lineWidth = 2; context.beginPath(); context.arc(size / 2, size / 2, radius, 0, Math.PI * 2); context.stroke();
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
    updateText(selectors.solarSystemStatus, payload.stale ? `Moon ephemeris delayed. Stale values from ${formatAstronomyValue(payload.timestamp)}.` : "Moon observation active. Phase and age are calculated approximations; distance and illumination are JPL ephemeris values.");
  } catch { updateText(selectors.moonError, "Moon ephemeris temporarily unavailable"); updateText(selectors.solarSystemStatus, "Moon preview remains available; live values could not be retrieved."); setObservationBadge("unavailable"); drawMoonPhase(null); }
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

async function loadSolarObservation() {
  updateText(selectors.solarError, "");
  const [summaryResult, alertsResult] = await Promise.allSettled([fetchAstronomy("/api/space-weather/summary"), fetchAstronomy("/api/space-weather/alerts")]);
  if (summaryResult.status === "rejected") { updateText(selectors.solarError, "NOAA space-weather data temporarily unavailable"); updateText(selectors.solarSystemStatus, "Solar Activity preview remains available; live NOAA summary could not be retrieved."); setObservationBadge("unavailable"); if (alertsResult.status === "fulfilled") renderAlerts(alertsResult.value); return; }
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
  updateText(selectors.solarSystemStatus, payload.stale ? `NOAA data delayed. Stale values from ${formatAstronomyValue(payload.timestamp)}.` : payload.partial ? "Solar Activity active. NOAA summary is partially available; missing fields remain unavailable." : "Solar Activity active with NOAA SWPC data.");
  if (alertsResult.status === "fulfilled") renderAlerts(alertsResult.value);
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
    renderBodyValues(selectors.planetValues, payload.data || {});
    selectors.planetMeta.forEach((element) => {
      const field = element.dataset.planetMeta;
      const value = field === "source" ? payload.source : payload[field];
      element.textContent = formatAstronomyValue(value);
    });
    setObservationBadge(payload.status, payload.stale || payload.status === "stale");
    updateText(selectors.solarSystemStatus, `${celestialTargetConfig[body].displayName} ephemeris ${payload.status}. Observation time ${formatAstronomyValue(payload.observed_at)}.`);
  } catch {
    selectors.planetValues.forEach((element) => { element.textContent = "Unavailable"; });
    selectors.planetMeta.forEach((element) => { element.textContent = "Unavailable"; });
    updateText(selectors.planetError, `${celestialTargetConfig[body].displayName} ephemeris temporarily unavailable`);
    setObservationBadge("unavailable");
  }
}

async function loadSunObservation() {
  const [, ephemerisResult] = await Promise.allSettled([
    loadSolarObservation(),
    fetchAstronomy("/api/astronomy/body/sun"),
  ]);
  if (ephemerisResult.status === "fulfilled") {
    renderBodyValues(selectors.sunValues, ephemerisResult.value.data || {});
    updateText(selectors.sunEphemerisTime, formatAstronomyValue(ephemerisResult.value.observed_at));
  } else {
    selectors.sunValues.forEach((element) => { element.textContent = "Unavailable"; });
    updateText(selectors.sunEphemerisTime, "Unavailable");
  }
}

function initializeFrameworkControls() {
  selectors.solarSystemControls.forEach((control) => {
    control.setAttribute("aria-pressed", String(control.dataset.solarTarget === "earth"));
    control.addEventListener("click", () => { void setCelestialTarget(control.dataset.solarTarget); });
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
