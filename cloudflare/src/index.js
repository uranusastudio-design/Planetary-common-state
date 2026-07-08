export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/latest" || url.pathname === "/variables") {
      const { results } = await env.PCS_DB
        .prepare(`
          SELECT *
          FROM pcs_variables
          ORDER BY id
        `)
        .all();

      return Response.json(results, {
        headers: {
          "access-control-allow-origin": "*"
        }
      });
    }

    return Response.json({
      status: "ok",
      d1: !!env.PCS_DB,
      kv: !!env.PCS_CACHE
    }, {
      headers: {
        "access-control-allow-origin": "*"
      }
    });
  }
}
