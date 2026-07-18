import { handleNasaRequest, NASA_DATASET_ROUTES } from "./nasa/routes.ts";
import { handleAstronomyRequest, ASTRONOMY_ROUTES } from "./astronomy.js";
import { handleVisitorRequest, VISITOR_ROUTES } from "./visitors.js";
import { handlePcsRequest, PCS_ROUTES } from "./pcs/routes.js";
import { runScheduledJobs } from "./pcs/jobs.js";
import { handleRegionalRequest } from "./regional.js";

const DATASETS = [
  {
    symbol: "GMST",
    url: "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv",
    parser: "gistemp",
    source: "NASA GISTEMP",
    unit: "°C anomaly"
  },
  {
    symbol: "CO2",
    url: "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv",
    parser: "noaaCsv",
    source: "NOAA GML CO2",
    unit: "ppm"
  },
  {
    symbol: "CH4",
    url: "https://gml.noaa.gov/webdata/ccgg/trends/ch4/ch4_mm_gl.csv",
    parser: "noaaCsv",
    source: "NOAA GML CH4",
    unit: "ppb"
  }
];

const POWER_PARAMS = [
  ["PRECIP", "PRECTOTCORR", "mm/day"],
  ["CLOUD", "CLOUD_AMT", "%"],
  ["UV", "ALLSKY_SFC_UV_INDEX", "index"],
  ["RAD", "ALLSKY_SFC_SW_DWN", "kWh/m2/day"]
];

const EXTRA_STATIC_OBSERVATIONS = [
  {
    symbol: "SST",
    value: null,
    timestamp: new Date().toISOString(),
    source: "NOAA OISST",
    note: "registered_pending_connector"
  },
  {
    symbol: "GMSL",
    value: null,
    timestamp: new Date().toISOString(),
    source: "NASA Sea Level",
    note: "registered_pending_connector"
  },
  {
    symbol: "OHC",
    value: null,
    timestamp: new Date().toISOString(),
    source: "NOAA Ocean Heat Content",
    note: "registered_pending_connector"
  },
  {
    symbol: "ARCTIC_ICE",
    value: null,
    timestamp: new Date().toISOString(),
    source: "NSIDC Sea Ice",
    note: "registered_pending_connector"
  },
  {
    symbol: "NDVI",
    value: null,
    timestamp: new Date().toISOString(),
    source: "NASA MODIS NDVI",
    note: "registered_pending_connector"
  },
  {
    symbol: "FIRE",
    value: null,
    timestamp: new Date().toISOString(),
    source: "NASA FIRMS",
    note: "registered_pending_connector"
  },
  {
    symbol: "POP",
    value: null,
    timestamp: new Date().toISOString(),
    source: "World Bank Population",
    note: "registered_pending_connector"
  },
  {
    symbol: "ENERGY",
    value: null,
    timestamp: new Date().toISOString(),
    source: "Energy Institute",
    note: "registered_pending_connector"
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    }
  });
}
const OPENWEATHER_LAYERS = {
  clouds: "clouds_new",
  rain: "precipitation_new",
  temperature: "temp_new",
  // Backward-compatible alias for PCS clients deployed before the route and
  // UI layer identifiers were aligned. Both resolve to the documented
  // OpenWeather Weather Maps 1.0 temperature product.
  temp: "temp_new",
  wind: "wind_new"
};

function tileResponse(body, status = 200, contentType = "image/png", metadata = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType,
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "x-pcs-observation-time, x-pcs-retrieved-at, x-pcs-weather-layer",
      "cache-control": "public, max-age=600",
      "x-pcs-observation-time": metadata.observationTime || "unavailable",
      "x-pcs-retrieved-at": metadata.retrievedAt || new Date().toISOString(),
      "x-pcs-weather-layer": metadata.layer || "unknown"
    }
  });
}

async function openWeatherHealth(env) {
  const apiKey = env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return {
      key_configured: false,
      upstream_status: null,
      upstream_ok: false,
      error_message: "OPENWEATHER_API_KEY is not configured"
    };
  }

  const testUrl =
    `https://tile.openweathermap.org/map/${OPENWEATHER_LAYERS.temperature}/1/1/1.png?appid=${apiKey}`;

  try {
    const response = await fetch(testUrl);

    return {
      key_configured: true,
      upstream_status: response.status,
      upstream_ok: response.ok,
      error_message: response.ok ? null : "OpenWeather health tile request failed"
    };
  } catch (error) {
    return {
      key_configured: true,
      upstream_status: null,
      upstream_ok: false,
      error_message: "OpenWeather health tile request failed"
    };
  }
}

async function openWeatherTile(request, env) {
  const apiKey = env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return json({ error: "OPENWEATHER_API_KEY is not configured" }, 500);
  }

  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);

  // /tiles/openweather/:layer/:z/:x/:y(.png)
  const layerKey = parts[2];
  const z = parts[3];
  const x = parts[4];
  const rawY = parts[5];
  const y = rawY ? rawY.replace(/\.png$/i, "") : rawY;

  const openWeatherLayer = OPENWEATHER_LAYERS[layerKey];

  if (!openWeatherLayer || !z || !x || !y) {
    return json({
      error: "Invalid OpenWeather tile path",
      expected: "/tiles/openweather/:layer/:z/:x/:y.png",
      layers: Object.keys(OPENWEATHER_LAYERS)
    }, 400);
  }

  const tileUrl =
    `https://tile.openweathermap.org/map/${openWeatherLayer}/${z}/${x}/${y}.png?appid=${apiKey}`;

  const response = await fetch(tileUrl);

  if (!response.ok) {
    return json({
      error: "OpenWeather tile request failed",
      layer: layerKey,
      upstream_layer: openWeatherLayer,
      upstream_status: response.status
    }, response.status);
  }

  return tileResponse(await response.arrayBuffer(), 200, response.headers.get("content-type") || "image/png", {
    layer: layerKey === "temp" ? "temperature" : layerKey,
    observationTime: response.headers.get("last-modified"),
    retrievedAt: new Date().toISOString(),
  });
}

async function nhcGisProxy(request) {
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url");
  let upstream;
  try {
    upstream = new URL(rawUrl || "");
  } catch {
    return json({ error: "A valid NHC GIS URL is required" }, 400);
  }
  const allowedPath = upstream.pathname.startsWith("/storm_graphics/api/") || upstream.pathname.startsWith("/gis/");
  if (upstream.protocol !== "https:" || upstream.hostname !== "www.nhc.noaa.gov" || !allowedPath || !upstream.pathname.toLowerCase().endsWith(".kmz")) {
    return json({ error: "Only official NOAA NHC KMZ products are allowed" }, 400);
  }
  const response = await fetch(upstream.toString(), { headers: { "user-agent": "PCS-Observatory/2.0 public-research" } });
  if (!response.ok) return json({ error: "NOAA NHC GIS product request failed", upstream_status: response.status }, response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const signature = bytes.length >= 4 ? `${bytes[0]},${bytes[1]},${bytes[2]},${bytes[3]}` : "";
  const isZip = ["80,75,3,4", "80,75,5,6", "80,75,7,8"].includes(signature);
  if (!isZip) return json({ error: "NOAA NHC response was not a valid KMZ archive" }, 502);
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "application/vnd.google-earth.kmz",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
      "x-pcs-source": "NOAA National Hurricane Center",
      "x-content-type-options": "nosniff",
    },
  });
}
function latestNumericFromCsv(text) {
  const lines = text.split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  for (let i = lines.length - 1; i >= 0; i--) {
    const cols = lines[i].split(",").map((x) => x.trim());
    const nums = cols.map(Number).filter((n) => Number.isFinite(n));
    if (nums.length >= 3) {
      return {
        timestamp: `${Math.trunc(nums[0])}-${String(Math.trunc(nums[1] || 1)).padStart(2, "0")}-01T00:00:00Z`,
        value: nums[nums.length - 1]
      };
    }
  }
  return null;
}

function latestGistemp(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const cols = lines[i].split(",").map((x) => x.trim());
    const year = Number(cols[0]);
    const annual = Number(cols[13]);
    if (Number.isFinite(year) && Number.isFinite(annual)) {
      return {
        timestamp: `${year}-12-31T00:00:00Z`,
        value: annual / 100
      };
    }
  }
  return null;
}

async function upsertObservation(env, symbol, value, timestamp, sourceName, uncertainty = null) {
  const variable = await env.PCS_DB
    .prepare("SELECT id FROM pcs_variables WHERE symbol = ? LIMIT 1")
    .bind(symbol)
    .first();

  if (!variable) {
    return { symbol, imported: false, reason: "variable_not_found" };
  }

  const source = await env.PCS_DB
    .prepare("SELECT id FROM pcs_sources WHERE name = ? LIMIT 1")
    .bind(sourceName)
    .first();

  if (!source) {
    return { symbol, imported: false, reason: "source_not_found" };
  }

  await env.PCS_DB
    .prepare(`
      INSERT INTO pcs_observations
      (variable_id, region_id, timestamp, value, uncertainty, source_id)
      VALUES (?, 1, ?, ?, ?, ?)
    `)
    .bind(variable.id, timestamp, value, uncertainty, source.id)
    .run();

  return { symbol, imported: true, value, timestamp, source: sourceName };
}

async function ingestCore(env) {
  const imported = [];

  for (const dataset of DATASETS) {
    try {
      const response = await fetch(dataset.url, { cf: { cacheTtl: 0 } });
      const text = await response.text();
      const parsed = dataset.parser === "gistemp"
        ? latestGistemp(text)
        : latestNumericFromCsv(text);

      if (!parsed) {
        imported.push({ symbol: dataset.symbol, imported: false, reason: "parse_failed" });
        continue;
      }

      imported.push(await upsertObservation(
        env,
        dataset.symbol,
        parsed.value,
        parsed.timestamp,
        dataset.source
      ));
    } catch (error) {
      imported.push({ symbol: dataset.symbol, imported: false, reason: error.message });
    }
  }

  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startStr = start.toISOString().slice(0, 10).replaceAll("-", "");
  const endStr = end.toISOString().slice(0, 10).replaceAll("-", "");

  for (const [symbol, parameter, unit] of POWER_PARAMS) {
    try {
      const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${parameter}&community=RE&longitude=0&latitude=0&start=${startStr}&end=${endStr}&format=JSON`;
      const response = await fetch(url, { cf: { cacheTtl: 0 } });
      const data = await response.json();
      const series = data?.properties?.parameter?.[parameter] || {};
      const entries = Object.entries(series)
        .filter(([, value]) => Number.isFinite(Number(value)))
        .sort(([a], [b]) => a.localeCompare(b));

      if (!entries.length) {
        imported.push({ symbol, imported: false, reason: "no_power_data" });
        continue;
      }

      const [dateKey, rawValue] = entries[entries.length - 1];
      const timestamp = `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}T00:00:00Z`;

      imported.push(await upsertObservation(
        env,
        symbol,
        Number(rawValue),
        timestamp,
        "NASA POWER"
      ));
    } catch (error) {
      imported.push({ symbol, imported: false, reason: error.message });
    }
  }

  return imported;
}

async function latestState(env) {
  const { results } = await env.PCS_DB.prepare(`
    SELECT
      v.id AS variable_id,
      v.name,
      v.symbol,
      v.category,
      v.residual_group,
      v.unit,
      o.timestamp,
      o.value,
      o.uncertainty,
      s.name AS source_name
    FROM pcs_variables v
    LEFT JOIN pcs_observations o ON o.variable_id = v.id
    LEFT JOIN pcs_sources s ON s.id = o.source_id
    ORDER BY v.id, o.timestamp DESC
  `).all();

  const latestBySymbol = {};
  for (const row of results) {
    if (!latestBySymbol[row.symbol]) latestBySymbol[row.symbol] = row;
  }

  const observations = Object.values(latestBySymbol);
  const connected = observations.filter((v) => v.value !== null && v.value !== undefined);
  const by = Object.fromEntries(observations.map((o) => [o.symbol, o]));
  const now = new Date().toISOString();

  return {
    timestamp: now,
    metadata: {
      generated_at_utc: now,
      api_version: "v1",
      source: "Cloudflare D1 pcs_observations"
    },
    pcs_state: {
      value: null,
      status: "awaiting_calculation"
    },
    coverage_count: connected.length,
    latest_year: new Date().getFullYear(),
    projections: {
      L_T: by.GMST?.value ?? by.SST?.value ?? null,
      L_C: by.CO2?.value ?? by.CH4?.value ?? null,
      L_S: by.ARCTIC_ICE?.value ?? by.GMSL?.value ?? null,
      L_I: by.NDVI?.value ?? null
    },
    observations
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (ASTRONOMY_ROUTES.includes(url.pathname)
      || url.pathname.startsWith("/api/astronomy/body/")
      || url.pathname.startsWith("/api/astronomy/planet-image/")) {
      return handleAstronomyRequest(request, env, ctx);
    }
    if (url.pathname === "/api/nasa/status" || url.pathname.startsWith("/api/nasa/")) {
      return handleNasaRequest(request, env, ctx);
    }
    if (url.pathname.startsWith("/api/visitors/")) {
      return handleVisitorRequest(request, env, ctx);
    }
    if (url.pathname === "/api/layers/nhc-gis") {
      return nhcGisProxy(request);
    }
    if (url.pathname.startsWith("/api/regional/")) {
      return handleRegionalRequest(request);
    }
    if (PCS_ROUTES.includes(url.pathname)
      || url.pathname.startsWith("/api/events/")
      || url.pathname.startsWith("/api/evidence-ledger/")
      || url.pathname.startsWith("/api/admin/")) {
      return handlePcsRequest(request, env, ctx);
    }

    if (url.pathname === "/health/openweather") {
      return json(await openWeatherHealth(env));
    }

    if (url.pathname.startsWith("/tiles/openweather/")) {
      return openWeatherTile(request, env);
    }
    if (url.pathname === "/ingest/v1") {
      const secret = env.INGEST_SECRET;
      if (!secret) {
        return json({ error: "INGEST_SECRET is not configured on the worker" }, 500);
      }
      const authHeader = request.headers.get("Authorization") ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

      // Use constant-time comparison to prevent timing-based secret enumeration.
      // crypto.subtle.timingSafeEqual throws if byte lengths differ, so check first.
      const encoder = new TextEncoder();
      const tokenBytes = encoder.encode(token);
      const secretBytes = encoder.encode(secret);
      let tokensMatch = false;
      if (tokenBytes.byteLength === secretBytes.byteLength) {
        tokensMatch = crypto.subtle.timingSafeEqual(tokenBytes, secretBytes);
      }

      if (!tokensMatch) {
        return json({ error: "Unauthorized" }, 401);
      }
      const imported = await ingestCore(env);
      for (const item of EXTRA_STATIC_OBSERVATIONS) {
        try {
          imported.push({
            symbol: item.symbol,
            imported: false,
            value: item.value,
            timestamp: item.timestamp,
            source: item.source,
            status: item.note
          });
        } catch (error) {
          imported.push({
            symbol: item.symbol,
            imported: false,
            reason: error.message
          });
        }
      }
      return json({
        status: "ok",
        imported_count: imported.filter((x) => x.imported).length,
        results: imported
      });
    }

    if (url.pathname === "/latest") {
      return json(await latestState(env));
    }

    if (url.pathname === "/variables") {
      const { results } = await env.PCS_DB
        .prepare("SELECT * FROM pcs_variables ORDER BY id")
        .all();
      return json(results);
    }

    return json({
  status: "ok",
  service: "pcs-backend",
  endpoints: [
    "/latest",
    "/variables",
    "/ingest/v1",
    "/health/openweather",
    "/tiles/openweather/clouds/1/1/1.png",
    ...VISITOR_ROUTES,
    "/api/nasa/status",
    ...NASA_DATASET_ROUTES
    ,...ASTRONOMY_ROUTES
    ,"/api/regional/profiles"
    ,"/api/regional/observation?region=taiwan"
  ],
  d1: !!env.PCS_DB,
  kv: !!env.PCS_CACHE
});
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduledJobs(env, controller.cron));
  }
};    
