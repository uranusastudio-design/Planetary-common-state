import { EarthdataClientError, fetchEarthdata } from "./client.ts";
import type {
  EarthdataDatasetConfig,
  EarthdataErrorResponse,
  NasaDatasetKey,
  NasaDatasetName,
  NasaRouteEnv
} from "./types.ts";

const EARTHDATA_COLLECTIONS_URL = "https://cmr.earthdata.nasa.gov/search/collections.json";
const EARTHDATA_GRANULES_URL = "https://cmr.earthdata.nasa.gov/search/granules.json";
const PROVIDER = "NASA Earthdata";
const DEFAULT_SMAP_PRODUCT = "SPL4SMGP";
const DEFAULT_SMAP_VERSION = "008";
const DEFAULT_SMAP_CONCEPT_ID = "C3480440870-NSIDC_CPRD";
const DEFAULT_SMAP_TITLE =
  "SMAP L4 Global 3-hourly 9 km EASE-Grid Surface and Root Zone Soil Moisture Geophysical Data V008";
const SMAP_LATEST_ROUTE_VERSION = "smap-latest-v2";
const SMAP_LATEST_FALLBACK_WINDOWS = ["48_hours", "7_days", "30_days", "latest_available"] as const;
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
    description: "Soil Moisture Active Passive collection discovery",
    cacheTtlSeconds: 12 * 60 * 60,
    defaultParams: { keyword: "SMAP", page_size: "20" }
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

function smapLatestJson(data: unknown, status = 200, cacheTtlSeconds = 0) {
  const response = json(data, status, cacheTtlSeconds);
  response.headers.set("X-PCS-Route-Version", SMAP_LATEST_ROUTE_VERSION);
  return response;
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

function buildGranulesUrl(request: Request) {
  const incomingUrl = new URL(request.url);
  const collectionConceptId = incomingUrl.searchParams.get("collection_concept_id");
  const start = incomingUrl.searchParams.get("start");
  const end = incomingUrl.searchParams.get("end");
  const boundingBox = incomingUrl.searchParams.get("bounding_box");
  const pageSize = incomingUrl.searchParams.get("page_size") || "20";

  if (!collectionConceptId || !start || !end) {
    throw new EarthdataClientError(
      "collection_concept_id, start, and end are required",
      400
    );
  }

  return buildGranulesUrlFromParams({
    collectionConceptId,
    start,
    end,
    boundingBox,
    pageSize
  });
}

function buildGranulesUrlFromParams({
  collectionConceptId,
  start,
  end,
  boundingBox,
  pageSize = "20"
}: {
  collectionConceptId: string;
  start?: string | null;
  end?: string | null;
  boundingBox?: string | null;
  pageSize?: string;
}) {
  const earthdataUrl = new URL(EARTHDATA_GRANULES_URL);

  earthdataUrl.searchParams.set("collection_concept_id", collectionConceptId);
  if (start || end) {
    earthdataUrl.searchParams.set("temporal", `${start || ""},${end || ""}`);
  }
  earthdataUrl.searchParams.set("page_size", pageSize);
  earthdataUrl.searchParams.append("sort_key[]", "-start_date");

  if (boundingBox) {
    earthdataUrl.searchParams.set("bounding_box", boundingBox);
  }

  return earthdataUrl.toString();
}

function buildPreferredSmapCollectionUrl() {
  const earthdataUrl = new URL(EARTHDATA_COLLECTIONS_URL);
  earthdataUrl.searchParams.set("short_name", DEFAULT_SMAP_PRODUCT);
  earthdataUrl.searchParams.set("version", DEFAULT_SMAP_VERSION);
  earthdataUrl.searchParams.set("page_size", "5");
  return earthdataUrl.toString();
}

function entriesFromEarthdataResponse(data: unknown) {
  if (!data || typeof data !== "object") {
    return [];
  }

  const feed = "feed" in data ? data.feed : null;
  if (!feed || typeof feed !== "object" || !("entry" in feed) || !Array.isArray(feed.entry)) {
    return [];
  }

  return feed.entry;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function linksFromEntry(entry: Record<string, unknown>) {
  return Array.isArray(entry.links) ? entry.links : [];
}

function conceptIdFromEntry(entry: Record<string, unknown>) {
  return textValue(entry.id) || textValue(entry["concept-id"]);
}

function isRelevantSmapCollection(entry: Record<string, unknown>) {
  const searchable = [
    entry.id,
    entry.short_name,
    entry.dataset_id,
    entry.title,
    entry.summary
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return /\bsmap\b/.test(searchable);
}

function normalizeSmapCollection(entry: Record<string, unknown>) {
  return {
    concept_id: conceptIdFromEntry(entry),
    short_name: textValue(entry.short_name),
    version_id: textValue(entry.version_id),
    title: textValue(entry.title) || textValue(entry.dataset_id),
    summary: textValue(entry.summary),
    time_start: textValue(entry.time_start),
    time_end: textValue(entry.time_end),
    data_center: textValue(entry.data_center),
    links: linksFromEntry(entry)
  };
}

function normalizeSmapCollections(data: unknown) {
  return entriesFromEarthdataResponse(data)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .filter(isRelevantSmapCollection)
    .map(normalizeSmapCollection);
}

function preferredSmapCollection(collections: ReturnType<typeof normalizeSmapCollections>) {
  return collections.find((collection) =>
    collection.short_name === DEFAULT_SMAP_PRODUCT &&
    collection.version_id === DEFAULT_SMAP_VERSION
  ) || collections.find((collection) => collection.short_name === DEFAULT_SMAP_PRODUCT);
}

function linkRel(link: unknown) {
  return link && typeof link === "object" && "rel" in link && typeof link.rel === "string"
    ? link.rel.toLowerCase()
    : "";
}

function linkHref(link: unknown) {
  return link && typeof link === "object" && "href" in link && typeof link.href === "string"
    ? link.href
    : null;
}

function normalizedLinks(entry: Record<string, unknown>, predicate: (rel: string, href: string) => boolean) {
  return linksFromEntry(entry).filter((link) => {
    const href = linkHref(link);
    return !!href && predicate(linkRel(link), href);
  });
}

function isDownloadLink(rel: string, href: string) {
  return rel.includes("/data#") || rel.includes("/metadata#") || /\.(h5|hdf5?|nc|nc4|zarr|zip)(\?|$)/i.test(href);
}

function isBrowseLink(rel: string) {
  return rel.includes("/browse#");
}

function normalizeGranule(entry: Record<string, unknown>) {
  return {
    concept_id: conceptIdFromEntry(entry),
    title: textValue(entry.title),
    time_start: textValue(entry.time_start),
    time_end: textValue(entry.time_end),
    updated: textValue(entry.updated),
    size_mb: numberValue(entry.granule_size),
    download_links: normalizedLinks(entry, isDownloadLink),
    browse_links: normalizedLinks(entry, (rel) => isBrowseLink(rel))
  };
}

function normalizeGranules(data: unknown) {
  return entriesFromEarthdataResponse(data)
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .map(normalizeGranule);
}

function cacheKeyFor(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/nasa/smap/latest") {
    url.searchParams.set("__pcs_cache_version", SMAP_LATEST_ROUTE_VERSION);
  }
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

    const collections = config.key === "smap" ? normalizeSmapCollections(data.data) : [];
    const payload = config.key === "smap"
      ? {
        ...data,
        status: collections.length > 0 ? "ok" : "no_results",
        description: config.description,
        product: DEFAULT_SMAP_PRODUCT,
        version: DEFAULT_SMAP_VERSION,
        preferred_collection: preferredSmapCollection(collections) || null,
        count: collections.length,
        collections
      }
      : data;

    if (config.key === "smap" && payload.status === "no_results") {
      logRequest(config.dataset, requestTime, new Date().toISOString(), data.status);
      return json({
        success: false,
        source: PROVIDER,
        dataset: config.dataset,
        status: "no_results",
        error: "No relevant SMAP collections found",
        timestamp: new Date().toISOString(),
        product: DEFAULT_SMAP_PRODUCT,
        version: DEFAULT_SMAP_VERSION,
        count: 0,
        collections: []
      }, 404);
    }

    const response = json(payload, 200, config.cacheTtlSeconds);
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

async function handleSmapGranulesRequest(request: Request, env: NasaRouteEnv) {
  const config = DATASETS.smap;

  if (request.method !== "GET") {
    return json(errorPayload(config.dataset, "Method not allowed"), 405);
  }

  if (!env.EARTHDATA_TOKEN) {
    return json(errorPayload(config.dataset, "NASA Earthdata is not configured"), 503);
  }

  const cached = await readCache(request);
  if (cached) {
    cached.headers.set("X-PCS-Route-Version", SMAP_LATEST_ROUTE_VERSION);
    logRequest(config.dataset, new Date().toISOString(), new Date().toISOString(), cached.status);
    return cached;
  }

  const requestTime = new Date().toISOString();

  try {
    const upstreamUrl = buildGranulesUrl(request);
    const data = await fetchEarthdata({
      dataset: config.dataset,
      token: env.EARTHDATA_TOKEN,
      url: upstreamUrl
    });
    const granules = normalizeGranules(data.data);

    if (!granules.length) {
      logRequest(config.dataset, requestTime, new Date().toISOString(), data.status);
      return json({
        success: false,
        source: PROVIDER,
        dataset: config.dataset,
        product: DEFAULT_SMAP_PRODUCT,
        version: DEFAULT_SMAP_VERSION,
        count: 0,
        status: "no_results",
        error: "No SMAP granules found for the requested collection and time range",
        timestamp: new Date().toISOString(),
        granules: []
      }, 404);
    }

    const response = json({
      ...data,
      status: "ok",
      description: "SMAP granule metadata discovery",
      product: DEFAULT_SMAP_PRODUCT,
      version: DEFAULT_SMAP_VERSION,
      count: granules.length,
      granules
    }, 200, config.cacheTtlSeconds);
    response.headers.set("x-pcs-cache", "MISS");
    await writeCache(request, response);
    logRequest(config.dataset, requestTime, new Date().toISOString(), data.status);
    return response;
  } catch (error) {
    const status = error instanceof EarthdataClientError ? error.status : 502;
    const publicMessage = status === 400
      ? error instanceof EarthdataClientError ? error.message : "Invalid SMAP granule request"
      : status === 504
        ? "NASA Earthdata request timed out"
        : "NASA Earthdata request failed";
    logRequest(config.dataset, requestTime, new Date().toISOString(), status);
    return json(errorPayload(config.dataset, publicMessage), status >= 400 && status < 600 ? status : 502);
  }
}

async function findPreferredSmapCollectionConceptId(env: NasaRouteEnv) {
  if (!env.EARTHDATA_TOKEN) {
    throw new EarthdataClientError("NASA Earthdata is not configured", 503);
  }

  const data = await fetchEarthdata({
    dataset: DATASETS.smap.dataset,
    token: env.EARTHDATA_TOKEN,
    url: buildPreferredSmapCollectionUrl()
  });
  const collections = normalizeSmapCollections(data.data);
  const collection = preferredSmapCollection(collections);

  if (!collection?.concept_id) {
    throw new EarthdataClientError("Preferred SMAP collection was not found", 404);
  }

  return collection;
}

function latestWindowFromRequest(request: Request) {
  const url = new URL(request.url);
  const end = url.searchParams.get("end") || new Date().toISOString();

  return {
    end,
    boundingBox: url.searchParams.get("bounding_box"),
    pageSize: url.searchParams.get("page_size") || "5"
  };
}

function smapLatestSearchWindows(end: string) {
  const endTime = new Date(end).getTime();
  return [
    {
      fallbackWindow: "48_hours",
      start: new Date(endTime - 48 * 60 * 60 * 1000).toISOString(),
      end
    },
    {
      fallbackWindow: "7_days",
      start: new Date(endTime - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end
    },
    {
      fallbackWindow: "30_days",
      start: new Date(endTime - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end
    },
    {
      fallbackWindow: "latest_available",
      start: null,
      end: null
    }
  ] as const;
}

function latestGranuleTime(granules: ReturnType<typeof normalizeGranules>) {
  return granules[0]?.time_start || granules[0]?.time_end || null;
}

async function querySmapLatestGranules({
  token,
  end,
  pageSize,
  boundingBox
}: {
  token: string;
  end: string;
  pageSize: string;
  boundingBox?: string | null;
}) {
  for (const window of smapLatestSearchWindows(end)) {
    const upstreamUrl = buildGranulesUrlFromParams({
      collectionConceptId: DEFAULT_SMAP_CONCEPT_ID,
      start: window.start,
      end: window.end,
      boundingBox,
      pageSize
    });
    const data = await fetchEarthdata({
      dataset: DATASETS.smap.dataset,
      token,
      url: upstreamUrl
    });
    const granules = normalizeGranules(data.data);

    if (granules.length) {
      return {
        data,
        granules,
        fallbackWindow: window.fallbackWindow,
        requestedStart: window.start,
        requestedEnd: window.end
      };
    }
  }

  return null;
}

async function handleSmapLatestRequest(request: Request, env: NasaRouteEnv) {
  const config = DATASETS.smap;

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
    const { end, boundingBox, pageSize } = latestWindowFromRequest(request);
    const firstResult = await querySmapLatestGranules({
      token: env.EARTHDATA_TOKEN,
      end,
      pageSize,
      boundingBox
    });
    const relaxedResult = !firstResult && boundingBox
      ? await querySmapLatestGranules({
        token: env.EARTHDATA_TOKEN,
        end,
        pageSize,
        boundingBox: null
      })
      : null;
    const result = firstResult || relaxedResult;
    const spatialFilterRelaxed = !!relaxedResult;

    if (!result) {
      logRequest(config.dataset, requestTime, new Date().toISOString(), 200);
      return smapLatestJson({
      success: true,
      source: PROVIDER,
      dataset: config.dataset,
      product: DEFAULT_SMAP_PRODUCT,
      version: DEFAULT_SMAP_VERSION,
        concept_id: DEFAULT_SMAP_CONCEPT_ID,
        status: "no_results",
        count: 0,
      timestamp: new Date().toISOString(),
        data: [],
        fallback_windows_checked: SMAP_LATEST_FALLBACK_WINDOWS,
        spatial_filter_relaxed: !!boundingBox
      }, 200, config.cacheTtlSeconds);
    }

    const payload = {
      ...result.data,
      success: true,
      source: PROVIDER,
      dataset: config.dataset,
      product: DEFAULT_SMAP_PRODUCT,
      version: DEFAULT_SMAP_VERSION,
      concept_id: DEFAULT_SMAP_CONCEPT_ID,
      status: "ok",
      fallback_window: result.fallbackWindow,
      requested_start: result.requestedStart,
      requested_end: result.requestedEnd,
      latest_granule_time: latestGranuleTime(result.granules),
      count: result.granules.length,
      timestamp: new Date().toISOString(),
      spatial_filter_relaxed: spatialFilterRelaxed,
      data: result.granules,
      granules: result.granules
    };

    const response = smapLatestJson(payload, 200, config.cacheTtlSeconds);
    response.headers.set("x-pcs-cache", "MISS");
    await writeCache(request, response);
    logRequest(config.dataset, requestTime, new Date().toISOString(), result.data.status);
    return response;
  } catch (error) {
    const status = error instanceof EarthdataClientError ? error.status : 502;
    const publicMessage = status === 404
      ? "Preferred SMAP collection was not found"
      : status === 504
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

  if (url.pathname === "/api/nasa/smap/latest") {
    return handleSmapLatestRequest(request, env);
  }

  if (url.pathname === "/api/nasa/smap/granules") {
    return handleSmapGranulesRequest(request, env);
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

export const NASA_DATASET_ROUTES = [
  "/api/nasa/smap/latest",
  "/api/nasa/smap/granules",
  ...Object.keys(DATASETS).map((key) => `/api/nasa/${key}`)
];
