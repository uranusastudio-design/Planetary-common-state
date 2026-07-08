export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const headers = {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    };

    if (url.pathname === "/variables") {
      const result = await env.PCS_DB
        .prepare("SELECT * FROM pcs_variables ORDER BY id")
        .all();

      return new Response(JSON.stringify(result.results), { headers });
    }

    return new Response(JSON.stringify({
      status: "ok",
      d1: !!env.PCS_DB,
      kv: !!env.PCS_CACHE
    }), { headers });
  }
}
