import test from "node:test";
import assert from "node:assert/strict";
import { handleAstronomyRequest, JPL_BODY_CONFIG, PLANET_IMAGE_PRODUCTS, SOLAR_IMAGE_MODES } from "../src/astronomy.js";

function memoryEnvironment(seed = {}) {
  const kv = new Map(Object.entries(seed));
  const cache = new Map();
  globalThis.caches = { default: {
    async match(key) { return cache.get(key.url)?.clone() || null; },
    async put(key, value) { cache.set(key.url, value.clone()); },
  } };
  return {
    env: { PCS_CACHE: {
      async get(key, type) { const value = kv.get(key); return type === "json" && value ? JSON.parse(value) : value || null; },
      async put(key, value) { kv.set(key, value); },
    } },
    ctx: { waitUntil(promise) { return promise; } },
    cache,
  };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function jpegResponse(lastModified = "Mon, 13 Jul 2026 05:10:05 GMT") {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
  return new Response(bytes, {
    status: 200,
    headers: { "content-type": "image/jpeg", "content-length": String(bytes.byteLength), "last-modified": lastModified },
  });
}

function pngResponse() {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  return new Response(bytes, { status: 200, headers: { "content-type": "image/png" } });
}

test("Moon route normalizes JPL ephemeris and labels local calculations", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => jsonResponse({ result: "$$SOE\n2026-07-13T00:00:00, 42.5, 1850.2, 0.00257\n$$EOE" });
  const { env, ctx } = memoryEnvironment();
  const response = await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/moon"), env, ctx);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.illumination_percent, 42.5);
  assert.ok(payload.data.earth_distance_km > 380000);
  assert.equal(payload.data.provenance.phase_fraction.type, "calculated");
  assert.equal(payload.data.provenance.earth_distance_km.type, "source-computed_ephemeris");
  assert.equal(payload.data.next_new_moon, null);
  assert.equal(payload.data.phase_geometry_status, "approximation");
  assert.equal(payload.partial, true);
});

test("Moon route prefers JPL ICRF vectors for phase geometry", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url) => {
    const requestUrl = new URL(String(url));
    if (requestUrl.searchParams.get("EPHEM_TYPE") === "'VECTORS'") {
      const command = requestUrl.searchParams.get("COMMAND");
      const vector = command === "'10'" ? "149000000, 1200000, 800000" : "-380000, 12000, 4000";
      return jsonResponse({ result: `$$SOE\n2461234.5, A.D. 2026-Jul-13 00:00:00.0000, ${vector}, 0, 0, 0\n$$EOE` });
    }
    return jsonResponse({ result: "$$SOE\n2026-07-13T00:00:00, 42.5, 1850.2, 0.00257\n$$EOE" });
  };
  const { env, ctx } = memoryEnvironment();
  const response = await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/moon"), env, ctx);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload.data.moon_to_sun_vector_km, [149000000, 1200000, 800000]);
  assert.deepEqual(payload.data.moon_to_earth_vector_km, [-380000, 12000, 4000]);
  assert.equal(payload.data.phase_geometry_status, "source-computed_ephemeris");
  assert.equal(payload.partial, false);
});

test("Moon failure returns unavailable without fabricated values", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new Error("offline"); };
  const { env, ctx } = memoryEnvironment();
  const response = await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/moon"), env, ctx);
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.equal(payload.data, null);
  assert.equal(payload.status, "unavailable");
});

test("Solar image metadata validates every official product and exposes only Worker image URLs", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requested = [];
  globalThis.fetch = async (url) => { requested.push(String(url)); return jpegResponse(); };
  for (const [mode, config] of Object.entries(SOLAR_IMAGE_MODES)) {
    const { env, ctx } = memoryEnvironment();
    const request = new Request(`https://worker.test/api/space-weather/solar-image?mode=${mode}`);
    const response = await handleAstronomyRequest(request, env, ctx);
    const payload = await response.json();
    assert.equal(response.status, 200, mode);
    assert.equal(payload.success, true, mode);
    assert.equal(payload.product_type, "observed_image", mode);
    assert.equal(payload.instrument, config.instrument, mode);
    assert.equal(payload.observed_at, "2026-07-13T05:10:05.000Z", mode);
    assert.equal(payload.image_url, `https://worker.test/api/space-weather/solar-image?mode=${mode}&format=image`, mode);
    assert.equal(payload.source_image_url, config.full, mode);
    assert.equal(requested.at(-1), config.full, mode);
  }
});

test("Solar binary proxy returns a validated image and rejects an HTML 200 response", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => jpegResponse();
  const valid = memoryEnvironment();
  const imageResponse = await handleAstronomyRequest(new Request("https://worker.test/api/space-weather/solar-image?mode=aia-171&format=image"), valid.env, valid.ctx);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/jpeg");
  assert.equal(imageResponse.headers.get("access-control-allow-origin"), "*");
  globalThis.fetch = async () => new Response("<html>upstream error</html>", { status: 200, headers: { "content-type": "text/html" } });
  const invalid = memoryEnvironment();
  const rejected = await handleAstronomyRequest(new Request("https://worker.test/api/space-weather/solar-image?mode=aia-193&format=image"), invalid.env, invalid.ctx);
  assert.equal(rejected.status, 503);
  assert.equal((await rejected.json()).status, "unavailable");
});

test("Solar metadata uses bounded last-valid stale fallback", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new Error("offline"); };
  const stored = {
    success: true, source: "NASA Solar Dynamics Observatory", instrument: "SDO/HMI", wavelength: "6173 Å continuum",
    observed_at: "2026-07-12T00:00:00.000Z", retrieved_at: "2026-07-12T00:01:00.000Z", status: "live",
    image_url: "https://old.test/image", thumbnail_url: "https://old.test/thumb", product_type: "observed_image", mode: "hmi-continuum",
  };
  const { env, ctx } = memoryEnvironment({ "astronomy:last:solar-image:hmi-continuum": JSON.stringify(stored) });
  const response = await handleAstronomyRequest(new Request("https://worker.test/api/space-weather/solar-image?mode=hmi-continuum"), env, ctx);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.status, "stale");
  assert.match(payload.image_url, /^https:\/\/worker\.test\/api\/space-weather\/solar-image/);
});

test("Lunar image proxy validates PNG content and sets scientific attribution headers", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => pngResponse();
  const { env, ctx } = memoryEnvironment();
  const response = await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/lunar-image"), env, ctx);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("x-pcs-image-source"), "USGS-LROC-WAC");
});

test("Planet image route validates every fixed official product and normalizes metadata", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requested = [];
  globalThis.fetch = async (url) => { requested.push(String(url)); return jpegResponse(); };
  for (const [body, config] of Object.entries(PLANET_IMAGE_PRODUCTS)) {
    const { env, ctx } = memoryEnvironment();
    const response = await handleAstronomyRequest(new Request(`https://worker.test/api/astronomy/planet-image/${body}`), env, ctx);
    const payload = await response.json();
    assert.equal(response.status, 200, body);
    assert.equal(payload.success, true, body);
    assert.equal(payload.body, body, body);
    assert.equal(payload.source, config.source, body);
    assert.equal(payload.instrument, config.instrument ?? null, body);
    assert.equal(payload.observed_at, config.observedAt ?? null, body);
    assert.equal(payload.product_date, config.productDate ?? null, body);
    assert.equal(payload.status, "archival", body);
    const expectedImageUrl = new URL(`https://worker.test/api/astronomy/planet-image/${body}`);
    expectedImageUrl.searchParams.set("format", "image");
    if (config.version) expectedImageUrl.searchParams.set("v", config.version);
    assert.equal(payload.image_url, expectedImageUrl.toString(), body);
    if (config.textureVariants) {
      assert.equal(payload.thumbnail_url, payload.texture_variants[0].image_url, body);
      assert.deepEqual(payload.source_texture_resolution, {
        width: config.sourceWidth,
        height: config.sourceHeight,
      }, body);
    } else {
      assert.equal(payload.thumbnail_url, null, body);
    }
    assert.match(config.sourceUrl, /^https:\/\/(astrogeology\.usgs\.gov|planetarymaps\.usgs\.gov|photojournal\.jpl\.nasa\.gov|assets\.science\.nasa\.gov)\//, body);
    assert.equal(requested.at(-1), config.sourceUrl, body);
  }
});

test("Mercury exposes only official May 2013 MESSENGER progressive textures", async (t) => {
  const mercury = PLANET_IMAGE_PRODUCTS.mercury;
  assert.equal(mercury.version, "mercury-mdis-may2013-1");
  assert.match(mercury.masterSourceUrl, /Mercury_MESSENGER_mosaic_global_250m_2013\.tif$/);
  assert.deepEqual(mercury.textureVariants.map(({ width, height }) => [width, height]), [
    [2048, 1024], [4096, 2048], [8192, 4096],
  ]);
  mercury.textureVariants.forEach((variant) => {
    const urls = variant.sourceUrls || [variant.sourceUrl];
    urls.forEach((url) => {
      assert.match(url, /LAYERS=MESSENGER_May2013/);
      assert.doesNotMatch(url, /moon|lroc|mariner/i);
    });
  });
  assert.equal(mercury.textureVariants[2].assembly, "horizontal");
  assert.equal(mercury.textureVariants[2].sourceUrls.length, 2);

  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let requested = null;
  globalThis.fetch = async (url) => { requested = String(url); return jpegResponse(); };
  const { env, ctx } = memoryEnvironment();
  const response = await handleAstronomyRequest(new Request(
    "https://worker.test/api/astronomy/planet-image/mercury?format=image&width=8192",
  ), env, ctx);
  assert.equal(response.status, 200);
  assert.equal(requested, mercury.textureVariants[2].sourceUrls[0]);
});

test("Venus uses the versioned globe-safe USGS topographic browse mosaic", () => {
  const venus = PLANET_IMAGE_PRODUCTS.venus;
  assert.equal(venus.projection, "equirectangular");
  assert.equal(venus.version, "venus-mosaic-2");
  assert.match(venus.product, /Global C3-MDIR Colorized Topographic Mosaic 6600m/);
  assert.match(venus.sourceUrl, /venus_magellan_c3-mdir_clrtopo_global_mosaic_1024\.jpg$/);
  assert.doesNotMatch(venus.sourceUrl, /\/full\.jpg$/);
});

test("Planet binary proxy serves validated bytes and rejects HTML error pages", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => jpegResponse();
  const valid = memoryEnvironment();
  const image = await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/planet-image/mars?format=image"), valid.env, valid.ctx);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/jpeg");
  assert.equal(image.headers.get("x-pcs-image-status"), "validated");
  assert.equal(image.headers.get("access-control-allow-origin"), "*");

  globalThis.fetch = async () => new Response("<html>not an image</html>", { status: 200, headers: { "content-type": "text/html" } });
  const invalid = memoryEnvironment();
  const rejected = await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/planet-image/venus?format=image"), invalid.env, invalid.ctx);
  assert.equal(rejected.status, 503);
  assert.equal((await rejected.json()).status, "unavailable");
});

test("Unsupported planet imagery returns the complete null-safe unavailable schema", async () => {
  const { env, ctx } = memoryEnvironment();
  const response = await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/planet-image/pluto"), env, ctx);
  const payload = await response.json();
  assert.equal(response.status, 404);
  assert.equal(payload.success, false);
  assert.equal(payload.source, null);
  assert.equal(payload.instrument, null);
  assert.equal(payload.image_url, null);
  assert.equal(payload.product_date, null);
  assert.equal(payload.status, "unavailable");
});

test("NOAA timeout is normalized as unavailable", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new DOMException("timed out", "AbortError"); };
  const { env, ctx } = memoryEnvironment();
  const response = await handleAstronomyRequest(new Request("https://worker.test/api/space-weather/xray"), env, ctx);
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.equal(payload.error, "upstream timeout");
  assert.equal(payload.data, null);
});

test("Kp cache hit avoids a second upstream request", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return jsonResponse([["time_tag", "Kp"], ["2026-07-13 00:00:00.000", "4.67"]]); };
  const { env, ctx } = memoryEnvironment();
  const request = new Request("https://worker.test/api/space-weather/kp");
  const first = await handleAstronomyRequest(request, env, ctx);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const second = await handleAstronomyRequest(request, env, ctx);
  assert.equal((await first.json()).data.kp, 4.67);
  assert.equal((await second.json()).cache_status, "hit");
  assert.equal(calls, 1);
});

test("Stale last-valid payload is clearly delayed after upstream failure", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new Error("offline"); };
  const stale = { success: true, source: "NOAA Space Weather Prediction Center", dataset: "NOAA planetary K-index", timestamp: "2026-07-12T00:00:00Z", retrieved_at: "2026-07-12T00:00:01Z", data: { kp: 3 }, status: "live" };
  const { env, ctx } = memoryEnvironment({ "astronomy:last:kp": JSON.stringify(stale) });
  const response = await handleAstronomyRequest(new Request("https://worker.test/api/space-weather/kp"), env, ctx);
  const payload = await response.json();
  assert.equal(payload.status, "delayed");
  assert.equal(payload.cache_status, "stale");
  assert.equal(payload.stale, true);
  assert.equal(payload.data.kp, 3);
});

test("Solar summary tolerates partial NOAA field failure and leaves missing fields null", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url) => {
    const path = String(url);
    if (path.includes("noaa-planetary")) return jsonResponse([["time_tag", "Kp"], ["2026-07-13 00:00:00.000", "2"]]);
    if (path.includes("plasma")) return jsonResponse([["time_tag", "density", "speed", "temperature"], ["2026-07-13 00:01:00.000", "5", "420", "90000"]]);
    if (path.includes("mag-7")) return jsonResponse([["time_tag", "bx_gsm", "by_gsm", "bz_gsm"], ["2026-07-13 00:01:00.000", "1", "2", "-3"]]);
    throw new Error("partial outage");
  };
  const { env, ctx } = memoryEnvironment();
  const response = await handleAstronomyRequest(new Request("https://worker.test/api/space-weather/summary"), env, ctx);
  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.equal(payload.partial, true);
  assert.equal(payload.data.solar_wind_speed_km_s, 420);
  assert.equal(payload.data.xray_flux_w_m2, null);
  assert.equal(payload.data.active_alert_count, null);
});

const BODY_RESULT = { result: "$$SOE\n2026-07-13T00:00:00, , , 12 00 00.00, -10 00 00.0, -1.2, 5.0, 75.5, 1.5, 0.0, 2.5, 0.0, 20.8, 35.0\n$$EOE" };

test("Shared body route supports every configured JPL target ID", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requested = [];
  globalThis.fetch = async (url) => { requested.push(String(url)); return jsonResponse(BODY_RESULT); };
  for (const [body, config] of Object.entries(JPL_BODY_CONFIG)) {
    const { env, ctx } = memoryEnvironment();
    const response = await handleAstronomyRequest(new Request(`https://worker.test/api/astronomy/body/${body}`), env, ctx);
    const payload = await response.json();
    assert.equal(response.status, 200, body);
    assert.equal(payload.body, body);
    assert.equal(payload.dataset, "body_ephemeris");
    assert.equal(payload.status, "live");
    assert.equal(payload.data.right_ascension, "12 00 00.00");
    assert.ok(requested.at(-1).includes(`COMMAND=%27${config.id}%27`), body);
  }
});

test("Body route preserves missing Horizons fields as null", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => jsonResponse({ result: "$$SOE\n2026-07-13T00:00:00, , , 12 00 00.00, -10 00 00.0, n.a., 5.0, n.a., 1.5, 0.0, 2.5, 0.0, n.a., 35.0\n$$EOE" });
  const { env, ctx } = memoryEnvironment();
  const payload = await (await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/body/mars"), env, ctx)).json();
  assert.ok(payload.data.earth_distance_km > 300000000);
  assert.equal(payload.data.apparent_magnitude, null);
  assert.equal(payload.data.illumination_percent, null);
  assert.equal(payload.data.light_time_minutes, null);
  assert.equal(payload.data.phase_angle_deg, 35);
});

test("Body timeout and stale fallback use normalized statuses", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new DOMException("timed out", "AbortError"); };
  const unavailable = memoryEnvironment();
  const failed = await (await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/body/neptune"), unavailable.env, unavailable.ctx)).json();
  assert.equal(failed.status, "unavailable");
  const stalePayload = { success: true, source: "NASA/JPL Horizons", dataset: "body_ephemeris", body: "neptune", observed_at: "2026-07-12T00:00:00Z", retrieved_at: "2026-07-12T00:01:00Z", status: "live", data: { earth_distance_km: 1 } };
  const stale = memoryEnvironment({ "astronomy:last:body:neptune": JSON.stringify(stalePayload) });
  const delayed = await (await handleAstronomyRequest(new Request("https://worker.test/api/astronomy/body/neptune"), stale.env, stale.ctx)).json();
  assert.equal(delayed.status, "stale");
  assert.equal(delayed.cache_status, "stale");
});

test("Body endpoint cache hit avoids a second Horizons request", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return jsonResponse(BODY_RESULT); };
  const { env, ctx } = memoryEnvironment();
  const request = new Request("https://worker.test/api/astronomy/body/venus");
  await handleAstronomyRequest(request, env, ctx);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const payload = await (await handleAstronomyRequest(request, env, ctx)).json();
  assert.equal(payload.cache_status, "hit");
  assert.equal(calls, 1);
});
