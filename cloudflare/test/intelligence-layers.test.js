import test from "node:test";
import assert from "node:assert/strict";
import { PCS_LAYER_ADAPTERS, retrieveLayer } from "../src/providers/layers.js";
import { ingestDailyBrief, proposeAiAnalysis } from "../src/pcs/intelligence.js";
import { residualState, validationEvidenceSufficient } from "../src/pcs/routes.js";

test("layer adapters expose the complete observation contract", async () => {
  const adapter = PCS_LAYER_ADAPTERS.find((item) => item.id === "global-temperature");
  const result = await retrieveLayer(adapter, {}, async () => new Response("Land-Ocean Temperature Index, x\nYear,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec\n2026,1.01,1.02,***,***,***,***,***,***,***,***,***,***", { status: 200 }), new Date("2026-03-15T00:00:00Z"));
  for (const key of ["provider", "dataset", "endpoint", "observation_time", "retrieved_at", "latency", "spatial_resolution", "temporal_resolution", "quality_flag", "uncertainty", "license", "retrieval_status"]) assert.ok(Object.hasOwn(result, key), key);
  assert.equal(result.value, 1.02);
  assert.equal(result.data_state, "OBSERVED");
  assert.notEqual(result.dataset, "OpenWeather");
});

test("credentialed FIRMS layer remains visibly AUTH_REQUIRED without a key", async () => {
  const adapter = PCS_LAYER_ADAPTERS.find((item) => item.id === "wildfire");
  const result = await retrieveLayer(adapter, {}, async () => { throw new Error("must not fetch"); });
  assert.equal(result.retrieval_status, "AUTH_REQUIRED");
  assert.match(result.error, /FIRMS_MAP_KEY/);
});

test("daily brief produces ten deduplicated publication items and no measurements or automatic events", async () => {
  const items = Array.from({ length: 12 }, (_, index) => `<item><title>Research report ${index}</title><link>https://example.test/${index}</link><description>Peer-reviewed climate dataset release.</description><pubDate>Fri, ${String(index + 1).padStart(2, "0")} Jul 2026 00:00:00 GMT</pubDate></item>`).join("");
  const result = await ingestDailyBrief({}, async () => new Response(`<rss><channel>${items}</channel></rss>`, { status: 200 }), new Date("2026-07-17T00:00:00Z"));
  assert.equal(result.primary.length, 10);
  assert.equal(new Set(result.primary.map((item) => item.source_url)).size, 10);
  assert.ok(result.primary.every((item) => item.event_candidate === false));
  assert.ok(result.primary.every((item) => item.observed_field === "publication metadata"));
  assert.equal(result.policy.article_measurements, false);
});

test("AI adapter is proposal-only and does not invent output when unconfigured", async () => {
  const result = await proposeAiAnalysis({}, { source_record: { title: "A report" }, input_snapshot_ids: [] }, new Date("2026-07-17T00:00:00Z"));
  assert.equal(result.status, "NOT_CONFIGURED");
  assert.equal(result.proposal, null);
  assert.equal(result.review_status, "PROPOSAL");
  assert.equal(result.confidence, null);
});

test("PCS residuals and total L(t) remain unavailable without scientific definitions", () => {
  const state = residualState();
  assert.equal(state.total_l_t.value, null);
  assert.equal(state.total_l_t.status, "UNAVAILABLE");
  assert.deepEqual(state.components.map((item) => item.component), ["thermal", "flow", "chemical", "informational", "structural"]);
  assert.ok(state.components.every((item) => item.value === null && item.validation_status === "UNVALIDATED"));
});

test("resolved validation requires evidence snapshots and official confirmation", () => {
  assert.equal(validationEvidenceSufficient({ result: "confirmed", input_data_snapshot: [], official_confirmation_time: null }), false);
  assert.equal(validationEvidenceSufficient({ result: "confirmed", input_data_snapshot: ["snapshot-1"], official_confirmation_time: "2026-07-17T00:00:00Z" }), true);
  assert.equal(validationEvidenceSufficient({ result: "insufficient_data" }), true);
});
