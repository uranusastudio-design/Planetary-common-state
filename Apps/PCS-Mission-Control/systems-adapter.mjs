import { exec } from "node:child_process";
import { promisify } from "node:util";
import { statfs } from "node:fs/promises";
import { freemem, totalmem, loadavg, cpus, uptime } from "node:os";

const execp = promisify(exec);
const TIMEOUT = 2500;

async function checkHttp(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    return { url, status: res.status < 500 ? "ONLINE" : "DEGRADED", code: res.status, latency_ms: Date.now() - t0 };
  } catch (e) {
    return { url, status: "OFFLINE", code: null, latency_ms: null, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function diskUsage() {
  try {
    const s = await statfs("/");
    const total = s.blocks * s.bsize;
    const free = s.bfree * s.bsize;
    return { total_gb: (total / 1e9).toFixed(1), free_gb: (free / 1e9).toFixed(1), used_pct: (((total - free) / total) * 100).toFixed(1) };
  } catch { return null; }
}

export async function loadSystems() {
  const [openclaw, pcsBackend, wsHttp, ollama, mem] = await Promise.all([
    checkHttp("http://127.0.0.1:18789/"),
    checkHttp("https://pcs-backend.uranusastudio.workers.dev/api/project-updates/latest"),
    checkHttp("http://127.0.0.1:8765/"),
    checkHttp("http://127.0.0.1:11434/api/tags"),
    Promise.resolve({ total_gb: (totalmem() / 1e9).toFixed(1), free_gb: (freemem() / 1e9).toFixed(1), used_pct: (((totalmem() - freemem()) / totalmem()) * 100).toFixed(1) })
  ]);
  const disk = await diskUsage();

  return {
    schema_version: "pcs.mission-control.systems.v1",
    checked_at: new Date().toISOString(),
    services: [
      { id: "openclaw", name: "OpenClaw Gateway", ...openclaw },
      { id: "pcs-backend", name: "PCS Backend (Cloudflare Worker)", ...pcsBackend },
      { id: "ws-http", name: "Workspace HTTP (8765)", ...wsHttp },
      { id: "ollama", name: "Ollama (11434)", ...ollama }
    ],
    resources: {
      memory: mem,
      disk,
      cpu: { cores: cpus().length, load_1m: loadavg()[0].toFixed(2), load_5m: loadavg()[1].toFixed(2), load_15m: loadavg()[2].toFixed(2) },
      uptime_hours: (uptime() / 3600).toFixed(1)
    }
  };
}
