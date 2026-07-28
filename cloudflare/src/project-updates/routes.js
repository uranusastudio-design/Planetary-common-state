import repositoryUpdates from "../../data/project-updates.json" with { type: "json" };

export const PROJECT_UPDATE_PREFIX = "/api/project-updates";
export const PROJECT_UPDATE_ADMIN_PREFIX = "/api/admin/project-updates";
export const PROJECT_UPDATE_KV_KEY = "project-updates:v1";

const STATUSES = new Set(["DEPLOYED", "CHECKPOINT", "IN_PROGRESS", "MAINTENANCE", "DATA_UPDATE", "FIXED", "SECURITY_UPDATE", "ARCHIVED"]);
const TEXT_FIELDS = ["slug", "phase", "version", "title_zh", "title_en", "title_ja", "title_ko", "summary_zh", "summary_en", "summary_ja", "summary_ko", "details_url", "deployed_at", "published_at", "commit_hash"];

function response(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function adminAllowed(request, env) {
  const expected = env.ADMIN_API_KEY || env.INGEST_SECRET;
  const header = request.headers.get("authorization") || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!expected || !supplied) return false;
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index % left.length] || 0) ^ (right[index % right.length] || 0);
  }
  return difference === 0;
}

function cleanText(value, maximum = 2000) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return cleaned && cleaned.length <= maximum ? cleaned : undefined;
}

function cleanDate(value) {
  const cleaned = cleanText(value, 64);
  if (cleaned === null) return null;
  if (!cleaned || Number.isNaN(Date.parse(cleaned))) return undefined;
  return cleaned;
}

function cleanUrl(value) {
  const cleaned = cleanText(value, 1000);
  if (cleaned === null) return null;
  if (!cleaned) return undefined;
  try {
    const url = new URL(cleaned);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function validateProjectUpdate(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: ["body must be an object"] };
  const value = {};
  const errors = [];
  if (!partial || Object.hasOwn(input, "status")) {
    if (!STATUSES.has(input.status)) errors.push("status is invalid");
    else value.status = input.status;
  }
  for (const field of TEXT_FIELDS) {
    if (!Object.hasOwn(input, field)) continue;
    const cleaned = field.endsWith("_at")
      ? cleanDate(input[field])
      : field === "details_url"
        ? cleanUrl(input[field])
        : cleanText(input[field], field.startsWith("summary_") ? 2000 : 300);
    if (cleaned === undefined) errors.push(`${field} is invalid`);
    else value[field] = cleaned;
  }
  if (!partial || Object.hasOwn(input, "is_pinned")) value.is_pinned = Boolean(input.is_pinned);
  if (!partial) {
    for (const field of ["slug", "phase", "title_en", "summary_en", "published_at"]) if (!value[field]) errors.push(`${field} is required`);
  }
  return { ok: errors.length === 0, value, errors };
}

function validStoredUpdate(value) {
  if (!value || typeof value !== "object" || typeof value.id !== "string") return null;
  const checked = validateProjectUpdate(value);
  return checked.ok ? { ...checked.value, id: value.id, created_at: cleanDate(value.created_at), updated_at: cleanDate(value.updated_at) } : null;
}

export function mergeProjectUpdates(baseRecords, runtimeRecords = []) {
  const base = baseRecords.map(validStoredUpdate).filter(Boolean);
  const runtime = runtimeRecords.map(validStoredUpdate).filter(Boolean);
  const merged = new Map(base.map((item) => [item.id, item]));
  for (const item of runtime) merged.set(item.id, item);
  return [...merged.values()].sort((left, right) => {
    if (left.is_pinned !== right.is_pinned) return Number(right.is_pinned) - Number(left.is_pinned);
    return Date.parse(right.published_at || right.updated_at || 0) - Date.parse(left.published_at || left.updated_at || 0);
  });
}

async function readUpdates(env) {
  let runtime = [];
  if (env.PCS_CACHE?.get) {
    try {
      const stored = await env.PCS_CACHE.get(PROJECT_UPDATE_KV_KEY, "json");
      if (Array.isArray(stored)) runtime = stored;
    } catch {
      runtime = [];
    }
  }
  return mergeProjectUpdates(repositoryUpdates, runtime);
}

async function writeUpdates(env, updates) {
  if (!env.PCS_CACHE?.put) throw new Error("Project update storage is unavailable");
  await env.PCS_CACHE.put(PROJECT_UPDATE_KV_KEY, JSON.stringify(updates));
}

async function bodyObject(request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export async function handleProjectUpdateRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === "OPTIONS") return response({}, 204);
  if (path === `${PROJECT_UPDATE_PREFIX}/latest` && request.method === "GET") {
    const updates = await readUpdates(env);
    return response({ update: updates[0] || null });
  }
  if (path === PROJECT_UPDATE_PREFIX && request.method === "GET") {
    const updates = await readUpdates(env);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    return response({ updates: updates.slice(0, limit), total: updates.length });
  }
  if (!path.startsWith(PROJECT_UPDATE_ADMIN_PREFIX)) return response({ error: "Not found" }, 404);
  if (!await adminAllowed(request, env)) return response({ error: "Unauthorized" }, 401);
  const body = await bodyObject(request);
  if (!body) return response({ error: "Request body must be valid JSON object" }, 400);
  const updates = await readUpdates(env);
  if (path === PROJECT_UPDATE_ADMIN_PREFIX && request.method === "POST") {
    const checked = validateProjectUpdate(body);
    if (!checked.ok) return response({ error: "Invalid project update", fields: checked.errors }, 400);
    const now = new Date().toISOString();
    const update = { ...checked.value, id: body.id || crypto.randomUUID(), created_at: now, updated_at: now };
    if (updates.some((item) => item.id === update.id)) return response({ error: "Project update id already exists" }, 409);
    await writeUpdates(env, [update, ...updates]);
    return response({ update }, 201);
  }
  const match = path.match(/^\/api\/admin\/project-updates\/([^/]+)$/);
  if (match && request.method === "PATCH") {
    const id = decodeURIComponent(match[1]);
    const index = updates.findIndex((item) => item.id === id);
    if (index < 0) return response({ error: "Project update not found" }, 404);
    const checked = validateProjectUpdate(body, { partial: true });
    if (!checked.ok) return response({ error: "Invalid project update", fields: checked.errors }, 400);
    updates[index] = { ...updates[index], ...checked.value, id, updated_at: new Date().toISOString() };
    const complete = validateProjectUpdate(updates[index]);
    if (!complete.ok) return response({ error: "Updated project record is invalid", fields: complete.errors }, 400);
    await writeUpdates(env, updates);
    return response({ update: updates[index] });
  }
  return response({ error: "Not found" }, 404);
}
