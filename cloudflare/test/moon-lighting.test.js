import test from "node:test";
import assert from "node:assert/strict";

await import("../../PCS_OBSERVATORY/moon-lighting.js");

const { calculateMoonSunDirection } = globalThis.PCSMoonLighting;

const cases = [
  { phase_fraction: 0.00, illumination: 0.00, direction: "new" },
  { phase_fraction: 0.25, illumination: 0.50, direction: "right" },
  { phase_fraction: 0.50, illumination: 1.00, direction: "full" },
  { phase_fraction: 0.75, illumination: 0.50, direction: "left" },
];

for (const phaseCase of cases) {
  test(`Moon phase ${phaseCase.phase_fraction.toFixed(2)} has expected illumination and limb`, () => {
    const result = calculateMoonSunDirection({ phase_fraction: phaseCase.phase_fraction });
    assert.ok(Math.abs(result.illuminated_fraction - phaseCase.illumination) < 1e-12);
    const direction = result.moon_to_sun_display_direction;
    if (phaseCase.direction === "new") assert.ok(direction.x > 0.999);
    if (phaseCase.direction === "full") assert.ok(direction.x < -0.999);
    if (phaseCase.direction === "right") assert.ok(direction.y < -0.999, "waxing illumination must be on the visual right");
    if (phaseCase.direction === "left") assert.ok(direction.y > 0.999, "waning illumination must be on the visual left");
  });
}

test("JPL vectors supply bright-limb tilt without reversing waxing convention", () => {
  const result = calculateMoonSunDirection({
    phase_fraction: 0.25,
    illumination_percent: 50,
    moon_to_earth_vector_km: [1, 0, 0],
    moon_to_sun_vector_km: [0, 0.8, 0.6],
  });
  assert.equal(result.geometry_source, "jpl-horizons-vectors");
  assert.ok(result.moon_to_sun_display_direction.y < 0);
  assert.notEqual(result.moon_to_sun_display_direction.z, 0);
});
