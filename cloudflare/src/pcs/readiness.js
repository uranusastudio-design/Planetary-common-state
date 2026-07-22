const CONNECTED_STATUSES = new Set(["ACTIVE", "AVAILABLE", "LIVE", "LATEST", "DELAYED"]);

export const RESIDUAL_REQUIREMENTS = Object.freeze({
  thermal: Object.freeze([
    { id: "global-temperature", role: "global temperature anomaly and land-surface temperature" },
    { id: "temperature", role: "current gridded weather temperature" },
    { id: "sea-ice", role: "cryosphere thermal response" },
  ]),
  flow: Object.freeze([
    { id: "precipitation", role: "precipitation flux" },
    { id: "sea-level", role: "coastal water-level observation" },
    { id: "wind", role: "atmospheric transport" },
  ]),
  chemical: Object.freeze([
    { id: "co2", role: "atmospheric composition observation" },
    { id: "air-quality-composition", role: "spatial PM2.5 and ozone composition" },
  ]),
  structural: Object.freeze([
    { id: "ndvi", role: "vegetation structure" },
    { id: "wildfire", role: "active disturbance detections" },
    { id: "tropical-cyclones", role: "organized storm structure" },
  ]),
  informational: Object.freeze([
    { id: "shipping", role: "validated vessel-position observations" },
    { id: "aviation", role: "validated aircraft-position observations" },
    { id: "satellite-observations", role: "validated propagated satellite positions" },
  ]),
});

function normalizedStatus(layer) {
  return String(layer?.runtime_status || layer?.retrieval_status || "UNAVAILABLE").toUpperCase();
}

function finiteNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function nonEmpty(value) {
  return value !== null && value !== undefined && value !== "";
}

function decode(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}

export function residualCalculationEligible(calculation) {
  if (!calculation) return false;
  return finiteNumber(calculation.value)
    && nonEmpty(calculation.formula_version)
    && nonEmpty(calculation.baseline_period)
    && nonEmpty(calculation.normalization_method)
    && Array.isArray(decode(calculation.weights, null))
    && finiteNumber(calculation.data_coverage)
    && Number(calculation.data_coverage) >= 0.8
    && finiteNumber(calculation.uncertainty)
    && nonEmpty(calculation.validation_method)
    && nonEmpty(calculation.validation_status);
}

function readinessFor(component, layers, calculation) {
  const required = RESIDUAL_REQUIREMENTS[component];
  const layerById = new Map((layers || []).map((layer) => [layer.layer_id || layer.id, layer]));
  const connected = required.flatMap((requirement) => {
    const layer = layerById.get(requirement.id);
    if (!layer || !CONNECTED_STATUSES.has(normalizedStatus(layer))) return [];
    return [{
      id: requirement.id,
      provider: layer.provider || null,
      dataset: layer.dataset || null,
      runtime_status: normalizedStatus(layer),
      observation_time: layer.latest_observation_time || layer.observation_time || null,
      spatial_resolution: layer.spatial_resolution || null,
      temporal_resolution: layer.temporal_resolution || null,
    }];
  });
  const connectedIds = new Set(connected.map((item) => item.id));
  const missing = required.filter((item) => !connectedIds.has(item.id));
  const times = connected.map((item) => item.observation_time).filter(Boolean).sort();
  const eligible = residualCalculationEligible(calculation);
  let state = connected.length === 0 ? "NO_DATA" : missing.length ? "DATA_PARTIAL" : "FORMULA_PENDING";
  if (calculation) {
    if (!nonEmpty(calculation.formula_version)) state = "FORMULA_PENDING";
    else if (!nonEmpty(calculation.baseline_period)) state = "BASELINE_PENDING";
    else if (!nonEmpty(calculation.normalization_method) || !Array.isArray(decode(calculation.weights, null))) state = "NORMALIZATION_PENDING";
    else if (!finiteNumber(calculation.data_coverage) || Number(calculation.data_coverage) < 0.8 || !finiteNumber(calculation.uncertainty)) state = "DATA_PARTIAL";
    else if (!nonEmpty(calculation.validation_method) || !nonEmpty(calculation.validation_status)) state = "VALIDATION_PENDING";
    else if (eligible) state = String(calculation.validation_status).toUpperCase() === "VALIDATED" ? "VALIDATED" : "CALCULATED";
  }
  const unavailableReason = state === "NO_DATA" ? "No mandatory input dataset is connected."
    : state === "DATA_PARTIAL" ? "Mandatory inputs or reproducible coverage and uncertainty metadata are incomplete."
      : state === "FORMULA_PENDING" ? "Mandatory input connections do not define a residual formula."
        : state === "BASELINE_PENDING" ? "A reproducible baseline period is not defined."
          : state === "NORMALIZATION_PENDING" ? "Normalization and documented weights are incomplete."
            : state === "VALIDATION_PENDING" ? "Validation method or validation metadata is incomplete."
              : null;
  return {
    component,
    value: eligible ? Number(calculation.value) : null,
    readiness_state: state,
    data_state: state,
    connected_datasets: connected,
    required_datasets: required,
    missing_datasets: missing,
    spatial_coverage: connected.map((item) => ({ id: item.id, coverage: item.spatial_resolution })),
    temporal_coverage: { start: times[0] || null, end: times.at(-1) || null, resolutions: [...new Set(connected.map((item) => item.temporal_resolution).filter(Boolean))] },
    formula_version: calculation?.formula_version || null,
    baseline_period: calculation?.baseline_period || null,
    normalization_method: calculation?.normalization_method || null,
    weights: decode(calculation?.weights, null),
    uncertainty: finiteNumber(calculation?.uncertainty) ? Number(calculation.uncertainty) : null,
    validation_method: calculation?.validation_method || null,
    last_calculated_at: calculation?.calculated_at || null,
    validation_status: calculation?.validation_status || "UNVALIDATED",
    unavailable_reason: eligible ? null : calculation?.unavailable_reason || unavailableReason,
  };
}

export function residualState(layers = [], calculations = []) {
  const calculationByComponent = new Map((calculations || []).map((item) => [item.component, item]));
  return {
    total_l_t: {
      value: null,
      status: "UNAVAILABLE",
      formula_version: null,
      validation_status: "UNVALIDATED",
      unavailable_reason: "No documented and validated component aggregation method exists in the repository.",
    },
    components: Object.keys(RESIDUAL_REQUIREMENTS).map((component) => readinessFor(component, layers, calculationByComponent.get(component))),
  };
}
