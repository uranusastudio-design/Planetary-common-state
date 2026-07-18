import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { PROVIDER_ADAPTERS, domainReadiness, probeAdapter } from "../src/providers/registry.js";
import { eventSimilarity, gatheringRisk } from "../src/pcs/routes.js";

test("temperature route and legacy temp alias both proxy temp_new with server-side key", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { "content-type": "image/png" } });
  };
  try {
    for (const layer of ["temperature", "temp"]) {
      const response = await worker.fetch(new Request(`https://pcs.test/tiles/openweather/${layer}/1/1/1.png`), { OPENWEATHER_API_KEY: "secret-key" }, {});
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
    }
    assert.equal(requests.length, 2);
    for (const url of requests) {
      assert.match(url, /tile\.openweathermap\.org\/map\/temp_new\/1\/1\/1\.png\?appid=secret-key$/);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test("unknown OpenWeather layer remains an explicit 400", async () => {
  const response = await worker.fetch(new Request("https://pcs.test/tiles/openweather/not-a-layer/1/1/1.png"), { OPENWEATHER_API_KEY: "secret-key" }, {});
  assert.equal(response.status, 400);
  assert.match(await response.text(), /Invalid OpenWeather tile path/);
});

test("NHC GIS proxy allows only official KMZ archives and adds public CORS", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://www.nhc.noaa.gov/storm_graphics/api/EP052026_012adv_TRACK.kmz");
    return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01]), { status: 200, headers: { "content-type": "application/octet-stream" } });
  };
  try {
    const official = encodeURIComponent("https://www.nhc.noaa.gov/storm_graphics/api/EP052026_012adv_TRACK.kmz");
    const response = await worker.fetch(new Request(`https://pcs.test/api/layers/nhc-gis?url=${official}`), {}, {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/vnd.google-earth.kmz");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    const denied = await worker.fetch(new Request(`https://pcs.test/api/layers/nhc-gis?url=${encodeURIComponent("https://example.test/file.kmz")}`), {}, {});
    assert.equal(denied.status, 400);
  } finally { globalThis.fetch = originalFetch; }
});

test("provider adapters expose the complete replaceable metadata contract", async () => {
  const item = await probeAdapter(PROVIDER_ADAPTERS.find((entry) => entry.id === "usgs-earthquakes"), {}, async () => new Response("{}", { status: 200, headers: { "last-modified": "Thu, 16 Jul 2026 00:00:00 GMT" } }), new Date("2026-07-16T01:00:00Z"));
  for (const key of ["provider", "dataset", "endpoint", "timestamp", "latency", "quality_flag", "uncertainty", "license"]) assert.ok(Object.hasOwn(item, key), key);
  assert.equal(item.status, "live");
  assert.equal(item.latency, 60);
});

test("domain connected counts are derived from adapter results", async () => {
  const result = await domainReadiness({ PCS_DB: {}, OPENWEATHER_API_KEY: "configured" }, async () => new Response("{}", { status: 200 }), new Date("2026-07-16T01:00:00Z"));
  assert.equal(result.datasets.length, PROVIDER_ADAPTERS.length);
  for (const domain of result.domains) {
    assert.equal(domain.total, domain.datasets.length);
    assert.equal(domain.connected, domain.datasets.filter((item) => ["connected", "live", "delayed", "partial"].includes(item.status)).length);
  }
});

test("event matching requires compatible geography, time, type, and title evidence", () => {
  const base = { title: "Regional heat dome warning", region: "Colorado", event_type: "heat_dome", observed_event_time: "2026-07-10T00:00:00Z" };
  assert.ok(eventSimilarity(base, { ...base, title: "Colorado regional heat dome" }) >= 0.5);
  assert.ok(eventSimilarity(base, { title: "Distant earthquake", region: "Japan", event_type: "earthquake", observed_event_time: "2025-01-01T00:00:00Z" }) < 0.5);
});

test("gathering risk is computed only when every aggregate factor is available", () => {
  assert.equal(gatheringRisk({ hazard_index: 0.5, crowd_density: 0.4, vulnerability: 0.3, exposure_duration: 0.2 }), 0.012);
  assert.equal(gatheringRisk({ hazard_index: 0.5, crowd_density: null, vulnerability: 0.3, exposure_duration: 0.2 }), null);
});
