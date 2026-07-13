const NOAA = "https://services.swpc.noaa.gov";
const JPL_HORIZONS = "https://ssd.jpl.nasa.gov/api/horizons.api";

export const ASTRONOMY_ROUTES = [
  "/api/astronomy/moon",
  "/api/astronomy/body/:body",
  "/api/space-weather/summary",
  "/api/space-weather/kp",
  "/api/space-weather/solar-wind",
  "/api/space-weather/xray",
  "/api/space-weather/alerts",
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

export async function handleAstronomyRequest(request, env, ctx) {
  if (request.method !== "GET") return response(errorEnvelope(SOURCE.noaa, "PCS astronomy API", "method not allowed"), 405);
  const path = new URL(request.url).pathname;
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
