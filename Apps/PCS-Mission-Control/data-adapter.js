import { validateRegistry, validateLocalAdminStatus } from "./components.js";

const REGISTRY_URL = "/local-api/phase-registry";
const QUEUE_URL = "/local-api/mission-queue";
const LOCAL_STATUS_URL = "./local-admin-status.json";
export const UPDATE_API_TIMEOUT_MS = 5000;

export async function loadLocalAdminData(fetcher = fetch) {
  const [registryResponse, queueResponse, statusResponse] = await Promise.all([
    fetcher(REGISTRY_URL),
    fetcher(QUEUE_URL),
    fetcher(LOCAL_STATUS_URL)
  ]);
  if (!registryResponse.ok) throw new Error(`Registry unavailable (${registryResponse.status})`);
  if (!queueResponse.ok) throw new Error(`Queue unavailable (${queueResponse.status})`);
  if (!statusResponse.ok) throw new Error(`Local status unavailable (${statusResponse.status})`);
  return {
    registry: validateRegistry(await registryResponse.json()),
    queue: await queueResponse.json(),
    localStatus: validateLocalAdminStatus(await statusResponse.json())
  };
}

export async function fetchProjectUpdateState({
  url,
  fetcher = fetch,
  timeoutMs = UPDATE_API_TIMEOUT_MS,
  now = () => new Date(),
  controller = new AbortController(),
  schedule = setTimeout,
  cancel = clearTimeout
} = {}) {
  const timer = schedule(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const update = payload?.update || payload;
    if (!update || !update.id || !update.status) throw new Error("Malformed update");
    return { state: "AVAILABLE", update, checkedAt: now().toISOString() };
  } catch {
    return { state: "UPDATE_UNAVAILABLE", update: null, checkedAt: now().toISOString() };
  } finally {
    cancel(timer);
  }
}
