export const HORIZONS_ENDPOINT = "https://ssd.jpl.nasa.gov/api/horizons.api";

const REQUIRED_VECTOR_FIELDS = Object.freeze({
  format: "json",
  OBJ_DATA: "'NO'",
  MAKE_EPHEM: "'YES'",
  EPHEM_TYPE: "'VECTORS'",
  TIME_TYPE: "'TDB'",
  REF_SYSTEM: "'ICRF'",
  REF_PLANE: "'ECLIPTIC'",
  OUT_UNITS: "'AU-D'",
  VEC_TABLE: "'2'",
  VEC_CORR: "'NONE'",
  CSV_FORMAT: "'YES'",
  CAL_TYPE: "'GREGORIAN'",
  TIME_DIGITS: "'FRACSEC'"
});

function requiredText(value, name) {
  const text = String(value || "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

export function buildVectorQuery({ command, center = "500@10", start, stop, step = "1 d" }) {
  const fields = {
    ...REQUIRED_VECTOR_FIELDS,
    COMMAND: `'${requiredText(command, "command")}'`,
    CENTER: `'${requiredText(center, "center")}'`,
    START_TIME: `'${requiredText(start, "start")}'`,
    STOP_TIME: `'${requiredText(stop, "stop")}'`,
    STEP_SIZE: `'${requiredText(step, "step")}'`
  };
  const url = new URL(HORIZONS_ENDPOINT);
  for (const [key, value] of Object.entries(fields)) url.searchParams.set(key, value);
  return Object.freeze({ endpoint: HORIZONS_ENDPOINT, fields: Object.freeze(fields), url: url.toString() });
}

export function parseVectorResult(result) {
  const text = requiredText(result, "Horizons result");
  const block = text.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/);
  if (!block) throw new Error("Horizons vector result has no $$SOE/$$EOE block");
  const rows = block[1].split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const columns = line.split(",").map(value => value.trim()).filter((value, index, all) => value || index < all.length - 1);
    if (columns.length < 8) throw new Error(`Malformed Horizons vector row: ${line}`);
    const [jdTdb, calendarTdb, x, y, z, vx, vy, vz] = columns;
    const numeric = [jdTdb, x, y, z, vx, vy, vz].map(Number);
    if (!numeric.every(Number.isFinite)) throw new Error(`Non-finite Horizons vector row: ${line}`);
    return Object.freeze({
      jdTdb: numeric[0],
      calendarTdb,
      positionAu: Object.freeze(numeric.slice(1, 4)),
      velocityAuPerDay: Object.freeze(numeric.slice(4, 7))
    });
  });
  if (rows.length < 2) throw new Error("At least two Horizons vector samples are required for interpolation");
  return Object.freeze(rows);
}

export function normalizeResponse(payload, request, metadata = {}) {
  if (payload?.signature?.source !== "NASA/JPL Horizons API") throw new Error("Unexpected Horizons API signature");
  const rows = parseVectorResult(payload.result);
  const sourceMatch = payload.result.match(/\{source:\s*([^}]+)\}/);
  const targetMatch = payload.result.match(/Target body name:\s*([^\n{]+)/);
  const centerMatch = payload.result.match(/Center body name:\s*([^\n{]+)/);
  return Object.freeze({
    schemaVersion: 1,
    objectId: requiredText(metadata.objectId, "objectId"),
    naifId: Number(requiredText(metadata.naifId, "naifId")),
    targetName: targetMatch?.[1]?.trim() || metadata.targetName || null,
    centerName: centerMatch?.[1]?.trim() || null,
    source: "NASA/JPL Horizons",
    catalogEphemeris: sourceMatch?.[1]?.trim() || "Not provided",
    retrievedAt: requiredText(metadata.retrievedAt, "retrievedAt"),
    query: request.fields,
    timeScale: "TDB",
    referenceSystem: "ICRF",
    referencePlane: "Earth mean ecliptic at J2000.0 (IAU76/80)",
    center: request.fields.CENTER.replaceAll("'", ""),
    outputUnits: "AU-D",
    vectorCorrection: "NONE",
    samples: rows
  });
}
