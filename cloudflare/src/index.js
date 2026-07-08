function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function notFound() {
  return jsonResponse(
    {
      error: "not_found",
      message: "PCS backend endpoint not found."
    },
    404
  );
}

export default {
  async fetch(request) {
    return new Response("PCS Worker OK");
    const url = new URL(request.url);
    const timestamp = new Date().toISOString();

    if (request.method !== "GET") {
      return jsonResponse(
        {
          error: "method_not_allowed",
          message: "Only GET requests are supported by this prototype."
        },
        405
      );
    }

    if (url.pathname === "/") {
      return jsonResponse({
        service: "PCS Backend",
        status: "online",
        version: "0.1",
        message: "Planetary Common State Cloudflare Backend Prototype",
        timestamp
      });
    }

    if (url.pathname === "/health") {
      return jsonResponse({
        status: "healthy",
        uptime: "prototype",
        backend: "cloudflare-worker"
      });
    }

    if (url.pathname === "/latest") {
      return jsonResponse({
        pcs_state: null,
        connected_sources: [],
        waiting_sources: [],
        planned_sources: [],
        generated_by: "Cloudflare Worker",
        prototype: true
      });
    }

    return notFound();
  }
};
