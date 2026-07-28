export const STATUS_ORDER = [
  "DEPLOYED",
  "ARCHIVED",
  "VALIDATED_LOCAL",
  "PUSHED_NOT_DEPLOYED",
  "CHECKPOINT",
  "IN_PROGRESS",
  "NOT_STARTED"
];

export function summarize(records) {
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0]));
  records.forEach((record) => {
    counts[record.status] = (counts[record.status] || 0) + 1;
  });
  return counts;
}

export function validateRegistry(registry) {
  if (!registry || registry.schema_version !== "pcs.phase-registry.v1" || !Array.isArray(registry.records)) {
    throw new Error("Unsupported phase registry");
  }
  if (registry.records.length !== 48) throw new Error("Expected 48 canonical phase records");
  const ids = registry.records.map((record) => record.id);
  if (new Set(ids).size !== ids.length) throw new Error("Phase stable IDs must be unique");
  const vocabulary = new Set(registry.status_vocabulary);
  registry.records.forEach((record) => {
    if (!record.id || !record.namespace || !vocabulary.has(record.status)) throw new Error(`Invalid record: ${record.id || "unknown"}`);
  });
  return registry;
}

export function filterRecords(records, { query = "", namespace = "", status = "", sort = "id" } = {}) {
  const needle = query.trim().toLowerCase();
  return records
    .filter((record) => !namespace || record.namespace === namespace)
    .filter((record) => !status || record.status === status)
    .filter((record) => !needle || [record.id, record.phase, record.name, record.namespace].some((value) => String(value).toLowerCase().includes(needle)))
    .sort((a, b) => String(a[sort] || "").localeCompare(String(b[sort] || ""), undefined, { numeric: true }));
}

export function statusBadge(status) {
  const span = document.createElement("span");
  span.className = `status-badge status-${status.toLowerCase().replaceAll("_", "-")}`;
  span.textContent = status;
  span.setAttribute("aria-label", `Status: ${status}`);
  return span;
}

export function moduleCard({ title, status, description, href }) {
  const article = document.createElement("article");
  article.className = "module-card";
  const heading = document.createElement("h3");
  heading.textContent = title;
  article.append(heading, statusBadge(status));
  const text = document.createElement("p");
  text.textContent = description;
  article.append(text);
  if (href) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = "Open existing module";
    article.append(link);
  }
  return article;
}
