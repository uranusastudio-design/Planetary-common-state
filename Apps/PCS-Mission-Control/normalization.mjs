// PCS Residual Normalization Engine
// Each function must return a value in [0, 1] or null.
// Return null when the mapping has not been scientifically validated by Alvin.
// Never invent numbers. Never average raw units.

export function normalizeThermal(rawCelsiusAnomaly) {
  // PENDING PCS DEFINITION.
  // Placeholder mapping (unused until approved): anomaly / 2.0
  // Example: 1.3 °C anomaly → 0.65 if the 2 °C threshold is adopted.
  if (rawCelsiusAnomaly == null) return null;
  return null; // awaiting Alvin's approved mapping
}

export function normalizeFlow(rawSverdrups) {
  if (rawSverdrups == null) return null;
  return null; // awaiting definition
}

export function normalizeChemical(rawPpmCO2) {
  // PENDING. Placeholder: (ppm - 280) / (560 - 280) → doubled-CO2 threshold at 1.0
  if (rawPpmCO2 == null) return null;
  return null; // awaiting definition
}

export function normalizeInformation(rawIndex) {
  if (rawIndex == null) return null;
  return null;
}

export function normalizeStructural(rawPercent) {
  if (rawPercent == null) return null;
  return null;
}

export const NORMALIZERS = {
  L_T: normalizeThermal,
  L_F: normalizeFlow,
  L_C: normalizeChemical,
  L_I: normalizeInformation,
  L_S: normalizeStructural
};
