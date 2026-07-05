const STATE_SOURCE = "../PCS_ENGINE/output/latest_state.json";

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

function displayRawValue(element, value) {
  if (value === null || typeof value === "undefined") {
    element.textContent = "Waiting for data";
    element.classList.add("is-missing");
    return;
  }

  element.textContent = String(value);
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
  displayRawValue(observatoryModules.summary.currentState, state.S_demo);
  displayRawValue(observatoryModules.summary.coverage, state.coverage_count);
  displayRawValue(observatoryModules.summary.latestUpdate, state.metadata?.generated_at_utc);

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
