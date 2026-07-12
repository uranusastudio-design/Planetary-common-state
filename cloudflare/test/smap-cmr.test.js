import assert from "node:assert/strict";
import test from "node:test";

const SMAP_COLLECTIONS_URL =
  "https://cmr.earthdata.nasa.gov/search/collections.json?keyword=SMAP&page_size=20";
const PREFERRED_SMAP_COLLECTION_URL =
  "https://cmr.earthdata.nasa.gov/search/collections.json?short_name=SPL4SMGP&version=008&page_size=5";

function isRelevantSmapCollection(entry) {
  const searchable = [
    entry.id,
    entry.short_name,
    entry.dataset_id,
    entry.title,
    entry.summary
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return /\bsmap\b/.test(searchable);
}

test("SMAP CMR collection discovery returns at least one relevant collection", async () => {
  const response = await fetch(SMAP_COLLECTIONS_URL, {
    headers: { accept: "application/json" }
  });

  assert.equal(response.status, 200);

  const data = await response.json();
  const entries = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];
  const relevantCollections = entries.filter(isRelevantSmapCollection);

  assert.ok(
    relevantCollections.length > 0,
    "Expected CMR keyword=SMAP search to return at least one clearly relevant SMAP collection"
  );

  for (const collection of relevantCollections) {
    assert.ok(collection.id, "SMAP collection should include a concept id");
    assert.ok(collection.short_name, "SMAP collection should include a short name");
    assert.ok(collection.title || collection.dataset_id, "SMAP collection should include a title");
  }
});

test("preferred PCS SMAP collection exposes a CMR concept id", async () => {
  const response = await fetch(PREFERRED_SMAP_COLLECTION_URL, {
    headers: { accept: "application/json" }
  });

  assert.equal(response.status, 200);

  const data = await response.json();
  const entries = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];
  const preferred = entries.find((entry) =>
    entry.short_name === "SPL4SMGP" && entry.version_id === "008"
  );

  assert.ok(preferred, "Expected SPL4SMGP version 008 to be discoverable in CMR");
  assert.ok(
    preferred.id || preferred["concept-id"],
    "Expected SPL4SMGP version 008 to expose a CMR collection concept id"
  );
  assert.equal(preferred.id || preferred["concept-id"], "C3480440870-NSIDC_CPRD");
  assert.equal(
    preferred.title || preferred.dataset_id,
    "SMAP L4 Global 3-hourly 9 km EASE-Grid Surface and Root Zone Soil Moisture Geophysical Data V008"
  );
});
