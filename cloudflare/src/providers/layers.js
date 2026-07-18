const PUBLIC_DOMAIN = "Public domain / provider terms";

const OBSERVATION_LAYER_ADAPTERS = Object.freeze([
  { id: "global-temperature", provider: "NASA GISS", dataset: "GISTEMP v4 global monthly surface temperature anomaly", endpoint: "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv", parser: "gistemp", spatial_resolution: "global mean", temporal_resolution: "monthly", license: PUBLIC_DOMAIN },
  { id: "sea-level", provider: "NOAA CO-OPS", dataset: "Verified/Preliminary Water Level, Honolulu 1612340", endpoint: "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=1612340&product=water_level&datum=MSL&units=metric&time_zone=gmt&format=json", parser: "noaa_water_level", spatial_resolution: "station", temporal_resolution: "6 minutes", license: PUBLIC_DOMAIN },
  { id: "precipitation", provider: "NASA GES DISC", dataset: "GPM IMERG Early Half-Hourly V07", endpoint: "https://cmr.earthdata.nasa.gov/search/granules.json?short_name=GPM_3IMERGHHE&version=07&page_size=1&sort_key=-start_date", parser: "cmr_granule", spatial_resolution: "0.1 degree", temporal_resolution: "30 minutes", license: PUBLIC_DOMAIN },
  { id: "tropical-cyclones", provider: "NOAA NHC", dataset: "Current Tropical Cyclone Products", endpoint: "https://www.nhc.noaa.gov/CurrentStorms.json", parser: "nhc", spatial_resolution: "storm advisory", temporal_resolution: "advisory cycle", license: PUBLIC_DOMAIN },
  { id: "wildfire", provider: "NASA FIRMS", dataset: "VIIRS NOAA-20 Near Real-Time active fire detections", endpoint: "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{FIRMS_MAP_KEY}/VIIRS_NOAA20_NRT/world/1", parser: "firms", secret: "FIRMS_MAP_KEY", spatial_resolution: "375 m detection", temporal_resolution: "near real-time", license: PUBLIC_DOMAIN },
  { id: "co2", provider: "NOAA GML", dataset: "Mauna Loa monthly mean CO2", endpoint: "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv", parser: "noaa_co2", spatial_resolution: "Mauna Loa station", temporal_resolution: "monthly", license: PUBLIC_DOMAIN },
  { id: "ndvi", provider: "NASA MODIS", dataset: "MOD13Q1 Terra Vegetation Indices 16-Day L3 Global 250 m V061", endpoint: "https://cmr.earthdata.nasa.gov/search/granules.json?short_name=MOD13Q1&version=061&page_size=1&sort_key=-start_date", parser: "cmr_granule", spatial_resolution: "250 m", temporal_resolution: "16-day composite", license: PUBLIC_DOMAIN },
  { id: "sea-ice", provider: "NSIDC", dataset: "Sea Ice Index v4 Northern Hemisphere daily extent", endpoint: "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv", parser: "nsidc", spatial_resolution: "Northern Hemisphere extent", temporal_resolution: "daily", license: PUBLIC_DOMAIN },
  { id: "shipping", provider: "NOAA Marine Cadastre", dataset: "AccessAIS historical vessel traffic", endpoint: "https://marinecadastre.gov/ais/", parser: "metadata_only", spatial_resolution: "historical track archive", temporal_resolution: "annual archive", license: PUBLIC_DOMAIN, partial_reason: "No sustainable anonymous public live vessel-position API is configured; no vessel positions are inferred." },
  { id: "aviation", provider: "OpenSky Network", dataset: "State Vectors", endpoint: "https://opensky-network.org/api/states/all", parser: "opensky", authOnDenied: true, spatial_resolution: "reported aircraft positions", temporal_resolution: "live state snapshot", license: "OpenSky Network terms" },
  { id: "satellite-observations", provider: "CelesTrak", dataset: "Active Satellites GP (OMM JSON)", endpoint: "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json", parser: "celestrak", spatial_resolution: "orbital element per active object", temporal_resolution: "latest GP epoch", license: "CelesTrak terms" },
]);

const OPENWEATHER_LAYER_ADAPTERS = Object.freeze([
  { id: "clouds", provider: "OpenWeather", dataset: "Weather Maps 1.0 Clouds", endpoint: "/tiles/openweather/clouds/{z}/{x}/{y}.png", parser: "openweather_tile", openweather_product: "clouds_new", spatial_resolution: "256 px Web Mercator tiles", temporal_resolution: "provider current map", license: "OpenWeather API terms" },
  { id: "rain", provider: "OpenWeather", dataset: "Weather Maps 1.0 Precipitation", endpoint: "/tiles/openweather/rain/{z}/{x}/{y}.png", parser: "openweather_tile", openweather_product: "precipitation_new", spatial_resolution: "256 px Web Mercator tiles", temporal_resolution: "provider current map", license: "OpenWeather API terms" },
  { id: "temperature", provider: "OpenWeather", dataset: "Weather Maps 1.0 Temperature", endpoint: "/tiles/openweather/temperature/{z}/{x}/{y}.png", parser: "openweather_tile", openweather_product: "temp_new", spatial_resolution: "256 px Web Mercator tiles", temporal_resolution: "provider current map", license: "OpenWeather API terms" },
  { id: "wind", provider: "OpenWeather", dataset: "Weather Maps 1.0 Wind", endpoint: "/tiles/openweather/wind/{z}/{x}/{y}.png", parser: "openweather_tile", openweather_product: "wind_new", spatial_resolution: "256 px Web Mercator tiles", temporal_resolution: "provider current map", license: "OpenWeather API terms" },
]);

export const PCS_LAYER_ADAPTERS = Object.freeze([
  ...OBSERVATION_LAYER_ADAPTERS,
  ...OPENWEATHER_LAYER_ADAPTERS,
]);

const gibs = (layer, matrixSet, maximumLevel, legendUrl, units, product, extra = {}) => ({
  kind: "gibs_wmts",
  service: "NASA Global Imagery Browse Services (GIBS)",
  capabilities_url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml",
  tile_base_url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best",
  layer,
  matrix_set: matrixSet,
  maximum_level: maximumLevel,
  format: "image/png",
  legend_url: legendUrl,
  units,
  product,
  ...extra,
});

const LAYER_CAPABILITIES = Object.freeze({
  "global-temperature": {
    source_type: "csv_global_anomaly_plus_raster",
    visualization_type: "cesium_imagery_land_surface_temperature",
    spatial_data_available: true,
    time_series_available: true,
    cesium_renderer_available: true,
    checkbox_connected: true,
    legend_available: true,
    opacity_control_available: true,
    visualization: gibs("MODIS_Terra_Land_Surface_Temp_Day_TES", "GoogleMapsCompatible_Level7", 7, "https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg", "K", "MODIS/Terra MOD21 Land Surface Temperature (Day, TES)", { semantic_note: "The raster is land-surface temperature, not current 2 m weather temperature and not the GISTEMP global anomaly." }),
  },
  "sea-level": { source_type: "json_station_observation", visualization_type: "cesium_station", spatial_data_available: true, time_series_available: true, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true, visualization: { kind: "station", station_id: "1612340", station_name: "Honolulu", latitude: 21.3033, longitude: -157.8645, datum: "MSL", units: "m", product: "NOAA CO-OPS water level" } },
  precipitation: { source_type: "cmr_granule_plus_raster", visualization_type: "cesium_imagery", spatial_data_available: true, time_series_available: true, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true, visualization: gibs("IMERG_Precipitation_Rate_30min", "GoogleMapsCompatible_Level6", 6, "https://gibs.earthdata.nasa.gov/legends/GPM_Precipitation_Rate_H.svg", "mm/hr", "GPM IMERG V07 precipitation rate, 30-minute") },
  "tropical-cyclones": { source_type: "json_advisory_and_gis_links", visualization_type: "cesium_entities_and_kml", spatial_data_available: true, time_series_available: true, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true, visualization: { kind: "tropical_cyclones", product: "NOAA NHC current centers and advisory GIS products", units: "kt", uncertainty: "Forecast cone communicates probable center-track uncertainty; it is not a storm-size boundary." } },
  wildfire: { source_type: "csv_detection_snapshot", visualization_type: "cesium_detection_points", spatial_data_available: true, time_series_available: false, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true, visualization: { kind: "fire_detections", product: "NASA FIRMS VIIRS NOAA-20 NRT", units: "detections", credential_mode: "backend_secret_only" } },
  co2: { source_type: "csv_station_time_series", visualization_type: "cesium_station", spatial_data_available: true, time_series_available: true, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true, visualization: { kind: "station", station_id: "MLO", station_name: "Mauna Loa Observatory", latitude: 19.5362, longitude: -155.5763, altitude_m: 3397, units: "ppm", product: "NOAA GML monthly mean dry-air CO2" } },
  ndvi: { source_type: "cmr_granule_plus_raster", visualization_type: "cesium_imagery", spatial_data_available: true, time_series_available: true, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true, visualization: gibs("MODIS_Terra_L3_NDVI_16Day", "GoogleMapsCompatible_Level9", 9, "https://gibs.earthdata.nasa.gov/legends/MODIS_L3_NDVI_H.svg", "unitless NDVI", "MODIS/Terra MOD13Q1 NDVI 16-day composite", { composite_days: 16, quality_mask: "Provider-rendered fill, invalid, and unavailable pixels are transparent; no PCS interpolation is applied." }) },
  "sea-ice": { source_type: "csv_extent_plus_raster", visualization_type: "cesium_imagery", spatial_data_available: true, time_series_available: true, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true, visualization: gibs("GHRSST_L4_MUR_Sea_Ice_Concentration", "GoogleMapsCompatible_Level7", 7, "https://gibs.earthdata.nasa.gov/legends/GHRSST_Sea_Ice_Concentration_H.svg", "% concentration", "GHRSST MUR L4 global sea-ice concentration", { regions: ["Arctic", "Antarctic"], extent_boundary: "No separate boundary geometry is published by the selected GIBS layer; the 15% threshold is documented but not interpolated by PCS.", seasonal_comparison: "NSIDC Sea Ice Index v4 Northern Hemisphere extent metadata" }) },
  shipping: { source_type: "html_dataset_catalog", visualization_type: "metadata_only", spatial_data_available: false, time_series_available: true, unavailable_reason: "The connected source is a historical archive catalog, not a sustainable anonymous live vessel-position feed.", planned_adapter_interface: "Authenticated or licensed AIS position snapshots normalized to vessel id, latitude, longitude, course, speed, and observation time.", authentication_requirement: "No sustainable anonymous live AIS API is configured." },
  aviation: { source_type: "json_position_snapshot", visualization_type: "metadata_only", spatial_data_available: false, time_series_available: false, unavailable_reason: "The audited adapter exposes only aggregate provider status; raw aircraft positions are intentionally not forwarded to Cesium.", planned_adapter_interface: "Authenticated OpenSky state vectors normalized to ICAO24, latitude, longitude, altitude, velocity, and observation time.", authentication_requirement: "OpenSky authentication may be required for sustainable use; no position-rendering contract is configured." },
  "satellite-observations": { source_type: "omm_json_orbital_elements", visualization_type: "metadata_only", spatial_data_available: false, time_series_available: false, unavailable_reason: "Orbital positions require validated propagation from epoch-tagged GP/OMM elements; the configured upstream request also currently fails.", planned_adapter_interface: "Validated GP/OMM records propagated by an explicit orbit model with epoch and uncertainty metadata.", authentication_requirement: "The configured CelesTrak request currently returns HTTP 403." },
  clouds: { source_type: "raster_tile", visualization_type: "cesium_imagery", spatial_data_available: true, time_series_available: false, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true },
  rain: { source_type: "raster_tile", visualization_type: "cesium_imagery", spatial_data_available: true, time_series_available: false, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true },
  temperature: { source_type: "raster_tile", visualization_type: "cesium_imagery", spatial_data_available: true, time_series_available: false, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true },
  wind: { source_type: "raster_tile", visualization_type: "cesium_imagery", spatial_data_available: true, time_series_available: false, cesium_renderer_available: true, checkbox_connected: true, legend_available: true, opacity_control_available: true },
});

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
        uncertainty: "See GISTEMP v4 observational uncertainty ensemble", details: {
          baseline_period: "1951–1980",
          observation_period: `${values[0]}-${String(index).padStart(2, "0")}`,
          month: months[index - 1],
          value_semantics: "observed global monthly land-ocean surface temperature anomaly; positive means warmer than the baseline",
          map_semantics: "The companion Cesium raster is MODIS land-surface temperature and must not be interpreted as this global anomaly.",
        },
      };
    }
  }
  throw new Error("No current GISTEMP anomaly found");
}

function parseNoaaCo2(text) {
  const line = lastDataLine(text);
  const values = line?.trim().split(/\s+|,/).filter(Boolean) || [];
  const year = Number(values[0]), month = Number(values[1]);
  const monthlyMean = Number(values[3]);
  const standardDeviation = Number(values[6]);
  const uncertainty = Number(values[7]);
  if (!year || !month || !Number.isFinite(monthlyMean) || monthlyMean < 250 || monthlyMean > 600) throw new Error("NOAA CO2 monthly mean row unavailable");
  return {
    observation_time: isoDate(year, month), value: monthlyMean, unit: "ppm",
    data_state: "OBSERVED", quality_flag: "provider_published_monthly_mean_dry_air_mole_fraction",
    uncertainty: Number.isFinite(uncertainty) ? `NOAA reported monthly mean uncertainty: ${uncertainty} ppm` : null,
    details: {
      station: "Mauna Loa Observatory (MLO)", location: "Hawaii, United States", latitude: 19.5362, longitude: -155.5763,
      altitude_m: 3397, value_type: "station observation", standard_deviation_ppm: Number.isFinite(standardDeviation) ? standardDeviation : null,
      trend: "not_calculated_by_pcs", spatial_warning: "This station value is not a global CO2 surface.",
    },
  };
}

function parseNsidc(text) {
  const line = lastDataLine(text);
  const values = line?.split(",").map((value) => value.trim()) || [];
  if (values.length < 4) throw new Error("NSIDC extent row unavailable");
  return {
    observation_time: isoDate(values[0], values[1], values[2]), value: Number(values[3]), unit: "million km²",
    data_state: "OBSERVED", quality_flag: "provider_published_daily_extent",
    uncertainty: "Sea Ice Index uses passive-microwave concentration and a 15% ice-concentration threshold.",
    details: {
      region: "Northern Hemisphere (Arctic)", hemisphere: "north", definition: "extent, not area; full grid cells with at least 15% sea-ice concentration",
      seasonal_comparison: "Compare against the NSIDC Sea Ice Index v4 climatology; no comparison is calculated by PCS.",
      map_semantics: "The Cesium raster is global concentration for both Arctic and Antarctic; this number is Arctic extent metadata only.",
    },
  };
}

function normalizedStormClass(classification, id = "") {
  const code = String(classification || "").toUpperCase();
  const basin = String(id).slice(0, 2).toLowerCase();
  const regional = basin === "wp" ? "typhoon" : ["io", "sh"].includes(basin) ? "cyclone" : "hurricane";
  if (["TD", "SD"].includes(code)) return { code, normalized: "tropical_depression", regional_name: "tropical depression" };
  if (["TS", "SS"].includes(code)) return { code, normalized: "tropical_storm", regional_name: "tropical storm" };
  if (["HU", "TY", "TC", "ST"].includes(code)) return { code, normalized: regional, regional_name: regional };
  return { code: code || "UNKNOWN", normalized: "tropical_cyclone", regional_name: "tropical cyclone" };
}

function normalizeStorm(item) {
  const latitude = Number(item?.latitudeNumeric);
  const longitude = Number(item?.longitudeNumeric);
  return {
    id: item?.id || null, name: item?.name || "Unnamed", basin: String(item?.id || "").slice(0, 2).toUpperCase() || null,
    classification: normalizedStormClass(item?.classification, item?.id),
    intensity_kt: Number.isFinite(Number(item?.intensity)) ? Number(item.intensity) : null,
    pressure_hpa: Number.isFinite(Number(item?.pressure)) ? Number(item.pressure) : null,
    latitude: Number.isFinite(latitude) ? latitude : null, longitude: Number.isFinite(longitude) ? longitude : null,
    movement_degrees: Number.isFinite(Number(item?.movementDir)) ? Number(item.movementDir) : null,
    movement_kt: Number.isFinite(Number(item?.movementSpeed)) ? Number(item.movementSpeed) : null,
    advisory_time: item?.lastUpdate || item?.publicAdvisory?.issuance || null, advisory_number: item?.publicAdvisory?.advNum || null,
    source: "NOAA National Hurricane Center",
    uncertainty: "Forecast cone is a probable center-track region based on historical NHC forecast errors; hazards can occur outside it.",
    gis: {
      forecast_track: item?.forecastTrack?.kmzFile || null, forecast_cone: item?.trackCone?.kmzFile || null,
      observed_track: item?.bestTrackGIS?.kmzFile || null, initial_wind_radii: item?.initialWindExtent?.kmzFile || null,
      forecast_wind_radii: item?.forecastWindRadiiGIS?.kmzFile || null,
    },
  };
}

function parseFirms(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { observation_time: null, value: 0, unit: "VIIRS fire detections", data_state: "OBSERVED", quality_flag: "firms_nrt_no_detections", uncertainty: "No detections is not proof that no fires exist.", details: { detections: [], source_product: "VIIRS_NOAA20_NRT" } };
  const headers = lines[0].split(",").map((value) => value.trim());
  const index = Object.fromEntries(headers.map((name, position) => [name, position]));
  const detections = lines.slice(1, 5001).map((line) => {
    const values = line.split(",");
    const date = values[index.acq_date];
    const time = String(values[index.acq_time] || "").padStart(4, "0");
    const observationTime = date ? new Date(`${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`).toISOString() : null;
    return {
      latitude: Number(values[index.latitude]), longitude: Number(values[index.longitude]), observation_time: observationTime,
      satellite: values[index.satellite] || "NOAA-20", instrument: values[index.instrument] || "VIIRS",
      confidence: values[index.confidence] || null, status: values[index.type] || "active_fire_detection",
    };
  }).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  const observationTime = detections.map((item) => item.observation_time).filter(Boolean).sort().at(-1) || null;
  return {
    observation_time: observationTime, value: detections.length, unit: "VIIRS fire detections", data_state: "OBSERVED",
    quality_flag: lines.length - 1 > detections.length ? "firms_nrt_detection_points_capped_5000" : "firms_nrt_detection_points",
    uncertainty: "Each point is a satellite detection, not burned area or a unique fire event.",
    details: { detections, source_product: "VIIRS_NOAA20_NRT", returned_count: detections.length, source_row_count: lines.length - 1 },
  };
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
    return {
      observation_time: item.t ? new Date(`${item.t.replace(" ", "T")}Z`).toISOString() : null, value: Number(item.v), unit: "m relative to MSL",
      data_state: "OBSERVED", quality_flag: item.q === "v" ? "verified" : item.q === "p" ? "preliminary" : item.f || "provider_flag_not_supplied",
      uncertainty: Number.isFinite(Number(item.s)) ? `NOAA reported sigma: ${Number(item.s)} m` : null,
      details: {
        station: `${payload?.metadata?.name || "Honolulu"} ${payload?.metadata?.id || "1612340"}`, datum: "MSL", location: "Honolulu, Hawaii",
        latitude: Number(payload?.metadata?.lat) || 21.3033, longitude: Number(payload?.metadata?.lon) || -157.8645,
        value_type: "local tide-gauge water level", spatial_warning: "This local station value is not global sea level.", trend: "NOT_CALCULATED",
      },
    };
  }
  if (adapter.parser === "nhc") {
    const storms = payload?.activeStorms || payload?.storms || [];
    const normalizedStorms = storms.slice(0, 20).map(normalizeStorm);
    const latestAdvisory = normalizedStorms.map((item) => item.advisory_time).filter(Boolean).sort().at(-1) || payload?.lastUpdated || null;
    return {
      observation_time: latestAdvisory, value: normalizedStorms.length, unit: "active storms", data_state: "OBSERVED",
      quality_flag: normalizedStorms.every((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) ? "official_current_centers_and_gis_links" : "official_summary_missing_some_centers",
      uncertainty: "NHC forecast cone is a center-track uncertainty product; storm hazards can extend beyond the cone.",
      details: { storms: normalizedStorms, normalized_model: "basin-aware tropical_depression/tropical_storm/hurricane/typhoon/cyclone" },
    };
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
  if (adapter.parser === "openweather_tile") {
    if (!env?.OPENWEATHER_API_KEY) return normalized(adapter, {
      retrieved_at: retrievedAt, retrieval_status: "AUTH_REQUIRED", quality_flag: "missing_provider_credential",
      error: "OPENWEATHER_API_KEY is not configured",
    });
    const tileUrl = `https://tile.openweathermap.org/map/${adapter.openweather_product}/1/1/1.png?appid=${env.OPENWEATHER_API_KEY}`;
    try {
      const response = await fetcher(tileUrl, { cf: { cacheTtl: 0 } });
      if (!response.ok) return normalized(adapter, {
        retrieved_at: retrievedAt,
        retrieval_status: [401, 403].includes(response.status) ? "AUTH_REQUIRED" : "ERROR",
        quality_flag: `http_${response.status}`,
        error: `Provider returned HTTP ${response.status}`,
      });
      const contentType = response.headers.get("content-type") || "";
      const bytes = new Uint8Array(await response.arrayBuffer());
      const png = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      if (!contentType.startsWith("image/") || !png) return normalized(adapter, {
        retrieved_at: retrievedAt, retrieval_status: "ERROR", quality_flag: "invalid_tile_response",
        error: "Provider response was not a valid PNG weather tile",
      });
      const modified = response.headers.get("last-modified");
      return normalized(adapter, {
        observation_time: modified && Number.isFinite(new Date(modified).getTime()) ? new Date(modified).toISOString() : null,
        retrieved_at: retrievedAt, latency: null, retrieval_status: "LATEST", data_state: "OBSERVED",
        quality_flag: "provider_png_tile_validated", uncertainty: "Tile service does not publish per-pixel uncertainty",
        details: { upstream_product: adapter.openweather_product, sample_tile: "1/1/1" }, error: null,
      });
    } catch (error) {
      return normalized(adapter, {
        retrieved_at: retrievedAt, retrieval_status: "ERROR", quality_flag: "tile_network_error",
        error: error?.message || "Provider tile retrieval failed",
      });
    }
  }
  const endpoint = adapter.endpoint.replace("{FIRMS_MAP_KEY}", env?.FIRMS_MAP_KEY || "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetcher(endpoint, { headers: { "user-agent": "PCS-Observatory/2.0 public-research" }, signal: controller.signal, cf: { cacheTtl: 0 } });
    if (!response.ok) return normalized(adapter, { endpoint, retrieved_at: retrievedAt, retrieval_status: adapter.authOnDenied && (response.status === 401 || response.status === 403) ? "AUTH_REQUIRED" : "ERROR", quality_flag: `http_${response.status}`, error: `Provider returned HTTP ${response.status}` });
    const body = await response.text();
    let result;
    if (adapter.parser === "firms") result = parseFirms(body);
    else result = parsePayload(adapter, body, response.headers.get("content-type") || "");
    const latency = result.observation_time ? Math.max(0, Math.round((now - new Date(result.observation_time)) / 60000)) : null;
    return normalized(adapter, { endpoint, ...result, retrieved_at: retrievedAt, latency, retrieval_status: statusFor(adapter, result, latency), error: null });
  } catch (error) {
    return normalized(adapter, { endpoint, retrieved_at: retrievedAt, retrieval_status: error?.name === "AbortError" ? "DELAYED" : "ERROR", quality_flag: error?.name === "AbortError" ? "provider_timeout" : "parse_or_network_error", error: error?.message || "Provider retrieval failed" });
  } finally { clearTimeout(timer); }
}

function normalized(adapter, runtime) {
  const capability = LAYER_CAPABILITIES[adapter.id] || {};
  const rendererAvailable = capability.cesium_renderer_available === true;
  const retrievalStatus = runtime.retrieval_status || "UNAVAILABLE";
  const runtimeStatus = retrievalStatus === "AUTH_REQUIRED" ? "AUTH_REQUIRED"
    : retrievalStatus === "ERROR" ? "ERROR"
      : retrievalStatus === "DELAYED" ? "DELAYED"
        : retrievalStatus === "PARTIAL" ? "PARTIAL"
          : retrievalStatus === "UNAVAILABLE" ? "UNAVAILABLE"
            : rendererAvailable ? "AVAILABLE" : "METADATA_ONLY";
  const implementationReason = rendererAvailable
    ? null
    : capability.unavailable_reason || "No Cesium renderer is implemented for this dataset.";
  return {
    id: adapter.id, layer_id: adapter.id, provider: adapter.provider, dataset: adapter.dataset,
    endpoint: adapter.secret ? adapter.endpoint : runtime.endpoint || adapter.endpoint, observation_time: runtime.observation_time ?? null,
    retrieved_at: runtime.retrieved_at, latency: runtime.latency ?? null,
    spatial_resolution: adapter.spatial_resolution, temporal_resolution: adapter.temporal_resolution,
    quality_flag: runtime.quality_flag || "not_retrieved", uncertainty: runtime.uncertainty ?? null,
    license: adapter.license, retrieval_status: runtime.retrieval_status || "UNAVAILABLE",
    data_state: runtime.data_state || "UNAVAILABLE", value: runtime.value ?? null,
    unit: runtime.unit ?? null, details: runtime.details || {}, error: runtime.error || null,
    provider_adapter_available: true,
    source_type: capability.source_type || "provider_response",
    data_endpoint: adapter.endpoint,
    visualization_type: capability.visualization_type || "metadata_only",
    spatial_data_available: capability.spatial_data_available === true,
    time_series_available: capability.time_series_available === true,
    cesium_renderer_available: rendererAvailable,
    checkbox_connected: capability.checkbox_connected === true,
    legend_available: capability.legend_available === true,
    opacity_control_available: capability.opacity_control_available === true,
    visualization: capability.visualization || null,
    authentication_requirement: capability.authentication_requirement || (adapter.secret ? `${adapter.secret} must be configured as a backend secret; credentials are never sent to the frontend.` : "None"),
    planned_adapter_interface: capability.planned_adapter_interface || null,
    last_successful_request: runtime.last_successful_request || null,
    latest_observation_time: runtime.observation_time ?? null,
    latest_retrieval_time: runtime.retrieved_at,
    data_quality: runtime.quality_flag || "not_retrieved",
    runtime_status: runtimeStatus,
    failure_reason: runtime.error || (runtimeStatus === "PARTIAL" ? adapter.partial_reason : implementationReason),
  };
}

export async function retrieveAllLayers(env, fetcher = fetch, now = new Date()) {
  const layers = await Promise.all(PCS_LAYER_ADAPTERS.map((adapter) => retrieveLayer(adapter, env, fetcher, now)));
  return { generated_at: now.toISOString(), layers };
}
