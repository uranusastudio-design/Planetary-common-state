export default {
  async fetch(request, env) {
    return Response.json({
      status: "ok",
      d1: !!env.PCS_DB,
      kv: !!env.PCS_CACHE
    });
  }
}
