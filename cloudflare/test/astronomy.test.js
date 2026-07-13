import test from "node:test";
import assert from "node:assert/strict";
import { handleAstronomyRequest, JPL_BODY_CONFIG } from "../src/astronomy.js";

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
