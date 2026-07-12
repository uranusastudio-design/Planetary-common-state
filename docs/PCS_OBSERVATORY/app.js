const GLOBAL_STATE_SOURCE = "../PCS_ENGINE/output/latest_state.json";
const REGIONAL_STATE_SOURCE_PREFIX = "../PCS_ENGINE/output/regions";
const REFRESH_INTERVAL_MS = 10000;
const LANGUAGE_STORAGE_KEY = "pcs_observatory_language";
const REGION_STORAGE_KEY = "pcs_observatory_region";
const NASA_GIBS_WMS_ENDPOINT = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
const WEATHER_LAYER_ORDER = ["clouds", "rain", "temp", "wind"];
const WEATHER_LAYER_TEST_NOTICE = "NASA GIBS test layer - not real-time weather.";
const WEATHER_LAYER_CONFIG = {
  clouds: {
    label: "Clouds",
    provider: "NASA GIBS",
    service: "wms",
    endpoint: NASA_GIBS_WMS_ENDPOINT,
    layers: "MODIS_Terra_Cloud_Fraction_Day",
    observationDate: "2026-07-12",
    dataset: "MODIS Terra Cloud Fraction Day",
    scientificRole: "Cloud fraction observation test layer",
    parameters: {
      format: "image/png",
      transparent: true,
      time: "2026-07-12",
    },
    opacity: 0.5,
    credit: "NASA GIBS / MODIS Terra Cloud Fraction Day",
  },
  rain: {
    label: "Precipitation",
    provider: "NASA GIBS",
    service: "wms",
    endpoint: NASA_GIBS_WMS_ENDPOINT,
    layers: "IMERG_Precipitation_Rate",
    observationDate: "2026-07-09",
    dataset: "IMERG Precipitation Rate",
    scientificRole: "Precipitation rate observation test layer",
    parameters: {
      format: "image/png",
      transparent: true,
      time: "2026-07-09",
    },
    opacity: 0.45,
    credit: "NASA GIBS / IMERG Precipitation Rate",
  },
  temp: {
    label: "Temperature",
    provider: "NASA GIBS",
    service: "wms",
    endpoint: NASA_GIBS_WMS_ENDPOINT,
    layers: "AIRS_L3_Surface_Air_Temperature_Daily_Day",
    observationDate: "2026-07-07",
    dataset: "AIRS L3 Surface Air Temperature Daily Day",
    scientificRole: "Surface air temperature observation test layer",
    parameters: {
      format: "image/png",
      transparent: true,
      time: "2026-07-07",
    },
    opacity: 0.42,
    credit: "NASA GIBS / AIRS L3 Surface Air Temperature Daily Day",
  },
  wind: {
    label: "Wind speed",
    provider: "NASA GIBS",
    service: "wms",
    endpoint: NASA_GIBS_WMS_ENDPOINT,
    layers: "CYGNSS_L3_Wind_Speed_Daily",
    observationDate: "2021-02-28",
    dataset: "CYGNSS L3 Wind Speed Daily",
    scientificRole: "Ocean/tropical cyclone wind speed observation test layer",
    parameters: {
      format: "image/png",
      transparent: true,
      time: "2021-02-28",
    },
    opacity: 0.42,
    credit: "NASA GIBS / CYGNSS L3 Wind Speed Daily",
  },
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
  timelineControls: document.querySelectorAll("[data-timeline-action]"),
  timelineStatus: document.querySelector("#timeline-status"),
  timelineSpeed: document.querySelector("#timeline-speed"),
  soundToggle: document.querySelector("#sound-toggle"),
  voiceToggle: document.querySelector("#voice-toggle"),
  audioStatus: document.querySelector("#audio-status"),
  weatherLayerControls: document.querySelectorAll("[data-weather-layer]"),
  weatherOpacityControls: document.querySelectorAll("[data-weather-opacity]"),
  weatherProxyStatus: document.querySelector("#weather-proxy-status"),
  weatherActiveLayers: document.querySelector("#weather-active-layers"),
  weatherTileError: document.querySelector("#weather-tile-error"),
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

function clampNumber(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return min;
  }
  return Math.min(max, Math.max(min, numericValue));
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
  if (!cesiumViewer || !window.Cesium) {
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

function initializeCesiumGlobe() {
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
    Cesium.TileMapServiceImageryProvider.fromUrl(
      Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
    ).then((provider) => {
      if (!cesiumViewer || cesiumViewer.isDestroyed()) {
        return;
      }
      cesiumViewer.imageryLayers.addImageryProvider(provider, 0);
    }).catch((error) => {
      console.warn("[PCS_OBSERVATORY] Natural Earth base imagery failed:", error);
    });
    cesiumViewer.scene.skyAtmosphere.show = true;
    cesiumViewer.scene.globe.enableLighting = true;
    const cameraController = cesiumViewer.scene.screenSpaceCameraController;
    cameraController.minimumZoomDistance = 12000000;
    cameraController.maximumZoomDistance = 50000000;
    cameraController.enableRotate = true;
    cameraController.enableTranslate = true;
    cameraController.enableZoom = true;
    cameraController.enableTilt = true;
    cameraController.enableLook = true;
    cameraController.inertiaZoom = 0;
    setCesiumCameraForRegion(activeRegionId);

    updateText(selectors.cesiumFallback, "CesiumJS globe initialized. Visualization only.");
    selectors.cesiumFallback?.classList.remove("is-error");
  } catch (error) {
    showCesiumFallback("3D Earth unavailable. PCS data display remains operational.");
  }
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

function initializeFrameworkControls() {
  selectors.solarSystemControls.forEach((control) => {
    control.addEventListener("click", () => {
      const target = control.dataset.solarTarget;
      if (target === "earth") {
        updateText(selectors.solarSystemStatus, "Earth Observatory active. No planetary data or models are loaded.");
        return;
      }

      updateText(selectors.solarSystemStatus, "Coming soon. Earth Observatory remains active.");
    });
  });

  selectors.observatoryModeControls.forEach((control) => {
    control.addEventListener("click", () => {
      const mode = control.dataset.observatoryMode;
      if (mode === "planet") {
        updateText(selectors.observatoryModeStatus, "Planet mode active. Regional data integration pending.");
        return;
      }

      updateText(selectors.observatoryModeStatus, "Mode placeholder. Regional data integration pending.");
    });
  });

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

function createWeatherImageryProvider(config) {
  return new Cesium.WebMapServiceImageryProvider({
    url: config.endpoint,
    layers: config.layers,
    parameters: config.parameters,
    credit: config.credit,
    enablePickFeatures: false,
  });
}

function updateWeatherActiveLayersStatus() {
  const labels = WEATHER_LAYER_ORDER
    .filter((id) => activeWeatherLayers.has(id))
    .map((id) => WEATHER_LAYER_CONFIG[id]?.label ?? id)
    .join(", ");
  updateText(selectors.weatherActiveLayers, labels ? `Active layers: ${labels}` : "Active layers: none");
}

function setWeatherConnectionStatus(message) {
  updateText(selectors.weatherProxyStatus, message);
}

function setWeatherTileError(message) {
  updateText(selectors.weatherTileError, message);
}

function syncWeatherLayerControls() {
  selectors.weatherLayerControls.forEach((control) => {
    control.checked = activeWeatherLayers.has(control.dataset.weatherLayer);
  });
}

function removeWeatherLayer(layerId, options = {}) {
  if (!cesiumViewer || !activeWeatherLayers.has(layerId)) {
    return;
  }
  const { layer, unsubscribeErrorListener } = activeWeatherLayers.get(layerId);
  unsubscribeErrorListener?.();
  cesiumViewer.imageryLayers.remove(layer, true);
  activeWeatherLayers.delete(layerId);
  if (activeWeatherLayers.size === 0 && !options.keepMessage) {
    setWeatherTileError("");
  }
  updateWeatherActiveLayersStatus();
  syncWeatherLayerControls();
}

function enforceWeatherLayerOrder() {
  if (!cesiumViewer) {
    return;
  }

  WEATHER_LAYER_ORDER.forEach((layerId) => {
    const activeLayer = activeWeatherLayers.get(layerId)?.layer;
    if (activeLayer) {
      cesiumViewer.imageryLayers.raiseToTop(activeLayer);
    }
  });
}

function weatherLayerStatusText(layerId, config) {
  return `${config.provider}: ${config.dataset} connected. Observation date: ${config.observationDate}. ${WEATHER_LAYER_TEST_NOTICE}`;
}

function updateWeatherOpacity(layerId, value) {
  const opacity = clampNumber(value, 0, 1);
  const config = WEATHER_LAYER_CONFIG[layerId];
  if (config) {
    config.opacity = opacity;
  }
  const activeLayer = activeWeatherLayers.get(layerId)?.layer;
  if (activeLayer) {
    activeLayer.alpha = opacity;
  }
}

async function addWeatherLayer(layerId) {
  if (!cesiumViewer || !window.Cesium) {
    setWeatherConnectionStatus("NASA GIBS test layers: globe not available.");
    syncWeatherLayerControls();
    return;
  }
  if (activeWeatherLayers.has(layerId)) {
    syncWeatherLayerControls();
    return;
  }
  const config = WEATHER_LAYER_CONFIG[layerId];
  if (!config) {
    syncWeatherLayerControls();
    return;
  }

  try {
    const provider = createWeatherImageryProvider(config);
    const unsubscribeErrorListener = provider.errorEvent.addEventListener((error) => {
      const statusCode = error.error?.statusCode ? ` (${error.error.statusCode})` : "";
      setWeatherTileError(`${config.label} test layer tile unavailable${statusCode}`);
    });
    const layer = cesiumViewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = config.opacity;
    activeWeatherLayers.set(layerId, { layer, unsubscribeErrorListener });
    enforceWeatherLayerOrder();
    setWeatherConnectionStatus(weatherLayerStatusText(layerId, config));
    setWeatherTileError("");
  } catch (error) {
    console.error("[PCS_OBSERVATORY] Weather layer load failed:", error);
    const unavailableMessage = `${config.label} NASA GIBS test layer unavailable. Base globe remains visible.`;
    setWeatherConnectionStatus(unavailableMessage);
    setWeatherTileError(unavailableMessage);
  }
  updateWeatherActiveLayersStatus();
  syncWeatherLayerControls();
}

function initializeWeatherLayers() {
  if (!selectors.weatherLayerControls.length) {
    return;
  }

  resetWeatherStatusDisplay();
  selectors.weatherOpacityControls.forEach((control) => {
    const layerId = control.dataset.weatherOpacity;
    const config = WEATHER_LAYER_CONFIG[layerId];
    if (config) {
      control.value = String(Math.round(config.opacity * 100));
    }
    control.addEventListener("input", () => {
      updateWeatherOpacity(layerId, Number(control.value) / 100);
    });
  });
  selectors.weatherLayerControls.forEach((control) => {
    control.addEventListener("change", async () => {
      const layerId = control.dataset.weatherLayer;
      if (control.checked) {
        await addWeatherLayer(layerId);
      } else {
        removeWeatherLayer(layerId);
        setWeatherConnectionStatus(
          activeWeatherLayers.size
            ? "NASA GIBS test layers: connected. Base globe remains independent."
            : `NASA GIBS test layers ready. ${WEATHER_LAYER_TEST_NOTICE}`
        );
      }
    });
  });
}

function resetWeatherStatusDisplay() {
  updateWeatherActiveLayersStatus();
  setWeatherConnectionStatus(`NASA GIBS test layers ready. ${WEATHER_LAYER_TEST_NOTICE}`);
  setWeatherTileError("");
}

async function initializeApp() {
  runSafe("regional mode initialization", initializeRegionalMode);
  runSafe("language selector initialization", initializeLanguageSelector);
  renderClock();
  runSafe("Cesium globe initialization", initializeCesiumGlobe);
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
