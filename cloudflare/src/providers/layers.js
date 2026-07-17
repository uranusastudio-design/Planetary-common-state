const PUBLIC_DOMAIN = "Public domain / provider terms";

export const PCS_LAYER_ADAPTERS = Object.freeze([
  { id: "global-temperature", provider: "NASA GISS", dataset: "GISTEMP v4 global monthly surface temperature anomaly", endpoint: "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv", parser: "gistemp", spatial_resolution: "global mean", temporal_resolution: "monthly", license: PUBLIC_DOMAIN },
  { id: "sea-level", provider: "NOAA CO-OPS", dataset: "Verified/Preliminary Water Level, Honolulu 1612340", endpoint: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=1612340&product=water_level&datum=MSL&units=metric&time_zone=gmt&format=json", parser: "noaa_water_level", spatial_resolution: "station", temporal_resolution: "6 minutes", license: PUBLIC_DOMAIN },
  { id: "precipitation", provider: "NASA GES DISC", dataset: "GPM IMERG Early Half-Hourly V07", endpoint: "https://cmr.earthdata.nasa.gov/search/granules.json?short_name=GPM_3IMERGHHE&version=07&page_size=1&sort_key=-start_date", parser: "cmr_granule", spatial_resolution: "0.1 degree", temporal_resolution: "30 minutes", license: PUBLIC_DOMAIN },
  { id: "tropical-cyclones", provider: "NOAA NHC", dataset: "Current Tropical Cyclone Products", endpoint: "https://www.nhc.noaa.gov/CurrentStorms.json", parser: "nhc", spatial_resolution: "storm advisory", temporal_resolution: "advisory cycle", license: PUBLIC_DOMAIN },
  { id: "wildfire", provider: "NASA FIRMS", dataset: "VIIRS NOAA-20 Near Real-Time active fire detections", endpoint: "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{FIRMS_MAP_KEY}/VIIRS_NOAA20_NRT/world/1", parser: "firms", secret: "FIRMS_MAP_KEY", spatial_resolution: "375 m detection", temporal_resolution: "near real-time", license: PUBLIC_DOMAIN },
  { id: "co2", provider: "NOAA GML", dataset: "Mauna Loa monthly mean CO2", endpoint: "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv", parser: "noaa_co2", spatial_resolution: "Mauna Loa station", temporal_resolution: "monthly", license: PUBLIC_DOMAIN },
  { id: "ndvi", provider: "NASA MODIS", dataset: "MOD13A2 Vegetation Indices 16-Day L3 Global 1 km", endpoint: "https://cmr.earthdata.nasa.gov/search/granules.json?short_name=MOD13A2&version=061&page_size=1&sort_key=-start_date", parser: "cmr_granule", spatial_resolution: "1 km", temporal_resolution: "16 days", license: PUBLIC_DOMAIN },
  { id: "sea-ice", provider: "NSIDC", dataset: "Sea Ice Index v4 Northern Hemisphere daily extent", endpoint: "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv", parser: "nsidc", spatial_resolution: "Northern Hemisphere extent", temporal_resolution: "daily", license: PUBLIC_DOMAIN },
  { id: "shipping", provider: "NOAA Marine Cadastre", dataset: "AccessAIS historical vessel traffic", endpoint: "https://marinecadastre.gov/ais/", parser: "metadata_only", spatial_resolution: "historical track archive", temporal_resolution: "annual archive", license: PUBLIC_DOMAIN, partial_reason: "No sustainable anonymous public live vessel-position API is configured; no vessel positions are inferred." },
  { id: "aviation", provider: "OpenSky Network", dataset: "State Vectors", endpoint: "https://opensky-network.org/api/states/all", parser: "opensky", authOnDenied: true, spatial_resolution: "reported aircraft positions", temporal_resolution: "live state snapshot", license: "OpenSky Network terms" },
  { id: "satellite-observations", provider: "CelesTrak", dataset: "Active Satellites GP (OMM JSON)", endpoint: "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json", parser: "celestrak", spatial_resolution: "orbital element per active object", temporal_resolution: "latest GP epoch", license: "CelesTrak terms" },
]);

function isoDate(year, month, day = 1) {
  const value = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isFinite(value.getTime()) ? value.toISOString() : null;
}

function lastDataLine(text) {
  return text.trim().split(/\r?\n/).reverse().find((line) => line.trim() && !line.trim().startsWith("#"));
}

function parseGistemp(text) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const lines = text.trim().split(/\r?\n/);
  const header = lines.find((line) => /^Year,/.test(line));
  const rows = lines.filter((line) => /^\d{4},/.test(line));
  if (!header || !rows.length) throw new Error("GISTEMP data rows unavailable");
  for (const row of rows.reverse()) {
    const values = row.split(",");
    for (let index = 12; index >= 1; index -= 1) {
      const value = Number(values[index]);
      if (Number.isFinite(value) && value < 900) return {
        observation_time: isoDate(values[0], index), value, unit: "°C anomaly",
        data_state: "OBSERVED", quality_flag: "provider_published_global_anomaly",
        uncertainty: "See GISTEMP v4 uncertainty analysis", details: { baseline_period: "1951–1980", month: months[index - 1] },
      };
    }
  }
  throw new Error("No current GISTEMP anomaly found");
}

function parseNoaaCo2(text) {
  const line = lastDataLine(text);
  const values = line?.trim().split(/\s+|,/).filter(Boolean) || [];
  const year = Number(values[0]), month = Number(values[1]);
  const candidates = values.slice(2).map(Number).filter((value) => Number.isFinite(value) && value > 0);
  if (!year || !month || !candidates.length) throw new Error("NOAA CO2 data rows unavailable");
  return { observation_time: isoDate(year, month), value: candidates[1] ?? candidates[0], unit: "ppm", data_state: "OBSERVED", quality_flag: "provider_published_monthly_mean", uncertainty: null, details: { trend: "not_calculated_by_pcs" } };
}

function parseNsidc(text) {
  const line = lastDataLine(text);
  const values = line?.split(",").map((value) => value.trim()) || [];
  if (values.length < 4) throw new Error("NSIDC extent row unavailable");
  return { observation_time: isoDate(values[0], values[1], values[2]), value: Number(values[3]), unit: "million km²", data_state: "OBSERVED", quality_flag: "provider_published_daily_extent", uncertainty: null, details: { hemisphere: "north" } };
}

function parseCmr(payload) {
  const entry = payload?.feed?.entry?.[0];
  if (!entry) return { observation_time: null, value: null, unit: null, data_state: "UNAVAILABLE", quality_flag: "no_current_granule", uncertainty: null, details: {} };
  return { observation_time: entry.time_start || entry.updated || null, value: null, unit: null, data_state: "OBSERVED", quality_flag: "granule_metadata_observed_measurement_not_downloaded", uncertainty: null, details: { granule_id: entry.title || entry.id || null } };
}

function parsePayload(adapter, body, contentType) {
  if (adapter.parser === "gistemp") return parseGistemp(body);
  if (adapter.parser === "noaa_co2") return parseNoaaCo2(body);
  if (adapter.parser === "nsidc") return parseNsidc(body);
  if (adapter.parser === "metadata_only") return { observation_time: null, value: null, unit: null, data_state: "UNAVAILABLE", quality_flag: "metadata_only", uncertainty: null, details: { limitation: adapter.partial_reason } };
  const payload = contentType.includes("json") ? JSON.parse(body) : JSON.parse(body);
  if (adapter.parser === "cmr_granule") return parseCmr(payload);
  if (adapter.parser === "noaa_water_level") {
    const item = payload?.data?.[0];
    if (!item) throw new Error(payload?.error?.message || "NOAA water-level observation unavailable");
    return { observation_time: item.t ? new Date(`${item.t.replace(" ", "T")}Z`).toISOString() : null, value: Number(item.v), unit: "m relative to MSL", data_state: "OBSERVED", quality_flag: item.f || "provider_flag_not_supplied", uncertainty: null, details: { station: "Honolulu 1612340", trend: "NOT_CALCULATED" } };
  }
  if (adapter.parser === "nhc") {
    const storms = payload?.activeStorms || payload?.storms || [];
    return { observation_time: payload?.lastUpdated || null, value: storms.length, unit: "active storms", data_state: "OBSERVED", quality_flag: "official_current_products", uncertainty: null, details: { storms: storms.slice(0, 20).map((item) => item.name || item.id || "unnamed") } };
  }
  if (adapter.parser === "opensky") return { observation_time: payload?.time ? new Date(payload.time * 1000).toISOString() : null, value: Array.isArray(payload?.states) ? payload.states.length : null, unit: "reported live positions", data_state: "OBSERVED", quality_flag: "crowdsourced_state_vectors", uncertainty: "Coverage varies geographically and by receiver availability", details: { mode: "live_positions", aggregate_only_in_ui: true } };
  if (adapter.parser === "celestrak") {
    const objects = Array.isArray(payload) ? payload : [];
    const epochs = objects.map((item) => item.EPOCH).filter(Boolean).sort();
    return { observation_time: epochs.at(-1) || null, value: objects.length, unit: "active objects with GP data", data_state: "OBSERVED", quality_flag: "active_group_gp_elements", uncertainty: "Orbit propagation uncertainty is object- and epoch-dependent", details: { active: objects.length, inactive: null, unknown: null, classification_scope: "active_group_only" } };
  }
  throw new Error(`Unsupported parser ${adapter.parser}`);
}

function statusFor(adapter, result, latencyMinutes) {
  if (adapter.parser === "metadata_only") return "PARTIAL";
  if (result.data_state === "UNAVAILABLE") return "UNAVAILABLE";
  if (latencyMinutes !== null && latencyMinutes > 7 * 24 * 60) return "DELAYED";
  return result.value === null ? "LATEST" : "LIVE";
}

export async function retrieveLayer(adapter, env, fetcher = fetch, now = new Date()) {
  const retrievedAt = now.toISOString();
  if (adapter.secret && !env?.[adapter.secret]) return normalized(adapter, { retrieved_at: retrievedAt, retrieval_status: "AUTH_REQUIRED", quality_flag: "missing_provider_credential", error: `${adapter.secret} is not configured` });
  const endpoint = adapter.endpoint.replace("{FIRMS_MAP_KEY}", env?.FIRMS_MAP_KEY || "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetcher(endpoint, { headers: { "user-agent": "PCS-Observatory/2.0 public-research" }, signal: controller.signal, cf: { cacheTtl: 0 } });
    if (!response.ok) return normalized(adapter, { endpoint, retrieved_at: retrievedAt, retrieval_status: adapter.authOnDenied && (response.status === 401 || response.status === 403) ? "AUTH_REQUIRED" : "ERROR", quality_flag: `http_${response.status}`, error: `Provider returned HTTP ${response.status}` });
    const body = await response.text();
    let result;
    if (adapter.parser === "firms") {
      const rows = body.trim().split(/\r?\n/);
      result = { observation_time: null, value: Math.max(0, rows.length - 1), unit: "VIIRS fire detections", data_state: "OBSERVED", quality_flag: "firms_nrt_detection_count", uncertainty: "Detection count is not burned area or fire-event count", details: { source_product: "VIIRS_NOAA20_NRT" } };
    } else result = parsePayload(adapter, body, response.headers.get("content-type") || "");
    const latency = result.observation_time ? Math.max(0, Math.round((now - new Date(result.observation_time)) / 60000)) : null;
    return normalized(adapter, { endpoint, ...result, retrieved_at: retrievedAt, latency, retrieval_status: statusFor(adapter, result, latency), error: null });
  } catch (error) {
    return normalized(adapter, { endpoint, retrieved_at: retrievedAt, retrieval_status: error?.name === "AbortError" ? "DELAYED" : "ERROR", quality_flag: error?.name === "AbortError" ? "provider_timeout" : "parse_or_network_error", error: error?.message || "Provider retrieval failed" });
  } finally { clearTimeout(timer); }
}

function normalized(adapter, runtime) {
  return {
    id: adapter.id, provider: adapter.provider, dataset: adapter.dataset,
    endpoint: runtime.endpoint || adapter.endpoint, observation_time: runtime.observation_time ?? null,
    retrieved_at: runtime.retrieved_at, latency: runtime.latency ?? null,
    spatial_resolution: adapter.spatial_resolution, temporal_resolution: adapter.temporal_resolution,
    quality_flag: runtime.quality_flag || "not_retrieved", uncertainty: runtime.uncertainty ?? null,
    license: adapter.license, retrieval_status: runtime.retrieval_status || "UNAVAILABLE",
    data_state: runtime.data_state || "UNAVAILABLE", value: runtime.value ?? null,
    unit: runtime.unit ?? null, details: runtime.details || {}, error: runtime.error || null,
  };
}

export async function retrieveAllLayers(env, fetcher = fetch, now = new Date()) {
  const layers = await Promise.all(PCS_LAYER_ADAPTERS.map((adapter) => retrieveLayer(adapter, env, fetcher, now)));
  return { generated_at: now.toISOString(), layers };
}
