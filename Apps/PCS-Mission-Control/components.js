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
  if (!registry || !["pcs.phase-registry.v1", "pcs.phase-registry.local-readonly.v1"].includes(registry.schema_version) || !Array.isArray(registry.records)) {
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

export function validateLocalAdminStatus(status) {
  if (!status || status.schema_version !== "pcs.mission-control.local-admin-status.v1") {
    throw new Error("Unsupported local-admin status source");
  }
  if (status.runtime_mode !== "LOCAL_ADMIN_ONLY" || status.system_state !== "DEGRADED_OR_INCOMPLETE") {
    throw new Error("Unsafe Mission Control runtime state");
  }
  const source = status.history_source;
  if (!source || source.name !== "chatgpt-pcs-history" || source.access !== "READ_ONLY" || source.scope !== "LOCAL_ONLY") {
    throw new Error("Invalid history-source boundary");
  }
  if (source.conversations !== 83 || source.messages !== 2384 || source.chunks !== 3013) {
    throw new Error("History-source validation counts changed");
  }
  return status;
}

export function filterRecords(records, {
  query = "",
  namespace = "",
  status = "",
  functional = "",
  deployment = "",
  lock = "",
  sort = "id"
} = {}) {
  const needle = query.trim().toLowerCase();
  return records
    .filter((record) => !namespace || record.namespace === namespace)
    .filter((record) => !status || record.status === status)
    .filter((record) => !functional || record.functional_status === functional)
    .filter((record) => !deployment || record.deployment_status === deployment)
    .filter((record) => !lock || record.lock_status === lock)
    .filter((record) => !needle || [
      record.id,
      record.phase,
      record.name,
      record.namespace,
      record.status,
      record.functional_status,
      record.deployment_status,
      ...(record.blockers || [])
    ].some((value) => String(value).toLowerCase().includes(needle)))
    .sort((a, b) => String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), undefined, { numeric: true }));
}

export function summarizeQueue(items, vocabulary) {
  const counts = Object.fromEntries(vocabulary.map((status) => [status, 0]));
  items.forEach((item) => {
    if (!(item.queue_status in counts)) throw new Error(`Unknown queue status: ${item.queue_status}`);
    counts[item.queue_status] += 1;
  });
  return counts;
}

export function filterQueueItems(items, {
  query = "",
  status = "",
  namespace = "",
  priority = "",
  lock = "",
  validation = "",
  blockers = "",
  sort = "queue_item_id"
} = {}) {
  const needle = query.trim().toLowerCase();
  const direction = sort === "priority" ? -1 : 1;
  return items
    .filter((item) => !status || item.queue_status === status)
    .filter((item) => !namespace || item.namespace === namespace)
    .filter((item) => !priority || item.priority === priority)
    .filter((item) => !lock || item.lock_status === lock)
    .filter((item) => !validation || item.validation_status === validation)
    .filter((item) => !blockers || (blockers === "HAS_BLOCKERS" ? item.blockers.length > 0 : item.blockers.length === 0))
    .filter((item) => !needle || [
      item.queue_item_id,
      item.canonical_record_id,
      item.title,
      item.namespace,
      item.lifecycle_status,
      item.queue_status,
      item.priority,
      ...item.blockers,
      ...item.dependency_ids
    ].some((value) => String(value ?? "").toLowerCase().includes(needle)))
    .sort((a, b) => direction * String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), undefined, { numeric: true }));
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
