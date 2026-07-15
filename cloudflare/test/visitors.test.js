import assert from "node:assert/strict";
import test from "node:test";
import { handleVisitorRequest, VISITOR_ROUTES } from "../src/visitors.js";

function createVisitorDb() {
  const sessions = new Map();
  const events = [];
  const statements = [];

  return {
    statements,
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      let values = [];
      const statement = {
        bind(...nextValues) {
          values = nextValues;
          return statement;
        },
        async run() {
          statements.push(normalized);
          if (normalized.startsWith("INSERT INTO visitor_sessions")) {
            const [sessionId, country, city, region, continent, timezone, latitude, longitude, firstSeen, lastSeen] = values;
            const previous = sessions.get(sessionId);
            sessions.set(sessionId, {
              sessionId, country, city, region, continent, timezone, latitude, longitude,
              firstSeen: previous?.firstSeen ?? firstSeen,
              lastSeen,
            });
          } else if (normalized.startsWith("INSERT INTO visitor_events")) {
            const [sessionId, createdAt] = values;
            const cutoff = new Date(createdAt).getTime() - 10 * 60 * 1000;
            if (!events.some((event) => event.sessionId === sessionId && new Date(event.createdAt).getTime() >= cutoff)) {
              events.push({ id: events.length + 1, sessionId, createdAt });
            }
          } else if (normalized.startsWith("UPDATE visitor_sessions")) {
            const [lastSeen, sessionId] = values;
            const session = sessions.get(sessionId);
            if (session) session.lastSeen = lastSeen;
          }
          return { success: true };
        },
        async first() {
          if (normalized.includes("COUNT(*) AS count") && normalized.includes("FROM visitor_sessions") && normalized.includes("last_seen")) {
            return { count: sessions.size };
          }
          if (normalized.includes("COUNT(*) AS count") && normalized.includes("FROM visitor_events")) {
            return { count: events.length };
          }
          if (normalized.includes("COUNT(*) AS count") && normalized.includes("FROM visitor_sessions")) {
            return { count: sessions.size };
          }
          if (normalized.includes("COUNT(DISTINCT country)")) {
            return { count: new Set([...sessions.values()].map((session) => session.country).filter(Boolean)).size };
          }
          if (normalized.includes("ORDER BY e.created_at DESC")) {
            const event = events.at(-1);
            const session = event ? sessions.get(event.sessionId) : null;
            return event && session ? { city: session.city, country: session.country, created_at: event.createdAt } : null;
          }
          if (normalized.includes("UPPER(s.country) != 'TW'")) return null;
          if (normalized.includes("ORDER BY e.created_at ASC")) {
            const event = events[0];
            const session = event ? sessions.get(event.sessionId) : null;
            return event && session ? { achievedAt: event.createdAt, city: session.city, country: session.country } : null;
          }
          return null;
        },
        async all() {
          if (normalized.startsWith("WITH session_regions")) {
            return {
              results: [...sessions.values()].map((session) => ({
                country: session.country,
                city: session.city,
                latitude: session.latitude,
                longitude: session.longitude,
                count: events.filter((event) => event.sessionId === session.sessionId).length || 1,
                lastSeen: session.lastSeen,
              })),
            };
          }
          if (normalized.includes("MIN(e.created_at) AS achievedAt")) return { results: [] };
          if (normalized.includes("strftime(")) return { results: [] };
          if (normalized.includes("CASE WHEN COUNT(e.id)")) return { results: [] };
          if (normalized.includes("COUNT(DISTINCT e.session_id)")) {
            return { results: [{ countryCode: "TW", visits: events.length, uniqueSessions: sessions.size }] };
          }
          return { results: [] };
        },
      };
      return statement;
    },
  };
}

function visitorRequest(path, method = "GET") {
  const init = method === "POST"
    ? { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: "pcs-test-session-0001" }) }
    : { method };
  const request = new Request(`https://pcs.example${path}`, init);
  Object.defineProperty(request, "cf", {
    value: { country: "TW", city: "Keelung", latitude: "25.13", longitude: "121.74" },
  });
  return request;
}

test("visitor routes retain the complete production surface", () => {
  assert.deepEqual(VISITOR_ROUTES, [
    "/api/visitors/register",
    "/api/visitors/ping",
    "/api/visitors/stats",
    "/api/visitors/locations",
    "/api/visitors/analytics",
  ]);
});

test("register deduplicates visits for ten minutes and ping does not add visits", async () => {
  const db = createVisitorDb();
  const env = { PCS_DB: db };
  assert.equal((await handleVisitorRequest(visitorRequest("/api/visitors/register", "POST"), env)).status, 200);
  assert.equal((await handleVisitorRequest(visitorRequest("/api/visitors/register", "POST"), env)).status, 200);
  assert.equal((await handleVisitorRequest(visitorRequest("/api/visitors/ping", "POST"), env)).status, 200);

  const response = await handleVisitorRequest(visitorRequest("/api/visitors/stats"), env);
  const stats = await response.json();
  assert.equal(stats.totalVisits, 1);
  assert.equal(stats.uniqueSessions, 1);
  assert.ok(db.statements.some((sql) => sql.includes("NOT EXISTS") && sql.includes("10.0 / 1440.0")));
});

test("locations are approximate, normalized, and contain no tracking identifiers", async () => {
  const db = createVisitorDb();
  const env = { PCS_DB: db };
  await handleVisitorRequest(visitorRequest("/api/visitors/register", "POST"), env);
  const response = await handleVisitorRequest(visitorRequest("/api/visitors/locations"), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.locations[0].country, "Taiwan");
  assert.equal(body.selfLocation.city, "Keelung");
  assert.equal(body.selfLocation.latitude, 25.13);
  assert.ok(!JSON.stringify(body).match(/sessionId|userAgent|\bip\b/i));
});

test("analytics returns normalized countries and data-driven milestones", async () => {
  const db = createVisitorDb();
  const env = { PCS_DB: db };
  await handleVisitorRequest(visitorRequest("/api/visitors/register", "POST"), env);
  const response = await handleVisitorRequest(visitorRequest("/api/visitors/analytics?range=24h"), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.countryRanking[0].country, "Taiwan");
  assert.equal(body.milestones[0].title, "First Observation");
  assert.equal(body.milestones[0].city, "Keelung");
});
