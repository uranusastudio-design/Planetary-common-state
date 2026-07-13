(function initializeMoonLighting(globalScope) {
  "use strict";

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const length = (vector) => Math.hypot(vector[0], vector[1], vector[2]);
  const normalize = (vector) => {
    const magnitude = length(vector);
    return magnitude > 0 ? vector.map((value) => value / magnitude) : null;
  };
  const dot = (left, right) => left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
  const cross = (left, right) => [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
  const subtractScaled = (vector, basis, scale) => vector.map((value, index) => value - basis[index] * scale);

  function normalizePhaseFraction(value) {
    if (!Number.isFinite(value)) return null;
    return ((value % 1) + 1) % 1;
  }

  function calculateIlluminatedFraction(phaseFraction, illuminationPercent) {
    if (Number.isFinite(illuminationPercent)) return clamp(illuminationPercent / 100, 0, 1);
    const phase = normalizePhaseFraction(phaseFraction);
    return phase === null ? null : (1 - Math.cos(phase * Math.PI * 2)) / 2;
  }

  function validVector(value) {
    return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite) && length(value) > 0;
  }

  function calculateMoonSunDirection(ephemeris = {}) {
    const phase = normalizePhaseFraction(ephemeris.phase_fraction);
    const illumination = calculateIlluminatedFraction(phase, ephemeris.illumination_percent);
    if (phase === null || illumination === null) return null;

    const waxing = phase > 0 && phase < 0.5;
    const waning = phase > 0.5;
    const cosine = clamp(illumination * 2 - 1, -1, 1);
    const transverse = Math.sqrt(Math.max(0, 1 - cosine * cosine));
    let horizontal = waxing ? -transverse : transverse;
    let vertical = 0;
    let source = "utc-synodic-approximation";

    if (validVector(ephemeris.moon_to_earth_vector_km) && validVector(ephemeris.moon_to_sun_vector_km)) {
      const observer = normalize(ephemeris.moon_to_earth_vector_km);
      const sun = normalize(ephemeris.moon_to_sun_vector_km);
      const northProjection = normalize(subtractScaled([0, 0, 1], observer, dot([0, 0, 1], observer)));
      if (northProjection) {
        const skyRight = normalize(cross(northProjection, observer));
        const sunProjection = normalize(subtractScaled(sun, observer, dot(sun, observer)));
        if (skyRight && sunProjection) {
          horizontal = -dot(sunProjection, skyRight) * transverse;
          vertical = dot(sunProjection, northProjection) * transverse;
          // The Moon texture is viewed from longitude 180. Keep the conventional
          // northern-view waxing/right and waning/left relationship while retaining
          // the JPL-derived bright-limb tilt.
          if ((waxing && horizontal > 0) || (waning && horizontal < 0)) {
            horizontal *= -1;
            vertical *= -1;
          }
          source = "jpl-horizons-vectors";
        }
      }
    }

    const moonToSun = normalize([-cosine, horizontal, vertical]);
    return {
      phase_fraction: phase,
      illuminated_fraction: illumination,
      waxing,
      waning,
      moon_to_sun_display_direction: { x: moonToSun[0], y: moonToSun[1], z: moonToSun[2] },
      geometry_source: source,
    };
  }

  globalScope.PCSMoonLighting = Object.freeze({
    calculateIlluminatedFraction,
    calculateMoonSunDirection,
    normalizePhaseFraction,
  });
}(typeof globalThis !== "undefined" ? globalThis : window));
