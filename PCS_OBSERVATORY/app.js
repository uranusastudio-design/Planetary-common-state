const STATE_SOURCE = "../PCS_ENGINE/output/latest_state.json";
const REFRESH_INTERVAL_MS = 10000;

let latestStateSignature = "";
let lastJsonUpdateValue = null;
let nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
let cesiumViewer = null;

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
};

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
  updateText(element, isMissing ? "Waiting for data" : `${value} / 4`);
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

function renderState(state) {
  const stateSignature = JSON.stringify(state);
  latestStateSignature = stateSignature;
  lastJsonUpdateValue = state.metadata?.generated_at_utc ?? null;

  displayValue(selectors.currentState, state.S_demo);
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
  updateText(selectors.dataMessage, `JSON load status: loaded from ${STATE_SOURCE}`);
}

function renderClock() {
  const now = Date.now();
  const secondsRemaining = Math.max(0, Math.ceil((nextRefreshAt - now) / 1000));

  updateText(selectors.localBrowserTime, new Date(now).toLocaleString());
  updateText(selectors.lastJsonUpdate, formatTimestamp(lastJsonUpdateValue));
  updateText(selectors.autoRefreshCountdown, `Next refresh in ${secondsRemaining}s`);
}

async function loadLatestState() {
  try {
    const response = await fetch(STATE_SOURCE, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`JSON load status: failed (${response.status})`);
    }

    const state = await response.json();
    renderState(state);

    if (JSON.stringify(state) === latestStateSignature) {
      updateText(selectors.dataMessage, `JSON load status: loaded from ${STATE_SOURCE}`);
    }
  } catch (error) {
    updateText(selectors.dataMessage, error.message);
  } finally {
    nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
    renderClock();
  }
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
      destination: Cesium.Cartesian3.fromDegrees(120, 20, 30000000),
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

loadLatestState();
renderClock();
initializeCesiumGlobe();
window.addEventListener("resize", () => {
  if (cesiumViewer) {
    cesiumViewer.resize();
  }
});
setInterval(renderClock, 1000);
setInterval(loadLatestState, REFRESH_INTERVAL_MS);
