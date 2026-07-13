const GLOBAL_STATE_SOURCE = "../PCS_ENGINE/output/latest_state.json";
const REGIONAL_STATE_SOURCE_PREFIX = "../PCS_ENGINE/output/regions";
const REFRESH_INTERVAL_MS = 10000;
const LANGUAGE_STORAGE_KEY = "pcs_observatory_language";
const REGION_STORAGE_KEY = "pcs_observatory_region";
const NASA_GIBS_WMS_ENDPOINT = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
const WEATHER_PROXY_BASE = "https://pcs-backend.uranusastudio.workers.dev";
const ASTRONOMY_PROXY_BASE = WEATHER_PROXY_BASE;
const SPACE_WEATHER_UI_THRESHOLDS = {
  kp: { medium: 4, high: 5 },
  solarWindSpeed: { medium: 500, high: 700 },
  xrayFlux: { medium: 1e-6, high: 1e-5 },
};
const WEATHER_SOURCE_STORAGE_KEY = "pcs_observatory_weather_source";
const WEATHER_LAYER_ORDER = ["clouds", "rain", "temp", "wind"];
const WEATHER_LAYER_TEST_NOTICE = "NASA GIBS test layer - not real-time weather.";
const AUTO_ROTATE_RESUME_DELAY_MS = 5000;
const AUTO_ROTATE_RADIANS_PER_SECOND = 0.00018;
const WEATHER_SOURCE_MODES = {
  nasa: {
    label: "NASA GIBS Test / Observation",
    readyMessage: `NASA GIBS Test / Observation layers ready. ${WEATHER_LAYER_TEST_NOTICE}`,
    connectedMessage: "NASA GIBS Test / Observation layers connected. Base globe remains independent.",
    configs: {
      clouds: {
        label: "Clouds",
        provider: "NASA GIBS Test / Observation",
        service: "wms",
        endpoint: NASA_GIBS_WMS_ENDPOINT,
        layers: "MODIS_Terra_Cloud_Fraction_Day",
        observationDate: "2026-07-12",
        dataset: "MODIS Terra Cloud Fraction Day",
        detail: "NASA GIBS test layer - MODIS_Terra_Cloud_Fraction_Day - 2026-07-12",
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
        provider: "NASA GIBS Test / Observation",
        service: "wms",
        endpoint: NASA_GIBS_WMS_ENDPOINT,
        layers: "IMERG_Precipitation_Rate",
        observationDate: "2026-07-09",
        dataset: "IMERG Precipitation Rate",
        detail: "NASA GIBS test layer - IMERG_Precipitation_Rate - 2026-07-09",
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
        provider: "NASA GIBS Test / Observation",
        service: "wms",
        endpoint: NASA_GIBS_WMS_ENDPOINT,
        layers: "AIRS_L3_Surface_Air_Temperature_Daily_Day",
        observationDate: "2026-07-07",
        dataset: "AIRS L3 Surface Air Temperature Daily Day",
        detail: "NASA GIBS test layer - AIRS_L3_Surface_Air_Temperature_Daily_Day - 2026-07-07",
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
        provider: "NASA GIBS Test / Observation",
        service: "wms",
        endpoint: NASA_GIBS_WMS_ENDPOINT,
        layers: "CYGNSS_L3_Wind_Speed_Daily",
        observationDate: "2021-02-28",
        dataset: "CYGNSS L3 Wind Speed Daily",
        detail: "NASA GIBS test layer - CYGNSS_L3_Wind_Speed_Daily - 2021-02-28",
        parameters: {
          format: "image/png",
          transparent: true,
          time: "2021-02-28",
        },
        opacity: 0.42,
        credit: "NASA GIBS / CYGNSS L3 Wind Speed Daily",
      },
    },
  },
  openweather: {
    label: "OpenWeather Live",
    readyMessage: "OpenWeather Live layers ready. Tiles are proxied through pcs-backend.",
    connectedMessage: "OpenWeather Live layers connected. Base globe remains independent.",
    configs: {
      clouds: {
        label: "Clouds",
        provider: "OpenWeather Live",
        service: "url-template",
        path: "clouds",
        dataset: "OpenWeather clouds_new",
        detail: "OpenWeather Live - clouds - proxied via pcs-backend",
        opacity: 0.5,
        credit: "Weather data OpenWeather",
      },
      rain: {
        label: "Rain",
        provider: "OpenWeather Live",
        service: "url-template",
        path: "rain",
        dataset: "OpenWeather precipitation_new",
        detail: "OpenWeather Live - rain - proxied via pcs-backend",
        opacity: 0.6,
        credit: "Weather data OpenWeather",
      },
      temp: {
        label: "Temperature",
        provider: "OpenWeather Live",
        service: "url-template",
        path: "temperature",
        dataset: "OpenWeather temp_new",
        detail: "OpenWeather Live - temperature - proxied via pcs-backend",
        opacity: 0.6,
        credit: "Weather data OpenWeather",
      },
      wind: {
        label: "Wind",
        provider: "OpenWeather Live",
        service: "url-template",
        path: "wind",
        dataset: "OpenWeather wind_new",
        detail: "OpenWeather Live - wind - proxied via pcs-backend",
        opacity: 0.6,
        credit: "Weather data OpenWeather",
      },
    },
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
let activeWeatherSourceId = "nasa";
let translations = {};
const activeWeatherLayers = new Map();
const autoRotateState = {
  enabled: false,
  initialized: false,
  interactingUntil: 0,
  lastFrameTime: 0,
  mediaQuery: null,
  rotatedFrames: 0,
};

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
  autoRotateToggle: document.querySelector("#auto-rotate-toggle"),
  autoRotateStatus: document.querySelector("#auto-rotate-status"),
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
  weatherLayerDetails: document.querySelectorAll("[data-weather-layer-detail]"),
  weatherSourceSelector: document.querySelector("#weather-source-selector"),
  weatherProxyStatus: document.querySelector("#weather-proxy-status"),
  weatherActiveLayers: document.querySelector("#weather-active-layers"),
  weatherTileError: document.querySelector("#weather-tile-error"),
  earthOnlyPanels: document.querySelectorAll(".earth-only-panel"),
  observatorySourceBadge: document.querySelector("#observatory-source-badge"),
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

function prefersReducedMotion() {
  if (typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function updateAutoRotateStatus(message) {
  updateText(selectors.autoRotateStatus, message);
}

function markGlobeInteraction() {
  autoRotateState.interactingUntil = Date.now() + AUTO_ROTATE_RESUME_DELAY_MS;
  if (autoRotateState.enabled) {
    updateAutoRotateStatus("Auto Rotate: paused during interaction");
  }
}

function markGlobeDragInteraction(event) {
  if (event?.buttons || event?.touches?.length) {
    markGlobeInteraction();
  }
}

function shouldAutoRotate(now) {
  return Boolean(
    cesiumViewer &&
    !cesiumViewer.isDestroyed() &&
    autoRotateState.enabled &&
    !document.hidden &&
    now >= autoRotateState.interactingUntil
  );
}

function autoRotateFrame() {
  const now = Date.now();
  const elapsedSeconds = autoRotateState.lastFrameTime
    ? Math.min((now - autoRotateState.lastFrameTime) / 1000, 0.1)
    : 0;
  autoRotateState.lastFrameTime = now;

  if (shouldAutoRotate(now) && elapsedSeconds > 0) {
    cesiumViewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -AUTO_ROTATE_RADIANS_PER_SECOND * elapsedSeconds);
    autoRotateState.rotatedFrames += 1;
    selectors.cesiumGlobe.dataset.autoRotateFrames = String(autoRotateState.rotatedFrames);
    updateAutoRotateStatus("Auto Rotate: on");
  } else if (!autoRotateState.enabled) {
    updateAutoRotateStatus("Auto Rotate: off");
  } else if (document.hidden) {
    updateAutoRotateStatus("Auto Rotate: paused while tab is hidden");
  } else if (now < autoRotateState.interactingUntil) {
    updateAutoRotateStatus("Auto Rotate: paused during interaction");
  }

  window.requestAnimationFrame(autoRotateFrame);
}

function initializeAutoRotate() {
  if (autoRotateState.initialized || !selectors.cesiumGlobe || !selectors.autoRotateToggle) {
    return;
  }

  autoRotateState.initialized = true;
  autoRotateState.mediaQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  autoRotateState.enabled = !prefersReducedMotion();
  selectors.autoRotateToggle.checked = autoRotateState.enabled;

  selectors.autoRotateToggle.addEventListener("change", () => {
    autoRotateState.enabled = selectors.autoRotateToggle.checked;
    autoRotateState.interactingUntil = 0;
    updateAutoRotateStatus(autoRotateState.enabled ? "Auto Rotate: on" : "Auto Rotate: off");
  });

  ["pointerdown", "wheel", "touchstart"].forEach((eventName) => {
    selectors.cesiumGlobe.addEventListener(eventName, markGlobeInteraction, { passive: true, capture: true });
  });
  selectors.cesiumGlobe.addEventListener("pointermove", markGlobeDragInteraction, { passive: true, capture: true });
  selectors.cesiumGlobe.addEventListener("touchmove", markGlobeDragInteraction, { passive: true, capture: true });

  document.addEventListener("visibilitychange", () => {
    autoRotateState.lastFrameTime = Date.now();
    if (!document.hidden && autoRotateState.enabled) {
      updateAutoRotateStatus("Auto Rotate: on");
    }
  });

  updateAutoRotateStatus(autoRotateState.enabled ? "Auto Rotate: on" : "Auto Rotate: off");
  window.requestAnimationFrame(autoRotateFrame);
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
    initializeAutoRotate();

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

function formatAstronomyValue(value, unit, digits = 1) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  if (typeof value === "number") return `${value.toLocaleString(undefined, { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ""}`;
  if (/^\d{4}-\d\d-\d\dT/.test(String(value))) return new Date(value).toLocaleString();
  return String(value);
}

function setObservationBadge(status, stale = false) {
  if (!selectors.observatorySourceBadge) return;
  const label = stale ? "Delayed · stale" : status === "live" ? "Live" : status === "delayed" ? "Delayed" : "Unavailable";
  selectors.observatorySourceBadge.textContent = label;
  selectors.observatorySourceBadge.className = `status-pill ${status === "live" && !stale ? "status-normal" : status === "delayed" || stale ? "status-muted" : "status-alert"}`;
}

function renderProvenance(container, provenance, response) {
  if (!container) return;
  container.replaceChildren();
  Object.entries(provenance || {}).forEach(([field, item]) => {
    const entry = document.createElement("div");
    entry.className = "provenance-entry";
    entry.textContent = `${field}: ${item.source || "Unavailable"} · ${item.type || "unknown"} · ${item.unit || "unit unavailable"} · observation/calculation: ${formatAstronomyValue(item.time)} · retrieved: ${formatAstronomyValue(response.retrieved_at)} · status: ${response.stale ? "stale" : response.status}`;
    container.append(entry);
  });
}

function drawMoonPhase(fraction) {
  const canvas = selectors.moonPhaseGraphic;
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const size = canvas.width;
  const radius = size * 0.42;
  context.clearRect(0, 0, size, size);
  context.save();
  context.beginPath();
  context.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = "#101722";
  context.fillRect(0, 0, size, size);
  if (Number.isFinite(fraction)) {
    const illumination = (1 - Math.cos(Math.PI * 2 * fraction)) / 2;
    const waxing = fraction < 0.5;
    context.fillStyle = "#f2f0d8";
    context.beginPath();
    context.arc(size / 2, size / 2, radius, -Math.PI / 2, Math.PI / 2, waxing);
    context.ellipse(size / 2, size / 2, Math.abs(1 - 2 * illumination) * radius, radius, 0, Math.PI / 2, Math.PI * 1.5, illumination > 0.5 ? !waxing : waxing);
    context.fill();
  }
  context.restore();
  context.strokeStyle = "rgba(210,225,239,.5)";
  context.lineWidth = 2;
  context.beginPath(); context.arc(size / 2, size / 2, radius, 0, Math.PI * 2); context.stroke();
}

async function fetchAstronomy(path) {
  const response = await fetch(`${ASTRONOMY_PROXY_BASE}${path}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) throw Object.assign(new Error(payload.error || "data unavailable"), { payload });
  return payload;
}

async function loadMoonObservation() {
  updateText(selectors.moonError, "");
  try {
    const payload = await fetchAstronomy("/api/astronomy/moon");
    const data = payload.data || {};
    const units = { moon_age_days: "days", illumination_percent: "%", earth_distance_km: "km" };
    selectors.moonValues.forEach((element) => {
      const field = element.dataset.moonValue;
      element.textContent = formatAstronomyValue(data[field], units[field], field === "earth_distance_km" ? 0 : 2);
    });
    drawMoonPhase(data.phase_fraction);
    renderProvenance(selectors.moonProvenance, data.provenance, payload);
    setObservationBadge(payload.status, payload.stale);
    updateText(selectors.solarSystemStatus, payload.stale ? `Moon ephemeris delayed. Stale values from ${formatAstronomyValue(payload.timestamp)}.` : "Moon observation active. Phase and age are calculated approximations; distance and illumination are JPL ephemeris values.");
  } catch (error) {
    updateText(selectors.moonError, "Moon ephemeris temporarily unavailable");
    updateText(selectors.solarSystemStatus, "Moon preview remains available; live values could not be retrieved.");
    setObservationBadge("unavailable");
    drawMoonPhase(null);
  }
}

function statusCategory(value, thresholds) {
  if (!Number.isFinite(value)) return "";
  return value >= thresholds.high ? "status-category-high" : value >= thresholds.medium ? "status-category-medium" : "status-category-low";
}

function renderAlerts(payload) {
  const alerts = Array.isArray(payload?.data) ? payload.data : [];
  updateText(selectors.solarAlertCount, String(alerts.length));
  selectors.solarAlertList?.replaceChildren();
  alerts.forEach((alert) => {
    const entry = document.createElement("article");
    entry.className = "alert-entry";
    entry.textContent = `${alert.title || "NOAA alert"}\n${alert.severity || "information"} · ${formatAstronomyValue(alert.issued_at)}\n${alert.summary || "No summary supplied."}`;
    selectors.solarAlertList?.append(entry);
  });
}

async function loadSolarObservation() {
  updateText(selectors.solarError, "");
  const [summaryResult, alertsResult] = await Promise.allSettled([
    fetchAstronomy("/api/space-weather/summary"), fetchAstronomy("/api/space-weather/alerts"),
  ]);
  if (summaryResult.status === "rejected") {
    updateText(selectors.solarError, "NOAA space-weather data temporarily unavailable");
    updateText(selectors.solarSystemStatus, "Solar Activity preview remains available; live NOAA summary could not be retrieved.");
    setObservationBadge("unavailable");
    if (alertsResult.status === "fulfilled") renderAlerts(alertsResult.value);
    return;
  }
  const payload = summaryResult.value;
  const data = payload.data || {};
  const units = { solar_wind_speed_km_s: "km/s", solar_wind_density_p_cm3: "p/cm³", imf_bz_nt: "nT", xray_flux_w_m2: "W/m²" };
  selectors.solarValues.forEach((element) => {
    const field = element.dataset.solarValue;
    const value = field === "source_status" ? `${payload.status}${payload.partial ? " · partial" : ""}${payload.stale ? " · stale" : ""}` : data[field];
    element.textContent = formatAstronomyValue(value, units[field], field === "xray_flux_w_m2" ? 8 : 2);
    element.classList.remove("status-category-low", "status-category-medium", "status-category-high");
    if (field === "kp_index") element.classList.add(statusCategory(data[field], SPACE_WEATHER_UI_THRESHOLDS.kp));
    if (field === "solar_wind_speed_km_s") element.classList.add(statusCategory(data[field], SPACE_WEATHER_UI_THRESHOLDS.solarWindSpeed));
    if (field === "xray_flux_w_m2") element.classList.add(statusCategory(data[field], SPACE_WEATHER_UI_THRESHOLDS.xrayFlux));
  });
  renderProvenance(selectors.solarProvenance, data.provenance, payload);
  setObservationBadge(payload.status, payload.stale);
  updateText(selectors.solarSystemStatus, payload.stale ? `NOAA data delayed. Stale values from ${formatAstronomyValue(payload.timestamp)}.` : payload.partial ? "Solar Activity active. NOAA summary is partially available; missing fields remain unavailable." : "Solar Activity active with NOAA SWPC data.");
  if (alertsResult.status === "fulfilled") renderAlerts(alertsResult.value);
}

function selectObservatoryTarget(target) {
  selectors.solarSystemControls.forEach((control) => control.classList.toggle("is-active", control.dataset.solarTarget === target));
  const isEarth = target === "earth";
  selectors.earthOnlyPanels.forEach((panel) => { panel.hidden = !isEarth; });
  if (selectors.moonPanel) selectors.moonPanel.hidden = target !== "moon";
  if (selectors.solarPanel) selectors.solarPanel.hidden = target !== "solar-activity";
  if (isEarth) {
    updateText(selectors.solarSystemStatus, "Earth Observatory active. No planetary data or models are loaded.");
    if (selectors.observatorySourceBadge) { selectors.observatorySourceBadge.textContent = "Earth active"; selectors.observatorySourceBadge.className = "status-pill status-normal"; }
  } else if (target === "moon") void runSafeAsync("Moon data loading", loadMoonObservation);
  else if (target === "solar-activity") void runSafeAsync("solar data loading", loadSolarObservation);
  else updateText(selectors.solarSystemStatus, "Coming soon. Select Earth, Moon, or Solar Activity for an active view.");
}

function initializeFrameworkControls() {
  selectors.solarSystemControls.forEach((control) => {
    control.addEventListener("click", () => {
      const target = control.dataset.solarTarget;
      selectObservatoryTarget(target);
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

function currentWeatherSource() {
  return WEATHER_SOURCE_MODES[activeWeatherSourceId] ?? WEATHER_SOURCE_MODES.nasa;
}

function currentWeatherConfig(layerId) {
  return currentWeatherSource().configs[layerId] ?? null;
}

function buildOpenWeatherTileUrl(layerPath) {
  const base = WEATHER_PROXY_BASE.replace(/\/$/, "");
  return `${base}/tiles/openweather/${layerPath}/{z}/{x}/{y}.png`;
}

function createWeatherImageryProvider(config) {
  if (config.service === "url-template") {
    return new Cesium.UrlTemplateImageryProvider({
      url: buildOpenWeatherTileUrl(config.path),
      tilingScheme: new Cesium.WebMercatorTilingScheme(),
      credit: config.credit,
      minimumLevel: 0,
      maximumLevel: 8,
      tileWidth: 256,
      tileHeight: 256,
      enablePickFeatures: false,
    });
  }

  return new Cesium.WebMapServiceImageryProvider({
    url: config.endpoint,
    layers: config.layers,
    parameters: config.parameters,
    credit: config.credit,
    enablePickFeatures: false,
  });
}

function updateWeatherActiveLayersStatus() {
  const source = currentWeatherSource();
  const labels = WEATHER_LAYER_ORDER
    .filter((id) => activeWeatherLayers.has(id))
    .map((id) => source.configs[id]?.label ?? id)
    .join(", ");
  updateText(selectors.weatherActiveLayers, labels ? `Active layers (${source.label}): ${labels}` : "Active layers: none");
}

function setWeatherConnectionStatus(message) {
  updateText(selectors.weatherProxyStatus, message);
}

function setWeatherTileError(message) {
  updateText(selectors.weatherTileError, message);
}

async function checkOpenWeatherHealth() {
  if (activeWeatherSourceId !== "openweather") {
    return;
  }

  setWeatherConnectionStatus("OpenWeather Live: checking pcs-backend...");
  try {
    const response = await fetch(`${WEATHER_PROXY_BASE}/health/openweather`, { cache: "no-store" });
    if (!response.ok) {
      setWeatherConnectionStatus(`OpenWeather Live: pcs-backend health unavailable (${response.status})`);
      return;
    }
    const health = await response.json();
    if (!health.key_configured || !health.upstream_ok) {
      setWeatherConnectionStatus("OpenWeather Live: pcs-backend is reachable, live weather upstream is not ready.");
      return;
    }
    setWeatherConnectionStatus("OpenWeather Live: pcs-backend connected. Live weather tiles ready.");
  } catch (error) {
    setWeatherConnectionStatus("OpenWeather Live: pcs-backend unavailable.");
  }
}

function syncWeatherLayerControls() {
  selectors.weatherLayerControls.forEach((control) => {
    control.checked = activeWeatherLayers.has(control.dataset.weatherLayer);
  });
}

function syncWeatherSourceControls() {
  const source = currentWeatherSource();
  if (selectors.weatherSourceSelector) {
    selectors.weatherSourceSelector.value = activeWeatherSourceId;
  }
  selectors.weatherLayerDetails.forEach((detail) => {
    const layerId = detail.dataset.weatherLayerDetail;
    const config = source.configs[layerId];
    if (config?.detail) {
      detail.textContent = config.detail;
    }
  });
  selectors.weatherOpacityControls.forEach((control) => {
    const layerId = control.dataset.weatherOpacity;
    const config = source.configs[layerId];
    if (config) {
      control.value = String(Math.round(config.opacity * 100));
    }
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
  if (activeWeatherSourceId === "nasa") {
    return `${config.provider}: ${config.dataset} connected. Observation date: ${config.observationDate}. ${WEATHER_LAYER_TEST_NOTICE}`;
  }
  return `${config.provider}: ${config.dataset} connected through pcs-backend.`;
}

function updateWeatherOpacity(layerId, value) {
  const opacity = clampNumber(value, 0, 1);
  const config = currentWeatherConfig(layerId);
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
  const config = currentWeatherConfig(layerId);
  if (!config) {
    syncWeatherLayerControls();
    return;
  }

  try {
    const provider = createWeatherImageryProvider(config);
    const unsubscribeErrorListener = provider.errorEvent.addEventListener((error) => {
      const statusCode = error.error?.statusCode ? ` (${error.error.statusCode})` : "";
      setWeatherTileError(`${config.label} ${currentWeatherSource().label} tile unavailable${statusCode}`);
    });
    const layer = cesiumViewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = config.opacity;
    activeWeatherLayers.set(layerId, { layer, unsubscribeErrorListener });
    enforceWeatherLayerOrder();
    setWeatherConnectionStatus(weatherLayerStatusText(layerId, config));
    setWeatherTileError("");
  } catch (error) {
    console.error("[PCS_OBSERVATORY] Weather layer load failed:", error);
    const unavailableMessage = `${config.label} ${currentWeatherSource().label} layer unavailable. Base globe remains visible.`;
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

  const storedSource = readStorageValue(WEATHER_SOURCE_STORAGE_KEY, "nasa");
  activeWeatherSourceId = WEATHER_SOURCE_MODES[storedSource] ? storedSource : "nasa";
  syncWeatherSourceControls();
  resetWeatherStatusDisplay();
  selectors.weatherOpacityControls.forEach((control) => {
    const layerId = control.dataset.weatherOpacity;
    const config = currentWeatherConfig(layerId);
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
            ? currentWeatherSource().connectedMessage
            : currentWeatherSource().readyMessage
        );
      }
    });
  });
  selectors.weatherSourceSelector?.addEventListener("change", async () => {
    const nextSource = selectors.weatherSourceSelector.value;
    if (!WEATHER_SOURCE_MODES[nextSource] || nextSource === activeWeatherSourceId) {
      return;
    }

    const checkedLayerIds = [...selectors.weatherLayerControls]
      .filter((control) => control.checked)
      .map((control) => control.dataset.weatherLayer)
      .filter(Boolean);

    [...activeWeatherLayers.keys()].forEach((layerId) => {
      removeWeatherLayer(layerId, { keepMessage: true });
    });

    activeWeatherSourceId = nextSource;
    writeStorageValue(WEATHER_SOURCE_STORAGE_KEY, activeWeatherSourceId);
    syncWeatherSourceControls();
    setWeatherTileError("");
    setWeatherConnectionStatus(currentWeatherSource().readyMessage);
    await checkOpenWeatherHealth();

    for (const layerId of checkedLayerIds) {
      await addWeatherLayer(layerId);
    }
    syncWeatherLayerControls();
    updateWeatherActiveLayersStatus();
  });
}

function resetWeatherStatusDisplay() {
  syncWeatherSourceControls();
  updateWeatherActiveLayersStatus();
  setWeatherConnectionStatus(currentWeatherSource().readyMessage);
  setWeatherTileError("");
  void checkOpenWeatherHealth();
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
