const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function loadRegistry() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(`${__dirname}/celestial-bodies.js`, "utf8"), context);
  return context.window.PCSSatelliteRegistry;
}

test("phase-one registry contains exactly Moon and the ten requested satellites", () => {
  const { bodies } = loadRegistry();
  assert.deepEqual(Object.keys(bodies), [
    "moon", "phobos", "deimos", "io", "europa", "ganymede", "callisto",
    "titan", "enceladus", "titania", "triton",
  ]);
});

test("every satellite satisfies the central data contract and provenance rules", () => {
  const { bodies } = loadRegistry();
  const required = [
    "id", "name", "parentBodyId", "type", "radiusKm", "meanOrbitalRadiusKm",
    "orbitalPeriodDays", "rotationPeriodDays", "inclinationDeg", "eccentricity",
    "texture", "fallbackTexture", "description", "scientificHighlights",
    "dataSource", "dataSourceUrl", "visualizationStatus", "dataQuality",
  ];
  Object.values(bodies).forEach((body) => {
    required.forEach((field) => assert.notEqual(body[field], undefined, `${body.id}.${field}`));
    assert.equal(body.type, "natural-satellite");
    assert.ok(body.radiusKm > 0);
    assert.ok(body.meanOrbitalRadiusKm > body.radiusKm);
    assert.ok(body.orbitalPeriodDays > 0);
    assert.ok(body.rotationPeriodDays > 0);
    assert.match(body.dataSourceUrl, /^https:\/\/(science|ssd)\.nasa\.gov\//);
    assert.ok(body.scientificHighlights.length >= 2 && body.scientificHighlights.length <= 4);
    assert.equal(body.dataQuality.radiusKm, "verified");
    assert.equal(body.dataQuality.meanOrbitalRadiusKm, "approximate");
    assert.equal(body.dataQuality.texture, "visual-only");
  });
});

test("planet-to-satellite hierarchy matches phase-one scope", () => {
  const { hierarchy } = loadRegistry();
  assert.deepEqual(JSON.parse(JSON.stringify(hierarchy)), {
    earth: ["moon"], mars: ["phobos", "deimos"],
    jupiter: ["io", "europa", "ganymede", "callisto"],
    saturn: ["titan", "enceladus"], uranus: ["titania"], neptune: ["triton"],
  });
});
