import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BLOCKERS_PATH = fileURLToPath(new URL("./blockers.json", import.meta.url));

export async function loadBlockers() {
  const text = await readFile(BLOCKERS_PATH, "utf-8");
  const data = JSON.parse(text);
  return {
    schema_version: data.schema_version,
    checked_at: new Date().toISOString(),
    generated_at: data.generated_at,
    items: data.items,
    counts: {
      HIGH: data.items.filter(i => i.severity === "HIGH").length,
      MEDIUM: data.items.filter(i => i.severity === "MEDIUM").length,
      LOW: data.items.filter(i => i.severity === "LOW").length,
      total: data.items.length
    }
  };
}
