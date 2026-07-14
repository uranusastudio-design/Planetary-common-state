const VISITOR_ROUTES = [
  "/api/visitors/register",
  "/api/visitors/ping",
  "/api/visitors/stats"
];

function visitorJson(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store"
    }
  });
}

function validateSessionId(sessionId) {
  return typeof sessionId === "string"
    && sessionId.length >= 16
    && sessionId.length <= 128
    && /^[0-9a-zA-Z_-]+(?:-[0-9a-zA-Z_-]+)*$/.test(sessionId);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function cfVisitorLocation(request) {
  const cf = request.cf || {};
  const latitude = Number(cf.latitude);
  const longitude = Number(cf.longitude);

  return {
    country: typeof cf.country === "string" ? cf.country : null,
    city: typeof cf.city === "string" ? cf.city : null,
    region: typeof cf.region === "string" ? cf.region : null,
    continent: typeof cf.continent === "string" ? cf.continent : null,
    timezone: typeof cf.timezone === "string" ? cf.timezone : null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null
  };
}

async function registerVisitor(request, env) {
  if (request.method !== "POST") {
    return visitorJson({ error: "Method not allowed" }, 405);
  }

  const body = await readJson(request);
  const sessionId = body.sessionId;

  if (!validateSessionId(sessionId)) {
    return visitorJson({ error: "Invalid visitor session" }, 400);
  }

  const location = cfVisitorLocation(request);
  const now = new Date().toISOString();

  await env.PCS_DB.prepare(`
    INSERT INTO visitor_sessions
      (session_id, country, city, region, continent, timezone, latitude, longitude, first_seen, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      country = excluded.country,
      city = excluded.city,
      region = excluded.region,
      continent = excluded.continent,
      timezone = excluded.timezone,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      last_seen = excluded.last_seen
  `).bind(
    sessionId,
    location.country,
    location.city,
    location.region,
    location.continent,
    location.timezone,
    location.latitude,
    location.longitude,
    now,
    now
  ).run();

  await env.PCS_DB.prepare(`
    INSERT INTO visitor_events (session_id, event_type, created_at)
    VALUES (?, 'visit', ?)
  `).bind(sessionId, now).run();

  return visitorJson({ status: "ok", lastUpdated: now });
}

async function pingVisitor(request, env) {
  if (request.method !== "POST") {
    return visitorJson({ error: "Method not allowed" }, 405);
  }

  const body = await readJson(request);
  const sessionId = body.sessionId;

  if (!validateSessionId(sessionId)) {
    return visitorJson({ error: "Invalid visitor session" }, 400);
  }

  const now = new Date().toISOString();

  await env.PCS_DB.prepare(`
    UPDATE visitor_sessions
    SET last_seen = ?
    WHERE session_id = ?
  `).bind(now, sessionId).run();

  return visitorJson({ status: "ok", lastUpdated: now });
}

async function visitorStats(request, env) {
  if (request.method !== "GET") {
    return visitorJson({ error: "Method not allowed" }, 405);
  }

  const now = new Date();
  const onlineSince = new Date(now.getTime() - 90 * 1000).toISOString();
  const todayStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )).toISOString();

  const [
    online,
    todayVisits,
    totalVisits,
    uniqueSessions,
    countries,
    latestVisitor
  ] = await Promise.all([
    env.PCS_DB.prepare(`
      SELECT COUNT(*) AS count
      FROM visitor_sessions
      WHERE last_seen >= ?
    `).bind(onlineSince).first(),
    env.PCS_DB.prepare(`
      SELECT COUNT(*) AS count
      FROM visitor_events
      WHERE event_type = 'visit' AND created_at >= ?
    `).bind(todayStart).first(),
    env.PCS_DB.prepare(`
      SELECT COUNT(*) AS count
      FROM visitor_events
      WHERE event_type = 'visit'
    `).first(),
    env.PCS_DB.prepare(`
      SELECT COUNT(*) AS count
      FROM visitor_sessions
    `).first(),
    env.PCS_DB.prepare(`
      SELECT COUNT(DISTINCT country) AS count
      FROM visitor_sessions
      WHERE country IS NOT NULL AND country != ''
    `).first(),
    env.PCS_DB.prepare(`
      SELECT s.city, s.country, e.created_at
      FROM visitor_events e
      JOIN visitor_sessions s ON s.session_id = e.session_id
      WHERE e.event_type = 'visit'
      ORDER BY e.created_at DESC
      LIMIT 1
    `).first()
  ]);

  return visitorJson({
    online: online?.count ?? 0,
    todayVisits: todayVisits?.count ?? 0,
    totalVisits: totalVisits?.count ?? 0,
    uniqueSessions: uniqueSessions?.count ?? 0,
    countries: countries?.count ?? 0,
    latestVisitor: latestVisitor
      ? {
          city: latestVisitor.city,
          country: latestVisitor.country,
          timestamp: latestVisitor.created_at
        }
      : null,
    lastUpdated: now.toISOString()
  });
}

async function handleVisitorRequest(request, env) {
  if (request.method === "OPTIONS") {
    return visitorJson({ status: "ok" });
  }

  if (!env.PCS_DB) {
    return visitorJson({ error: "PCS_DB is not configured" }, 500);
  }

  const url = new URL(request.url);

  if (url.pathname === "/api/visitors/register") {
    return registerVisitor(request, env);
  }

  if (url.pathname === "/api/visitors/ping") {
    return pingVisitor(request, env);
  }

  if (url.pathname === "/api/visitors/stats") {
    return visitorStats(request, env);
  }

  return visitorJson({ error: "Visitor route not found" }, 404);
}

export { handleVisitorRequest, VISITOR_ROUTES };
