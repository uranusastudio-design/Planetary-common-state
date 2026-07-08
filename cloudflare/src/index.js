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
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/ingest/v1") {
      const imported = await ingestCore(env);
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
      endpoints: ["/latest", "/variables", "/ingest/v1"],
      d1: !!env.PCS_DB,
      kv: !!env.PCS_CACHE
    });
  }
}
