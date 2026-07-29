const PCS_LATEST = "https://pcs-backend.uranusastudio.workers.dev/latest";
const PCS_UPDATE = "https://pcs-backend.uranusastudio.workers.dev/api/project-updates/latest";
const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadPcsState() {
  const [latest, update] = await Promise.allSettled([
    fetchWithTimeout(PCS_LATEST),
    fetchWithTimeout(PCS_UPDATE)
  ]);

  const latestData = latest.status === "fulfilled" ? latest.value : null;
  const updateData = update.status === "fulfilled" ? update.value?.update : null;

  const pcsState = latestData?.pcs_state ?? null;
  const projections = latestData?.projections ?? {};
  const observations = latestData?.observations ?? [];

  const residuals = [
    { key: "L_T", label: "Thermal", unit: "°C anomaly" },
    { key: "L_F", label: "Flow", unit: "Sv" },
    { key: "L_C", label: "Chemical", unit: "ppm CO₂" },
    { key: "L_I", label: "Informational", unit: "Index" },
    { key: "L_S", label: "Structural", unit: "%" }
  ].map(({ key, label, unit }) => {
    const value = projections[key] ?? null;
    const obs = observations.find((o) => o.residual_group?.toLowerCase() === label.toLowerCase());
    return {
      key,
      label,
      unit,
      value: value !== null ? value : (obs?.value ?? null),
      source: obs?.source_name ?? null,
      timestamp: obs?.timestamp ?? null,
      status: value !== null || obs?.value != null ? "AVAILABLE" : "NO_DATA"
    };
  });

  return {
    schema_version: "pcs.mission-control.pcs-state.v1",
    checked_at: new Date().toISOString(),
    l_value: {
      value: pcsState?.value ?? null,
      status: pcsState?.status ?? "UNAVAILABLE",
      display: pcsState?.value != null ? String(pcsState.value) : (pcsState?.status ?? "NOT_CONNECTED")
    },
    residuals,
    activity: [
      updateData ? {
        source: "GPT Agent",
        type: "PCS_UPDATE",
        text: `${updateData.phase ?? ""} · ${updateData.status ?? ""} — ${updateData.title_zh ?? updateData.title_en ?? ""}`.replace(/^·\s*/, ""),
        time: updateData.published_at ?? null
      } : null
    ].filter(Boolean),
    source_status: latestData ? "AVAILABLE" : "UNAVAILABLE"
  };
}
