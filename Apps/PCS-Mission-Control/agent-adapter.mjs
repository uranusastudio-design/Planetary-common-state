const OPENCLAW_GATEWAY = "http://127.0.0.1:18789";
const PCS_UPDATE_API = "https://pcs-backend.uranusastudio.workers.dev/api/project-updates/latest";
const TIMEOUT_MS = 4000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkClaudeAgent() {
  try {
    const res = await fetchWithTimeout(`${OPENCLAW_GATEWAY}/`);
    if (res.ok || res.status === 401 || res.status === 403) {
      return { status: "ONLINE", detail: "OpenClaw gateway responding" };
    }
    return { status: "DEGRADED", detail: `Gateway HTTP ${res.status}` };
  } catch {
    return { status: "OFFLINE", detail: "Gateway unreachable" };
  }
}

async function checkGptAgent() {
  try {
    const res = await fetchWithTimeout(PCS_UPDATE_API);
    if (!res.ok) return { status: "UNAVAILABLE", detail: `API HTTP ${res.status}`, last_update: null, last_update_at: null };
    const data = await res.json();
    const update = data.update || {};
    return {
      status: "ONLINE",
      detail: "PCS backend reachable",
      last_update: `${update.phase || ""} · ${update.status || ""}`.trim().replace(/^·\s*/, ""),
      last_update_at: update.published_at || null,
      title: update.title_zh || update.title_en || null
    };
  } catch {
    return { status: "UNAVAILABLE", detail: "PCS backend unreachable", last_update: null, last_update_at: null };
  }
}

export async function loadAgentStatus() {
  const [claude, gpt] = await Promise.all([checkClaudeAgent(), checkGptAgent()]);
  return {
    schema_version: "pcs.mission-control.agent-status.v1",
    checked_at: new Date().toISOString(),
    agents: [
      {
        id: "claude",
        name: "Claude Agent",
        role: "Writer · Code · Verification",
        provider: "Anthropic via OpenClaw",
        model: "claude-sonnet-4-6",
        current_task: "MC-05 Agent Panel",
        ...claude
      },
      {
        id: "gpt",
        name: "GPT Agent",
        role: "Professor · Research · Theory",
        provider: "OpenAI",
        site_url: "https://alvin-lin-pcs.uranusastudio.chatgpt.site/",
        ...gpt
      }
    ]
  };
}
