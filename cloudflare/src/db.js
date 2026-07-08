export async function saveObservation(env, observation) {
  const variable = await env.PCS_DB
    .prepare("SELECT id FROM pcs_variables WHERE symbol = ? LIMIT 1")
    .bind(observation.symbol)
    .first();

  if (!variable) {
    return {
      symbol: observation.symbol,
      imported: false,
      reason: "variable_not_found"
    };
  }

  const source = await env.PCS_DB
    .prepare("SELECT id FROM pcs_sources WHERE name = ? LIMIT 1")
    .bind(observation.source)
    .first();

  if (!source) {
    return {
      symbol: observation.symbol,
      imported: false,
      reason: "source_not_found"
    };
  }

  await env.PCS_DB
    .prepare(`
      INSERT INTO pcs_observations
      (variable_id, region_id, timestamp, value, uncertainty, source_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(
      variable.id,
      observation.region_id ?? 1,
      observation.timestamp,
      observation.value,
      observation.uncertainty ?? null,
      source.id
    )
    .run();

  return {
    symbol: observation.symbol,
    imported: true,
    value: observation.value,
    timestamp: observation.timestamp,
    source: observation.source
  };
}

export async function getLatestState(env) {
  const { results } = await env.PCS_DB.prepare(`
    SELECT
      v.id AS variable_id,
      v.name,
      v.symbol,
      v.category,
      v.residual_group,
      v.unit,
      o.timestamp,
      o.value,
      o.uncertainty,
      s.name AS source_name
    FROM pcs_variables v
    LEFT JOIN pcs_observations o ON o.variable_id = v.id
    LEFT JOIN pcs_sources s ON s.id = o.source_id
    ORDER BY v.id, o.timestamp DESC
  `).all();

  const latestBySymbol = {};
  for (const row of results) {
    if (!latestBySymbol[row.symbol]) {
      latestBySymbol[row.symbol] = row;
    }
  }

  return Object.values(latestBySymbol);
}
