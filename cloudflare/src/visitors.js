const VISITOR_ROUTES = [
  "/api/visitors/register",
  "/api/visitors/ping",
  "/api/visitors/stats",
  "/api/visitors/locations",
  "/api/visitors/analytics"
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

function displayCountry(country) {
  if (!country) return null;

  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(country) || country;
  } catch {
    return country;
  }
}

function roundedCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function analyticsRangeConfig(rawRange) {
  const range = rawRange === "7d" || rawRange === "30d" ? rawRange : "24h";
  const now = new Date();
  const bucketCount = range === "24h" ? 24 : range === "7d" ? 7 : 30;
  const bucketMs = range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const currentBucket = range === "24h"
    ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
    : Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startMs = currentBucket - (bucketCount - 1) * bucketMs;

  return {
    range,
    bucketCount,
    bucketMs,
    start: new Date(startMs).toISOString(),
    bucketFormat: range === "24h" ? "%Y-%m-%dT%H:00:00.000Z" : "%Y-%m-%dT00:00:00.000Z",
    buckets: Array.from({ length: bucketCount }, (_, index) => ({
      time: new Date(startMs + index * bucketMs).toISOString(),
      visits: 0,
      uniqueSessions: 0
    }))
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

async function visitorLocations(request, env) {
  if (request.method !== "GET") {
    return visitorJson({ error: "Method not allowed" }, 405);
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { results } = await env.PCS_DB.prepare(`
    SELECT
      country,
      city,
      ROUND(latitude, 2) AS latitude,
      ROUND(longitude, 2) AS longitude,
      COUNT(*) AS count,
      MAX(last_seen) AS lastSeen
    FROM visitor_sessions
    WHERE last_seen >= ?
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    GROUP BY country, city, ROUND(latitude, 2), ROUND(longitude, 2)
    ORDER BY lastSeen DESC
    LIMIT 100
  `).bind(since).all();

  const locations = results.map((location) => ({
    country: displayCountry(location.country),
    city: location.city,
    latitude: roundedCoordinate(location.latitude),
    longitude: roundedCoordinate(location.longitude),
    count: location.count ?? 0,
    lastSeen: location.lastSeen
  }));

  return visitorJson({ locations, lastUpdated: new Date().toISOString() });
}

async function visitorAnalytics(request, env) {
  if (request.method !== "GET") {
    return visitorJson({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const config = analyticsRangeConfig(url.searchParams.get("range"));

  try {
    const [
      countryRankingResult,
      trendResult,
      heatResult
    ] = await Promise.all([
      env.PCS_DB.prepare(`
        SELECT
          s.country AS countryCode,
          COUNT(e.id) AS visits,
          COUNT(DISTINCT e.session_id) AS uniqueSessions
        FROM visitor_events e
        JOIN visitor_sessions s ON s.session_id = e.session_id
        WHERE e.event_type = 'visit'
          AND e.created_at >= ?
          AND s.country IS NOT NULL
          AND s.country != ''
          AND UPPER(s.country) != 'UNKNOWN'
        GROUP BY s.country
        ORDER BY visits DESC
        LIMIT 10
      `).bind(config.start).all(),
      env.PCS_DB.prepare(`
        SELECT
          strftime(?, e.created_at) AS bucket,
          COUNT(e.id) AS visits,
          COUNT(DISTINCT e.session_id) AS uniqueSessions
        FROM visitor_events e
        WHERE e.event_type = 'visit'
          AND e.created_at >= ?
        GROUP BY bucket
        ORDER BY bucket ASC
      `).bind(config.bucketFormat, config.start).all(),
      env.PCS_DB.prepare(`
        SELECT
          s.country,
          s.city,
          ROUND(s.latitude, 2) AS latitude,
          ROUND(s.longitude, 2) AS longitude,
          CASE WHEN COUNT(e.id) > 100 THEN 100 ELSE COUNT(e.id) END AS weight,
          MAX(e.created_at) AS lastSeen
        FROM visitor_events e
        JOIN visitor_sessions s ON s.session_id = e.session_id
        WHERE e.event_type = 'visit'
          AND e.created_at >= ?
          AND s.latitude IS NOT NULL
          AND s.longitude IS NOT NULL
        GROUP BY s.country, s.city, ROUND(s.latitude, 2), ROUND(s.longitude, 2)
        ORDER BY weight DESC, lastSeen DESC
        LIMIT 100
      `).bind(config.start).all()
    ]);

    const bucketByTime = new Map(config.buckets.map((bucket) => [bucket.time, bucket]));
    for (const row of trendResult.results) {
      const bucket = bucketByTime.get(row.bucket);
      if (bucket) {
        bucket.visits = row.visits ?? 0;
        bucket.uniqueSessions = row.uniqueSessions ?? 0;
      }
    }

    const countryRanking = countryRankingResult.results.map((country) => ({
      country: displayCountry(country.countryCode),
      countryCode: country.countryCode,
      visits: country.visits ?? 0,
      uniqueSessions: country.uniqueSessions ?? 0
    }));

    const heatLocations = heatResult.results.map((location) => ({
      country: displayCountry(location.country),
      city: location.city,
      latitude: roundedCoordinate(location.latitude),
      longitude: roundedCoordinate(location.longitude),
      weight: Math.min(100, Math.max(0, location.weight ?? 0)),
      lastSeen: location.lastSeen
    }));

    const peak = config.buckets.reduce(
      (best, bucket) => bucket.visits > best.visits ? bucket : best,
      { time: null, visits: 0, uniqueSessions: 0 }
    );

    return visitorJson({
      range: config.range,
      countryRanking,
      trend: config.buckets,
      heatLocations,
      summary: {
        peakVisits: peak.visits,
        peakTime: peak.time,
        topCountry: countryRanking[0]?.country ?? null,
        activeRegions: heatLocations.length
      },
      lastUpdated: new Date().toISOString()
    });
  } catch {
    return visitorJson({ error: "Visitor analytics unavailable" }, 500);
  }
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

  if (url.pathname === "/api/visitors/locations") {
    return visitorLocations(request, env);
  }

  if (url.pathname === "/api/visitors/analytics") {
    return visitorAnalytics(request, env);
  }

  return visitorJson({ error: "Visitor route not found" }, 404);
}

export { handleVisitorRequest, VISITOR_ROUTES };
