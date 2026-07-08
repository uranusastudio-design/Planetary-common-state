export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/latest") {

      const { results } = await env.PCS_DB
        .prepare(`
          SELECT *
          FROM pcs_variables
          ORDER BY id
        `)
        .all();

      return Response.json(results);
    }

    return new Response("PCS Backend OK");
  }
}
