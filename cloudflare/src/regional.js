const OPEN_METEO_WEATHER = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AIR = "https://air-quality-api.open-meteo.com/v1/air-quality";
const OPEN_METEO_MARINE = "https://marine-api.open-meteo.com/v1/marine";
const USGS_EVENTS = "https://earthquake.usgs.gov/fdsnws/event/1/query";

const WEATHER_VARIABLES = [
  ["temperature_2m", "Air temperature"], ["apparent_temperature", "Feels-like temperature"],
  ["relative_humidity_2m", "Humidity"], ["dew_point_2m", "Dew point"],
  ["surface_pressure", "Surface pressure"], ["wind_speed_10m", "Wind speed"],
  ["wind_direction_10m", "Wind direction"], ["wind_gusts_10m", "Wind gust"],
  ["precipitation", "Precipitation"], ["snowfall", "Snowfall"],
  ["cloud_cover", "Cloud cover"], ["visibility", "Visibility"], ["uv_index", "UV index"],
];
const AIR_VARIABLES = [["us_aqi", "AQI (US scale)"], ["pm2_5", "PM2.5"], ["ozone", "Ozone"]];

const port = (id, name, lat, lon, authority, stationId = null) => ({ id, name, lat, lon, authority, station_id: stationId });
const TAIWAN_PORTS = [
  port("keelung", "Keelung", 25.155, 121.75, "Taiwan CWA"),
  port("taipei-port", "Taipei Port", 25.154, 121.379, "Taiwan CWA"),
  port("taichung", "Taichung", 24.256, 120.514, "Taiwan CWA"),
  port("kaohsiung", "Kaohsiung", 22.616, 120.272, "Taiwan CWA"),
  port("hualien", "Hualien", 23.983, 121.633, "Taiwan CWA"),
];
const JAPAN_PORTS = [
  port("tokyo", "Tokyo", 35.65, 139.77, "Japan Meteorological Agency"),
  port("yokohama", "Yokohama", 35.45, 139.65, "Japan Meteorological Agency"),
  port("kobe", "Kobe", 34.68, 135.18, "Japan Meteorological Agency"),
  port("naha", "Naha", 26.21, 127.67, "Japan Meteorological Agency"),
];

const profile = (group, displayName, lat, lon, altitude, timeZone, bounds, features, stations = []) => ({
  group, display_name: displayName, lat, lon, altitude, time_zone: timeZone, bounds, features, stations,
});

export const REGIONAL_PROFILES = {
  global: profile("COUNTRY", "Global", 20, 120, 30000000, "UTC", null, ["global hazards", "seasonal overview"]),
  taiwan: profile("COUNTRY", "Taiwan", 23.6978, 120.9605, 2500000, "Asia/Taipei", [21.5, 119, 26.5, 123], ["earthquake", "typhoon", "tide", "heavy rain", "landslide", "heat", "air quality", "Lunar New Year", "Dragon Boat Festival", "Mid-Autumn Moon Observatory"], TAIWAN_PORTS),
  japan: profile("COUNTRY", "Japan", 36.2048, 138.2529, 6000000, "Asia/Tokyo", [24, 122, 46.5, 146], ["earthquake", "tsunami", "volcano", "heavy rain", "snow", "heat", "Mount Fuji Observatory", "Sakura Tracker", "autumn foliage", "New Year and first sunrise"], JAPAN_PORTS),
  korea: profile("COUNTRY", "Korea", 36.5, 127.8, 3500000, "Asia/Seoul", [33, 124, 39.5, 131], ["heavy rain", "snow", "heat", "air quality"]),
  canada: profile("COUNTRY", "Canada", 56.13, -106.35, 9000000, "America/Toronto", [41, -141, 84, -52], ["wildfire", "cold", "snow", "air quality"]),
  uk: profile("COUNTRY", "United Kingdom", 55.38, -3.44, 3500000, "Europe/London", [49, -9, 61, 2], ["wind", "heavy rain", "coastal hazards"]),
  usa: profile("COUNTRY", "United States", 37.09, -95.71, 8000000, "America/Chicago", [18, -125, 50, -66], ["earthquake", "hurricane", "tornado", "wildfire", "heat", "snow"], [port("honolulu", "Honolulu", 21.3067, -157.867, "NOAA CO-OPS", "1612340")]),
  china: profile("COUNTRY", "China", 35.86, 104.2, 8000000, "Asia/Shanghai", [18, 73, 54, 135], ["earthquake", "heat", "heavy rain", "air quality"]),
  singapore: profile("COUNTRY", "Singapore", 1.35, 103.82, 1500000, "Asia/Singapore", [1.1, 103.5, 1.6, 104.1], ["heat", "heavy rain", "air quality"]),
  dubai: profile("COUNTRY", "Dubai", 25.2, 55.27, 1800000, "Asia/Dubai", [24.5, 54.5, 26, 56], ["heat", "dust", "air quality"]),
  himalaya: profile("CRITICAL REGION", "Tibetan Plateau & Himalaya", 30.5, 84, 5000000, "Asia/Kathmandu", [25, 72, 38, 103], ["glacier", "snow", "earthquake", "landslide"]),
  iceland_glaciers: profile("CRITICAL REGION", "Iceland Glaciers", 64.8, -18.8, 2300000, "Atlantic/Reykjavik", [63, -25, 67.5, -12], ["glacier", "volcano", "earthquake"]),
  new_zealand_glaciers: profile("CRITICAL REGION", "New Zealand Glaciers", -43.5, 170.2, 2600000, "Pacific/Auckland", [-47.5, 165, -40, 175], ["glacier", "earthquake", "tsunami"]),
  alaska_glaciers: profile("CRITICAL REGION", "Alaska Glaciers", 61.2, -149.5, 4500000, "America/Anchorage", [51, -180, 72, -129], ["glacier", "earthquake", "tsunami"], [port("anchorage", "Anchorage", 61.237, -149.89, "NOAA CO-OPS", "9455920")]),
  drylands: profile("CRITICAL REGION", "Global Drylands & Desertification", 23, 15, 16000000, "UTC", [-45, -180, 55, 180], ["drought", "vegetation", "dust"]),
  amazon: profile("CRITICAL REGION", "Amazon Basin", -3.5, -62, 6500000, "America/Manaus", [-20, -80, 10, -45], ["heavy rain", "river", "wildfire", "vegetation"]),
  african_savanna: profile("CRITICAL REGION", "African Savanna", -2, 25, 9500000, "Africa/Nairobi", [-25, -20, 20, 55], ["drought", "vegetation", "wildfire"]),
  niagara: profile("CRITICAL REGION", "Niagara Falls", 43.08, -79.07, 500000, "America/Toronto", [42.8, -79.4, 43.3, -78.7], ["river flow", "ice", "weather"]),
  iguazu: profile("CRITICAL REGION", "Iguazu Falls", -25.69, -54.44, 500000, "America/Argentina/Cordoba", [-26, -54.8, -25.4, -54.1], ["river flow", "heavy rain", "weather"]),
  victoria_falls: profile("CRITICAL REGION", "Victoria Falls", -17.925, 25.856, 500000, "Africa/Harare", [-18.2, 25.5, -17.6, 26.2], ["river flow", "drought", "weather"]),
  new_year: profile("SEASONAL & CIVILIZATION", "Global New Year Observatory", 20, 0, 30000000, "UTC", null, ["local countdown", "weather", "air quality", "public event status", "aggregate crowd information"]),
  taiwan_festivals: profile("SEASONAL & CIVILIZATION", "Taiwan Seasonal Observatory", 23.7, 121, 2500000, "Asia/Taipei", [21.5, 119, 26.5, 123], ["Lunar New Year", "Dragon Boat Festival", "Mid-Autumn Moon Observatory"]),
  japan_seasons: profile("SEASONAL & CIVILIZATION", "Japan Seasonal Observatory", 36.2, 138.3, 6000000, "Asia/Tokyo", [24, 122, 46.5, 146], ["Sakura Tracker", "autumn foliage", "New Year and first sunrise"]),
};
REGIONAL_PROFILES.taiwan.observation_point = { name: "Taipei regional reference", lat: 25.0375, lon: 121.5637 };
REGIONAL_PROFILES.japan.observation_point = { name: "Tokyo regional reference", lat: 35.6762, lon: 139.6503 };
REGIONAL_PROFILES.taiwan_festivals.observation_point = REGIONAL_PROFILES.taiwan.observation_point;
REGIONAL_PROFILES.japan_seasons.observation_point = REGIONAL_PROFILES.japan.observation_point;

const NEW_YEAR_CITIES = [
  ["Auckland", -36.85, 174.76, "Pacific/Auckland"], ["Tokyo", 35.68, 139.76, "Asia/Tokyo"],
  ["Taipei", 25.03, 121.56, "Asia/Taipei"], ["Sydney", -33.87, 151.21, "Australia/Sydney"],
  ["Dubai", 25.2, 55.27, "Asia/Dubai"], ["London", 51.51, -0.13, "Europe/London"],
  ["New York", 40.71, -74.01, "America/New_York"], ["Honolulu", 21.31, -157.86, "Pacific/Honolulu"],
];

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", "access-control-allow-origin": "*" } });
const valueRecord = (key, label, source, dataClass, value, unit, validTime, retrievedAt, quality = "MODEL_OUTPUT", uncertainty = "Provider does not publish point uncertainty") => ({ key, label, provider: source, data_class: dataClass, value: value ?? null, unit: unit || "unknown", valid_time: validTime || null, retrieval_time: retrievedAt, status: value === null || value === undefined ? "UNAVAILABLE" : "AVAILABLE", quality, uncertainty });

async function upstreamJson(url, fetcher) {
  const response = await fetcher(url, { headers: { "user-agent": "PCS-Observatory/2.0 public scientific dashboard" }, cf: { cacheTtl: 300, cacheEverything: true } });
  if (!response.ok) throw new Error(`Upstream ${response.status}`);
  return response.json();
}

function nearestIndex(times, now = Date.now()) {
  if (!Array.isArray(times) || !times.length) return -1;
  let best = 0; let delta = Infinity;
  times.forEach((time, index) => { const d = Math.abs(new Date(time).getTime() - now); if (d < delta) { delta = d; best = index; } });
  return best;
}

async function loadWeather(profileData, fetcher, retrievedAt) {
  const observationPoint = profileData.observation_point || { name: `${profileData.display_name} profile center`, lat: profileData.lat, lon: profileData.lon };
  const variables = WEATHER_VARIABLES.map(([key]) => key).join(",");
  const weatherUrl = `${OPEN_METEO_WEATHER}?latitude=${observationPoint.lat}&longitude=${observationPoint.lon}&current=${variables}&hourly=${variables}&forecast_hours=24&timezone=auto`;
  const airVars = AIR_VARIABLES.map(([key]) => key).join(",");
  const airUrl = `${OPEN_METEO_AIR}?latitude=${observationPoint.lat}&longitude=${observationPoint.lon}&current=${airVars}&hourly=${airVars}&forecast_hours=24&timezone=auto`;
  const [weatherResult, airResult] = await Promise.allSettled([upstreamJson(weatherUrl, fetcher), upstreamJson(airUrl, fetcher)]);
  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
  const air = airResult.status === "fulfilled" ? airResult.value : null;
  const forecast = [];
  for (const [key, label] of WEATHER_VARIABLES) {
    const unit = key === "uv_index" ? "index" : weather?.current_units?.[key];
    forecast.push(valueRecord(key, label, "Open-Meteo multi-model forecast", "FORECAST", weather?.current?.[key], unit, weather?.current?.time, retrievedAt));
  }
  for (const [key, label] of AIR_VARIABLES) forecast.push(valueRecord(key, label, "CAMS via Open-Meteo", "FORECAST", air?.current?.[key], air?.current_units?.[key], air?.current?.time, retrievedAt, "MODEL_OUTPUT", "CAMS grid resolution and model uncertainty apply"));
  forecast.push(valueRecord("wbgt", "WBGT / heat stress", "No validated adapter", "FORECAST", null, "°C", null, retrievedAt, "NOT_ASSESSED", "Not calculated from incomplete inputs"));
  forecast.push(valueRecord("lightning", "Lightning", "No sustainable public adapter", "OBSERVED", null, "events", null, retrievedAt, "NOT_ASSESSED", "No positions are inferred"));
  return { observed: [], forecast, observation_point: observationPoint, source_status: { weather: weather ? "AVAILABLE" : "UNAVAILABLE", air_quality: air ? "AVAILABLE" : "UNAVAILABLE" }, model_timezone: weather?.timezone || profileData.time_zone };
}

async function loadEarthquakes(profileData, fetcher, retrievedAt) {
  let endpoint;
  if (profileData.bounds) {
    const [minlatitude, minlongitude, maxlatitude, maxlongitude] = profileData.bounds;
    const start = new Date(Date.now() - 7 * 86400000).toISOString();
    endpoint = `${USGS_EVENTS}?format=geojson&eventtype=earthquake&orderby=time&limit=50&minmagnitude=2.5&starttime=${encodeURIComponent(start)}&minlatitude=${minlatitude}&maxlatitude=${maxlatitude}&minlongitude=${minlongitude}&maxlongitude=${maxlongitude}`;
  } else endpoint = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";
  try {
    const data = await upstreamJson(endpoint, fetcher);
    const events = (data.features || []).map((feature) => ({
      id: feature.id, longitude: feature.geometry?.coordinates?.[0], latitude: feature.geometry?.coordinates?.[1], depth_km: feature.geometry?.coordinates?.[2],
      magnitude: feature.properties?.mag, time: feature.properties?.time ? new Date(feature.properties.time).toISOString() : null,
      updated_time: feature.properties?.updated ? new Date(feature.properties.updated).toISOString() : null, place: feature.properties?.place || "Location unavailable",
      intensity_cdi: feature.properties?.cdi ?? null, intensity_mmi: feature.properties?.mmi ?? null, reviewed_status: feature.properties?.status || "unknown",
      tsunami_flag: feature.properties?.tsunami === 1, tectonic_context: feature.properties?.place || null, source: "USGS Earthquake Hazards Program", detail_url: feature.properties?.url || null,
      cluster_label: null,
    })).filter((event) => Number.isFinite(event.longitude) && Number.isFinite(event.latitude));
    return { status: "AVAILABLE", retrieved_at: retrievedAt, source: "USGS FDSN Event Web Service / GeoJSON", events, note: "PCS does not infer foreshock, mainshock, or aftershock clusters from proximity." };
  } catch (error) { return { status: "UNAVAILABLE", retrieved_at: retrievedAt, source: "USGS FDSN Event Web Service", events: [], error: error.message }; }
}

function tideExtrema(times, values, startIndex) {
  const extrema = [];
  for (let i = Math.max(1, startIndex); i < values.length - 1 && extrema.length < 4; i += 1) {
    if (![values[i - 1], values[i], values[i + 1]].every(Number.isFinite)) continue;
    const type = values[i] > values[i - 1] && values[i] > values[i + 1] ? "HIGH" : values[i] < values[i - 1] && values[i] < values[i + 1] ? "LOW" : null;
    if (type) extrema.push({ type, time: times[i], value: values[i], unit: "m" });
  }
  return extrema;
}

async function loadNoaaCoops(station, fetcher, retrievedAt) {
  if (!station.station_id || station.authority !== "NOAA CO-OPS") return null;
  const base = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
  const common = `station=${station.station_id}&datum=MSL&units=metric&time_zone=gmt&format=json&application=PCS_Observatory`;
  try {
    const [water, predictions, extrema] = await Promise.all([
      upstreamJson(`${base}?date=latest&product=water_level&${common}`, fetcher),
      upstreamJson(`${base}?date=today&product=predictions&interval=6&${common}`, fetcher),
      upstreamJson(`${base}?date=today&product=predictions&interval=hilo&${common}`, fetcher),
    ]);
    const observation = water.data?.at(-1); const observedTime = observation?.t ? `${observation.t.replace(" ", "T")}:00Z` : null;
    const predictionRows = predictions.predictions || []; const observedMs = observedTime ? new Date(observedTime).getTime() : NaN;
    const nearest = predictionRows.reduce((best, row) => {
      const rowTime = new Date(`${row.t.replace(" ", "T")}:00Z`).getTime();
      return !best || Math.abs(rowTime - observedMs) < best.delta ? { row, delta: Math.abs(rowTime - observedMs) } : best;
    }, null)?.row;
    const observedValue = Number(observation?.v); const predictedValue = Number(nearest?.v);
    return {
      observed_water_level: { data_class: "OBSERVED_WATER_LEVEL", status: Number.isFinite(observedValue) ? "AVAILABLE" : "UNAVAILABLE", provider: "NOAA CO-OPS", value: Number.isFinite(observedValue) ? observedValue : null, unit: "m", datum: "MSL", observation_time: observedTime, retrieval_time: retrievedAt, quality: observation?.q || "preliminary/verified flag not supplied" },
      predicted_tide: { data_class: "PREDICTED_TIDE", status: Number.isFinite(predictedValue) ? "AVAILABLE" : "UNAVAILABLE", provider: "NOAA CO-OPS", value: Number.isFinite(predictedValue) ? predictedValue : null, unit: "m", datum: "MSL", prediction_time: nearest?.t ? `${nearest.t.replace(" ", "T")}:00Z` : null, next_high_low: (extrema.predictions || []).map((row) => ({ type: row.type === "H" ? "HIGH" : "LOW", time: `${row.t.replace(" ", "T")}:00Z`, value: Number(row.v), unit: "m" })) },
      storm_surge_residual: { data_class: "STORM_SURGE_RESIDUAL", status: Number.isFinite(observedValue) && Number.isFinite(predictedValue) ? "CALCULATED" : "UNAVAILABLE", value: Number.isFinite(observedValue) && Number.isFinite(predictedValue) ? Number((observedValue - predictedValue).toFixed(3)) : null, unit: "m", datum: "MSL", calculation: "observed water level minus nearest 6-minute astronomical prediction", uncertainty: "Includes measurement, datum, and time-alignment uncertainty; it is not by itself an official storm-surge classification." },
    };
  } catch (error) { return { error: error.message }; }
}

async function loadMarine(profileData, fetcher, retrievedAt) {
  if (!profileData.stations.length) return { status: "UNAVAILABLE", stations: [], reason: "No coastal station profile is configured for this region." };
  const lats = profileData.stations.map((s) => s.lat).join(","); const lons = profileData.stations.map((s) => s.lon).join(",");
  const url = `${OPEN_METEO_MARINE}?latitude=${lats}&longitude=${lons}&hourly=wave_height,sea_surface_temperature,sea_level_height_msl&forecast_hours=72&past_hours=6&timezone=GMT&cell_selection=sea`;
  let datasets;
  try { const payload = await upstreamJson(url, fetcher); datasets = Array.isArray(payload) ? payload : [payload]; }
  catch (error) { return { status: "UNAVAILABLE", stations: profileData.stations.map((s) => ({ ...s, status: "UNAVAILABLE" })), reason: error.message }; }
  const noaaResults = await Promise.all(profileData.stations.map((station) => loadNoaaCoops(station, fetcher, retrievedAt)));
  const stations = profileData.stations.map((station, index) => {
    const data = datasets[index] || {}; const times = data.hourly?.time || []; const i = nearestIndex(times); const sea = data.hourly?.sea_level_height_msl || [];
    const observedConfigured = station.station_id && station.authority === "NOAA CO-OPS";
    const noaa = noaaResults[index];
    return {
      ...station, status: i >= 0 ? "AVAILABLE" : "UNAVAILABLE", observation_time: times[i] || null, retrieval_time: retrievedAt,
      modelled_sea_level: valueRecord("sea_level_height_msl", "Modelled sea-level height", "Météo-France SMOC via Open-Meteo Marine", "FORECAST", sea[i], data.hourly_units?.sea_level_height_msl || "m", times[i], retrievedAt, "MODEL_OUTPUT_LIMITED_COASTAL_ACCURACY", "Not suitable for coastal navigation; datum is global mean sea level"),
      wave_height: valueRecord("wave_height", "Significant wave height", "Open-Meteo Marine model blend", "FORECAST", data.hourly?.wave_height?.[i], data.hourly_units?.wave_height || "m", times[i], retrievedAt),
      sea_surface_temperature: valueRecord("sea_surface_temperature", "Sea-surface temperature", "Météo-France via Open-Meteo Marine", "FORECAST", data.hourly?.sea_surface_temperature?.[i], data.hourly_units?.sea_surface_temperature || "°C", times[i], retrievedAt),
      next_model_extrema: tideExtrema(times, sea, Math.max(0, i)),
      predicted_tide: noaa?.predicted_tide || { data_class: "PREDICTED_TIDE", status: observedConfigured ? "UNAVAILABLE" : "UNAVAILABLE", provider: station.authority, datum: null },
      observed_water_level: noaa?.observed_water_level || { data_class: "OBSERVED_WATER_LEVEL", status: station.authority === "Taiwan CWA" ? "AUTH_REQUIRED" : "UNAVAILABLE", provider: station.authority, datum: null },
      storm_surge_residual: noaa?.storm_surge_residual || { data_class: "STORM_SURGE_RESIDUAL", status: "UNAVAILABLE", reason: "PCS does not subtract model fields without a time-aligned observed water level and common datum." },
      tsunami_alert: { status: "UNAVAILABLE", provider: "Regional official warning authority", reason: "No validated global alert adapter is configured for this station." },
    };
  });
  return { status: "AVAILABLE", source: "Open-Meteo Marine model blend", stations, navigation_warning: "Model sea-level forecasts have limited coastal accuracy and are not suitable for navigation." };
}

function seasonalStatus(profileId, now = new Date()) {
  const month = now.getUTCMonth() + 1;
  const items = [];
  if (["taiwan", "taiwan_festivals"].includes(profileId)) items.push(
    { name: "Lunar New Year", status: "OUT_OF_SEASON", data_status: "CALENDAR_METADATA" },
    { name: "Dragon Boat Festival", status: "OUT_OF_SEASON", data_status: "CALENDAR_METADATA" },
    { name: "Mid-Autumn Moon Observatory", status: month >= 9 && month <= 10 ? "SEASONAL_WINDOW" : "OUT_OF_SEASON", data_status: "CALENDAR_METADATA" },
  );
  if (["japan", "japan_seasons"].includes(profileId)) items.push(
    { name: "Sakura Tracker", status: month >= 3 && month <= 5 ? "SEASONAL_WINDOW_NO_LIVE_TRACKER" : "OUT_OF_SEASON", data_status: "UNAVAILABLE" },
    { name: "Autumn foliage", status: month >= 9 && month <= 12 ? "SEASONAL_WINDOW_NO_LIVE_TRACKER" : "OUT_OF_SEASON", data_status: "UNAVAILABLE" },
    { name: "New Year / first sunrise", status: month === 12 || month === 1 ? "SEASONAL_WINDOW" : "OUT_OF_SEASON", data_status: "CALENDAR_METADATA" },
  );
  return items;
}

export async function loadRegionalObservation(profileId, fetcher = fetch, now = new Date()) {
  const selected = REGIONAL_PROFILES[profileId];
  if (!selected) return { error: "Unknown regional profile", valid_profiles: Object.keys(REGIONAL_PROFILES) };
  const retrievedAt = now.toISOString();
  const [weather, earthquakes, coastal] = await Promise.all([loadWeather(selected, fetcher, retrievedAt), loadEarthquakes(selected, fetcher, retrievedAt), loadMarine(selected, fetcher, retrievedAt)]);
  const featureStatus = selected.features.map((name) => {
    const normalized = name.toLowerCase();
    if (normalized.includes("earthquake")) return { name, status: earthquakes.status, provider: earthquakes.source };
    if (["air quality", "heat", "heavy rain", "snow", "wind", "cold", "dust", "weather"].some((term) => normalized.includes(term))) return { name, status: weather.forecast.some((item) => item.status === "AVAILABLE") ? "FORECAST_AVAILABLE" : "UNAVAILABLE", provider: "Open-Meteo / CAMS" };
    if (["tide", "coastal"].some((term) => normalized.includes(term))) return { name, status: coastal.status, provider: coastal.source || "Regional station authority" };
    if (["typhoon", "hurricane", "cyclone"].some((term) => normalized.includes(term))) return { name, status: "AVAILABLE_WHERE_NHC_PUBLISHES", provider: "NOAA NHC" };
    return { name, status: "UNAVAILABLE", reason: "No current validated adapter is configured" };
  });
  return {
    api_version: "6.3", profile_id: profileId, profile: selected, retrieved_at: retrievedAt, weather, earthquakes, coastal,
    tropical_cyclones: { status: "AVAILABLE_WHERE_NHC_PUBLISHES", source: "NOAA NHC CurrentStorms + advisory GIS", normalized_model: "tropical_depression/tropical_storm/hurricane/typhoon/cyclone", geometry: ["current center", "observed path where published", "forecast path", "forecast cone", "wind radii"], pressure: "PROVIDER_FIELD_WHERE_PUBLISHED", maximum_sustained_wind: "PROVIDER_FIELD_WHERE_PUBLISHED", movement: "PROVIDER_FIELD_WHERE_PUBLISHED", expected_rainfall: "UNAVAILABLE", coastal_tide_interaction: "UNAVAILABLE_WITHOUT_TIME_ALIGNED_FORECAST_AND_GAUGE_DATUM", note: "Western North Pacific, Indian Ocean, and South Pacific remain UNAVAILABLE when no official GIS adapter publishes an active advisory." },
    seasonal: seasonalStatus(profileId, now), features: featureStatus, new_year_cities: profileId === "new_year" ? newYearCities(now) : [],
    alerts: { tsunami: { status: "UNAVAILABLE", reason: "No validated regional official alert response was loaded; earthquake tsunami flags are link indicators, not warnings." }, lightning: { status: "UNAVAILABLE", reason: "No sustainable public lightning source configured." } },
    sources: ["Open-Meteo multi-model weather", "CAMS via Open-Meteo Air Quality", "USGS FDSN Event Web Service", ...(selected.stations.length ? ["Open-Meteo Marine"] : []), "NOAA NHC (existing cyclone layer)"],
  };
}

export function newYearCities(now = new Date()) {
  return NEW_YEAR_CITIES.map(([name, lat, lon, time_zone]) => {
    const year = Number(new Intl.DateTimeFormat("en", { timeZone: time_zone, year: "numeric" }).format(now));
    const target = new Date(`${year + 1}-01-01T00:00:00Z`);
    const offsetName = new Intl.DateTimeFormat("en", { timeZone: time_zone, timeZoneName: "longOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value || "GMT";
    const match = offsetName.match(/GMT([+-])(\d{2}):(\d{2})/); const offset = match ? (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
    target.setUTCMinutes(target.getUTCMinutes() - offset);
    return { name, lat, lon, time_zone, local_time: new Intl.DateTimeFormat("en", { timeZone: time_zone, dateStyle: "medium", timeStyle: "medium" }).format(now), countdown_seconds: Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000)), public_event_status: "UNAVAILABLE", aggregate_crowd_status: "UNAVAILABLE" };
  });
}

export async function handleRegionalRequest(request, fetcher = fetch) {
  const url = new URL(request.url);
  if (url.pathname === "/api/regional") return json({ profiles: REGIONAL_PROFILES, profile_count: Object.keys(REGIONAL_PROFILES).length, new_year_cities: newYearCities(), data_state: "METADATA" });
  if (url.pathname === "/api/regional/profiles") return json({ profiles: REGIONAL_PROFILES, new_year_cities: newYearCities() });
  if (url.pathname === "/api/regional/observation") {
    const region = url.searchParams.get("region") || "global";
    const payload = await loadRegionalObservation(region, fetcher);
    return json(payload, payload.error ? 400 : 200);
  }
  return null;
}
