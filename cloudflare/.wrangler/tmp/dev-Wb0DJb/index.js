var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/nasa/client.ts
var DEFAULT_TIMEOUT_MS = 2e4;
var TRANSIENT_STATUSES = /* @__PURE__ */ new Set([408, 429, 500, 502, 503, 504]);
var EarthdataClientError = class extends Error {
  static {
    __name(this, "EarthdataClientError");
  }
  status;
  constructor(message, status = 502) {
    super(message);
    this.name = "EarthdataClientError";
    this.status = status;
  }
};
function isTransientStatus(status) {
  return TRANSIENT_STATUSES.has(status);
}
__name(isTransientStatus, "isTransientStatus");
function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
}
__name(isAbortError, "isAbortError");
function buildHeaders(token) {
  return {
    accept: "application/json",
    authorization: `Bearer ${token}`,
    "user-agent": "PCS-Backend/0.1 NASA-Earthdata-Gateway"
  };
}
__name(buildHeaders, "buildHeaders");
async function parseResponse(response2) {
  const contentType = response2.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response2.json();
  }
  const text = await response2.text();
  return {
    content_type: contentType || "text/plain",
    body: text.slice(0, 5e4),
    truncated: text.length > 5e4
  };
}
__name(parseResponse, "parseResponse");
async function fetchOnce(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(request.url, {
      headers: buildHeaders(request.token),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
__name(fetchOnce, "fetchOnce");
async function fetchEarthdata(request) {
  const started = Date.now();
  let lastStatus = 502;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response2 = await fetchOnce(request);
      lastStatus = response2.status;
      if (!response2.ok) {
        if (attempt === 0 && isTransientStatus(response2.status)) {
          continue;
        }
        throw new EarthdataClientError("NASA Earthdata request failed", response2.status);
      }
      return {
        success: true,
        source: "NASA Earthdata",
        dataset: request.dataset,
        request_url: request.url,
        status: response2.status,
        response_time_ms: Date.now() - started,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        data: await parseResponse(response2)
      };
    } catch (error) {
      if (attempt === 0 && (isAbortError(error) || !(error instanceof EarthdataClientError))) {
        continue;
      }
      if (error instanceof EarthdataClientError) {
        throw error;
      }
      const message = isAbortError(error) ? "NASA Earthdata request timed out" : "NASA Earthdata request failed";
      throw new EarthdataClientError(message, isAbortError(error) ? 504 : lastStatus);
    }
  }
  throw new EarthdataClientError("NASA Earthdata request failed", lastStatus);
}
__name(fetchEarthdata, "fetchEarthdata");

// src/nasa/routes.ts
var EARTHDATA_COLLECTIONS_URL = "https://cmr.earthdata.nasa.gov/search/collections.json";
var EARTHDATA_GRANULES_URL = "https://cmr.earthdata.nasa.gov/search/granules.json";
var PROVIDER = "NASA Earthdata";
var DEFAULT_SMAP_PRODUCT = "SPL4SMGP";
var DEFAULT_SMAP_VERSION = "008";
var DEFAULT_SMAP_CONCEPT_ID = "C3480440870-NSIDC_CPRD";
var SMAP_LATEST_ROUTE_VERSION = "smap-latest-v2";
var SMAP_LATEST_FALLBACK_WINDOWS = ["48_hours", "7_days", "30_days", "latest_available"];
var DATASETS = {
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
var ALLOWED_QUERY_PARAMS = /* @__PURE__ */ new Set([
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
function json(data, status = 200, cacheTtlSeconds = 0) {
  const headers = new Headers({
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "cache-control": cacheTtlSeconds > 0 ? `public, max-age=${cacheTtlSeconds}` : "no-store"
  });
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}
__name(json, "json");
function smapLatestJson(data, status = 200, cacheTtlSeconds = 0) {
  const response2 = json(data, status, cacheTtlSeconds);
  response2.headers.set("X-PCS-Route-Version", SMAP_LATEST_ROUTE_VERSION);
  return response2;
}
__name(smapLatestJson, "smapLatestJson");
function errorPayload(dataset, error) {
  return {
    success: false,
    source: PROVIDER,
    dataset,
    error,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(errorPayload, "errorPayload");
function buildEarthdataUrl(request, config) {
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
__name(buildEarthdataUrl, "buildEarthdataUrl");
function buildGranulesUrl(request) {
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
__name(buildGranulesUrl, "buildGranulesUrl");
function buildGranulesUrlFromParams({
  collectionConceptId,
  start,
  end,
  boundingBox,
  pageSize = "20"
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
__name(buildGranulesUrlFromParams, "buildGranulesUrlFromParams");
function entriesFromEarthdataResponse(data) {
  if (!data || typeof data !== "object") {
    return [];
  }
  const feed = "feed" in data ? data.feed : null;
  if (!feed || typeof feed !== "object" || !("entry" in feed) || !Array.isArray(feed.entry)) {
    return [];
  }
  return feed.entry;
}
__name(entriesFromEarthdataResponse, "entriesFromEarthdataResponse");
function textValue(value) {
  return typeof value === "string" ? value : null;
}
__name(textValue, "textValue");
function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
__name(numberValue, "numberValue");
function linksFromEntry(entry) {
  return Array.isArray(entry.links) ? entry.links : [];
}
__name(linksFromEntry, "linksFromEntry");
function conceptIdFromEntry(entry) {
  return textValue(entry.id) || textValue(entry["concept-id"]);
}
__name(conceptIdFromEntry, "conceptIdFromEntry");
function isRelevantSmapCollection(entry) {
  const searchable = [
    entry.id,
    entry.short_name,
    entry.dataset_id,
    entry.title,
    entry.summary
  ].filter((value) => typeof value === "string").join(" ").toLowerCase();
  return /\bsmap\b/.test(searchable);
}
__name(isRelevantSmapCollection, "isRelevantSmapCollection");
function normalizeSmapCollection(entry) {
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
__name(normalizeSmapCollection, "normalizeSmapCollection");
function normalizeSmapCollections(data) {
  return entriesFromEarthdataResponse(data).filter((entry) => !!entry && typeof entry === "object").filter(isRelevantSmapCollection).map(normalizeSmapCollection);
}
__name(normalizeSmapCollections, "normalizeSmapCollections");
function preferredSmapCollection(collections) {
  return collections.find(
    (collection) => collection.short_name === DEFAULT_SMAP_PRODUCT && collection.version_id === DEFAULT_SMAP_VERSION
  ) || collections.find((collection) => collection.short_name === DEFAULT_SMAP_PRODUCT);
}
__name(preferredSmapCollection, "preferredSmapCollection");
function linkRel(link) {
  return link && typeof link === "object" && "rel" in link && typeof link.rel === "string" ? link.rel.toLowerCase() : "";
}
__name(linkRel, "linkRel");
function linkHref(link) {
  return link && typeof link === "object" && "href" in link && typeof link.href === "string" ? link.href : null;
}
__name(linkHref, "linkHref");
function normalizedLinks(entry, predicate) {
  return linksFromEntry(entry).filter((link) => {
    const href = linkHref(link);
    return !!href && predicate(linkRel(link), href);
  });
}
__name(normalizedLinks, "normalizedLinks");
function isDownloadLink(rel, href) {
  return rel.includes("/data#") || rel.includes("/metadata#") || /\.(h5|hdf5?|nc|nc4|zarr|zip)(\?|$)/i.test(href);
}
__name(isDownloadLink, "isDownloadLink");
function isBrowseLink(rel) {
  return rel.includes("/browse#");
}
__name(isBrowseLink, "isBrowseLink");
function normalizeGranule(entry) {
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
__name(normalizeGranule, "normalizeGranule");
function normalizeGranules(data) {
  return entriesFromEarthdataResponse(data).filter((entry) => !!entry && typeof entry === "object").map(normalizeGranule);
}
__name(normalizeGranules, "normalizeGranules");
function cacheKeyFor(request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/nasa/smap/latest") {
    url.searchParams.set("__pcs_cache_version", SMAP_LATEST_ROUTE_VERSION);
  }
  url.searchParams.sort();
  return new Request(url.toString(), { method: "GET" });
}
__name(cacheKeyFor, "cacheKeyFor");
async function readCache(request) {
  try {
    const cached = await caches.default.match(cacheKeyFor(request));
    if (!cached) {
      return null;
    }
    const response2 = new Response(cached.body, cached);
    response2.headers.set("x-pcs-cache", "HIT");
    return response2;
  } catch (error) {
    console.warn(JSON.stringify({
      provider: PROVIDER,
      event: "cache_read_failed",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
    return null;
  }
}
__name(readCache, "readCache");
async function writeCache(request, response2) {
  try {
    await caches.default.put(cacheKeyFor(request), response2.clone());
  } catch (error) {
    console.warn(JSON.stringify({
      provider: PROVIDER,
      event: "cache_write_failed",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
  }
}
__name(writeCache, "writeCache");
function logRequest(dataset, requestTime, responseTime, status) {
  console.log(JSON.stringify({
    provider: PROVIDER,
    dataset,
    request_time: requestTime,
    response_time: responseTime,
    status_code: status
  }));
}
__name(logRequest, "logRequest");
async function handleDatasetRequest(request, env, config) {
  if (request.method !== "GET") {
    return json(errorPayload(config.dataset, "Method not allowed"), 405);
  }
  if (!env.EARTHDATA_TOKEN) {
    return json(errorPayload(config.dataset, "NASA Earthdata is not configured"), 503);
  }
  const cached = await readCache(request);
  if (cached) {
    logRequest(config.dataset, (/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString(), cached.status);
    return cached;
  }
  const requestTime = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const upstreamUrl = buildEarthdataUrl(request, config);
    const data = await fetchEarthdata({
      dataset: config.dataset,
      token: env.EARTHDATA_TOKEN,
      url: upstreamUrl
    });
    const collections = config.key === "smap" ? normalizeSmapCollections(data.data) : [];
    const payload = config.key === "smap" ? {
      ...data,
      status: collections.length > 0 ? "ok" : "no_results",
      description: config.description,
      product: DEFAULT_SMAP_PRODUCT,
      version: DEFAULT_SMAP_VERSION,
      preferred_collection: preferredSmapCollection(collections) || null,
      count: collections.length,
      collections
    } : data;
    if (config.key === "smap" && payload.status === "no_results") {
      logRequest(config.dataset, requestTime, (/* @__PURE__ */ new Date()).toISOString(), data.status);
      return json({
        success: false,
        source: PROVIDER,
        dataset: config.dataset,
        status: "no_results",
        error: "No relevant SMAP collections found",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        product: DEFAULT_SMAP_PRODUCT,
        version: DEFAULT_SMAP_VERSION,
        count: 0,
        collections: []
      }, 404);
    }
    const response2 = json(payload, 200, config.cacheTtlSeconds);
    response2.headers.set("x-pcs-cache", "MISS");
    await writeCache(request, response2);
    logRequest(config.dataset, requestTime, (/* @__PURE__ */ new Date()).toISOString(), data.status);
    return response2;
  } catch (error) {
    const status = error instanceof EarthdataClientError ? error.status : 502;
    const publicMessage = status === 504 ? "NASA Earthdata request timed out" : "NASA Earthdata request failed";
    logRequest(config.dataset, requestTime, (/* @__PURE__ */ new Date()).toISOString(), status);
    return json(errorPayload(config.dataset, publicMessage), status >= 400 && status < 600 ? status : 502);
  }
}
__name(handleDatasetRequest, "handleDatasetRequest");
async function handleSmapGranulesRequest(request, env) {
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
    logRequest(config.dataset, (/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString(), cached.status);
    return cached;
  }
  const requestTime = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const upstreamUrl = buildGranulesUrl(request);
    const data = await fetchEarthdata({
      dataset: config.dataset,
      token: env.EARTHDATA_TOKEN,
      url: upstreamUrl
    });
    const granules = normalizeGranules(data.data);
    if (!granules.length) {
      logRequest(config.dataset, requestTime, (/* @__PURE__ */ new Date()).toISOString(), data.status);
      return json({
        success: false,
        source: PROVIDER,
        dataset: config.dataset,
        product: DEFAULT_SMAP_PRODUCT,
        version: DEFAULT_SMAP_VERSION,
        count: 0,
        status: "no_results",
        error: "No SMAP granules found for the requested collection and time range",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        granules: []
      }, 404);
    }
    const response2 = json({
      ...data,
      status: "ok",
      description: "SMAP granule metadata discovery",
      product: DEFAULT_SMAP_PRODUCT,
      version: DEFAULT_SMAP_VERSION,
      count: granules.length,
      granules
    }, 200, config.cacheTtlSeconds);
    response2.headers.set("x-pcs-cache", "MISS");
    await writeCache(request, response2);
    logRequest(config.dataset, requestTime, (/* @__PURE__ */ new Date()).toISOString(), data.status);
    return response2;
  } catch (error) {
    const status = error instanceof EarthdataClientError ? error.status : 502;
    const publicMessage = status === 400 ? error instanceof EarthdataClientError ? error.message : "Invalid SMAP granule request" : status === 504 ? "NASA Earthdata request timed out" : "NASA Earthdata request failed";
    logRequest(config.dataset, requestTime, (/* @__PURE__ */ new Date()).toISOString(), status);
    return json(errorPayload(config.dataset, publicMessage), status >= 400 && status < 600 ? status : 502);
  }
}
__name(handleSmapGranulesRequest, "handleSmapGranulesRequest");
function latestWindowFromRequest(request) {
  const url = new URL(request.url);
  const end = url.searchParams.get("end") || (/* @__PURE__ */ new Date()).toISOString();
  return {
    end,
    boundingBox: url.searchParams.get("bounding_box"),
    pageSize: url.searchParams.get("page_size") || "5"
  };
}
__name(latestWindowFromRequest, "latestWindowFromRequest");
function smapLatestSearchWindows(end) {
  const endTime = new Date(end).getTime();
  return [
    {
      fallbackWindow: "48_hours",
      start: new Date(endTime - 48 * 60 * 60 * 1e3).toISOString(),
      end
    },
    {
      fallbackWindow: "7_days",
      start: new Date(endTime - 7 * 24 * 60 * 60 * 1e3).toISOString(),
      end
    },
    {
      fallbackWindow: "30_days",
      start: new Date(endTime - 30 * 24 * 60 * 60 * 1e3).toISOString(),
      end
    },
    {
      fallbackWindow: "latest_available",
      start: null,
      end: null
    }
  ];
}
__name(smapLatestSearchWindows, "smapLatestSearchWindows");
function latestGranuleTime(granules) {
  return granules[0]?.time_start || granules[0]?.time_end || null;
}
__name(latestGranuleTime, "latestGranuleTime");
async function querySmapLatestGranules({
  token,
  end,
  pageSize,
  boundingBox
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
__name(querySmapLatestGranules, "querySmapLatestGranules");
async function handleSmapLatestRequest(request, env) {
  const config = DATASETS.smap;
  if (request.method !== "GET") {
    return json(errorPayload(config.dataset, "Method not allowed"), 405);
  }
  if (!env.EARTHDATA_TOKEN) {
    return json(errorPayload(config.dataset, "NASA Earthdata is not configured"), 503);
  }
  const cached = await readCache(request);
  if (cached) {
    logRequest(config.dataset, (/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString(), cached.status);
    return cached;
  }
  const requestTime = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const { end, boundingBox, pageSize } = latestWindowFromRequest(request);
    const firstResult = await querySmapLatestGranules({
      token: env.EARTHDATA_TOKEN,
      end,
      pageSize,
      boundingBox
    });
    const relaxedResult = !firstResult && boundingBox ? await querySmapLatestGranules({
      token: env.EARTHDATA_TOKEN,
      end,
      pageSize,
      boundingBox: null
    }) : null;
    const result = firstResult || relaxedResult;
    const spatialFilterRelaxed = !!relaxedResult;
    if (!result) {
      logRequest(config.dataset, requestTime, (/* @__PURE__ */ new Date()).toISOString(), 200);
      return smapLatestJson({
        success: true,
        source: PROVIDER,
        dataset: config.dataset,
        product: DEFAULT_SMAP_PRODUCT,
        version: DEFAULT_SMAP_VERSION,
        concept_id: DEFAULT_SMAP_CONCEPT_ID,
        status: "no_results",
        count: 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      spatial_filter_relaxed: spatialFilterRelaxed,
      data: result.granules,
      granules: result.granules
    };
    const response2 = smapLatestJson(payload, 200, config.cacheTtlSeconds);
    response2.headers.set("x-pcs-cache", "MISS");
    await writeCache(request, response2);
    logRequest(config.dataset, requestTime, (/* @__PURE__ */ new Date()).toISOString(), result.data.status);
    return response2;
  } catch (error) {
    const status = error instanceof EarthdataClientError ? error.status : 502;
    const publicMessage = status === 404 ? "Preferred SMAP collection was not found" : status === 504 ? "NASA Earthdata request timed out" : "NASA Earthdata request failed";
    logRequest(config.dataset, requestTime, (/* @__PURE__ */ new Date()).toISOString(), status);
    return json(errorPayload(config.dataset, publicMessage), status >= 400 && status < 600 ? status : 502);
  }
}
__name(handleSmapLatestRequest, "handleSmapLatestRequest");
function statusResponse(env) {
  return json({
    success: true,
    provider: PROVIDER,
    configured: Boolean(env.EARTHDATA_TOKEN),
    authentication: "Bearer Token",
    datasets: Object.values(DATASETS).map((config) => config.dataset)
  });
}
__name(statusResponse, "statusResponse");
async function handleNasaRequest(request, env) {
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
  const datasetKey = url.pathname.replace(/^\/api\/nasa\//, "");
  const config = DATASETS[datasetKey];
  if (!config) {
    return json({
      success: false,
      source: PROVIDER,
      error: "Unknown NASA dataset route",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      datasets: Object.keys(DATASETS).map((key) => `/api/nasa/${key}`)
    }, 404);
  }
  return handleDatasetRequest(request, env, config);
}
__name(handleNasaRequest, "handleNasaRequest");
var NASA_DATASET_ROUTES = [
  "/api/nasa/smap/latest",
  "/api/nasa/smap/granules",
  ...Object.keys(DATASETS).map((key) => `/api/nasa/${key}`)
];

// src/astronomy.js
var NOAA = "https://services.swpc.noaa.gov";
var JPL_HORIZONS = "https://ssd.jpl.nasa.gov/api/horizons.api";
var SOLAR_IMAGE_CACHE_SECONDS = 600;
var SOLAR_IMAGE_STALE_SECONDS = 86400;
var MAX_OFFICIAL_IMAGE_BYTES = 12 * 1024 * 1024;
var PLANET_IMAGE_STALE_SECONDS = 30 * 24 * 60 * 60;
var OFFICIAL_IMAGE_HOSTS = /* @__PURE__ */ new Set([
  "astrogeology.usgs.gov",
  "planetarymaps.usgs.gov",
  "photojournal.jpl.nasa.gov",
  "assets.science.nasa.gov"
]);
var LUNAR_IMAGE_URL = "https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=LROC_WAC&STYLES=&SRS=EPSG:4326&BBOX=0,-90,360,90&WIDTH=2048&HEIGHT=1024&FORMAT=image/png";
var SOLAR_IMAGE_MODES = Object.freeze({
  "hmi-continuum": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/HMI",
    wavelength: "6173 \xC5 continuum",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIIC.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIC.jpg"
  },
  "hmi-magnetogram": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/HMI",
    wavelength: "6173 \xC5 line-of-sight magnetic field",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIB.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIB.jpg"
  },
  "aia-171": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/AIA",
    wavelength: "171 \xC5",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0171.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0171.jpg"
  },
  "aia-193": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/AIA",
    wavelength: "193 \xC5",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg"
  },
  "aia-304": {
    source: "NASA Solar Dynamics Observatory",
    instrument: "SDO/AIA",
    wavelength: "304 \xC5",
    full: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0304.jpg",
    thumbnail: "https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0304.jpg"
  },
  coronagraph: {
    source: "NASA/ESA SOHO",
    instrument: "SOHO/LASCO C2",
    wavelength: "white light",
    full: "https://soho.nascom.nasa.gov/data/realtime/c2/1024/latest.jpg",
    thumbnail: "https://soho.nascom.nasa.gov/data/realtime/c2/512/latest.jpg"
  }
});
var PLANET_IMAGE_PRODUCTS = Object.freeze({
  mercury: {
    source: "NASA / USGS Astrogeology",
    mission: "MESSENGER",
    instrument: "MDIS",
    product: "Mercury MESSENGER MDIS Global Mosaic 250m",
    productType: "global_mosaic",
    projection: "equirectangular",
    observedAt: null,
    productDate: "2013-05-01",
    sourceUrl: "https://astrogeology.usgs.gov/ckan/dataset/279e5d50-ff2f-4250-bde3-bb510096079e/resource/2b5865c2-bd0d-4962-bdb0-c12f0502def1/download/mercury_messenger_mosaic_global_1024.jpg",
    catalogUrl: "https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m",
    attribution: "NASA MESSENGER / USGS Astrogeology Science Center",
    notes: "Mission-derived global surface mosaic; not a live observation.",
    cacheSeconds: 604800
  },
  venus: {
    source: "NASA / USGS Astrogeology",
    mission: "Magellan",
    instrument: "SAR / GEDR",
    product: "Venus Magellan Global C3-MDIR Colorized Topographic Mosaic 6600m",
    productType: "radar_topography_map",
    projection: "equirectangular",
    observedAt: null,
    productDate: null,
    sourceUrl: "https://astrogeology.usgs.gov/ckan/dataset/f992cb3c-4f37-4e1a-a59d-4f29d8307d7d/resource/d97f7bf8-73da-46fe-9edb-95c9ad233b10/download/venus_magellan_c3-mdir_clrtopo_global_mosaic_1024.jpg",
    catalogUrl: "https://astrogeology.usgs.gov/search/map/venus_magellan_global_c3_mdir_colorized_topographic_mosaic_6600m",
    attribution: "NASA Magellan / PDS Geosciences Node / USGS Astrogeology",
    notes: "Global equirectangular Magellan radar mosaic with colorized GEDR topography; not natural visible-light color.",
    version: "venus-mosaic-2",
    cacheSeconds: 604800
  },
  mars: {
    source: "NASA / USGS Astrogeology",
    mission: "Viking Orbiter",
    instrument: "VIS",
    product: "Mars Viking Global Color Mosaic 925m",
    productType: "global_mosaic",
    projection: "simple_cylindrical",
    observedAt: null,
    productDate: null,
    sourceUrl: "https://astrogeology.usgs.gov/ckan/dataset/dfdc2242-52dc-4126-bc89-03af8253ae79/resource/0d7b31dc-0b2e-4ca6-89dc-e3c1404c0232/download/mars_viking_clrmosaic_global_1024.jpg",
    catalogUrl: "https://astrogeology.usgs.gov/search/map/mars_viking_global_color_mosaic_925m",
    attribution: "NASA Viking Orbiter / USGS Astrogeology Science Center",
    notes: "Mission-derived global optical color mosaic; archival, not live.",
    cacheSeconds: 604800
  },
  jupiter: {
    source: "NASA / JPL Photojournal",
    mission: "Cassini-Huygens",
    instrument: "Imaging Science Subsystem",
    product: "PIA02873 High Resolution Globe of Jupiter",
    productType: "observation_disc",
    projection: "observation_disc",
    observedAt: "2000-12-07T00:00:00.000Z",
    productDate: "2001-01-30",
    sourceUrl: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia02/pia02873/PIA02873.jpg",
    catalogUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA02873",
    attribution: "NASA/JPL/University of Arizona",
    notes: "True-color simulated globe made from four Cassini observations; rendered as an archival atmosphere observation disc.",
    cacheSeconds: 86400
  },
  saturn: {
    source: "NASA / JPL Photojournal",
    mission: "Cassini-Huygens",
    instrument: "ISS Narrow Angle Camera",
    product: "PIA05389 Saturn and its Rings",
    productType: "observation_disc",
    projection: "observation_disc",
    observedAt: "2004-03-27T00:00:00.000Z",
    productDate: null,
    sourceUrl: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia05/pia05389/PIA05389.jpg",
    catalogUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA05389",
    attribution: "NASA/JPL/Space Science Institute",
    notes: "Natural-color Cassini archival observation. Interface rings are also represented by a separate ring primitive.",
    cacheSeconds: 604800
  },
  uranus: {
    source: "NASA / JPL Photojournal",
    mission: "Voyager 2",
    instrument: "VG ISS Wide Angle Camera",
    product: "PIA00143 Uranus - Final Image",
    productType: "observation_disc",
    projection: "observation_disc",
    observedAt: "1986-01-25T00:00:00.000Z",
    productDate: "1996-01-29",
    sourceUrl: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00143/PIA00143.jpg",
    catalogUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA00143",
    attribution: "NASA/JPL",
    notes: "Voyager 2 archival atmospheric color composite; not a global surface map.",
    cacheSeconds: 604800
  },
  neptune: {
    source: "NASA / JPL Photojournal",
    mission: "Voyager 2",
    instrument: "VG ISS Narrow Angle Camera",
    product: "PIA00046 Neptune Full Disk",
    productType: "observation_disc",
    projection: "observation_disc",
    observedAt: null,
    productDate: "1996-01-29",
    sourceUrl: "https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00046/PIA00046.jpg",
    catalogUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA00046",
    attribution: "NASA/JPL",
    notes: "Processed Voyager 2 archival atmospheric observation; not a solid surface or global map.",
    cacheSeconds: 604800
  }
});
var ASTRONOMY_ROUTES = [
  "/api/astronomy/moon",
  "/api/astronomy/body/:body",
  "/api/space-weather/summary",
  "/api/space-weather/kp",
  "/api/space-weather/solar-wind",
  "/api/space-weather/xray",
  "/api/space-weather/alerts",
  "/api/space-weather/solar-image",
  "/api/astronomy/lunar-image",
  "/api/astronomy/planet-image/:body"
];
var JPL_BODY_CONFIG = {
  sun: { id: "10", cacheSeconds: 1800, group: "sun" },
  mercury: { id: "199", cacheSeconds: 7200, group: "inner" },
  venus: { id: "299", cacheSeconds: 7200, group: "inner" },
  earth: { id: "399", cacheSeconds: 7200, group: "inner", center: "500@10" },
  moon: { id: "301", cacheSeconds: 3600, group: "moon" },
  mars: { id: "499", cacheSeconds: 7200, group: "inner" },
  jupiter: { id: "599", cacheSeconds: 21600, group: "outer" },
  saturn: { id: "699", cacheSeconds: 21600, group: "outer" },
  uranus: { id: "799", cacheSeconds: 21600, group: "outer" },
  neptune: { id: "899", cacheSeconds: 21600, group: "outer" }
};
var CONFIG = {
  moon: { ttl: 3600, staleTtl: 86400, dataset: "JPL Horizons lunar ephemeris" },
  kp: { ttl: 600, staleTtl: 3600, dataset: "NOAA planetary K-index" },
  solarWind: { ttl: 180, staleTtl: 1800, dataset: "NOAA real-time solar wind" },
  xray: { ttl: 180, staleTtl: 1800, dataset: "NOAA GOES X-ray flux" },
  alerts: { ttl: 300, staleTtl: 3600, dataset: "NOAA SWPC alerts" },
  summary: { ttl: 180, staleTtl: 1800, dataset: "PCS NOAA space-weather summary" }
};
var SOURCE = {
  jpl: { name: "NASA/JPL Horizons", url: JPL_HORIZONS },
  noaa: { name: "NOAA Space Weather Prediction Center", url: NOAA }
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
    const horizonsDate = /* @__PURE__ */ new Date(`${month} ${day}, ${year} ${time} UTC`);
    return Number.isNaN(horizonsDate.getTime()) ? null : horizonsDate.toISOString();
  }
  const normalized = raw.replace(" ", "T").replace(/Z?$/, "Z");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
__name(iso, "iso");
function finite(value) {
  if (value === null || value === void 0 || value === "" || value === "null") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
__name(finite, "finite");
function envelope(source, dataset, timestamp, data, extras = {}) {
  return {
    success: true,
    source: source.name,
    source_url: source.url,
    dataset,
    timestamp: timestamp || null,
    retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
    data,
    status: "live",
    cache_status: "miss",
    stale: false,
    upstream_response_ms: null,
    ...extras
  };
}
__name(envelope, "envelope");
function errorEnvelope(source, dataset, message, extras = {}) {
  return {
    success: false,
    source: source.name,
    source_url: source.url,
    dataset,
    timestamp: null,
    retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
    data: null,
    status: "unavailable",
    cache_status: "miss",
    stale: false,
    upstream_response_ms: extras.upstream_response_ms ?? null,
    error: message,
    ...extras
  };
}
__name(errorEnvelope, "errorEnvelope");
function response(payload, status = 200, ttl = 0) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": ttl ? `public, max-age=${ttl}` : "no-store"
    }
  });
}
__name(response, "response");
async function timedJson(url, timeoutMs = 8e3) {
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
__name(timedJson, "timedJson");
async function readStored(env, key) {
  if (!env.PCS_CACHE) return null;
  try {
    return await env.PCS_CACHE.get(key, "json");
  } catch {
    return null;
  }
}
__name(readStored, "readStored");
async function writeStored(env, key, payload, staleTtl) {
  if (!env.PCS_CACHE) return;
  try {
    await env.PCS_CACHE.put(key, JSON.stringify(payload), { expirationTtl: staleTtl });
  } catch {
  }
}
__name(writeStored, "writeStored");
async function cachedDataset(request, env, ctx, key, config, source, loader) {
  const cache = caches.default;
  const requestUrl = new URL(request.url);
  const cacheUrl = new URL(requestUrl.pathname, requestUrl.origin);
  cacheUrl.searchParams.set("__pcs_dataset", key);
  const cacheKey = new Request(cacheUrl);
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
      writeStored(env, `astronomy:last:${key}`, payload, config.staleTtl)
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
        retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
        upstream_error: error.name === "AbortError" ? "upstream timeout" : "upstream temporarily unavailable"
      };
      return response(payload, 200, 0);
    }
    const message = error.name === "AbortError" ? "upstream timeout" : "upstream temporarily unavailable";
    return response(errorEnvelope(source, config.dataset, message), 503);
  }
}
__name(cachedDataset, "cachedDataset");
function parseHorizonsBody(result, body, center) {
  const block = result?.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/)?.[1]?.trim();
  if (!block) throw new Error("JPL Horizons body ephemeris was empty");
  const values = block.split(/\r?\n/).find((line) => line.trim()).split(",").map((value) => value.trim());
  const calculationTime = iso(values[0]);
  const apparentMagnitude = finite(values[5]);
  const illumination = finite(values[7]);
  const heliocentricAu = finite(values[8]);
  const observerAu = finite(values[10]);
  const lightTime = finite(values[12]);
  const phaseAngle = finite(values[13]);
  const auKm = 1495978707e-1;
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
      declination: values[4] || null
    }
  };
}
__name(parseHorizonsBody, "parseHorizonsBody");
async function loadBodyEphemeris(body, bodyConfig) {
  const now = /* @__PURE__ */ new Date();
  const stop = new Date(now.getTime() + 36e5);
  const center = bodyConfig.center || "500@399";
  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${bodyConfig.id}'`,
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: `'${center}'`,
    START_TIME: `'${now.toISOString()}'`,
    STOP_TIME: `'${stop.toISOString()}'`,
    STEP_SIZE: "'1 h'",
    QUANTITIES: "'1,9,10,19,20,21,24'",
    CSV_FORMAT: "'YES'",
    TIME_TYPE: "'UT'"
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
    retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
    status: "live",
    cache_status: "miss",
    stale: false,
    upstream_response_ms: ms,
    data: parsed.data
  };
}
__name(loadBodyEphemeris, "loadBodyEphemeris");
function latestRow(table) {
  if (!Array.isArray(table) || table.length < 2) return null;
  const headers = table[0];
  for (let index = table.length - 1; index > 0; index -= 1) {
    if (Array.isArray(table[index])) return Object.fromEntries(headers.map((header, i) => [header, table[index][i]]));
  }
  return null;
}
__name(latestRow, "latestRow");
function kpStatus(kp) {
  if (kp === null) return null;
  if (kp >= 8) return "severe";
  if (kp >= 7) return "strong";
  if (kp >= 5) return "storm";
  if (kp >= 4) return "active";
  return "quiet";
}
__name(kpStatus, "kpStatus");
async function loadKp() {
  const { value, ms } = await timedJson(`${NOAA}/products/noaa-planetary-k-index.json`);
  const row = latestRow(value);
  if (!row) throw new Error("NOAA Kp data was empty");
  const kp = finite(row.Kp ?? row.kp);
  const timestamp = iso(row.time_tag ?? row.timestamp);
  return envelope(SOURCE.noaa, CONFIG.kp.dataset, timestamp, {
    timestamp,
    kp,
    status: kpStatus(kp),
    data_type: "observed_or_estimated",
    unit: "index"
  }, { upstream_response_ms: ms });
}
__name(loadKp, "loadKp");
async function loadSolarWind() {
  const [plasma, magnetic] = await Promise.allSettled([
    timedJson(`${NOAA}/products/solar-wind/plasma-7-day.json`),
    timedJson(`${NOAA}/products/solar-wind/mag-7-day.json`)
  ]);
  if (plasma.status === "rejected" && magnetic.status === "rejected") throw plasma.reason;
  const p = plasma.status === "fulfilled" ? latestRow(plasma.value.value) : null;
  const m = magnetic.status === "fulfilled" ? latestRow(magnetic.value.value) : null;
  const timestamp = iso(p?.time_tag ?? m?.time_tag);
  return envelope(SOURCE.noaa, CONFIG.solarWind.dataset, timestamp, {
    timestamp,
    speed_km_s: finite(p?.speed),
    density_p_cm3: finite(p?.density),
    temperature_k: finite(p?.temperature),
    bz_nt: finite(m?.bz_gsm),
    data_type: "observed",
    units: { speed_km_s: "km/s", density_p_cm3: "protons/cm3", temperature_k: "K", bz_nt: "nT" }
  }, {
    upstream_response_ms: Math.max(plasma.value?.ms || 0, magnetic.value?.ms || 0),
    partial: plasma.status === "rejected" || magnetic.status === "rejected"
  });
}
__name(loadSolarWind, "loadSolarWind");
function flareClass(flux) {
  if (!Number.isFinite(flux) || flux <= 0) return null;
  const bands = [[1e-4, "X"], [1e-5, "M"], [1e-6, "C"], [1e-7, "B"], [1e-8, "A"]];
  const band = bands.find(([threshold]) => flux >= threshold) || [1e-8, "A"];
  return `${band[1]}${(flux / band[0]).toFixed(1)}`;
}
__name(flareClass, "flareClass");
async function loadXray() {
  const { value, ms } = await timedJson(`${NOAA}/json/goes/primary/xrays-7-day.json`);
  if (!Array.isArray(value) || !value.length) throw new Error("NOAA X-ray data was empty");
  const latestTime = value.reduce((max, row) => row.time_tag > max ? row.time_tag : max, "");
  const rows = value.filter((row) => row.time_tag === latestTime);
  const shortFlux = finite(rows.find((row) => String(row.energy).includes("0.05-0.4"))?.flux);
  const longFlux = finite(rows.find((row) => String(row.energy).includes("0.1-0.8"))?.flux);
  const timestamp = iso(latestTime);
  return envelope(SOURCE.noaa, CONFIG.xray.dataset, timestamp, {
    timestamp,
    short_channel_flux: shortFlux,
    long_channel_flux: longFlux,
    flare_class: flareClass(longFlux),
    data_type: "observed",
    unit: "W/m2"
  }, { upstream_response_ms: ms });
}
__name(loadXray, "loadXray");
function alertSeverity(productId = "") {
  const prefix = String(productId).trim().slice(0, 3).toUpperCase();
  return { WAR: "warning", WAT: "watch", ALT: "alert", SUM: "summary" }[prefix] || "information";
}
__name(alertSeverity, "alertSeverity");
async function loadAlerts() {
  const { value, ms } = await timedJson(`${NOAA}/products/alerts.json`);
  const alerts = Array.isArray(value) ? value.map((item) => ({
    issued_at: iso(item.issue_datetime),
    product_id: item.product_id || null,
    severity: alertSeverity(item.product_id),
    title: item.message?.split("\n").find(Boolean)?.trim() || item.product_id || "NOAA SWPC product",
    summary: item.message?.trim() || null,
    source_identifier: item.product_id || null,
    source_url: `${NOAA}/products/alerts.json`,
    data_type: "issued_product"
  })) : [];
  const timestamp = alerts.map((item) => item.issued_at).filter(Boolean).sort().at(-1) || null;
  return envelope(SOURCE.noaa, CONFIG.alerts.dataset, timestamp, alerts, { upstream_response_ms: ms });
}
__name(loadAlerts, "loadAlerts");
async function loadSunspots() {
  const { value, ms } = await timedJson(`${NOAA}/json/solar-cycle/observed-solar-cycle-indices.json`);
  const row = Array.isArray(value) ? value.at(-1) : null;
  return { value: finite(row?.ssn), timestamp: row?.time_tag ? iso(`${row.time_tag}-01`) : null, ms };
}
__name(loadSunspots, "loadSunspots");
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
    kp_index: k.kp ?? null,
    geomagnetic_status: k.status ?? null,
    solar_wind_speed_km_s: w.speed_km_s ?? null,
    solar_wind_density_p_cm3: w.density_p_cm3 ?? null,
    imf_bz_nt: w.bz_nt ?? null,
    xray_flux_w_m2: x.long_channel_flux ?? null,
    xray_class: x.flare_class ?? null,
    sunspot_number: s.value ?? null,
    active_alert_count: Array.isArray(a) ? a.length : null,
    observed_at: observedAt,
    retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
    data_type: "observed_summary",
    provenance: {
      kp_index: { source: SOURCE.noaa.name, time: k.timestamp ?? null, unit: "index", type: "observed_or_estimated" },
      solar_wind_speed_km_s: { source: SOURCE.noaa.name, time: w.timestamp ?? null, unit: "km/s", type: "observed" },
      solar_wind_density_p_cm3: { source: SOURCE.noaa.name, time: w.timestamp ?? null, unit: "protons/cm3", type: "observed" },
      imf_bz_nt: { source: SOURCE.noaa.name, time: w.timestamp ?? null, unit: "nT", type: "observed" },
      xray_flux_w_m2: { source: SOURCE.noaa.name, time: x.timestamp ?? null, unit: "W/m2", type: "observed" },
      xray_class: { source: "PCS derivation from NOAA GOES flux", time: x.timestamp ?? null, unit: "class", type: "calculated" },
      sunspot_number: { source: SOURCE.noaa.name, time: s.timestamp ?? null, unit: "count/index", type: "observed_monthly" },
      active_alert_count: { source: SOURCE.noaa.name, time: alerts.value?.timestamp ?? null, unit: "count", type: "issued_product" }
    }
  }, {
    upstream_response_ms: Math.max(kp.value?.upstream_response_ms || 0, wind.value?.upstream_response_ms || 0, xray.value?.upstream_response_ms || 0, alerts.value?.upstream_response_ms || 0, s.ms || 0),
    partial: [kp, wind, xray, alerts, sunspots].some((result) => result.status === "rejected")
  });
}
__name(loadSummary, "loadSummary");
function lunarApproximation(date) {
  const synodicDays = 29.530588853;
  const epoch = Date.parse("2000-01-06T18:14:00Z");
  const elapsedDays = (date.getTime() - epoch) / 864e5;
  const age = (elapsedDays % synodicDays + synodicDays) % synodicDays;
  const fraction = age / synodicDays;
  const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  return { phase_fraction: fraction, moon_age_days: age, phase_name: names[Math.floor(fraction * 8 + 0.5) % 8] };
}
__name(lunarApproximation, "lunarApproximation");
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
    distanceAu: numbers[2] ?? null
  };
}
__name(parseHorizons, "parseHorizons");
function parseHorizonsVector(result) {
  const block = result?.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/)?.[1]?.trim();
  if (!block) throw new Error("JPL Horizons vector ephemeris was empty");
  const values = block.split(/\r?\n/).find((item) => item.trim()).split(",").map((item) => item.trim());
  const vector = values.slice(2, 5).map(finite);
  if (vector.length !== 3 || vector.some((value) => value === null)) throw new Error("JPL Horizons vector was invalid");
  return vector;
}
__name(parseHorizonsVector, "parseHorizonsVector");
async function loadMoonVector(command, center, start, stop) {
  const params = new URLSearchParams({
    format: "json",
    COMMAND: `'${command}'`,
    EPHEM_TYPE: "'VECTORS'",
    CENTER: `'${center}'`,
    START_TIME: `'${start.toISOString()}'`,
    STOP_TIME: `'${stop.toISOString()}'`,
    STEP_SIZE: "'1 h'",
    VEC_TABLE: "'2'",
    OUT_UNITS: "'KM-S'",
    REF_PLANE: "'FRAME'",
    REF_SYSTEM: "'ICRF'",
    CSV_FORMAT: "'YES'",
    TIME_TYPE: "'UT'"
  });
  const result = await timedJson(`${JPL_HORIZONS}?${params}`);
  return { vector: parseHorizonsVector(result.value.result), ms: result.ms };
}
__name(loadMoonVector, "loadMoonVector");
async function loadMoon() {
  const now = /* @__PURE__ */ new Date();
  const stop = new Date(now.getTime() + 36e5);
  const params = new URLSearchParams({
    format: "json",
    COMMAND: "'301'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    START_TIME: `'${now.toISOString()}'`,
    STOP_TIME: `'${stop.toISOString()}'`,
    STEP_SIZE: "'1 h'",
    QUANTITIES: "'10,13,20'",
    CSV_FORMAT: "'YES'",
    TIME_TYPE: "'UT'"
  });
  const { value, ms } = await timedJson(`${JPL_HORIZONS}?${params}`);
  const sunVectorResult = await loadMoonVector("10", "500@301", now, stop).catch(() => null);
  const earthVectorResult = await loadMoonVector("399", "500@301", now, stop).catch(() => null);
  const eph = parseHorizons(value.result);
  const local = lunarApproximation(now);
  const vectorGeometryAvailable = Boolean(sunVectorResult?.vector && earthVectorResult?.vector);
  const data = {
    phase_name: local.phase_name,
    phase_fraction: local.phase_fraction,
    illumination_percent: eph.illumination,
    moon_age_days: local.moon_age_days,
    earth_distance_km: eph.distanceAu === null ? null : eph.distanceAu * 1495978707e-1,
    apparent_diameter_arcsec: eph.diameter,
    next_new_moon: null,
    next_full_moon: null,
    calculation_time: eph.calculationTime || now.toISOString(),
    source: SOURCE.jpl.name,
    data_status: "live",
    moon_to_sun_vector_km: sunVectorResult?.vector ?? null,
    moon_to_earth_vector_km: earthVectorResult?.vector ?? null,
    phase_geometry_source: vectorGeometryAvailable ? "NASA/JPL Horizons ICRF vectors" : "PCS UTC synodic approximation",
    phase_geometry_status: vectorGeometryAvailable ? "source-computed_ephemeris" : "approximation",
    orientation_accuracy: "simplified near-side orientation; research-grade physical libration is not implemented",
    provenance: {
      phase_name: { source: "PCS synodic approximation", time: now.toISOString(), unit: "category", type: "calculated" },
      phase_fraction: { source: "PCS synodic approximation", time: now.toISOString(), unit: "cycle fraction", type: "calculated" },
      illumination_percent: { source: SOURCE.jpl.name, time: eph.calculationTime, unit: "%", type: "source-computed_ephemeris" },
      moon_age_days: { source: "PCS synodic approximation", time: now.toISOString(), unit: "days", type: "calculated" },
      earth_distance_km: { source: SOURCE.jpl.name, time: eph.calculationTime, unit: "km", type: "source-computed_ephemeris" },
      apparent_diameter_arcsec: { source: SOURCE.jpl.name, time: eph.calculationTime, unit: "arcsec", type: "source-computed_ephemeris" },
      moon_to_sun_vector_km: { source: vectorGeometryAvailable ? SOURCE.jpl.name : null, time: vectorGeometryAvailable ? eph.calculationTime : now.toISOString(), unit: "ICRF km", type: vectorGeometryAvailable ? "source-computed_ephemeris" : "unavailable" },
      moon_to_earth_vector_km: { source: vectorGeometryAvailable ? SOURCE.jpl.name : null, time: vectorGeometryAvailable ? eph.calculationTime : now.toISOString(), unit: "ICRF km", type: vectorGeometryAvailable ? "source-computed_ephemeris" : "unavailable" },
      phase_geometry_source: { source: vectorGeometryAvailable ? SOURCE.jpl.name : "PCS UTC synodic approximation", time: vectorGeometryAvailable ? eph.calculationTime : now.toISOString(), unit: "direction", type: vectorGeometryAvailable ? "source-computed_ephemeris" : "approximation" },
      next_new_moon: { source: null, time: null, unit: "UTC", type: "unavailable" },
      next_full_moon: { source: null, time: null, unit: "UTC", type: "unavailable" }
    }
  };
  return envelope(SOURCE.jpl, CONFIG.moon.dataset, eph.calculationTime, data, {
    upstream_response_ms: Math.max(ms, sunVectorResult?.ms || 0, earthVectorResult?.ms || 0),
    partial: !vectorGeometryAvailable
  });
}
__name(loadMoon, "loadMoon");
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
      ...extras
    }
  });
}
__name(officialImageResponse, "officialImageResponse");
function hasImageSignature(bytes, contentType) {
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
  return contentType === "image/jpeg" && jpeg || contentType === "image/png" && png;
}
__name(hasImageSignature, "hasImageSignature");
async function fetchOfficialImage(url, timeoutMs = 1e4) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("upstream timeout"), timeoutMs);
  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "image/jpeg,image/png" }
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
    chunks.forEach((chunk) => {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    });
    if (!hasImageSignature(bytes, contentType)) throw new Error("upstream image signature is invalid");
    return {
      bytes,
      contentType,
      lastModified: iso(upstream.headers.get("last-modified"))
    };
  } finally {
    clearTimeout(timeout);
  }
}
__name(fetchOfficialImage, "fetchOfficialImage");
function solarObservationStatus(observedAt) {
  if (!observedAt) return "delayed";
  const ageMs = Date.now() - Date.parse(observedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) return "delayed";
  if (ageMs <= 30 * 60 * 1e3) return "live";
  if (ageMs <= 6 * 60 * 60 * 1e3) return "delayed";
  return "stale";
}
__name(solarObservationStatus, "solarObservationStatus");
function solarPublicImageUrl(request, mode, size = "full") {
  const url = new URL("/api/space-weather/solar-image", new URL(request.url).origin);
  url.searchParams.set("mode", mode);
  url.searchParams.set("format", "image");
  if (size === "thumbnail") url.searchParams.set("size", "thumbnail");
  return url.toString();
}
__name(solarPublicImageUrl, "solarPublicImageUrl");
function solarImageCacheKey(request, mode, size, stale = false) {
  const url = new URL(solarPublicImageUrl(request, mode, size));
  if (stale) url.searchParams.set("cache", "last-valid");
  return new Request(url);
}
__name(solarImageCacheKey, "solarImageCacheKey");
async function cacheSolarImage(request, ctx, mode, size, image) {
  const fresh = officialImageResponse(image, SOLAR_IMAGE_CACHE_SECONDS, { "x-pcs-image-status": "validated" });
  const stale = officialImageResponse(image, SOLAR_IMAGE_STALE_SECONDS, { "x-pcs-image-status": "last-valid" });
  ctx.waitUntil(Promise.all([
    caches.default.put(solarImageCacheKey(request, mode, size), fresh),
    caches.default.put(solarImageCacheKey(request, mode, size, true), stale)
  ]));
}
__name(cacheSolarImage, "cacheSolarImage");
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
__name(solarImageBinary, "solarImageBinary");
function solarMetadataCacheKey(request, mode) {
  const url = new URL("/api/space-weather/solar-image", new URL(request.url).origin);
  url.searchParams.set("mode", mode);
  return new Request(url);
}
__name(solarMetadataCacheKey, "solarMetadataCacheKey");
function solarMetadataPayload(request, mode, config, observedAt, status = solarObservationStatus(observedAt)) {
  return {
    success: true,
    source: config.source,
    instrument: config.instrument,
    wavelength: config.wavelength,
    observed_at: observedAt,
    retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
    status,
    image_url: solarPublicImageUrl(request, mode),
    thumbnail_url: solarPublicImageUrl(request, mode, "thumbnail"),
    product_type: "observed_image",
    mode,
    source_image_url: config.full,
    observation_time_basis: "Official upstream Last-Modified header"
  };
}
__name(solarMetadataPayload, "solarMetadataPayload");
async function solarImageMetadata(request, env, ctx, mode) {
  const config = SOLAR_IMAGE_MODES[mode];
  if (!config) {
    return response({
      success: false,
      source: null,
      instrument: null,
      wavelength: null,
      observed_at: null,
      retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
      status: "unavailable",
      image_url: null,
      thumbnail_url: null,
      product_type: "observed_image",
      error: "unsupported image mode",
      supported_modes: Object.keys(SOLAR_IMAGE_MODES)
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
      writeStored(env, `astronomy:last:solar-image:${mode}`, payload, SOLAR_IMAGE_STALE_SECONDS)
    ]));
    return result;
  } catch (error) {
    const stale = await readStored(env, `astronomy:last:solar-image:${mode}`);
    if (stale) {
      return response({
        ...stale,
        retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
        status: "stale",
        image_url: solarPublicImageUrl(request, mode),
        thumbnail_url: solarPublicImageUrl(request, mode, "thumbnail")
      });
    }
    const message = error.name === "AbortError" ? "upstream timeout" : "scientific solar image unavailable";
    return response({
      success: false,
      source: config.source,
      instrument: config.instrument,
      wavelength: config.wavelength,
      observed_at: null,
      retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
      status: "unavailable",
      image_url: null,
      thumbnail_url: null,
      product_type: "observed_image",
      error: message
    }, 503);
  }
}
__name(solarImageMetadata, "solarImageMetadata");
async function lunarImage(request, ctx) {
  const cacheKey = new Request(new URL("/api/astronomy/lunar-image", new URL(request.url).origin));
  const staleKey = new Request(`${cacheKey.url}?cache=last-valid`);
  const hit = await caches.default.match(cacheKey);
  if (hit) return hit;
  try {
    const image = await fetchOfficialImage(LUNAR_IMAGE_URL, 15e3);
    const fresh = officialImageResponse(image, 86400, {
      "x-pcs-image-status": "validated",
      "x-pcs-image-source": "USGS-LROC-WAC"
    });
    const stale = officialImageResponse(image, 604800, {
      "x-pcs-image-status": "last-valid",
      "x-pcs-image-source": "USGS-LROC-WAC"
    });
    ctx.waitUntil(Promise.all([caches.default.put(cacheKey, fresh), caches.default.put(staleKey, stale)]));
    return officialImageResponse(image, 86400, {
      "x-pcs-image-status": "validated",
      "x-pcs-image-source": "USGS-LROC-WAC"
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
__name(lunarImage, "lunarImage");
function planetPublicImageUrl(request, body) {
  const url = new URL(`/api/astronomy/planet-image/${body}`, new URL(request.url).origin);
  url.searchParams.set("format", "image");
  const version = PLANET_IMAGE_PRODUCTS[body]?.version;
  if (version) url.searchParams.set("v", version);
  return url.toString();
}
__name(planetPublicImageUrl, "planetPublicImageUrl");
function assertAllowedPlanetSource(sourceUrl) {
  const url = new URL(sourceUrl);
  if (url.protocol !== "https:" || !OFFICIAL_IMAGE_HOSTS.has(url.hostname)) {
    throw new Error("planet image source is not on the official-domain allowlist");
  }
}
__name(assertAllowedPlanetSource, "assertAllowedPlanetSource");
function planetImageCacheKey(request, body, stale = false) {
  const url = new URL(planetPublicImageUrl(request, body));
  url.searchParams.set("source", PLANET_IMAGE_PRODUCTS[body]?.sourceUrl || "unknown");
  if (stale) url.searchParams.set("cache", "last-valid");
  return new Request(url);
}
__name(planetImageCacheKey, "planetImageCacheKey");
async function cachePlanetImage(request, ctx, body, config, image) {
  const headers = { "x-pcs-image-status": "validated", "x-pcs-image-source": body };
  const fresh = officialImageResponse(image, config.cacheSeconds, headers);
  const stale = officialImageResponse(image, PLANET_IMAGE_STALE_SECONDS, { ...headers, "x-pcs-image-status": "last-valid" });
  ctx.waitUntil(Promise.all([
    caches.default.put(planetImageCacheKey(request, body), fresh),
    caches.default.put(planetImageCacheKey(request, body, true), stale)
  ]));
}
__name(cachePlanetImage, "cachePlanetImage");
async function validatedPlanetImage(request, ctx, body, config) {
  const fresh = await caches.default.match(planetImageCacheKey(request, body));
  if (fresh) return { response: fresh, status: "archival" };
  assertAllowedPlanetSource(config.sourceUrl);
  try {
    const image = await fetchOfficialImage(config.sourceUrl, 15e3);
    await cachePlanetImage(request, ctx, body, config, image);
    return {
      response: officialImageResponse(image, config.cacheSeconds, {
        "x-pcs-image-status": "validated",
        "x-pcs-image-source": body
      }),
      status: "archival"
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
__name(validatedPlanetImage, "validatedPlanetImage");
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
    retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
    status,
    image_url: planetPublicImageUrl(request, body),
    thumbnail_url: null,
    attribution: config.attribution,
    notes: config.notes ?? null,
    source_image_url: config.sourceUrl,
    catalog_url: config.catalogUrl,
    texture_version: config.version ?? null
  };
}
__name(planetMetadataPayload, "planetMetadataPayload");
async function planetImage(request, env, ctx, body) {
  const config = PLANET_IMAGE_PRODUCTS[body];
  if (!config) {
    return response({
      success: false,
      body,
      source: null,
      mission: null,
      instrument: null,
      product: null,
      product_type: null,
      projection: null,
      observed_at: null,
      product_date: null,
      retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
      status: "unavailable",
      image_url: null,
      thumbnail_url: null,
      attribution: null,
      notes: null,
      error: "unsupported body"
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
        ...stale,
        retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
        status: "stale",
        image_url: planetPublicImageUrl(request, body)
      });
    }
    const message = error.name === "AbortError" ? "upstream timeout" : "scientific planetary imagery unavailable";
    return response({
      success: false,
      body,
      source: config.source,
      mission: config.mission,
      instrument: config.instrument ?? null,
      product: config.product,
      product_type: config.productType,
      projection: config.projection,
      observed_at: config.observedAt ?? null,
      product_date: config.productDate ?? null,
      retrieved_at: (/* @__PURE__ */ new Date()).toISOString(),
      status: "unavailable",
      image_url: null,
      thumbnail_url: null,
      attribution: config.attribution,
      notes: config.notes ?? null,
      error: message
    }, 503);
  }
}
__name(planetImage, "planetImage");
async function handleAstronomyRequest(request, env, ctx) {
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
  if (path === "/api/astronomy/moon") return cachedDataset(request, env, ctx, "moon-phase3a", CONFIG.moon, SOURCE.jpl, loadMoon);
  if (path === "/api/space-weather/kp") return cachedDataset(request, env, ctx, "kp", CONFIG.kp, SOURCE.noaa, loadKp);
  if (path === "/api/space-weather/solar-wind") return cachedDataset(request, env, ctx, "solar-wind", CONFIG.solarWind, SOURCE.noaa, loadSolarWind);
  if (path === "/api/space-weather/xray") return cachedDataset(request, env, ctx, "xray", CONFIG.xray, SOURCE.noaa, loadXray);
  if (path === "/api/space-weather/alerts") return cachedDataset(request, env, ctx, "alerts", CONFIG.alerts, SOURCE.noaa, loadAlerts);
  if (path === "/api/space-weather/summary") return cachedDataset(request, env, ctx, "summary", CONFIG.summary, SOURCE.noaa, loadSummary);
  return response(errorEnvelope(SOURCE.noaa, "PCS astronomy API", "route not found"), 404);
}
__name(handleAstronomyRequest, "handleAstronomyRequest");

// src/index.js
var DATASETS2 = [
  {
    symbol: "GMST",
    url: "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv",
    parser: "gistemp",
    source: "NASA GISTEMP",
    unit: "\xB0C anomaly"
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
var POWER_PARAMS = [
  ["PRECIP", "PRECTOTCORR", "mm/day"],
  ["CLOUD", "CLOUD_AMT", "%"],
  ["UV", "ALLSKY_SFC_UV_INDEX", "index"],
  ["RAD", "ALLSKY_SFC_SW_DWN", "kWh/m2/day"]
];
var EXTRA_STATIC_OBSERVATIONS = [
  {
    symbol: "SST",
    value: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "NOAA OISST",
    note: "registered_pending_connector"
  },
  {
    symbol: "GMSL",
    value: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "NASA Sea Level",
    note: "registered_pending_connector"
  },
  {
    symbol: "OHC",
    value: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "NOAA Ocean Heat Content",
    note: "registered_pending_connector"
  },
  {
    symbol: "ARCTIC_ICE",
    value: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "NSIDC Sea Ice",
    note: "registered_pending_connector"
  },
  {
    symbol: "NDVI",
    value: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "NASA MODIS NDVI",
    note: "registered_pending_connector"
  },
  {
    symbol: "FIRE",
    value: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "NASA FIRMS",
    note: "registered_pending_connector"
  },
  {
    symbol: "POP",
    value: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "World Bank Population",
    note: "registered_pending_connector"
  },
  {
    symbol: "ENERGY",
    value: null,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    source: "Energy Institute",
    note: "registered_pending_connector"
  }
];
function json2(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    }
  });
}
__name(json2, "json");
var OPENWEATHER_LAYERS = {
  clouds: "clouds_new",
  rain: "precipitation_new",
  temperature: "temp_new",
  wind: "wind_new"
};
function tileResponse(body, status = 200, contentType = "image/png") {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType,
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=600"
    }
  });
}
__name(tileResponse, "tileResponse");
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
  const testUrl = `https://tile.openweathermap.org/map/${OPENWEATHER_LAYERS.clouds}/1/1/1.png?appid=${apiKey}`;
  try {
    const response2 = await fetch(testUrl);
    return {
      key_configured: true,
      upstream_status: response2.status,
      upstream_ok: response2.ok,
      error_message: response2.ok ? null : "OpenWeather health tile request failed"
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
__name(openWeatherHealth, "openWeatherHealth");
async function openWeatherTile(request, env) {
  const apiKey = env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return json2({ error: "OPENWEATHER_API_KEY is not configured" }, 500);
  }
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const layerKey = parts[2];
  const z = parts[3];
  const x = parts[4];
  const rawY = parts[5];
  const y = rawY ? rawY.replace(/\.png$/i, "") : rawY;
  const openWeatherLayer = OPENWEATHER_LAYERS[layerKey];
  if (!openWeatherLayer || !z || !x || !y) {
    return json2({
      error: "Invalid OpenWeather tile path",
      expected: "/tiles/openweather/:layer/:z/:x/:y.png",
      layers: Object.keys(OPENWEATHER_LAYERS)
    }, 400);
  }
  const tileUrl = `https://tile.openweathermap.org/map/${openWeatherLayer}/${z}/${x}/${y}.png?appid=${apiKey}`;
  const response2 = await fetch(tileUrl);
  if (!response2.ok) {
    return json2({
      error: "OpenWeather tile request failed",
      layer: layerKey,
      upstream_layer: openWeatherLayer,
      upstream_status: response2.status
    }, response2.status);
  }
  return tileResponse(await response2.arrayBuffer(), 200, response2.headers.get("content-type") || "image/png");
}
__name(openWeatherTile, "openWeatherTile");
function latestNumericFromCsv(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
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
__name(latestNumericFromCsv, "latestNumericFromCsv");
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
__name(latestGistemp, "latestGistemp");
async function upsertObservation(env, symbol, value, timestamp, sourceName, uncertainty = null) {
  const variable = await env.PCS_DB.prepare("SELECT id FROM pcs_variables WHERE symbol = ? LIMIT 1").bind(symbol).first();
  if (!variable) {
    return { symbol, imported: false, reason: "variable_not_found" };
  }
  const source = await env.PCS_DB.prepare("SELECT id FROM pcs_sources WHERE name = ? LIMIT 1").bind(sourceName).first();
  if (!source) {
    return { symbol, imported: false, reason: "source_not_found" };
  }
  await env.PCS_DB.prepare(`
      INSERT INTO pcs_observations
      (variable_id, region_id, timestamp, value, uncertainty, source_id)
      VALUES (?, 1, ?, ?, ?, ?)
    `).bind(variable.id, timestamp, value, uncertainty, source.id).run();
  return { symbol, imported: true, value, timestamp, source: sourceName };
}
__name(upsertObservation, "upsertObservation");
async function ingestCore(env) {
  const imported = [];
  for (const dataset of DATASETS2) {
    try {
      const response2 = await fetch(dataset.url, { cf: { cacheTtl: 0 } });
      const text = await response2.text();
      const parsed = dataset.parser === "gistemp" ? latestGistemp(text) : latestNumericFromCsv(text);
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
  const end = /* @__PURE__ */ new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1e3);
  const startStr = start.toISOString().slice(0, 10).replaceAll("-", "");
  const endStr = end.toISOString().slice(0, 10).replaceAll("-", "");
  for (const [symbol, parameter, unit] of POWER_PARAMS) {
    try {
      const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${parameter}&community=RE&longitude=0&latitude=0&start=${startStr}&end=${endStr}&format=JSON`;
      const response2 = await fetch(url, { cf: { cacheTtl: 0 } });
      const data = await response2.json();
      const series = data?.properties?.parameter?.[parameter] || {};
      const entries = Object.entries(series).filter(([, value]) => Number.isFinite(Number(value))).sort(([a], [b]) => a.localeCompare(b));
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
__name(ingestCore, "ingestCore");
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
  const connected = observations.filter((v) => v.value !== null && v.value !== void 0);
  const by = Object.fromEntries(observations.map((o) => [o.symbol, o]));
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    latest_year: (/* @__PURE__ */ new Date()).getFullYear(),
    projections: {
      L_T: by.GMST?.value ?? by.SST?.value ?? null,
      L_C: by.CO2?.value ?? by.CH4?.value ?? null,
      L_S: by.ARCTIC_ICE?.value ?? by.GMSL?.value ?? null,
      L_I: by.NDVI?.value ?? null
    },
    observations
  };
}
__name(latestState, "latestState");
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (ASTRONOMY_ROUTES.includes(url.pathname) || url.pathname.startsWith("/api/astronomy/body/") || url.pathname.startsWith("/api/astronomy/planet-image/")) {
      return handleAstronomyRequest(request, env, ctx);
    }
    if (url.pathname === "/api/nasa/status" || url.pathname.startsWith("/api/nasa/")) {
      return handleNasaRequest(request, env, ctx);
    }
    if (url.pathname === "/health/openweather") {
      return json2(await openWeatherHealth(env));
    }
    if (url.pathname.startsWith("/tiles/openweather/")) {
      return openWeatherTile(request, env);
    }
    if (url.pathname === "/ingest/v1") {
      const secret = env.INGEST_SECRET;
      if (!secret) {
        return json2({ error: "INGEST_SECRET is not configured on the worker" }, 500);
      }
      const authHeader = request.headers.get("Authorization") ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const encoder = new TextEncoder();
      const tokenBytes = encoder.encode(token);
      const secretBytes = encoder.encode(secret);
      let tokensMatch = false;
      if (tokenBytes.byteLength === secretBytes.byteLength) {
        tokensMatch = crypto.subtle.timingSafeEqual(tokenBytes, secretBytes);
      }
      if (!tokensMatch) {
        return json2({ error: "Unauthorized" }, 401);
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
      return json2({
        status: "ok",
        imported_count: imported.filter((x) => x.imported).length,
        results: imported
      });
    }
    if (url.pathname === "/latest") {
      return json2(await latestState(env));
    }
    if (url.pathname === "/variables") {
      const { results } = await env.PCS_DB.prepare("SELECT * FROM pcs_variables ORDER BY id").all();
      return json2(results);
    }
    return json2({
      status: "ok",
      service: "pcs-backend",
      endpoints: [
        "/latest",
        "/variables",
        "/ingest/v1",
        "/health/openweather",
        "/tiles/openweather/clouds/1/1/1.png",
        "/api/nasa/status",
        ...NASA_DATASET_ROUTES,
        ...ASTRONOMY_ROUTES
      ],
      d1: !!env.PCS_DB,
      kv: !!env.PCS_CACHE
    });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-a6Jk26/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-a6Jk26/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
