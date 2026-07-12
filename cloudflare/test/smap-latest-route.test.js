import assert from "node:assert/strict";
import test from "node:test";

const worker = await import("../src/index.js");
const originalFetch = globalThis.fetch;
const SMAP_CONCEPT_ID = "C3480440870-NSIDC_CPRD";

function smapGranule(timeStart = "2026-07-10T03:00:00.000Z") {
  return {
    id: "G1234567890-NSIDC_CPRD",
    title: "SMAP_L4_SM_gph_20260710T030000_Vv8030_001.h5",
    time_start: timeStart,
    time_end: "2026-07-10T05:59:59.000Z",
    updated: "2026-07-10T07:00:00.000Z",
    granule_size: 42.5,
    links: [
      {
        rel: "http://esipfed.org/ns/fedsearch/1.1/data#",
        href: "https://example.earthdata.nasa.gov/SMAP_L4_SM_gph.h5"
      },
      {
        rel: "http://esipfed.org/ns/fedsearch/1.1/browse#",
        href: "https://example.earthdata.nasa.gov/SMAP_L4_SM_gph.png"
      }
    ]
  };
}

function mockGranuleFetch(resolver, calls) {
  globalThis.fetch = async (url) => {
    const requestUrl = typeof url === "string" ? url : url.url;
    calls.push(requestUrl);

    if (!requestUrl.includes("/search/granules.json")) {
      return Response.json({ error: "unexpected mock URL" }, { status: 500 });
    }

    return Response.json({
      feed: {
        entry: resolver(requestUrl, calls.length)
      }
    });
  };
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function requestSmapLatest(path, resolver) {
  const calls = [];
  mockGranuleFetch(resolver, calls);

  const response = await worker.default.fetch(
    new Request(`https://pcs.example${path}`),
    { EARTHDATA_TOKEN: "test-token" },
    {}
  );
  const body = await response.json();

  return { response, body, calls };
}

function assertLatestOk(response, body, fallbackWindow) {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-PCS-Route-Version"), "smap-latest-v2");
  assert.equal(body.success, true);
  assert.equal(body.status, "ok");
  assert.equal(body.source, "NASA Earthdata");
  assert.equal(body.dataset, "SMAP");
  assert.equal(body.product, "SPL4SMGP");
  assert.equal(body.version, "008");
  assert.equal(body.concept_id, SMAP_CONCEPT_ID);
  assert.equal(body.fallback_window, fallbackWindow);
  assert.equal(body.latest_granule_time, "2026-07-10T03:00:00.000Z");
  assert.equal(body.count, 1);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].download_links.length, 1);
  assert.equal(body.data[0].browse_links.length, 1);
}

test("GET /api/nasa/smap/latest returns 48-hour success", async () => {
  const { response, body, calls } = await requestSmapLatest(
    "/api/nasa/smap/latest?end=2026-07-12T00:00:00.000Z",
    () => [smapGranule()]
  );

  assertLatestOk(response, body, "48_hours");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes(`collection_concept_id=${SMAP_CONCEPT_ID}`));
  assert.ok(calls[0].includes("page_size=5"));
  assert.ok(calls[0].includes("temporal="));
});

test("GET /api/nasa/smap/latest falls back from 48 hours to 7 days", async () => {
  const { response, body, calls } = await requestSmapLatest(
    "/api/nasa/smap/latest?end=2026-07-12T00:00:00.000Z",
    (_url, callNumber) => callNumber === 2 ? [smapGranule()] : []
  );

  assertLatestOk(response, body, "7_days");
  assert.equal(calls.length, 2);
  assert.ok(calls.every((url) => url.includes("temporal=")));
});

test("GET /api/nasa/smap/latest falls back to latest available without temporal filter", async () => {
  const { response, body, calls } = await requestSmapLatest(
    "/api/nasa/smap/latest?end=2026-07-12T00:00:00.000Z",
    (_url, callNumber) => callNumber === 4 ? [smapGranule()] : []
  );

  assertLatestOk(response, body, "latest_available");
  assert.equal(calls.length, 4);
  assert.ok(calls.slice(0, 3).every((url) => url.includes("temporal=")));
  assert.ok(!calls[3].includes("temporal="));
  assert.equal(body.requested_start, null);
  assert.equal(body.requested_end, null);
});

test("GET /api/nasa/smap/latest relaxes bounding_box when spatial results are empty", async () => {
  const { response, body, calls } = await requestSmapLatest(
    "/api/nasa/smap/latest?bounding_box=118,20,123,26&end=2026-07-12T00:00:00.000Z",
    (url) => url.includes("bounding_box=") ? [] : [smapGranule()]
  );

  assertLatestOk(response, body, "48_hours");
  assert.equal(body.spatial_filter_relaxed, true);
  assert.equal(calls.length, 5);
  assert.ok(calls.slice(0, 4).every((url) => url.includes("bounding_box=118%2C20%2C123%2C26")));
  assert.ok(!calls[4].includes("bounding_box="));
});

test("GET /api/nasa/smap/latest returns successful no_results after all fallbacks are empty", async () => {
  const { response, body, calls } = await requestSmapLatest(
    "/api/nasa/smap/latest?end=2026-07-12T00:00:00.000Z",
    () => []
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-PCS-Route-Version"), "smap-latest-v2");
  assert.equal(body.success, true);
  assert.equal(body.status, "no_results");
  assert.equal(body.count, 0);
  assert.deepEqual(body.data, []);
  assert.deepEqual(body.fallback_windows_checked, [
    "48_hours",
    "7_days",
    "30_days",
    "latest_available"
  ]);
  assert.equal(calls.length, 4);
});
