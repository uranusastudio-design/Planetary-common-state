export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const headers = {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    };

    if (url.pathname === "/latest") {
      const { results } = await env.PCS_DB.prepare(`
        SELECT
          v.id AS variable_id,
          v.name,
          v.symbol,
          v.category,
          v.residual_group,
          v.unit,
          o.timestamp,
          o.value,
          o.uncertainty,
          s.name AS source_name
        FROM pcs_variables v
        LEFT JOIN pcs_observations o
          ON o.variable_id = v.id
        LEFT JOIN pcs_sources s
          ON s.id = o.source_id
        ORDER BY v.id, o.timestamp DESC
      `).all();

      const latestBySymbol = {};
      for (const row of results) {
        if (!latestBySymbol[row.symbol]) {
          latestBySymbol[row.symbol] = row;
        }
      }

      const variables = Object.values(latestBySymbol);
      const connected = variables.filter((v) => v.value !== null && v.value !== undefined);

      const gmst = latestBySymbol.GMST;
      const co2 = latestBySymbol.CO2;

      const now = new Date().toISOString();

      return new Response(JSON.stringify({
        timestamp: now,
        metadata: {
          generated_at_utc: now,
          source: "Cloudflare D1 pcs_observations"
        },
        S_demo: null,
        coverage_count: connected.length,
        latest_year: new Date().getFullYear(),
        projections: {
          L_T: gmst?.value !== null && gmst?.value !== undefined ? 0.25 : null,
          L_C: co2?.value !== null && co2?.value !== undefined ? 0.25 : null,
          L_S: null,
          L_I: null
        },
        observations: variables
      }), { headers });
    }

    if (url.pathname === "/variables") {
      const { results } = await env.PCS_DB
        .prepare("SELECT * FROM pcs_variables ORDER BY id")
        .all();

      return new Response(JSON.stringify(results), { headers });
    }

    return new Response(JSON.stringify({
      status: "ok",
      d1: !!env.PCS_DB,
      kv: !!env.PCS_CACHE
    }), { headers });
  }
}
