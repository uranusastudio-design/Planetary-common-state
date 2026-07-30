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

async function checkLlamaAgent() {
  try {
    const res = await fetchWithTimeout("http://127.0.0.1:11434/api/tags");
    if (!res.ok) return { status: "OFFLINE", detail: `Ollama HTTP ${res.status}` };
    const data = await res.json();
    const models = (data.models || []).map(m => m.name).join(", ");
    return { status: "ONLINE", detail: models || "no models" };
  } catch {
    return { status: "OFFLINE", detail: "Ollama unreachable (localhost:11434)" };
  }
}

export async function loadAgentStatus() {
  const [claude, gpt, llama] = await Promise.all([
    checkClaudeAgent(),
    checkGptAgent(),
    checkLlamaAgent()
  ]);
  return {
    schema_version: "pcs.mission-control.agent-status.v2",
    checked_at: new Date().toISOString(),
    agents: [
      {
        id: "claude",
        name: "Claude Agent",
        role: "主執行 · 程式 · 整合",
        provider: "Anthropic via OpenClaw",
        model: "claude-opus-4-7",
        current_task: "MC Phase 1 · UI 整修",
        ...claude
      },
      {
        id: "gpt",
        name: "GPT Agent",
        role: "教授 · 研究 · 理論",
        provider: "OpenAI",
        model: "gpt-5",
        site_url: "https://alvin-lin-pcs.uranusastudio.chatgpt.site/",
        ...gpt
      },
      {
        id: "gemini",
        name: "Gemini Agent",
        role: "查資料 · 撰稿 · 免費副手",
        provider: "Google AI Studio",
        model: "gemini-flash-latest",
        status: "CONFIGURED",
        detail: "API key registered (browser cannot health-check due to CORS)"
      },
      {
        id: "llama",
        name: "Llama-Local",
        role: "本地免費批次 · 摘要 · 不吃 API",
        provider: "Ollama (localhost:11434)",
        model: "llama3.2:latest",
        current_task: "背景摘要 150+ PCS 文件",
        ...llama
      }
    ]
  };
}
