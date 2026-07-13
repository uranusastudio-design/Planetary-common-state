const NOAA = "https://services.swpc.noaa.gov";
const JPL_HORIZONS = "https://ssd.jpl.nasa.gov/api/horizons.api";
const SOLAR_IMAGE_CACHE_SECONDS = 600;
const SOLAR_IMAGE_STALE_SECONDS = 86400;
const MAX_OFFICIAL_IMAGE_BYTES = 12 * 1024 * 1024;
const PLANET_IMAGE_STALE_SECONDS = 30 * 24 * 60 * 60;
const OFFICIAL_IMAGE_HOSTS = new Set([
  "astrogeology.usgs.gov",
  "planetarymaps.usgs.gov",
  "photojournal.jpl.nasa.gov",
  "assets.science.nasa.gov",
]);
const LUNAR_IMAGE_URL = "https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=LROC_WAC&STYLES=&SRS=EPSG:4326&BBOX=0,-90,360,90&WIDTH=2048&HEIGHT=1024&FORMAT=image/png";

export const SOLAR_IMAGE_MODES = Object.freeze({
  "hmi-continuum": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/HMI",
    wavelength: "6173 Å continuum",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIIC.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIC.jpg",
  },
  "hmi-magnetogram": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/HMI",
    wavelength: "6173 Å line-of-sight magnetic field",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIB.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIB.jpg",
  },
  "aia-171": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/AIA",
    wavelength: "171 Å",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0171.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0171.jpg",
  },
  "aia-193": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/AIA",
    wavelength: "193 Å",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg",
  },
  "aia-304": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/AIA",
    wavelength: "304 Å",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0304.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0304.jpg",
  },
  coronagraph: {
    source: "NASA/ESA SOHO",
    instrument: "SOHO/LASCO C2",
    wavelength: "white light",
    full: "https://soho.nascom.nasa.gov/data/realtime/c2/1024/latest.jpg",
    thumbnail: "https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.jpg",
  },
});

export const PLANET_IMAGE_PRODUCTS = Object.freeze({
  mercury: {
    source: "NASA / USGS Astrogeology", mission: "MESSENGER", instrument: "MDIS",
    product: "Mercury MESSENGER MDIS Global Mosaic 250m",
    productType: "global_mosaic", projection: "equirectangular",
    observedAt: null, productDate: "2013-05-01",
    sourceUrl: "https://astrogeology.usgs.gov/ckan/dataset/279e5d50-ff2f-4250-bde3-bb510096079e/resource/2b5865c2-bd0d-4962-bdb0-c12f0502def1/download/mercury_messenger_mosaic_global_1024.jpg",
    catalogUrl: "https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m",
    attribution: "NASA MESSENGER / USGS Astrogeology Science Center",
    notes: "Mission-derived global surface mosaic; not a live observation.", cacheSeconds: 604800,
  },
  venus: {
    source: "NASA / USGS Astrogeology", mission: "Magellan", instrument: "SAR",
    product: "Venus Magellan Global C3-MIDR Mosaic 2025m",
    productType: "radar_map", projection: "equirectangular",
    observedAt: null, productDate: "2022-09-01",
    sourceUrl: "https://astrogeology.usgs.gov/ckan/dataset/bf10c4f9-7587-4357-b0d9-81d5b6e6637c/resource/12345d86-e2a3-45eb-af88-c1e8bf3ac358/download/full.jpg",
    catalogUrl: "https://astrogeology.usgs.gov/search/map/venus_magellan_global_c3_mdir_mosaic_2025m",
    attribution: "NASA Magellan / PDS Geosciences Node / USGS Astrogeology",
    notes: "Radar-derived surface mosaic; grayscale radar brightness is not natural visible-light color.", cacheSeconds: 604800,
  },
  mars: {
    source: "NASA / USGS Astrogeology", mission: "Viking Orbiter", instrument: "VIS",
    product: "Mars Viking Global Color Mosaic 925m",
    productType: "global_mosaic", projection: "simple_cylindrical",
    observedAt: null, productDate: null,
    sourceUrl: "https://astrogeology.usgs.gov/ckan/dataset/dfdc2242-52dc-4126-bc89-03af8253ae79/resource/0d7b31dc-0b2e-4ca6-89dc-e3c1404c0232/download/mars_viking_clrmosaic_global_1024.jpg",
    catalogUrl: "https://astrogeology.usgs.gov/search/map/mars_viking_global_color_mosaic_925m",
    attribution: "NASA Viking Orbiter / USGS Astrogeology Science Center",
    notes: "Mission-derived global optical color mosaic; archival, not live.", cacheSeconds: 604800,
  },
  jupiter: {
    source: "NASA / JPL Photojournal", mission: "Cassini-Huygens", instrument: "Imaging Science Subsystem",
    product: "PIA02873 High Resolution Globe of Jupiter",
    productType: "observation_disc", projection: "observation_disc",
    observedAt: "2000-12-07T00:00:00.000Z", productDate: "2001-01-30",
    sourceUrl: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia02/pia02873/PIA02873.jpg",
    catalogUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA02873",
    attribution: "NASA/JPL/University of Arizona",
    notes: "True-color simulated globe made from four Cassini observations; rendered as an archival atmosphere observation disc.", cacheSeconds: 86400,
  },
  saturn: {
    source: "NASA / JPL Photojournal", mission: "Cassini-Huygens", instrument: "ISS Narrow Angle Camera",
    product: "PIA05389 Saturn and its Rings",
    productType: "observation_disc", projection: "observation_disc",
    observedAt: "2004-03-27T00:00:00.000Z", productDate: null,
    sourceUrl: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia05/pia05389/PIA05389.jpg",
    catalogUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA05389",
    attribution: "NASA/JPL/Space Science Institute",
    notes: "Natural-color Cassini archival observation. Interface rings are also represented by a separate ring primitive.", cacheSeconds: 604800,
  },
  uranus: {
    source: "NASA / JPL Photojournal", mission: "Voyager 2", instrument: "VG ISS Wide Angle Camera",
    product: "PIA00143 Uranus - Final Image",
    productType: "observation_disc", projection: "observation_disc",
    observedAt: "1986-01-25T00:00:00.000Z", productDate: "1996-01-29",
    sourceUrl: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00143/PIA00143.jpg",
    catalogUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA00143",
    attribution: "NASA/JPL",
    notes: "Voyager 2 archival atmospheric color composite; not a global surface map.", cacheSeconds: 604800,
  },
  neptune: {
    source: "NASA / JPL Photojournal", mission: "Voyager 2", instrument: "VG ISS Narrow Angle Camera",
    product: "PIA00046 Neptune Full Disk",
    productType: "observation_disc", projection: "observation_disc",
    observedAt: null, productDate: "1996-01-29",
    sourceUrl: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00046/PIA00046.jpg",
    catalogUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA00046",
    attribution: "NASA/JPL",
    notes: "Processed Voyager 2 archival atmospheric observation; not a solid surface or global map.", cacheSeconds: 604800,
  },
});

export const ASTRONOMY_ROUTES = [
  "/api/astronomy/moon",
  "/api/astronomy/body/:body",
  "/api/space-weather/summary",
  "/api/space-weather/kp",
  "/api/space-weather/solar-wind",
  "/api/space-weather/xray",
  "/api/space-weather/alerts",
  "/api/space-weather/solar-image",
  "/api/astronomy/lunar-image",
  "/api/astronomy/planet-image/:body",
];

export const JPL_BODY_CONFIG = {
  sun: { id: "10", cacheSeconds: 1800, group: "sun" },
  mercury: { id: "199", cacheSeconds: 7200, group: "inner" },
  venus: { id: "299", cacheSeconds: 7200, group: "inner" },
  earth: { id: "399", cacheSeconds: 7200, group: "inner", center: "500@10" },
  moon: { id: "301", cacheSeconds: 3600, group: "moon" },
  mars: { id: "499", cacheSeconds: 7200, group: "inner" },
  jupiter: { id: "599", cacheSeconds: 21600, group: "outer" },
  saturn: { id: "699", cacheSeconds: 21600, group: "outer" },
  uranus: { id: "799", cacheSeconds: 21600, group: "outer" },
  neptune: { id: "899", cacheSeconds: 21600, group: "outer" },
};

const CONFIG = {
  moon: { ttl: 3600, staleTtl: 86400, dataset: "JPL Horizons lunar ephemeris" },
  kp: { ttl: 600, staleTtl: 3600, dataset: "NOAA planetary K-index" },
  solarWind: { ttl: 180, staleTtl: 1800, dataset: "NOAA real-time solar wind" },
  xray: { ttl: 180, staleTtl: 1800, dataset: "NOAA GOES X-ray flux" },
  alerts: { ttl: 300, staleTtl: 3600, dataset: "NOAA SWPC alerts" },
  summary: { ttl: 180, staleTtl: 1800, dataset: "PCS NOAA space-weather summary" },
};

const SOURCE = {
  jpl: { name: "NASA/JPL Horizons", url: JPL_HORIZONS },
  noaa: { name: "NOAA Space Weather Prediction Center", url: NOAA },
};

function iso(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^[A-Za-z]{3},\s/.test(raw)) {
    const httpDate = new Date(raw);
    return Number.isNaN(httpDate.getTime()) ? null : httpDate.toISOString();
  }
  const horizonsCalendar = raw.match(/^(\d{4})-([A-Za-z]{3})-(\d{1,2})\s+(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/);
  if (horizonsCalendar) {
    const [, year, month, day, time] = horizonsCalendar;
    const horizonsDate = new Date(`${month} ${day}, ${year} ${time} UTC`);
    return Number.isNaN(horizonsDate.getTime()) ? null : horizonsDate.toISOString();
  }
  const normalized = raw.replace(" ", "T").replace(/Z?$/, "Z");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function finite(value) {
  if (value === null || value === undefined || value === "" || value === "null") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function envelope(source, dataset, timestamp, data, extras = {}) {
  return {
    success: true,
    source: source.name,
    source_url: source.url,
    dataset,
    timestamp: timestamp || null,
    retrieved_at: new Date().toISOString(),
    data,
    status: "live",
    cache_status: "miss",
    stale: false,
    upstream_response_ms: null,
    ...extras,
  };
}

function errorEnvelope(source, dataset, message, extras = {}) {
  return {
    success: false,
    source: source.name,
    source_url: source.url,
    dataset,
    timestamp: null,
    retrieved_at: new Date().toISOString(),
    data: null,
    status: "unavailable",
    cache_status: "miss",
    stale: false,
    upstream_response_ms: extras.upstream_response_ms ?? null,
    error: message,
    ...extras,
  };
}

function response(payload, status = 200, ttl = 0) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": ttl ? `public, max-age=${ttl}` : "no-store",
    },
  });
}

async function timedJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("upstream timeout"), timeoutMs);
  const started = Date.now();
  try {
    const upstream = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!upstream.ok) throw new Error(`upstream HTTP ${upstream.status}`);
    return { value: await upstream.json(), ms: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }
}

async function readStored(env, key) {
  if (!env.PCS_CACHE) return null;
  try { return await env.PCS_CACHE.get(key, "json"); } catch { return null; }
}

async function writeStored(env, key, payload, staleTtl) {
  if (!env.PCS_CACHE) return;
  try { await env.PCS_CACHE.put(key, JSON.stringify(payload), { expirationTtl: staleTtl }); } catch { /* cache is optional */ }
}

async function cachedDataset(request, env, ctx, key, config, source, loader) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + new URL(request.url).pathname);
  const hit = await cache.match(cacheKey);
  if (hit) {
    const payload = await hit.json();
    payload.cache_status = "hit";
    return response(payload, 200, config.ttl);
  }

  try {
    const payload = await loader();
    const cacheResponse = response(payload, 200, config.ttl);
    ctx.waitUntil(Promise.all([
      cache.put(cacheKey, cacheResponse.clone()),
      writeStored(env, `astronomy:last:${key}`, payload, config.staleTtl),
    ]));
    return cacheResponse;
  } catch (error) {
    const stale = await readStored(env, `astronomy:last:${key}`);
    if (stale) {
      const payload = {
        ...stale,
        status: key.startsWith("body:") ? "stale" : "delayed",
        cache_status: "stale",
        stale: true,
        retrieved_at: new Date().toISOString(),
        upstream_error: error.name === "AbortError" ? "upstream timeout" : "upstream temporarily unavailable",
      };
      return response(payload, 200, 0);
    }
    const message = error.name === "AbortError" ? "upstream timeout" : "upstream temporarily unavailable";
    return response(errorEnvelope(source, config.dataset, message), 503);
  }
}

function parseHorizonsBody(result, body, center) {
  const block = result?.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/)?.[1]?.trim();
  if (!block) throw new Error("JPL Horizons body ephemeris was empty");
  const values = block.split(/\r?\n/).find((line) => line.trim()).split(",").map((value) => value.trim());
  const calculationTime = iso(values[0]);
  // Fixed columns for QUANTITIES 1,9,10,19,20,21,24 prevent an unavailable
  // value from shifting every later measurement into the wrong field.
  const apparentMagnitude = finite(values[5]);
  const illumination = finite(values[7]);
  const heliocentricAu = finite(values[8]);
  const observerAu = finite(values[10]);
  const lightTime = finite(values[12]);
  const phaseAngle = finite(values[13]);
  const auKm = 149597870.7;
  return {
    observed_at: calculationTime,
    data: {
      earth_distance_km: center === "500@399" && observerAu !== null ? observerAu * auKm : null,
      sun_distance_km: body === "sun" ? null : center === "500@10" && observerAu !== null ? observerAu * auKm : heliocentricAu !== null ? heliocentricAu * auKm : null,
      light_time_minutes: lightTime,
      apparent_magnitude: apparentMagnitude,
      illumination_percent: illumination,
      phase_angle_deg: phaseAngle,
      right_ascension: values[3] || null,
      declination: values[4] || null,
    },
  };
}

async function loadBodyEphemeris(body, bodyConfig) {
  const now = new Date();
  const stop = new Date(now.getTime() + 3600000);
  const center = bodyConfig.center || "500@399";
  const params = new URLSearchParams({
    format: "json", COMMAND: `'${bodyConfig.id}'`, EPHEM_TYPE: "'OBSERVER'", CENTER: `'${center}'`,
    START_TIME: `'${now.toISOString()}'`, STOP_TIME: `'${stop.toISOString()}'`, STEP_SIZE: "'1 h'",
    QUANTITIES: "'1,9,10,19,20,21,24'", CSV_FORMAT: "'YES'", TIME_TYPE: "'UT'",
  });
  const { value, ms } = await timedJson(`${JPL_HORIZONS}?${params}`);
  const parsed = parseHorizonsBody(value.result, body, center);
  return {
    success: true,
    source: SOURCE.jpl.name,
    source_url: SOURCE.jpl.url,
    dataset: "body_ephemeris",
    body,
    observed_at: parsed.observed_at,
    retrieved_at: new Date().toISOString(),
    status: "live",
    cache_status: "miss",
    stale: false,
    upstream_response_ms: ms,
    data: parsed.data,
  };
}

function latestRow(table) {
  if (!Array.isArray(table) || table.length < 2) return null;
  const headers = table[0];
  for (let index = table.length - 1; index > 0; index -= 1) {
    if (Array.isArray(table[index])) return Object.fromEntries(headers.map((header, i) => [header, table[index][i]]));
  }
  return null;
}

function kpStatus(kp) {
  if (kp === null) return null;
  if (kp >= 8) return "severe";
  if (kp >= 7) return "strong";
  if (kp >= 5) return "storm";
  if (kp >= 4) return "active";
  return "quiet";
}

async function loadKp() {
  const { value, ms } = await timedJson(`${NOAA}/products/noaa-planetary-k-index.json`);
  const row = latestRow(value);
  if (!row) throw new Error("NOAA Kp data was empty");
  const kp = finite(row.Kp ?? row.kp);
  const timestamp = iso(row.time_tag ?? row.timestamp);
  return envelope(SOURCE.noaa, CONFIG.kp.dataset, timestamp, {
    timestamp, kp, status: kpStatus(kp), data_type: "observed_or_estimated", unit: "index",
  }, { upstream_response_ms: ms });
}

async function loadSolarWind() {
  const [plasma, magnetic] = await Promise.allSettled([
    timedJson(`${NOAA}/products/solar-wind/plasma-7-day.json`),
    timedJson(`${NOAA}/products/solar-wind/mag-7-day.json`),
  ]);
  if (plasma.status === "rejected" && magnetic.status === "rejected") throw plasma.reason;
  const p = plasma.status === "fulfilled" ? latestRow(plasma.value.value) : null;
  const m = magnetic.status === "fulfilled" ? latestRow(magnetic.value.value) : null;
  const timestamp = iso(p?.time_tag ?? m?.time_tag);
  return envelope(SOURCE.noaa, CONFIG.solarWind.dataset, timestamp, {
    timestamp,
    speed_km_s: finite(p?.speed), density_p_cm3: finite(p?.density), temperature_k: finite(p?.temperature), bz_nt: finite(m?.bz_gsm),
    data_type: "observed", units: { speed_km_s: "km/s", density_p_cm3: "protons/cm3", temperature_k: "K", bz_nt: "nT" },
  }, {
    upstream_response_ms: Math.max(plasma.value?.ms || 0, magnetic.value?.ms || 0),
    partial: plasma.status === "rejected" || magnetic.status === "rejected",
  });
}

function flareClass(flux) {
  if (!Number.isFinite(flux) || flux <= 0) return null;
  const bands = [[1e-4, "X"], [1e-5, "M"], [1e-6, "C"], [1e-7, "B"], [1e-8, "A"]];
  const band = bands.find(([threshold]) => flux >= threshold) || [1e-8, "A"];
  return `${band[1]}${(flux / band[0]).toFixed(1)}`;
}

async function loadXray() {
  const { value, ms } = await timedJson(`${NOAA}/json/goes/primary/xrays-7-day.json`);
  if (!Array.isArray(value) || !value.length) throw new Error("NOAA X-ray data was empty");
  const latestTime = value.reduce((max, row) => row.time_tag > max ? row.time_tag : max, "");
  const rows = value.filter((row) => row.time_tag === latestTime);
  const shortFlux = finite(rows.find((row) => String(row.energy).includes("0.05-0.4"))?.flux);
  const longFlux = finite(rows.find((row) => String(row.energy).includes("0.1-0.8"))?.flux);
  const timestamp = iso(latestTime);
  return envelope(SOURCE.noaa, CONFIG.xray.dataset, timestamp, {
    timestamp, short_channel_flux: shortFlux, long_channel_flux: longFlux,
    flare_class: flareClass(longFlux), data_type: "observed", unit: "W/m2",
  }, { upstream_response_ms: ms });
}

function alertSeverity(productId = "") {
  const prefix = String(productId).trim().slice(0, 3).toUpperCase();
  return ({ WAR: "warning", WAT: "watch", ALT: "alert", SUM: "summary" })[prefix] || "information";
}

async function loadAlerts() {
  const { value, ms } = await timedJson(`${NOAA}/products/alerts.json`);
  const alerts = Array.isArray(value) ? value.map((item) => ({
    issued_at: iso(item.issue_datetime), product_id: item.product_id || null,
    severity: alertSeverity(item.product_id), title: item.message?.split("\n").find(Boolean)?.trim() || item.product_id || "NOAA SWPC product",
    summary: item.message?.trim() || null, source_identifier: item.product_id || null,
    source_url: `${NOAA}/products/alerts.json`, data_type: "issued_product",
  })) : [];
  const timestamp = alerts.map((item) => item.issued_at).filter(Boolean).sort().at(-1) || null;
  return envelope(SOURCE.noaa, CONFIG.alerts.dataset, timestamp, alerts, { upstream_response_ms: ms });
}

async function loadSunspots() {
  const { value, ms } = await timedJson(`${NOAA}/json/solar-cycle/observed-solar-cycle-indices.json`);
  const row = Array.isArray(value) ? value.at(-1) : null;
  return { value: finite(row?.ssn), timestamp: row?.time_tag ? iso(`${row.time_tag}-01`) : null, ms };
}

async function loadSummary() {
  const [kp, wind, xray, alerts, sunspots] = await Promise.allSettled([loadKp(), loadSolarWind(), loadXray(), loadAlerts(), loadSunspots()]);
  if ([kp, wind, xray, alerts].every((result) => result.status === "rejected")) throw kp.reason;
  const k = kp.value?.data || {};
  const w = wind.value?.data || {};
  const x = xray.value?.data || {};
  const a = alerts.value?.data;
  const s = sunspots.value || {};
  const observedAt = [k.timestamp, w.timestamp, x.timestamp].filter(Boolean).sort().at(-1) || null;
  return envelope(SOURCE.noaa, CONFIG.summary.dataset, observedAt, {
    kp_index: k.kp ?? null, geomagnetic_status: k.status ?? null,
    solar_wind_speed_km_s: w.speed_km_s ?? null, solar_wind_density_p_cm3: w.density_p_cm3 ?? null,
    imf_bz_nt: w.bz_nt ?? null, xray_flux_w_m2: x.long_channel_flux ?? null, xray_class: x.flare_class ?? null,
    sunspot_number: s.value ?? null, active_alert_count: Array.isArray(a) ? a.length : null,
    observed_at: observedAt, retrieved_at: new Date().toISOString(), data_type: "observed_summary",
    provenance: {
      kp_index: { source: SOURCE.noaa.name, time: k.timestamp ?? null, unit: "index", type: "observed_or_estimated" },
      solar_wind_speed_km_s: { source: SOURCE.noaa.name, time: w.timestamp ?? null, unit: "km/s", type: "observed" },
      solar_wind_density_p_cm3: { source: SOURCE.noaa.name, time: w.timestamp ?? null, unit: "protons/cm3", type: "observed" },
      imf_bz_nt: { source: SOURCE.noaa.name, time: w.timestamp ?? null, unit: "nT", type: "observed" },
      xray_flux_w_m2: { source: SOURCE.noaa.name, time: x.timestamp ?? null, unit: "W/m2", type: "observed" },
      xray_class: { source: "PCS derivation from NOAA GOES flux", time: x.timestamp ?? null, unit: "class", type: "calculated" },
      sunspot_number: { source: SOURCE.noaa.name, time: s.timestamp ?? null, unit: "count/index", type: "observed_monthly" },
      active_alert_count: { source: SOURCE.noaa.name, time: alerts.value?.timestamp ?? null, unit: "count", type: "issued_product" },
    },
  }, {
    upstream_response_ms: Math.max(kp.value?.upstream_response_ms || 0, wind.value?.upstream_response_ms || 0, xray.value?.upstream_response_ms || 0, alerts.value?.upstream_response_ms || 0, s.ms || 0),
    partial: [kp, wind, xray, alerts, sunspots].some((result) => result.status === "rejected"),
  });
}

function lunarApproximation(date) {
  // Approximation: elapsed UTC days modulo the mean synodic month (29.530588853 d),
  // anchored to the 2000-01-06 18:14 UTC new moon. This is for interface phase/age
  // context only and is not asserted to be research-grade or a direct observation.
  const synodicDays = 29.530588853;
  const epoch = Date.parse("2000-01-06T18:14:00Z");
  const elapsedDays = (date.getTime() - epoch) / 86400000;
  const age = ((elapsedDays % synodicDays) + synodicDays) % synodicDays;
  const fraction = age / synodicDays;
  const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  return { phase_fraction: fraction, moon_age_days: age, phase_name: names[Math.floor((fraction * 8) + 0.5) % 8] };
}

function parseHorizons(result) {
  const block = result?.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/)?.[1]?.trim();
  if (!block) throw new Error("JPL Horizons ephemeris was empty");
  const line = block.split(/\r?\n/).find((item) => item.trim());
  const values = line.split(",").map((item) => item.trim());
  const numbers = values.map(finite).filter((value) => value !== null);
  return {
    calculationTime: iso(values[0]),
    // QUANTITIES 10,13,20 are emitted in this order: illumination, angular
    // diameter, observer range, then range-rate. Ignore the optional rate.
    illumination: numbers[0] ?? null,
    diameter: numbers[1] ?? null,
    distanceAu: numbers[2] ?? null,
  };
}

async function loadMoon() {
  const now = new Date();
  const stop = new Date(now.getTime() + 3600000);
  const params = new URLSearchParams({
    format: "json", COMMAND: "'301'", EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'",
    START_TIME: `'${now.toISOString()}'`, STOP_TIME: `'${stop.toISOString()}'`, STEP_SIZE: "'1 h'",
    QUANTITIES: "'10,13,20'", CSV_FORMAT: "'YES'", TIME_TYPE: "'UT'",
  });
  const { value, ms } = await timedJson(`${JPL_HORIZONS}?${params}`);
  const eph = parseHorizons(value.result);
  const local = lunarApproximation(now);
  const data = {
    phase_name: local.phase_name, phase_fraction: local.phase_fraction,
    illumination_percent: eph.illumination, moon_age_days: local.moon_age_days,
    earth_distance_km: eph.distanceAu === null ? null : eph.distanceAu * 149597870.7,
    apparent_diameter_arcsec: eph.diameter, next_new_moon: null, next_full_moon: null,
    calculation_time: now.toISOString(), source: SOURCE.jpl.name, data_status: "live",
    provenance: {
      phase_name: { source: "PCS synodic approximation", time: now.toISOString(), unit: "category", type: "calculated" },
      phase_fraction: { source: "PCS synodic approximation", time: now.toISOString(), unit: "cycle fraction", type: "calculated" },
      illumination_percent: { source: SOURCE.jpl.name, time: eph.calculationTime, unit: "%", type: "source-computed_ephemeris" },
      moon_age_days: { source: "PCS synodic approximation", time: now.toISOString(), unit: "days", type: "calculated" },
      earth_distance_km: { source: SOURCE.jpl.name, time: eph.calculationTime, unit: "km", type: "source-computed_ephemeris" },
      apparent_diameter_arcsec: { source: SOURCE.jpl.name, time: eph.calculationTime, unit: "arcsec", type: "source-computed_ephemeris" },
      next_new_moon: { source: null, time: null, unit: "UTC", type: "unavailable" },
      next_full_moon: { source: null, time: null, unit: "UTC", type: "unavailable" },
    },
  };
  return envelope(SOURCE.jpl, CONFIG.moon.dataset, eph.calculationTime, data, { upstream_response_ms: ms });
}

function officialImageResponse(image, cacheSeconds, extras = {}) {
  return new Response(image.bytes, {
    status: 200,
    headers: {
      "content-type": image.contentType,
      "content-length": String(image.bytes.byteLength),
      "access-control-allow-origin": "*",
      "cache-control": `public, max-age=${cacheSeconds}`,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      ...extras,
    },
  });
}

function hasImageSignature(bytes, contentType) {
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  return (contentType === "image/jpeg" && jpeg) || (contentType === "image/png" && png);
}

async function fetchOfficialImage(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("upstream timeout"), timeoutMs);
  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "image/jpeg,image/png" },
    });
    if (!upstream.ok) throw new Error(`upstream HTTP ${upstream.status}`);
    const contentType = (upstream.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "image/jpeg" && contentType !== "image/png") throw new Error("upstream did not return an image");
    const declaredLength = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_OFFICIAL_IMAGE_BYTES) throw new Error("upstream image is too large");
    if (!upstream.body) throw new Error("upstream image body is empty");
    const reader = upstream.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_OFFICIAL_IMAGE_BYTES) {
        await reader.cancel("upstream image is too large");
        throw new Error("upstream image is too large");
      }
      chunks.push(value);
    }
    if (!received) throw new Error("upstream image has an invalid size");
    const bytes = new Uint8Array(received);
    let offset = 0;
    chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
    if (!hasImageSignature(bytes, contentType)) throw new Error("upstream image signature is invalid");
    return {
      bytes,
      contentType,
      lastModified: iso(upstream.headers.get("last-modified")),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function solarObservationStatus(observedAt) {
  if (!observedAt) return "delayed";
  const ageMs = Date.now() - Date.parse(observedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) return "delayed";
  if (ageMs <= 30 * 60 * 1000) return "live";
  if (ageMs <= 6 * 60 * 60 * 1000) return "delayed";
  return "stale";
}

function solarPublicImageUrl(request, mode, size = "full") {
  const url = new URL("/api/space-weather/solar-image", new URL(request.url).origin);
  url.searchParams.set("mode", mode);
  url.searchParams.set("format", "image");
  if (size === "thumbnail") url.searchParams.set("size", "thumbnail");
  return url.toString();
}

function solarImageCacheKey(request, mode, size, stale = false) {
  const url = new URL(solarPublicImageUrl(request, mode, size));
  if (stale) url.searchParams.set("cache", "last-valid");
  return new Request(url);
}

async function cacheSolarImage(request, ctx, mode, size, image) {
  const fresh = officialImageResponse(image, SOLAR_IMAGE_CACHE_SECONDS, { "x-pcs-image-status": "validated" });
  const stale = officialImageResponse(image, SOLAR_IMAGE_STALE_SECONDS, { "x-pcs-image-status": "last-valid" });
  ctx.waitUntil(Promise.all([
    caches.default.put(solarImageCacheKey(request, mode, size), fresh),
    caches.default.put(solarImageCacheKey(request, mode, size, true), stale),
  ]));
}

async function solarImageBinary(request, ctx, mode, size) {
  const config = SOLAR_IMAGE_MODES[mode];
  if (!config) return response(errorEnvelope(SOURCE.noaa, "solar_image", "unsupported image mode"), 400);
  const freshKey = solarImageCacheKey(request, mode, size);
  const fresh = await caches.default.match(freshKey);
  if (fresh) return fresh;
  try {
    const image = await fetchOfficialImage(config[size]);
    await cacheSolarImage(request, ctx, mode, size, image);
    return officialImageResponse(image, SOLAR_IMAGE_CACHE_SECONDS, { "x-pcs-image-status": "validated" });
  } catch (error) {
    const stale = await caches.default.match(solarImageCacheKey(request, mode, size, true));
    if (stale) {
      const headers = new Headers(stale.headers);
      headers.set("x-pcs-image-status", "stale");
      headers.set("warning", '110 - "stale solar image"');
      return new Response(stale.body, { status: 200, headers });
    }
    const message = error.name === "AbortError" ? "upstream timeout" : "scientific solar image unavailable";
    return response(errorEnvelope({ name: config.source, url: config.full }, "solar_image", message), 503);
  }
}

function solarMetadataCacheKey(request, mode) {
  const url = new URL("/api/space-weather/solar-image", new URL(request.url).origin);
  url.searchParams.set("mode", mode);
  return new Request(url);
}

function solarMetadataPayload(request, mode, config, observedAt, status = solarObservationStatus(observedAt)) {
  return {
    success: true,
    source: config.source,
    instrument: config.instrument,
    wavelength: config.wavelength,
    observed_at: observedAt,
    retrieved_at: new Date().toISOString(),
    status,
    image_url: solarPublicImageUrl(request, mode),
    thumbnail_url: solarPublicImageUrl(request, mode, "thumbnail"),
    product_type: "observed_image",
    mode,
    source_image_url: config.full,
    observation_time_basis: "Official upstream Last-Modified header",
  };
}

async function solarImageMetadata(request, env, ctx, mode) {
  const config = SOLAR_IMAGE_MODES[mode];
  if (!config) {
    return response({
      success: false,
      source: null,
      instrument: null,
      wavelength: null,
      observed_at: null,
      retrieved_at: new Date().toISOString(),
      status: "unavailable",
      image_url: null,
      thumbnail_url: null,
      product_type: "observed_image",
      error: "unsupported image mode",
      supported_modes: Object.keys(SOLAR_IMAGE_MODES),
    }, 400);
  }
  const key = solarMetadataCacheKey(request, mode);
  const hit = await caches.default.match(key);
  if (hit) return hit;
  try {
    const image = await fetchOfficialImage(config.full);
    await cacheSolarImage(request, ctx, mode, "full", image);
    const payload = solarMetadataPayload(request, mode, config, image.lastModified);
    const result = response(payload, 200, SOLAR_IMAGE_CACHE_SECONDS);
    ctx.waitUntil(Promise.all([
      caches.default.put(key, result.clone()),
      writeStored(env, `astronomy:last:solar-image:${mode}`, payload, SOLAR_IMAGE_STALE_SECONDS),
    ]));
    return result;
  } catch (error) {
    const stale = await readStored(env, `astronomy:last:solar-image:${mode}`);
    if (stale) {
      return response({
        ...stale,
        retrieved_at: new Date().toISOString(),
        status: "stale",
        image_url: solarPublicImageUrl(request, mode),
        thumbnail_url: solarPublicImageUrl(request, mode, "thumbnail"),
      });
    }
    const message = error.name === "AbortError" ? "upstream timeout" : "scientific solar image unavailable";
    return response({
      success: false,
      source: config.source,
      instrument: config.instrument,
      wavelength: config.wavelength,
      observed_at: null,
      retrieved_at: new Date().toISOString(),
      status: "unavailable",
      image_url: null,
      thumbnail_url: null,
      product_type: "observed_image",
      error: message,
    }, 503);
  }
}

async function lunarImage(request, ctx) {
  const cacheKey = new Request(new URL("/api/astronomy/lunar-image", new URL(request.url).origin));
  const staleKey = new Request(`${cacheKey.url}?cache=last-valid`);
  const hit = await caches.default.match(cacheKey);
  if (hit) return hit;
  try {
    const image = await fetchOfficialImage(LUNAR_IMAGE_URL, 15000);
    const fresh = officialImageResponse(image, 86400, {
      "x-pcs-image-status": "validated",
      "x-pcs-image-source": "USGS-LROC-WAC",
    });
    const stale = officialImageResponse(image, 604800, {
      "x-pcs-image-status": "last-valid",
      "x-pcs-image-source": "USGS-LROC-WAC",
    });
    ctx.waitUntil(Promise.all([caches.default.put(cacheKey, fresh), caches.default.put(staleKey, stale)]));
    return officialImageResponse(image, 86400, {
      "x-pcs-image-status": "validated",
      "x-pcs-image-source": "USGS-LROC-WAC",
    });
  } catch (error) {
    const stale = await caches.default.match(staleKey);
    if (stale) {
      const headers = new Headers(stale.headers);
      headers.set("x-pcs-image-status", "stale");
      return new Response(stale.body, { status: 200, headers });
    }
    const message = error.name === "AbortError" ? "upstream timeout" : "scientific lunar image unavailable";
    return response(errorEnvelope({ name: "USGS Astrogeology / NASA LROC", url: LUNAR_IMAGE_URL }, "LROC WAC global mosaic", message), 503);
  }
}

function planetPublicImageUrl(request, body) {
  const url = new URL(`/api/astronomy/planet-image/${body}`, new URL(request.url).origin);
  url.searchParams.set("format", "image");
  return url.toString();
}

function assertAllowedPlanetSource(sourceUrl) {
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:" || !OFFICIAL_IMAGE_HOSTS.has(url.hostname)) {
    throw new Error("planet image source is not on the official-domain allowlist");
  }
}

function planetImageCacheKey(request, body, stale = false) {
  const url = new URL(planetPublicImageUrl(request, body));
  if (stale) url.searchParams.set("cache", "last-valid");
  return new Request(url);
}

async function cachePlanetImage(request, ctx, body, config, image) {
  const headers = { "x-pcs-image-status": "validated", "x-pcs-image-source": body };
  const fresh = officialImageResponse(image, config.cacheSeconds, headers);
  const stale = officialImageResponse(image, PLANET_IMAGE_STALE_SECONDS, { ...headers, "x-pcs-image-status": "last-valid" });
  ctx.waitUntil(Promise.all([
    caches.default.put(planetImageCacheKey(request, body), fresh),
    caches.default.put(planetImageCacheKey(request, body, true), stale),
  ]));
}

async function validatedPlanetImage(request, ctx, body, config) {
  const fresh = await caches.default.match(planetImageCacheKey(request, body));
  if (fresh) return { response: fresh, status: "archival" };
  assertAllowedPlanetSource(config.sourceUrl);
  try {
    const image = await fetchOfficialImage(config.sourceUrl, 15000);
    await cachePlanetImage(request, ctx, body, config, image);
    return {
      response: officialImageResponse(image, config.cacheSeconds, {
        "x-pcs-image-status": "validated", "x-pcs-image-source": body,
      }),
      status: "archival",
    };
  } catch (error) {
    const stale = await caches.default.match(planetImageCacheKey(request, body, true));
    if (stale) {
      const headers = new Headers(stale.headers);
      headers.set("x-pcs-image-status", "stale");
      headers.set("warning", '110 - "stale archival planet image"');
      return { response: new Response(stale.body, { status: 200, headers }), status: "stale" };
    }
    throw error;
  }
}

function planetMetadataPayload(request, body, config, status = "archival") {
  return {
    success: true,
    body,
    source: config.source,
    mission: config.mission,
    instrument: config.instrument ?? null,
    product: config.product,
    product_type: config.productType,
    projection: config.projection,
    observed_at: config.observedAt ?? null,
    product_date: config.productDate ?? null,
    retrieved_at: new Date().toISOString(),
    status,
    image_url: planetPublicImageUrl(request, body),
    thumbnail_url: null,
    attribution: config.attribution,
    notes: config.notes ?? null,
    source_image_url: config.sourceUrl,
    catalog_url: config.catalogUrl,
  };
}

async function planetImage(request, env, ctx, body) {
  const config = PLANET_IMAGE_PRODUCTS[body];
  if (!config) {
    return response({
      success: false, body, source: null, mission: null, instrument: null, product: null,
      product_type: null, projection: null, observed_at: null, product_date: null,
      retrieved_at: new Date().toISOString(), status: "unavailable", image_url: null,
      thumbnail_url: null, attribution: null, notes: null, error: "unsupported body",
    }, 404);
  }
  const format = new URL(request.url).searchParams.get("format");
  try {
    const validated = await validatedPlanetImage(request, ctx, body, config);
    if (format === "image") return validated.response;
    const payload = planetMetadataPayload(request, body, config, validated.status);
    ctx.waitUntil(writeStored(env, `astronomy:last:planet-image:${body}`, payload, PLANET_IMAGE_STALE_SECONDS));
    return response(payload, 200, config.cacheSeconds);
  } catch (error) {
    if (format !== "image") {
      const stale = await readStored(env, `astronomy:last:planet-image:${body}`);
      if (stale) return response({
        ...stale, retrieved_at: new Date().toISOString(), status: "stale",
        image_url: planetPublicImageUrl(request, body),
      });
    }
    const message = error.name === "AbortError" ? "upstream timeout" : "scientific planetary imagery unavailable";
    return response({
      success: false, body, source: config.source, mission: config.mission,
      instrument: config.instrument ?? null, product: config.product,
      product_type: config.productType, projection: config.projection,
      observed_at: config.observedAt ?? null, product_date: config.productDate ?? null,
      retrieved_at: new Date().toISOString(), status: "unavailable", image_url: null,
      thumbnail_url: null, attribution: config.attribution, notes: config.notes ?? null,
      error: message,
    }, 503);
  }
}

export async function handleAstronomyRequest(request, env, ctx) {
  if (request.method !== "GET") return response(errorEnvelope(SOURCE.noaa, "PCS astronomy API", "method not allowed"), 405);
  const path = new URL(request.url).pathname;
  if (path === "/api/space-weather/solar-image") {
    const url = new URL(request.url);
    const mode = (url.searchParams.get("mode") || "hmi-continuum").toLowerCase();
    if (url.searchParams.get("format") === "image") {
      const size = url.searchParams.get("size") === "thumbnail" ? "thumbnail" : "full";
      return solarImageBinary(request, ctx, mode, size);
    }
    return solarImageMetadata(request, env, ctx, mode);
  }
  if (path === "/api/astronomy/lunar-image") return lunarImage(request, ctx);
  if (path.startsWith("/api/astronomy/planet-image/")) {
    const body = decodeURIComponent(path.split("/").filter(Boolean).at(-1) || "").toLowerCase();
    return planetImage(request, env, ctx, body);
  }
  if (path.startsWith("/api/astronomy/body/")) {
    const body = decodeURIComponent(path.split("/").filter(Boolean).at(-1) || "").toLowerCase();
    const bodyConfig = JPL_BODY_CONFIG[body];
    if (!bodyConfig) return response(errorEnvelope(SOURCE.jpl, "body_ephemeris", "unsupported body", { body }), 404);
    const config = { ttl: bodyConfig.cacheSeconds, staleTtl: Math.max(bodyConfig.cacheSeconds * 4, 86400), dataset: "body_ephemeris" };
    return cachedDataset(request, env, ctx, `body:${body}`, config, SOURCE.jpl, () => loadBodyEphemeris(body, bodyConfig));
  }
  if (path === "/api/astronomy/moon") return cachedDataset(request, env, ctx, "moon", CONFIG.moon, SOURCE.jpl, loadMoon);
  if (path === "/api/space-weather/kp") return cachedDataset(request, env, ctx, "kp", CONFIG.kp, SOURCE.noaa, loadKp);
  if (path === "/api/space-weather/solar-wind") return cachedDataset(request, env, ctx, "solar-wind", CONFIG.solarWind, SOURCE.noaa, loadSolarWind);
  if (path === "/api/space-weather/xray") return cachedDataset(request, env, ctx, "xray", CONFIG.xray, SOURCE.noaa, loadXray);
  if (path === "/api/space-weather/alerts") return cachedDataset(request, env, ctx, "alerts", CONFIG.alerts, SOURCE.noaa, loadAlerts);
  if (path === "/api/space-weather/summary") return cachedDataset(request, env, ctx, "summary", CONFIG.summary, SOURCE.noaa, loadSummary);
  return response(errorEnvelope(SOURCE.noaa, "PCS astronomy API", "route not found"), 404);
}
