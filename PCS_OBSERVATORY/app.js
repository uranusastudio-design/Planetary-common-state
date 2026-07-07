const GLOBAL_STATE_SOURCE = "../PCS_ENGINE/output/latest_state.json";
const REFRESH_INTERVAL_MS = 10000;

const REGION_CONFIG = {
  global: { id: "global", name: "Global", lat: 20, lon: 120, altitude: 30000000 },
  japan: { id: "japan", name: "Japan", lat: 36.2, lon: 138.2, altitude: 7000000 },
  taiwan: { id: "taiwan", name: "Taiwan", lat: 23.7, lon: 121.0, altitude: 2200000 },
  korea: { id: "korea", name: "Korea", lat: 37.6, lon: 127.8, altitude: 3500000 },
  canada: { id: "canada", name: "Canada", lat: 56.1, lon: -106.3, altitude: 12000000 },
  uk: { id: "uk", name: "United Kingdom", lat: 54.5, lon: -2.5, altitude: 3200000 },
  usa: { id: "usa", name: "United States", lat: 39.8, lon: -98.6, altitude: 8500000 },
  china: { id: "china", name: "China", lat: 35.9, lon: 104.2, altitude: 8500000 },
  singapore: { id: "singapore", name: "Singapore", lat: 1.35, lon: 103.82, altitude: 900000 },
  dubai: { id: "dubai", name: "Dubai", lat: 25.2, lon: 55.27, altitude: 1200000 },
};

let latestStateSignature = "";
let lastJsonUpdateValue = null;
let nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
let cesiumViewer = null;
let activeRegionId = "global";

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
  regionSelector: document.querySelector("#region-selector"),
  activeRegionName: document.querySelector("#active-region-name"),
  regionalModeStatus: document.querySelector("#regional-mode-status"),
};

function stateSourceForRegion(regionId) {
  if (regionId === "global") {
    return GLOBAL_STATE_SOURCE;
  }

  return `../PCS_ENGINE/output/regions/${regionId}_state.json`;
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

  displayValue(selectors.currentState, state.S_demo ?? state.pcs_state?.value);
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
    updateText(selectors.dataMessage, `Regional data pending. Using global fallback from ${GLOBAL_STATE_SOURCE}`);
  } else {
    updateText(selectors.dataMessage, `JSON load status: loaded from ${source}`);
  }
}

function renderClock() {
  const now = Date.now();
  const secondsRemaining = Math.max(0, Math.ceil((nextRefreshAt - now) / 1000));

  updateText(selectors.localBrowserTime, new Date(now).toLocaleString());
  updateText(selectors.lastJsonUpdate, formatTimestamp(lastJsonUpdateValue));
  updateText(selectors.autoRefreshCountdown, `Next refresh in ${secondsRemaining}s`);
}

async function loadLatestState() {
  const requestedSource = stateSourceForRegion(activeRegionId);

  try {
    let response = await fetch(requestedSource, { cache: "no-store" });
    let fallbackToGlobal = false;

    if (!response.ok && activeRegionId !== "global") {
      response = await fetch(GLOBAL_STATE_SOURCE, { cache: "no-store" });
      fallbackToGlobal = true;
      updateText(selectors.regionalModeStatus, "Regional data pending. Using global latest_state.json.");
    }

    if (!response.ok) {
      throw new Error(`JSON load status: failed (${response.status})`);
    }

    const state = await response.json();
    renderState(state, fallbackToGlobal ? GLOBAL_STATE_SOURCE : requestedSource, fallbackToGlobal);

    if (JSON.stringify(state) === latestStateSignature) {
      if (fallbackToGlobal) {
        updateText(selectors.dataMessage, `Regional data pending. Using global fallback from ${GLOBAL_STATE_SOURCE}`);
      } else {
        updateText(selectors.dataMessage, `JSON load status: loaded from ${requestedSource}`);
      }
    }
  } catch (error) {
    updateText(selectors.dataMessage, error.message);
  } finally {
    nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
    renderClock();
  }
}

function updateRegionContext(regionId) {
  const region = REGION_CONFIG[regionId] ?? REGION_CONFIG.global;
  activeRegionId = region.id;
  updateText(selectors.activeRegionName, region.name);

  if (region.id === "global") {
    updateText(selectors.regionalModeStatus, "Global mode selected.");
  } else {
    updateText(selectors.regionalModeStatus, "Regional mode selected. Regional datasets are not connected yet.");
  }
}

function setCesiumCameraForRegion(regionId) {
  const region = REGION_CONFIG[regionId] ?? REGION_CONFIG.global;
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
    cesiumViewer.scene.skyAtmosphere.show = true;
    cesiumViewer.scene.globe.enableLighting = true;
    const cameraController = cesiumViewer.scene.screenSpaceCameraController;
    cameraController.minimumZoomDistance = 12000000;
    cameraController.maximumZoomDistance = 50000000;
    cameraController.enableRotate = true;
    cameraController.enableTranslate = true;
    cameraController.enableZoom = true;
    cameraController.inertiaZoom = 0;
    cesiumViewer.camera.cancelFlight();
    cesiumViewer.scene.tweens.removeAll();
    cesiumViewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        REGION_CONFIG.global.lon,
        REGION_CONFIG.global.lat,
        REGION_CONFIG.global.altitude
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: Cesium.Math.toRadians(0),
      },
    });

    updateText(selectors.cesiumFallback, "CesiumJS globe initialized. Visualization only.");
    selectors.cesiumFallback?.classList.remove("is-error");
  } catch (error) {
    showCesiumFallback("3D Earth unavailable. PCS data display remains operational.");
  }
}

function initializeRegionalMode() {
  if (!selectors.regionSelector) {
    return;
  }

  updateRegionContext(selectors.regionSelector.value || "global");

  selectors.regionSelector.addEventListener("change", () => {
    updateRegionContext(selectors.regionSelector.value);
    setCesiumCameraForRegion(activeRegionId);
    loadLatestState();
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
        updateText(selectors.layerControlMessage, "Layer selected. Map overlay not implemented yet.");
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

loadLatestState();
renderClock();
initializeCesiumGlobe();
initializeRegionalMode();
initializeLayerControls();
renderBuildTimestamp();
window.addEventListener("resize", () => {
  if (cesiumViewer) {
    cesiumViewer.resize();
  }
});
setInterval(renderClock, 1000);
setInterval(loadLatestState, REFRESH_INTERVAL_MS);
