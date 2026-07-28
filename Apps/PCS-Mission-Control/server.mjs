import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const repositoryRoot = new URL("../../", import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`, "127.0.0.1", "localhost"]);

createServer((request, response) => {
  if (!allowedHosts.has(request.headers.host || "")) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }).end("Loopback host required");
    return;
  }
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
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
