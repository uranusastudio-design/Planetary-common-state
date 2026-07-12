import { EarthdataClientError, fetchEarthdata } from "./client";
import type {
  EarthdataDatasetConfig,
  EarthdataErrorResponse,
  NasaDatasetKey,
  NasaDatasetName,
  NasaRouteEnv
} from "./types";

const EARTHDATA_COLLECTIONS_URL = "https://cmr.earthdata.nasa.gov/search/collections.json";
const PROVIDER = "NASA Earthdata";
const DATASETS: Record<NasaDatasetKey, EarthdataDatasetConfig> = {
  gibs: {
    key: "gibs",
    dataset: "GIBS",
    description: "NASA Global Imagery Browse Services Earth observation layers",
    cacheTtlSeconds: 60 * 60,
    defaultParams: { keyword: "GIBS", page_size: "10" }
  },
  modis: {
    key: "modis",
    dataset: "MODIS",
    description: "Moderate Resolution Imaging Spectroradiometer datasets",
    cacheTtlSeconds: 6 * 60 * 60,
    defaultParams: { instrument: "MODIS", page_size: "10" }
  },
  viirs: {
    key: "viirs",
    dataset: "VIIRS",
    description: "Visible Infrared Imaging Radiometer Suite datasets",
    cacheTtlSeconds: 6 * 60 * 60,
    defaultParams: { instrument: "VIIRS", page_size: "10" }
  },
  firms: {
    key: "firms",
    dataset: "FIRMS",
    description: "NASA Fire Information for Resource Management System datasets",
    cacheTtlSeconds: 30 * 60,
    defaultParams: { keyword: "FIRMS fire", page_size: "10" }
  },
  smap: {
    key: "smap",
    dataset: "SMAP",
    description: "Soil Moisture Active Passive mission datasets",
    cacheTtlSeconds: 12 * 60 * 60,
    defaultParams: { instrument: "SMAP", page_size: "10" }
  }
};

const ALLOWED_QUERY_PARAMS = new Set([
  "bounding_box",
  "concept_id",
  "data_center",
  "entry_title",
  "instrument",
  "keyword",
  "page_num",
  "page_size",
  "platform",
  "provider",
  "science_keywords",
  "short_name",
  "sort_key",
  "temporal",
  "version"
]);

function json(data: unknown, status = 200, cacheTtlSeconds = 0) {
  const headers = new Headers({
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "cache-control": cacheTtlSeconds > 0
      ? `public, max-age=${cacheTtlSeconds}`
      : "no-store"
  });

  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function errorPayload(dataset: NasaDatasetName, error: string): EarthdataErrorResponse {
  return {
    success: false,
    source: PROVIDER,
    dataset,
    error,
    timestamp: new Date().toISOString()
  };
}

function buildEarthdataUrl(request: Request, config: EarthdataDatasetConfig) {
  const incomingUrl = new URL(request.url);
  const earthdataUrl = new URL(EARTHDATA_COLLECTIONS_URL);

  for (const [key, value] of Object.entries(config.defaultParams)) {
    earthdataUrl.searchParams.set(key, value);
  }

  for (const [key, value] of incomingUrl.searchParams) {
    if (ALLOWED_QUERY_PARAMS.has(key)) {
      earthdataUrl.searchParams.set(key, value);
    }
  }

  return earthdataUrl.toString();
}

function cacheKeyFor(request: Request) {
  const url = new URL(request.url);
  url.searchParams.sort();
  return new Request(url.toString(), { method: "GET" });
}

async function readCache(request: Request) {
  try {
    const cached = await caches.default.match(cacheKeyFor(request));
    if (!cached) {
      return null;
    }

    const response = new Response(cached.body, cached);
    response.headers.set("x-pcs-cache", "HIT");
    return response;
  } catch (error) {
    console.warn(JSON.stringify({
      provider: PROVIDER,
      event: "cache_read_failed",
      timestamp: new Date().toISOString()
    }));
    return null;
  }
}

async function writeCache(request: Request, response: Response) {
  try {
    await caches.default.put(cacheKeyFor(request), response.clone());
  } catch (error) {
    console.warn(JSON.stringify({
      provider: PROVIDER,
      event: "cache_write_failed",
      timestamp: new Date().toISOString()
    }));
  }
}

function logRequest(dataset: NasaDatasetName, requestTime: string, responseTime: string, status: number) {
  console.log(JSON.stringify({
    provider: PROVIDER,
    dataset,
    request_time: requestTime,
    response_time: responseTime,
    status_code: status
  }));
}

async function handleDatasetRequest(request: Request, env: NasaRouteEnv, config: EarthdataDatasetConfig) {
  if (request.method !== "GET") {
    return json(errorPayload(config.dataset, "Method not allowed"), 405);
  }

  if (!env.EARTHDATA_TOKEN) {
    return json(errorPayload(config.dataset, "NASA Earthdata is not configured"), 503);
  }

  const cached = await readCache(request);
  if (cached) {
    logRequest(config.dataset, new Date().toISOString(), new Date().toISOString(), cached.status);
    return cached;
  }

  const requestTime = new Date().toISOString();

  try {
    const upstreamUrl = buildEarthdataUrl(request, config);
    const data = await fetchEarthdata({
      dataset: config.dataset,
      token: env.EARTHDATA_TOKEN,
      url: upstreamUrl
    });

    const response = json(data, 200, config.cacheTtlSeconds);
    response.headers.set("x-pcs-cache", "MISS");
    await writeCache(request, response);
    logRequest(config.dataset, requestTime, new Date().toISOString(), data.status);
    return response;
  } catch (error) {
    const status = error instanceof EarthdataClientError ? error.status : 502;
    const publicMessage = status === 504
      ? "NASA Earthdata request timed out"
      : "NASA Earthdata request failed";
    logRequest(config.dataset, requestTime, new Date().toISOString(), status);
    return json(errorPayload(config.dataset, publicMessage), status >= 400 && status < 600 ? status : 502);
  }
}

function statusResponse(env: NasaRouteEnv) {
  return json({
    success: true,
    provider: PROVIDER,
    configured: Boolean(env.EARTHDATA_TOKEN),
    authentication: "Bearer Token",
    datasets: Object.values(DATASETS).map((config) => config.dataset)
  });
}

export async function handleNasaRequest(request: Request, env: NasaRouteEnv) {
  const url = new URL(request.url);

  if (url.pathname === "/api/nasa/status") {
    return statusResponse(env);
  }

  const datasetKey = url.pathname.replace(/^\/api\/nasa\//, "") as NasaDatasetKey;
  const config = DATASETS[datasetKey];

  if (!config) {
    return json({
      success: false,
      source: PROVIDER,
      error: "Unknown NASA dataset route",
      timestamp: new Date().toISOString(),
      datasets: Object.keys(DATASETS).map((key) => `/api/nasa/${key}`)
    }, 404);
  }

  return handleDatasetRequest(request, env, config);
}

export const NASA_DATASET_ROUTES = Object.keys(DATASETS).map((key) => `/api/nasa/${key}`);
