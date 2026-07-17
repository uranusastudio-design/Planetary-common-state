const LICENSES = Object.freeze({
  publicDomain: "Public domain / provider terms",
  copernicus: "Copernicus Data Space Ecosystem terms",
  openData: "Provider open-data license",
  osm: "ODbL 1.0",
});

function adapter(config) {
  return Object.freeze({
    endpoint: config.endpoint,
    method: config.method || "GET",
    headers: config.headers || {},
    timeoutMs: config.timeoutMs || 8000,
    ...config,
  });
}

// Every entry is an independently addressable provider adapter. UI code only
// consumes the normalized contract returned by probeAdapter, so replacing a
// provider never requires a component change.
export const PROVIDER_ADAPTERS = Object.freeze([
  adapter({ id: "noaa-nws-alerts", domain: "atmosphere", provider: "NOAA", dataset: "NWS Active Alerts", endpoint: "https://api.weather.gov/alerts/active", license: LICENSES.publicDomain }),
  adapter({ id: "open-meteo-forecast", domain: "atmosphere", provider: "Open-Meteo", dataset: "Global Forecast", endpoint: "https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0&current=temperature_2m", license: "CC BY 4.0" }),
  adapter({ id: "openweather-maps", domain: "atmosphere", provider: "OpenWeather", dataset: "Weather Maps 1.0", internal: "openweather", endpoint: "/health/openweather", license: "OpenWeather API terms" }),
  adapter({ id: "noaa-oisst", domain: "ocean", provider: "NOAA", dataset: "OISST v2.1", endpoint: "https://coastwatch.pfeg.noaa.gov/erddap/info/ncdcOisst21Agg_LonPM180/index.json", license: LICENSES.publicDomain }),
  adapter({ id: "copernicus-marine", domain: "ocean", provider: "Copernicus Marine", dataset: "Marine Data Store Catalogue", endpoint: "https://stac.marine.copernicus.eu/metadata/catalog.stac.json", license: LICENSES.copernicus }),
  adapter({ id: "nsidc-sea-ice", domain: "cryosphere", provider: "NSIDC", dataset: "Sea Ice Index", endpoint: "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv", license: LICENSES.publicDomain }),
  adapter({ id: "nasa-gibs", domain: "cryosphere", provider: "NASA GIBS", dataset: "Global Imagery Browse Services", endpoint: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml", license: LICENSES.publicDomain }),
  adapter({ id: "modis-ndvi", domain: "biosphere", provider: "NASA MODIS", dataset: "MOD13 NDVI", endpoint: "https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MOD13A2&page_size=1", license: LICENSES.publicDomain }),
  adapter({ id: "copernicus-land", domain: "biosphere", provider: "Copernicus Land", dataset: "Global Land Service", endpoint: "https://land.copernicus.eu/en/products", license: LICENSES.copernicus }),
  adapter({ id: "nasa-smap", domain: "hydrology", provider: "NASA SMAP", dataset: "SPL4SMGP v008", endpoint: "https://cmr.earthdata.nasa.gov/search/collections.json?short_name=SPL4SMGP&version=008&page_size=1", license: LICENSES.publicDomain }),
  adapter({ id: "glofas", domain: "hydrology", provider: "Copernicus GloFAS", dataset: "Global Flood Awareness System", endpoint: "https://global-flood.emergency.copernicus.eu/", license: LICENSES.copernicus }),
  adapter({ id: "usgs-earthquakes", domain: "geosphere", provider: "USGS", dataset: "Earthquake Hazards GeoJSON", endpoint: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson", license: LICENSES.publicDomain }),
  adapter({ id: "smithsonian-volcano", domain: "geosphere", provider: "Smithsonian GVP", dataset: "Weekly Volcanic Activity Report", endpoint: "https://volcano.si.edu/reports_weekly.cfm", license: "Smithsonian terms" }),
  adapter({ id: "world-bank", domain: "human_system", provider: "World Bank", dataset: "World Development Indicators", endpoint: "https://api.worldbank.org/v2/indicator/SP.POP.TOTL?format=json&per_page=1", license: "CC BY 4.0" }),
  adapter({ id: "worldpop", domain: "human_system", provider: "WorldPop", dataset: "Population Data Catalogue", endpoint: "https://hub.worldpop.org/rest/data/", license: "WorldPop data license" }),
  adapter({ id: "owid", domain: "human_system", provider: "Our World in Data", dataset: "Energy Data", endpoint: "https://ourworldindata.org/grapher/energy-data.csv", license: "CC BY 4.0" }),
  adapter({ id: "ember", domain: "energy", provider: "Ember", dataset: "Global Electricity Data Explorer", endpoint: "https://api.ember-energy.org/", license: "CC BY 4.0" }),
  adapter({ id: "eia-open-data", domain: "energy", provider: "U.S. EIA", dataset: "Open Data API", endpoint: "https://api.eia.gov/v2/", license: LICENSES.publicDomain }),
  adapter({ id: "fao", domain: "food", provider: "FAO", dataset: "FAOSTAT", endpoint: "https://bulks-faostat.fao.org/production/", license: "FAO data license" }),
  adapter({ id: "crop-monitor", domain: "food", provider: "GEOGLAM Crop Monitor", dataset: "Crop Monitor for Early Warning", endpoint: "https://cropmonitor.org/", license: "Provider terms" }),
  adapter({ id: "openstreetmap", domain: "infrastructure", provider: "OpenStreetMap", dataset: "Overpass API", endpoint: "https://overpass-api.de/api/status", license: LICENSES.osm }),
  adapter({ id: "gdacs", domain: "infrastructure", provider: "GDACS", dataset: "Public Disaster Infrastructure Alerts", endpoint: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH", license: "European Commission reuse policy" }),
  adapter({ id: "noaa-swpc", domain: "space_environment", provider: "NOAA SWPC", dataset: "Planetary K-index", endpoint: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json", license: LICENSES.publicDomain }),
  adapter({ id: "pcs-state", domain: "planetary_common_state", provider: "PCS", dataset: "Planetary Common State observations", internal: "pcs", endpoint: "/latest", license: "PCS source dataset licenses" }),
]);

function headerTimestamp(response) {
  const raw = response.headers.get("last-modified");
  if (!raw) return null;
  const timestamp = new Date(raw);
  return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : null;
}

function latency(timestamp, now) {
  if (!timestamp) return null;
  return Math.max(0, Math.round((now.getTime() - new Date(timestamp).getTime()) / 60000));
}

export async function probeAdapter(providerAdapter, env, fetcher = fetch, now = new Date()) {
  if (providerAdapter.internal === "openweather") {
    if (!env.OPENWEATHER_API_KEY) return normalized(providerAdapter, {
      status: "unavailable", validation_status: "missing_api_key", retrieval_status: "failed", checked_at: now.toISOString(),
    });
    try {
      const response = await fetcher(`https://tile.openweathermap.org/map/temp_new/1/1/1.png?appid=${env.OPENWEATHER_API_KEY}`, { cf: { cacheTtl: 0 } });
      return normalized(providerAdapter, {
        status: response.ok ? "live" : response.status === 429 ? "delayed" : "unavailable",
        validation_status: response.ok ? "temperature_tile_validated" : `http_${response.status}`,
        quality_flag: response.ok ? "provider_response_valid" : "provider_response_error",
        retrieval_status: response.ok ? "success" : "failed", http_status: response.status,
        checked_at: now.toISOString(),
      });
    } catch {
      return normalized(providerAdapter, { status: "unavailable", validation_status: "network_error", retrieval_status: "failed", checked_at: now.toISOString() });
    }
  }
  if (providerAdapter.internal === "pcs") {
    return normalized(providerAdapter, {
      status: env.PCS_DB ? "connected" : "unavailable",
      validation_status: env.PCS_DB ? "binding_available" : "missing_binding",
      retrieval_status: env.PCS_DB ? "ready" : "failed",
      checked_at: now.toISOString(),
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), providerAdapter.timeoutMs);
  try {
    const response = await fetcher(providerAdapter.endpoint, {
      method: providerAdapter.method,
      headers: { "user-agent": "PCS-Observatory/1.0", ...providerAdapter.headers },
      signal: controller.signal,
      cf: { cacheTtl: 0 },
    });
    const timestamp = headerTimestamp(response);
    return normalized(providerAdapter, {
      status: response.ok ? "live" : response.status === 429 ? "delayed" : "unavailable",
      validation_status: response.ok ? "http_validated" : `http_${response.status}`,
      quality_flag: response.ok ? "provider_response_valid" : "provider_response_error",
      availability: response.ok ? "available" : "unavailable",
      retrieval_status: response.ok ? "success" : "failed",
      timestamp,
      latency: latency(timestamp, now),
      checked_at: now.toISOString(),
      http_status: response.status,
    });
  } catch (error) {
    return normalized(providerAdapter, {
      status: error?.name === "AbortError" ? "delayed" : "unavailable",
      validation_status: error?.name === "AbortError" ? "timeout" : "network_error",
      quality_flag: "not_retrieved",
      availability: "unavailable",
      retrieval_status: "failed",
      checked_at: now.toISOString(),
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalized(providerAdapter, runtime) {
  return {
    id: providerAdapter.id,
    domain: providerAdapter.domain,
    provider: providerAdapter.provider,
    dataset: providerAdapter.dataset,
    endpoint: providerAdapter.endpoint,
    timestamp: runtime.timestamp ?? null,
    latency: runtime.latency ?? null,
    quality_flag: runtime.quality_flag ?? "metadata_only",
    uncertainty: null,
    license: providerAdapter.license,
    spatial_resolution: null,
    temporal_resolution: null,
    availability: runtime.availability ?? (runtime.status === "unavailable" ? "unavailable" : "available"),
    ...runtime,
  };
}

export async function domainReadiness(env, fetcher = fetch, now = new Date()) {
  const results = await Promise.all(PROVIDER_ADAPTERS.map((item) => probeAdapter(item, env, fetcher, now)));
  const domains = {};
  for (const item of results) {
    const group = domains[item.domain] ||= { id: item.domain, connected: 0, total: 0, datasets: [] };
    group.total += 1;
    if (["connected", "live", "delayed", "partial"].includes(item.status)) group.connected += 1;
    group.datasets.push(item);
  }
  return { generated_at: now.toISOString(), domains: Object.values(domains), datasets: results };
}
