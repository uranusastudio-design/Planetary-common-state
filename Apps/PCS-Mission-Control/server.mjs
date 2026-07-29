import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { loadCanonicalRegistry } from "./registry-adapter.mjs";
import { loadMissionQueue } from "./queue-adapter.mjs";
import { loadAgentStatus } from "./agent-adapter.mjs";
import { loadPcsState } from "./pcs-state-adapter.mjs";

const repositoryRoot = new URL("../../", import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`, "127.0.0.1", "localhost"]);

createServer(async (request, response) => {
  if (!allowedHosts.has(request.headers.host || "")) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }).end("Loopback host required");
    return;
  }
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  if (pathname === "/local-api/phase-registry") {
    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "application/json; charset=utf-8", Allow: "GET" }).end(JSON.stringify({ error: "READ_ONLY_ENDPOINT" }));
      return;
    }
    try {
      const payload = await loadCanonicalRegistry();
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }).end(JSON.stringify(payload));
    } catch (error) {
      const category = /^REGISTRY_[A-Z_]+$/.test(error.message) ? error.message : "REGISTRY_UNAVAILABLE";
      response.writeHead(503, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }).end(JSON.stringify({ error: category, source: "MC-01_AUDIT_ARTIFACT" }));
    }
    return;
  }
  if (pathname === "/local-api/pcs-state") {
    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "application/json; charset=utf-8", Allow: "GET" }).end(JSON.stringify({ error: "READ_ONLY_ENDPOINT" }));
      return;
    }
    try {
      const payload = await loadPcsState();
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }).end(JSON.stringify(payload));
    } catch (error) {
      response.writeHead(503, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }).end(JSON.stringify({ error: "PCS_STATE_UNAVAILABLE", detail: error.message }));
    }
    return;
  }
  if (pathname === "/local-api/agent-status") {
    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "application/json; charset=utf-8", Allow: "GET" }).end(JSON.stringify({ error: "READ_ONLY_ENDPOINT" }));
      return;
    }
    try {
      const payload = await loadAgentStatus();
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }).end(JSON.stringify(payload));
    } catch (error) {
      response.writeHead(503, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }).end(JSON.stringify({ error: "AGENT_STATUS_UNAVAILABLE", detail: error.message }));
    }
    return;
  }
  if (pathname === "/local-api/mission-queue") {
    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "application/json; charset=utf-8", Allow: "GET" }).end(JSON.stringify({ error: "READ_ONLY_ENDPOINT" }));
      return;
    }
    try {
      const payload = await loadMissionQueue();
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }).end(JSON.stringify(payload));
    } catch (error) {
      const category = /^QUEUE_[A-Z_]+$/.test(error.message) ? error.message : "QUEUE_UNAVAILABLE";
      response.writeHead(503, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }).end(JSON.stringify({ error: category, source: "MC-01_AND_VALIDATED_MC_ARTIFACTS" }));
    }
    return;
  }
  const requested = pathname === "/" || pathname === "/Apps/PCS-Mission-Control/"
    ? "/Apps/PCS-Mission-Control/index.html"
    : pathname;
  const file = normalize(join(repositoryRoot, requested));
  if (!file.startsWith(repositoryRoot)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    if (!statSync(file).isFile()) throw new Error("not file");
    response.writeHead(200, {
      "Content-Type": `${mime[extname(file)] || "application/octet-stream"}; charset=utf-8`,
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; connect-src 'self' https://pcs-backend.uranusastudio.workers.dev; style-src 'self'; script-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`PCS Mission Control: http://127.0.0.1:${port}/Apps/PCS-Mission-Control/`);
});
