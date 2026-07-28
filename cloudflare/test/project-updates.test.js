import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import checkpoint from "../data/project-updates.json" with { type: "json" };
import { mergeProjectUpdates, PROJECT_UPDATE_KV_KEY, validateProjectUpdate } from "../src/project-updates/routes.js";

function kv(initial = null) {
  let value = initial;
  return {
    async get(key, type) {
      assert.equal(key, PROJECT_UPDATE_KV_KEY);
      return type === "json" && value ? JSON.parse(value) : null;
    },
    async put(key, next) {
      assert.equal(key, PROJECT_UPDATE_KV_KEY);
      value = next;
    },
    read() {
      return value ? JSON.parse(value) : null;
    },
  };
}

const validUpdate = {
  slug: "maintenance-window", phase: "Phase 7.1", version: null, status: "MAINTENANCE",
  title_zh: "維護通知", title_en: "Maintenance notice", title_ja: "メンテナンスのお知らせ", title_ko: "유지보수 안내",
  summary_zh: "維護摘要。", summary_en: "Maintenance summary.", summary_ja: "メンテナンス概要。", summary_ko: "유지보수 요약.",
  details_url: null, deployed_at: null, published_at: "2026-07-28T12:00:00Z", commit_hash: null, is_pinned: false,
};

test("checkpoint uses the actual commit and remains CHECKPOINT", () => {
  assert.equal(checkpoint.length, 1);
  assert.equal(checkpoint[0].status, "CHECKPOINT");
  assert.equal(checkpoint[0].commit_hash, "bb724d3a79e06a50085333bc73258743c54f2842");
  assert.equal(checkpoint[0].published_at, "2026-07-22T20:09:46+08:00");
  assert.equal(checkpoint[0].deployed_at, null);
});

test("latest and history public APIs expose the versioned checkpoint", async () => {
  const env = { PCS_CACHE: kv() };
  const latest = await worker.fetch(new Request("https://pcs.test/api/project-updates/latest"), env, {});
  assert.equal(latest.status, 200);
  assert.equal((await latest.json()).update.id, checkpoint[0].id);
  const history = await worker.fetch(new Request("https://pcs.test/api/project-updates"), env, {});
  const payload = await history.json();
  assert.equal(payload.total, 1);
  assert.equal(payload.updates[0].status, "CHECKPOINT");
});

test("empty sources produce the documented no-record shape", () => {
  assert.deepEqual(mergeProjectUpdates([], []), []);
});

test("malformed records are ignored and partial translations retain English fallback data", () => {
  assert.deepEqual(mergeProjectUpdates([], [{ id: "bad", status: "DEPLOYED", published_at: "Invalid Date" }]), []);
  const partial = { ...validUpdate, id: "partial", title_zh: null, summary_zh: null };
  assert.equal(mergeProjectUpdates([], [partial])[0].title_en, validUpdate.title_en);
});

test("validation rejects malformed dates, unsafe URLs, invalid states and empty control text", () => {
  assert.equal(validateProjectUpdate({ ...validUpdate, published_at: "Invalid Date" }).ok, false);
  assert.equal(validateProjectUpdate({ ...validUpdate, details_url: "javascript:alert(1)" }).ok, false);
  assert.equal(validateProjectUpdate({ ...validUpdate, status: "COMPLETED" }).ok, false);
  assert.equal(validateProjectUpdate({ ...validUpdate, title_en: "\u0000" }).ok, false);
});

test("admin create and patch require auth and persist validated records", async () => {
  const store = kv();
  const env = { PCS_CACHE: store, ADMIN_API_KEY: "server-only-test-key" };
  const unauthorized = await worker.fetch(new Request("https://pcs.test/api/admin/project-updates", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validUpdate),
  }), env, {});
  assert.equal(unauthorized.status, 401);
  const create = await worker.fetch(new Request("https://pcs.test/api/admin/project-updates", {
    method: "POST", headers: { authorization: "Bearer server-only-test-key", "content-type": "application/json" },
    body: JSON.stringify({ ...validUpdate, id: "maintenance-1" }),
  }), env, {});
  assert.equal(create.status, 201);
  assert.ok(store.read().some((item) => item.id === "maintenance-1"));
  const patch = await worker.fetch(new Request("https://pcs.test/api/admin/project-updates/maintenance-1", {
    method: "PATCH", headers: { authorization: "Bearer server-only-test-key", "content-type": "application/json" },
    body: JSON.stringify({ status: "FIXED", title_en: "Maintenance completed" }),
  }), env, {});
  assert.equal(patch.status, 200);
  assert.equal((await patch.json()).update.status, "FIXED");
});

test("admin rejects malformed JSON without writing KV", async () => {
  const store = kv();
  const response = await worker.fetch(new Request("https://pcs.test/api/admin/project-updates", {
    method: "POST", headers: { authorization: "Bearer test", "content-type": "application/json" }, body: "{broken",
  }), { PCS_CACHE: store, ADMIN_API_KEY: "test" }, {});
  assert.equal(response.status, 400);
  assert.equal(store.read(), null);
});
