const STATE_SOURCE = "../PCS_ENGINE/output/latest_state.json";
const REFRESH_INTERVAL_MS = 10000;
let latestStateSignature = "";

const selectors = {
  currentState: document.querySelector("#current-state"),
  coverage: document.querySelector("#coverage"),
  latestUpdate: document.querySelector("#latest-update"),
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
};

const observatoryModules = {
  summary: selectors,
  projectionCards: selectors.projections,
  projectionBars: selectors.progress,
  futureCharts: null,
};

function formatDisplayValue(value) {
  if (value === null || typeof value === "undefined" || Number.isNaN(value)) {
    return "Waiting for data";
  }

  if (typeof value === "number") {
    return value.toFixed(3);
  }

  return String(value);
}

function formatLatestUpdate(value) {
  if (value === null || typeof value === "undefined") {
    return "Waiting for data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = date.toISOString().slice(0, 10);
  const time = date.toISOString().slice(11, 16);
  return `${day}\n${time} UTC`;
}

function updateText(element, value) {
  if (element.textContent !== value) {
    element.textContent = value;
  }
}

function displayRawValue(element, value) {
  if (value === null || typeof value === "undefined" || Number.isNaN(value)) {
    updateText(element, "Waiting for data");
    element.classList.add("is-missing");
    return;
  }

  updateText(element, formatDisplayValue(value));
  element.classList.remove("is-missing");
}

function displayCoverage(element, value) {
  if (value === null || typeof value === "undefined" || Number.isNaN(value)) {
    updateText(element, "Waiting for data");
    element.classList.add("is-missing");
    return;
  }

  updateText(element, `${value} / 4`);
  element.classList.remove("is-missing");
}

function displayLatestUpdate(element, value) {
  if (value === null || typeof value === "undefined") {
    updateText(element, "Waiting for data");
    element.classList.add("is-missing");
    return;
  }

  updateText(element, formatLatestUpdate(value));
  element.classList.remove("is-missing");
}

function displayProgressBar(element, value) {
  if (value === null || typeof value === "undefined" || Number.isNaN(Number(value))) {
    element.style.transform = "scaleX(0)";
    element.classList.add("is-missing");
    return;
  }

  element.style.transform = `scaleX(${value})`;
  element.classList.remove("is-missing");
}

function renderState(state) {
  const stateSignature = JSON.stringify(state);

  if (stateSignature === latestStateSignature) {
    observatoryModules.summary.dataMessage.textContent = `Read-only source: ${STATE_SOURCE}`;
    return;
  }

  latestStateSignature = stateSignature;

  displayRawValue(observatoryModules.summary.currentState, state.S_demo);
  displayCoverage(observatoryModules.summary.coverage, state.coverage_count);
  displayLatestUpdate(observatoryModules.summary.latestUpdate, state.metadata?.generated_at_utc);

  displayRawValue(observatoryModules.projectionCards.L_T, state.projections?.L_T);
  displayRawValue(observatoryModules.projectionCards.L_C, state.projections?.L_C);
  displayRawValue(observatoryModules.projectionCards.L_S, state.projections?.L_S);
  displayRawValue(observatoryModules.projectionCards.L_I, state.projections?.L_I);

  displayProgressBar(observatoryModules.projectionBars.L_T, state.projections?.L_T);
  displayProgressBar(observatoryModules.projectionBars.L_C, state.projections?.L_C);
  displayProgressBar(observatoryModules.projectionBars.L_S, state.projections?.L_S);
  displayProgressBar(observatoryModules.projectionBars.L_I, state.projections?.L_I);

  observatoryModules.summary.dataMessage.textContent = `Read-only source: ${STATE_SOURCE}`;
}

async function loadLatestState() {
  try {
    const response = await fetch(STATE_SOURCE, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Unable to read PCS state file: ${response.status}`);
    }

    const state = await response.json();
    renderState(state);
  } catch (error) {
    observatoryModules.summary.dataMessage.textContent = error.message;
  }
}

loadLatestState();
setInterval(loadLatestState, REFRESH_INTERVAL_MS);
