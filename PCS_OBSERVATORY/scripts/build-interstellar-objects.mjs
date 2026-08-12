#!/usr/bin/env node
import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "data/solar-system/normalized/interstellar-objects-horizons.js");
const SBDB = "https://ssd-api.jpl.nasa.gov/sbdb.api";
const HORIZONS = "https://ssd.jpl.nasa.gov/api/horizons.api";
const MPC = "https://data.minorplanetcenter.net/api/list";
const AU_KM = 149597870.7;
const GAUSSIAN_K = 0.01720209895;
const OBLIQUITY_RAD = 23.439291111 * Math.PI / 180;

const DEFINITIONS = [
  {
    id: "1I", horizonsDesignation: "2017 U1", officialDesignation: "1I/2017 U1 (ʻOumuamua)",
    commonName: "ʻOumuamua", objectClass: "Interstellar Object", discoveryDate: "2017-10-19",
    discoverySurvey: "Pan-STARRS1", discoveryDetail: "University of Hawaiʻi Pan-STARRS1 survey, Haleakalā",
    coverage: ["2015-01-01", "2025-01-01"], denseCoverage: ["2017-06-01", "2018-06-01"], denseStep: "6 h",
    color: "#f4b860", references: [
      "https://science.nasa.gov/solar-system/comets/oumuamua/",
      "https://www.jpl.nasa.gov/news/our-solar-systems-first-known-interstellar-object-gets-unexpected-speed-boost/",
      "https://doi.org/10.1038/s41586-018-0254-4"
    ],
    limitations: [
      "Exact physical shape is not established; PCS uses a point marker and does not render a fabricated body shape.",
      "The JPL solution includes a fitted non-gravitational acceleration model. Horizons warns that behavior outside the 2017-10-14 to 2018-01-02 observation arc is assumed and can be substantially more uncertain, especially before October 2017.",
      "No parent star or origin system is scientifically established.",
      "The trajectory is unbound and non-periodic; no return is implied."
    ]
  },
  {
    id: "2I", horizonsDesignation: "2019 Q4", officialDesignation: "2I/Borisov", commonName: "Borisov",
    objectClass: "Interstellar Comet", discoveryDate: "2019-08-30",
    discoverySurvey: "MARGO Observatory", discoveryDetail: "Discovered by Gennady Borisov at MARGO Observatory, Nauchnij, Crimea",
    coverage: ["2017-01-01", "2027-01-01"], denseCoverage: ["2019-02-01", "2020-10-01"],
    color: "#6ee7d8", references: [
      "https://science.nasa.gov/solar-system/comets/2i-borisov/",
      "https://www.jpl.nasa.gov/news/newly-discovered-comet-is-likely-interstellar-visitor/"
    ],
    limitations: [
      "The nucleus was unresolved in deployed source imagery; PCS uses a point marker and does not invent a physical shape.",
      "The Horizons orbit includes fitted non-gravitational parameters; cached VECTORS provide no covariance samples.",
      "No parent star or origin system is scientifically established.",
      "The trajectory is unbound and non-periodic; no return is implied."
    ]
  },
  {
    id: "3I", horizonsDesignation: "2025 N1", officialDesignation: "3I/ATLAS", commonName: "ATLAS",
    objectClass: "Interstellar Comet", discoveryDate: "2025-07-01",
    discoverySurvey: "ATLAS", discoveryDetail: "NASA-funded ATLAS survey telescope, Rio Hurtado, Chile; pre-discovery images extend earlier",
    coverage: ["2023-01-01", "2033-01-01"], denseCoverage: ["2025-05-01", "2026-08-01"],
    color: "#9ab8ff", references: [
      "https://science.nasa.gov/solar-system/comets/3i-atlas/",
      "https://science.nasa.gov/solar-system/comets/3i-atlas/3i-atlas-facts-and-faqs/"
    ],
    limitations: [
      "Physical properties remain under investigation; PCS uses a point marker and does not infer nucleus shape.",
      "The current JPL solution includes a CO₂-law non-gravitational acceleration model; cached VECTORS provide no covariance samples.",
      "No parent star or origin system is scientifically established.",
      "The trajectory is unbound and non-periodic; no return is implied."
    ]
  }
];

function query(url, parameters) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(parameters)) target.searchParams.set(key, value);
  return fetch(target).then(async response => {
    if (!response.ok) throw new Error(`${target.host} returned ${response.status}`);
    return response.json();
  });
}

function element(orbit, name) {
  const item = orbit.elements.find(entry => entry.name === name);
  return { value: item?.value == null ? null : Number(item.value), sigma: item?.sigma == null ? null : Number(item.sigma), units: item?.units || null };
}

function modelParameters(orbit) {
  return (orbit.model_pars || []).filter(item => item.kind === "EST").map(item => ({
    name: item.name, title: item.title, value: Number(item.value), sigma: item.sigma == null ? null : Number(item.sigma), units: item.units || null
  }));
}

function parseVectors(result) {
  const block = result.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/)?.[1];
  if (!block) throw new Error("Horizons VECTORS response did not contain an ephemeris block");
  return block.trim().split("\n").map(line => {
    const values = line.split(",").map(value => value.trim());
    const numbers = [Number(values[0]), ...values.slice(2, 8).map(Number)];
    if (numbers.length !== 7 || numbers.some(value => !Number.isFinite(value))) throw new Error(`Invalid Horizons vector row: ${line}`);
    return numbers;
  });
}

async function horizons(definition, start, stop, step) {
  const payload = await query(HORIZONS, {
    format: "json", COMMAND: `'DES=${definition.horizonsDesignation}'`, EPHEM_TYPE: "'VECTORS'", CENTER: "'500@10'",
    START_TIME: `'${start}'`, STOP_TIME: `'${stop}'`, STEP_SIZE: `'${step}'`, REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'ICRF'", OUT_UNITS: "'AU-D'", VEC_TABLE: "'2'", CSV_FORMAT: "'YES'", OBJ_DATA: "'YES'"
  });
  if (payload.error) throw new Error(payload.error);
  return { samples: parseVectors(payload.result), catalogEphemeris: payload.result.match(/\{source: (JPL#[^}]+)\}/)?.[1] || "JPL solution", generated: payload.result.match(/JPL\/HORIZONS[^\n]+?(\d{4}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2})/)?.[1] || null };
}

function mergeSamples(coarse, dense) {
  const byEpoch = new Map(coarse.map(sample => [sample[0], sample]));
  for (const sample of dense) byEpoch.set(sample[0], sample);
  return [...byEpoch.values()].sort((a, b) => a[0] - b[0]);
}

function equatorialDirection(position) {
  const [x, y, z] = position;
  const yeq = y * Math.cos(OBLIQUITY_RAD) - z * Math.sin(OBLIQUITY_RAD);
  const zeq = y * Math.sin(OBLIQUITY_RAD) + z * Math.cos(OBLIQUITY_RAD);
  const ra = ((Math.atan2(yeq, x) * 180 / Math.PI) % 360 + 360) % 360;
  const dec = Math.atan2(zeq, Math.hypot(x, yeq)) * 180 / Math.PI;
  return { raDeg: Number(ra.toFixed(6)), decDeg: Number(dec.toFixed(6)) };
}

function jdToIso(jd) {
  return new Date((jd - 2440587.5) * 86400000).toISOString().replace("Z", " TDB");
}

async function build() {
  const mpcPayload = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ list: "interstellar-names", limit: 10, offset: 0 });
    const request = https.request(MPC, { method: "GET", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } }, response => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { text += chunk; });
      response.on("end", () => response.statusCode >= 200 && response.statusCode < 300 ? resolve(JSON.parse(text)) : reject(new Error(`MPC returned ${response.statusCode}`)));
    });
    request.on("error", reject);
    request.end(body);
  });
  const mpcById = new Map(mpcPayload.items.map(item => [item.permid, item]));
  const records = [];
  for (const definition of DEFINITIONS) {
    const [sbdb, coarse, dense] = await Promise.all([
      query(SBDB, { sstr: definition.id, "full-prec": "true", "phys-par": "true" }),
      horizons(definition, definition.coverage[0], definition.coverage[1], "10 d"),
      horizons(definition, definition.denseCoverage[0], definition.denseCoverage[1], definition.denseStep || "2 d")
    ]);
    const mpc = mpcById.get(definition.id);
    if (!mpc) throw new Error(`MPC interstellar-name record missing for ${definition.id}`);
    const samples = mergeSamples(coarse.samples, dense.samples);
    const elements = Object.fromEntries(["e", "a", "q", "i", "om", "w", "tp"].map(name => [name, element(sbdb.orbit, name)]));
    const hyperbolicExcessVelocityKmS = GAUSSIAN_K / Math.sqrt(Math.abs(elements.a.value)) * AU_KM / 86400;
    records.push({
      id: definition.id, spkid: sbdb.object.spkid, officialDesignation: definition.officialDesignation,
      permanentDesignation: mpc.permid, provisionalDesignation: mpc.unpacked_primary_provisional_designation,
      commonName: definition.commonName, aliases: definition.id === "1I" ? ["ʻOumuamua", "Oumuamua", "1I", "1I/2017 U1", "A/2017 U1"] : definition.id === "2I" ? ["Borisov", "2I", "2I/Borisov", "C/2019 Q4"] : ["3I/ATLAS", "3I", "ATLAS", "C/2025 N1"],
      objectClass: definition.objectClass, orbitType: "Open hyperbolic trajectory", orbitClass: sbdb.object.orbit_class?.name,
      discoveryDate: definition.discoveryDate, discoverySurvey: definition.discoverySurvey, discoveryDetail: definition.discoveryDetail,
      firstObservation: sbdb.orbit.first_obs, lastObservation: sbdb.orbit.last_obs, observationArcDays: Number(sbdb.orbit.data_arc), observationsUsed: Number(sbdb.orbit.n_obs_used),
      observationStatus: Date.parse(`${sbdb.orbit.last_obs}T23:59:59Z`) < Date.now() ? "Historical observed passage; observation arc closed in current JPL solution" : "Active observation arc",
      orbitId: sbdb.orbit.orbit_id, solutionDate: `${sbdb.orbit.soln_date} UTC`, solutionEpochJdTdb: Number(sbdb.orbit.epoch), covarianceEpochJdTdb: Number(sbdb.orbit.cov_epoch), residualRmsArcsec: Number(sbdb.orbit.rms), planetaryEphemeris: sbdb.orbit.pe_used,
      elements: Object.fromEntries(Object.entries(elements).map(([name, item]) => [name, item.value])), elementUncertainty: Object.fromEntries(Object.entries(elements).map(([name, item]) => [name, item.sigma])),
      perihelionEpochTdb: jdToIso(elements.tp.value), hyperbolicExcessVelocityKmS: Number(hyperbolicExcessVelocityKmS.toFixed(6)),
      nonGravitationalAccelerationStatus: modelParameters(sbdb.orbit).length ? `Included in JPL solution: ${modelParameters(sbdb.orbit).map(item => item.name).join(", ")}` : "Not included in JPL solution",
      modelParameters: modelParameters(sbdb.orbit), sourceComment: sbdb.orbit.comment || null,
      trajectorySource: "NASA/JPL Horizons API geometric VECTORS; Sun-centered; ICRF/J2000 ecliptic; AU and AU/day",
      catalogEphemeris: coarse.catalogEphemeris, referenceFrame: "ICRF; Earth mean ecliptic at J2000.0; heliocentric origin", timeScale: "TDB",
      trajectoryCoverage: { start: `${definition.coverage[0]}T00:00:00.000Z`, end: `${definition.coverage[1]}T00:00:00.000Z`, coarseStep: "10 d", denseStart: `${definition.denseCoverage[0]}T00:00:00.000Z`, denseEnd: `${definition.denseCoverage[1]}T00:00:00.000Z`, denseStep: definition.denseStep || "2 d" },
      farFieldDirections: {
        inbound: { ...equatorialDirection(samples[0].slice(1, 4)), epochJdTdb: samples[0][0], status: "Ephemeris-derived far-field direction at coverage start; not a parent-star association" },
        outbound: { ...equatorialDirection(samples.at(-1).slice(1, 4)), epochJdTdb: samples.at(-1)[0], status: "Ephemeris-derived far-field direction at coverage end; not a parent-star association" }
      },
      originSystemStatus: "Unknown / unconstrained", color: definition.color, samples,
      references: ["https://data.minorplanetcenter.net/api/list", "https://ssd-api.jpl.nasa.gov/doc/sbdb.html", "https://ssd.jpl.nasa.gov/horizons/", ...definition.references],
      knownLimitations: definition.limitations
    });
  }
  const dataset = {
    schemaVersion: 1, datasetId: "pcs-interstellar-objects-jpl-horizons-2026-08-12", generatedAt: new Date().toISOString(),
    source: "Minor Planet Center interstellar-names list; NASA/JPL SBDB and Horizons APIs", classification: "Formal Interstellar Objects class bridging Solar System and Deep Space",
    referenceFrame: "ICRF; Earth mean ecliptic at J2000.0; heliocentric origin", timeScale: "TDB", interpolation: "Cubic Hermite from cached Horizons position and velocity",
    visualizationContract: "Open inbound → perihelion → outbound trajectories only; never closed into ellipses. Observational-arc ephemeris, historical reconstruction, and ephemeris extension are separately styled.",
    recordCount: records.length, records
  };
  const source = `(function(g){"use strict";g.PCSInterstellarObjectDataset=Object.freeze(${JSON.stringify(dataset)});})(window);\n`;
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, source);
  console.log(JSON.stringify({ output: OUTPUT, datasetId: dataset.datasetId, records: records.map(record => ({ id: record.id, designation: record.officialDesignation, samples: record.samples.length, orbit: record.catalogEphemeris })) }, null, 2));
}

await build();
