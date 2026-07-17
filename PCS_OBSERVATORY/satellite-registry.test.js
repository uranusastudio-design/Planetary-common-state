const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function loadRegistry() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(`${__dirname}/mission-imagery-registry.js`, "utf8"), context);
  vm.runInContext(fs.readFileSync(`${__dirname}/celestial-bodies.js`, "utf8"), context);
  return {
    ...context.window.PCSSatelliteRegistry,
    imagery: context.window.PCSMissionImageryRegistry,
  };
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

test("every phase-one satellite has centralized verified mission imagery provenance", () => {
  const { bodies, imagery } = loadRegistry();
  assert.equal(Object.keys(imagery).length, 11);
  for (const body of Object.values(bodies)) {
    const source = imagery[body.id];
    assert.ok(source, `${body.id} mission imagery registry entry`);
    assert.equal(source.verified, true, `${body.id} provenance verified`);
    assert.match(source.sourcePage, /^https:\/\/(science\.nasa\.gov|astrogeology\.usgs\.gov)\//);
    if (body.id === "moon") {
      assert.equal(body.textureProvider, "existing-moon-renderer");
      continue;
    }
    assert.equal(body.textureProvider.type, "mission-imagery", `${body.id} provider`);
    assert.equal(body.localTextureUrl, source.localPath);
    assert.equal(body.localVisualizationTextureUrl, undefined, `${body.id} has no procedural primary texture`);
    const localAsset = `${__dirname}/${source.localPath.replace(/^\.\//, "")}`;
    assert.equal(fs.existsSync(localAsset), true, `${body.id} deployed texture exists`);
    const metadata = JSON.parse(fs.readFileSync(`${__dirname}/assets/moons/${body.id}/source.json`, "utf8"));
    for (const field of ["agency", "mission", "instrument", "productId", "sourcePage", "sourceAsset", "credit", "projection", "colorMode", "coverage", "originalResolution", "deployedResolution", "processing", "accessDate"]) {
      assert.ok(metadata[field], `${body.id} source.json ${field}`);
    }
  }
  assert.deepEqual(Array.from(bodies.phobos.renderProfile.shapeAxesKm), [13.5, 11, 9]);
  assert.deepEqual(Array.from(bodies.deimos.renderProfile.shapeAxesKm), [7.5, 6, 5.5]);
});

test("runtime texture selection cannot use the retired procedural primary path", () => {
  const appSource = fs.readFileSync(`${__dirname}/app.js`, "utf8");
  const providerBody = appSource.slice(
    appSource.indexOf("async function getSatelliteTexture"),
    appSource.indexOf("function applySatelliteTexture"),
  );
  assert.doesNotMatch(providerBody, /createScientificSatelliteTexture|localVisualizationTextureUrl|procedural-scientific/);
  for (const bodyId of ["phobos", "deimos", "io", "europa", "ganymede", "callisto", "titan", "enceladus", "titania", "triton"]) {
    assert.equal(fs.existsSync(`${__dirname}/assets/moons/${bodyId}-scientific.svg`), false, `${bodyId} retired SVG removed`);
  }
});
