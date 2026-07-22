const BRIEF_SOURCES = Object.freeze([
  { id: "nasa-earth-observatory", name: "NASA Earth Observatory", url: "https://earthobservatory.nasa.gov/feeds/earth-observatory.rss", source_type: "official_research", reliability: "primary" },
  { id: "nasa-news", name: "NASA", url: "https://www.nasa.gov/news-release/feed/", source_type: "official_research", reliability: "primary" },
  { id: "noaa-research", name: "NOAA Research", url: "https://research.noaa.gov/feed/", source_type: "official_research", reliability: "primary" },
  { id: "arxiv-earth-ai", name: "arXiv", url: "https://export.arxiv.org/api/query?search_query=cat:physics.ao-ph+OR+cat:cs.AI&start=0&max_results=12&sortBy=submittedDate&sortOrder=descending", source_type: "academic_preprint", reliability: "preprint" },
  { id: "arxiv-space-math", name: "arXiv", url: "https://export.arxiv.org/api/query?search_query=cat:astro-ph+OR+cat:math.DS&start=0&max_results=12&sortBy=submittedDate&sortOrder=descending", source_type: "academic_preprint", reliability: "preprint" },
]);

function decodeXml(value = "") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

function field(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeXml(match[1]);
  }
  return "";
}

function link(block) {
  const atom = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  return atom?.[1] || field(block, ["link", "guid"]);
}

export function parseFeed(xml, source) {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  return blocks.map((block) => ({
    id: crypto.randomUUID(), title: field(block, ["title"]), summary: field(block, ["description", "summary", "content"]),
    source_url: link(block), source_name: source.name, source_type: source.source_type,
    reliability: source.reliability, published_at: field(block, ["pubDate", "published", "updated"]) || null,
    image_url: block.match(/<(?:media:content|enclosure)[^>]+url=["']([^"']+)["']/i)?.[1] || null,
  })).filter((item) => item.title && item.source_url);
}

function classify(text) {
  const value = text.toLowerCase();
  if (/climate|temperature|ocean|ice|atmospher|earth|wildfire|flood|drought/.test(value)) return "earth_system";
  if (/astronom|cosmolog|planet|galax|telescope|space/.test(value)) return "astronomy";
  if (/artificial intelligence|\bai\b|machine learning|technology|computer/.test(value)) return "ai_technology";
  if (/mathemat|physics|quantum/.test(value)) return "physics";
  return "academic_research";
}

function eventType(text) {
  const value = text.toLowerCase();
  const matches = [["heatwave", /heatwave|heat wave|heat dome/], ["drought", /drought/], ["flood", /flood/], ["wildfire", /wildfire|forest fire/], ["cyclone", /cyclone|hurricane|typhoon/], ["earthquake", /earthquake/], ["volcanic_activity", /volcan/], ["sea_ice", /sea ice/], ["scientific_discovery", /discover|new study|researchers find/]];
  return matches.find(([, pattern]) => pattern.test(value))?.[0] || "other";
}

function pcsDomains(text) {
  const value = text.toLowerCase(), domains = [];
  if (/climate|heat|temperature|weather|atmospher|cyclone/.test(value)) domains.push("atmosphere", "thermal");
  if (/ocean|sea level/.test(value)) domains.push("ocean", "hydrosphere");
  if (/ice|snow|glacier/.test(value)) domains.push("cryosphere");
  if (/forest|vegetation|ecosystem|wildfire/.test(value)) domains.push("biosphere");
  if (/earthquake|volcan/.test(value)) domains.push("lithosphere");
  return [...new Set(domains)];
}

function region(text) {
  const known = ["United States", "Europe", "Asia", "Africa", "Arctic", "Antarctica", "Pacific", "Atlantic", "China", "Japan", "Taiwan", "Korea"];
  return known.find((name) => text.toLowerCase().includes(name.toLowerCase())) || "Global / not extracted";
}

function deduplicate(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 12).join(" ");
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export function normalizeBriefItems(items, now = new Date()) {
  return deduplicate(items).map((item) => {
    const text = `${item.title} ${item.summary}`;
    const category = classify(text), mappedEvent = eventType(text);
    return { ...item, id: item.id || crypto.randomUUID(), category, region: region(text), event_type: mappedEvent,
      pcs_domains: pcsDomains(text), event_candidate: false,
      event_candidate_reason: "Research/news brief content is not an observation or event confirmation feed.",
      event_summary: item.summary || null,
      why_it_matters: null,
      research_relevance: pcsDomains(text).length ? `Mapped to PCS domains: ${pcsDomains(text).join(", ")}.` : null,
      observed_event_time: null,
      confidence: null,
      data_state: "PUBLICATION_METADATA", generated_at: now.toISOString(),
      created_at: now.toISOString(), updated_at: now.toISOString() };
  }).sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
}

async function retrieveSources(fetcher) {
  const settled = await Promise.allSettled(BRIEF_SOURCES.map(async (source) => {
    const response = await fetcher(source.url, { headers: { "user-agent": "PCS-Observatory/2.0 public-research" }, cf: { cacheTtl: 900 } });
    if (!response.ok) throw new Error(`${source.name} HTTP ${response.status}`);
    return { source, items: parseFeed(await response.text(), source) };
  }));
  return {
    items: settled.flatMap((result) => result.status === "fulfilled" ? result.value.items : []),
    sources: settled.map((result, index) => ({ provider: BRIEF_SOURCES[index].name, endpoint: BRIEF_SOURCES[index].url, retrieval_status: result.status === "fulfilled" ? "LIVE" : "ERROR", error: result.status === "rejected" ? String(result.reason?.message || result.reason) : null })),
  };
}

async function persistBrief(env, items) {
  if (!env.PCS_DB || !items.length) return;
  const statements = items.map((item) => env.PCS_DB.prepare(`INSERT OR IGNORE INTO pcs_daily_brief_items
    (id, title, summary, event_summary, why_it_matters, research_relevance, category, region, event_type,
     observed_event_time, confidence, pcs_domains, source_url, source_name, source_type,
     reliability, published_at, image_url, event_candidate, event_candidate_reason, data_state, retrieved_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(item.id, item.title, item.summary || null, item.event_summary, item.why_it_matters, item.research_relevance,
      item.category, item.region, item.event_type, item.observed_event_time, item.confidence, JSON.stringify(item.pcs_domains),
      item.source_url, item.source_name, item.source_type, item.reliability, item.published_at, item.image_url,
      item.event_candidate ? 1 : 0, item.event_candidate_reason, item.data_state, item.generated_at, item.created_at, item.updated_at));
  for (let index = 0; index < statements.length; index += 50) await env.PCS_DB.batch(statements.slice(index, index + 50));
}

export async function ingestDailyBrief(env, fetcher = fetch, now = new Date()) {
  const retrieved = await retrieveSources(fetcher);
  const normalized = normalizeBriefItems(retrieved.items, now);
  const highImportance = normalized.filter((item) => item.event_type !== "other" && item.reliability === "primary").length >= 5;
  const selected = normalized.slice(0, highImportance ? 15 : 10);
  await persistBrief(env, selected);
  const workingSources = retrieved.sources.filter((source) => source.retrieval_status === "LIVE").length;
  return { generated_at: now.toISOString(), operational_status: workingSources ? (workingSources === retrieved.sources.length ? "ACTIVE" : "PARTIAL") : "ERROR",
    primary: selected.slice(0, 10), more_intelligence: selected.slice(10, 15), sources: retrieved.sources,
    counts: { brief_items: selected.length, event_candidates: 0, retrospective_analyses: 0 },
    policy: { primary_size: 10, maximum_size: 15, article_measurements: false } };
}

export async function readDailyBrief(env, fetcher = fetch, now = new Date()) {
  if (env.PCS_DB) {
    const { results } = await env.PCS_DB.prepare(`SELECT * FROM pcs_daily_brief_items WHERE retrieved_at >= datetime('now','-2 days') ORDER BY COALESCE(published_at, retrieved_at) DESC LIMIT 15`).all();
    if (results.length >= 10) {
      const decoded = results.map((item) => ({ ...item, pcs_domains: JSON.parse(item.pcs_domains || "[]"), event_candidate: Boolean(item.event_candidate) }));
      const cachedNames = new Set(decoded.map((item) => item.source_name));
      const cachedSources = BRIEF_SOURCES.map((source) => ({ provider: source.name, endpoint: source.url,
        retrieval_status: cachedNames.has(source.name) ? "CACHED" : "NOT_RETRIEVED", error: null }));
      return { generated_at: now.toISOString(), operational_status: "ACTIVE", primary: decoded.slice(0, 10), more_intelligence: decoded.slice(10, 15), sources: cachedSources,
        counts: { brief_items: decoded.length, event_candidates: decoded.filter((item) => item.event_candidate).length, retrospective_analyses: 0 },
        policy: { primary_size: 10, maximum_size: 15, article_measurements: false } };
    }
  }
  return ingestDailyBrief(env, fetcher, now);
}

export async function proposeAiAnalysis(env, input, now = new Date()) {
  const metadata = { model_provider: env.AI ? "Cloudflare Workers AI" : null, model_name: env.AI_MODEL || null, model_version: env.AI_MODEL_VERSION || null,
    generated_at: now.toISOString(), input_snapshot_ids: input.input_snapshot_ids || [], confidence: null,
    review_status: "PROPOSAL", prompt_or_rule_version: input.prompt_or_rule_version || "pcs-analysis-v1" };
  if (!env.AI || !env.AI_MODEL) return { ...metadata, status: "NOT_CONFIGURED", proposal: null, error: "AI binding or AI_MODEL is not configured" };
  const prompt = `Return JSON only. Propose classification, PCS domains, candidate precursor variables, and a candidate causal-chain hypothesis for this supplied publication metadata. Never create measurements, anomalies, lead time, validation, precision, or recall. Input: ${JSON.stringify(input.source_record || {})}`;
  try {
    const output = await env.AI.run(env.AI_MODEL, { prompt });
    return { ...metadata, status: "CONNECTED", proposal: output?.response || output, constraints: ["proposal_only", "no_observed_measurements", "requires_rule_or_human_review"] };
  } catch (error) { return { ...metadata, status: "ERROR", proposal: null, error: error?.message || "AI analysis failed" }; }
}
