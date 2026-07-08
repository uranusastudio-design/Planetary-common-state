export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/variables") {

      const result = await env.PCS_DB
        .prepare("SELECT * FROM pcs_variables ORDER BY id")
        .all();

      return Response.json(result.results);
    }

    return Response.json({
      status: "ok",
      d1: !!env.PCS_DB,
      kv: !!env.PCS_CACHE
    });
  }
}
