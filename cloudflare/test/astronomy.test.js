import test from "node:test";
import assert from "node:assert/strict";
import { handleAstronomyRequest } from "../src/astronomy.js";

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
