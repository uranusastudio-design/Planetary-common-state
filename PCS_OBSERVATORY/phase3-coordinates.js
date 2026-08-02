(function exposePhase3Coordinates(global) {
  "use strict";

  const DEG = Math.PI / 180;
  const KPC_TO_LY = 3261.563777;
  const ICRS_TO_GALACTIC = Object.freeze([
    Object.freeze([-0.0548755604, -0.8734370902, -0.4838350155]),
    Object.freeze([0.4941094279, -0.4448296300, 0.7469822445]),
    Object.freeze([-0.8676661490, -0.1980763734, 0.4559837762])
  ]);
  const FRAME = Object.freeze({
    id: "pcs-galactocentric-reid2019-v1",
    handedness: "right-handed",
    galcenDistanceKpc: 8.15,
    zSunKpc: 0.0208,
    sun: Object.freeze([-8.15, 0, 0.0208]),
    axes: Object.freeze({x: "Sun projection toward Galactic center", y: "Galactic longitude l=90 deg", z: "North Galactic Pole"}),
    source: "Reid et al. 2019 for R0; Bennett & Bovy 2019 / documented Astropy parameter for z_sun"
  });

  const multiply = (matrix, vector) => matrix.map(row => row.reduce((sum, value, index) => sum + value * vector[index], 0));
  function sphericalToCartesian(longitudeDeg, latitudeDeg, distance) {
    const lon = longitudeDeg * DEG, lat = latitudeDeg * DEG, cosLat = Math.cos(lat);
    return [distance * cosLat * Math.cos(lon), distance * cosLat * Math.sin(lon), distance * Math.sin(lat)];
  }
  function icrsToHeliocentricGalactic(raDeg, decDeg, distanceKpc) {
    return multiply(ICRS_TO_GALACTIC, sphericalToCartesian(raDeg, decDeg, distanceKpc));
  }
  function galacticToGalactocentric(longitudeDeg, latitudeDeg, distanceKpc, frame = FRAME) {
    const [hx, hy, hz] = sphericalToCartesian(longitudeDeg, latitudeDeg, distanceKpc);
    return [hx - frame.galcenDistanceKpc, hy, hz + frame.zSunKpc];
  }
  function icrsToGalactocentric(raDeg, decDeg, distanceKpc, frame = FRAME) {
    const [hx, hy, hz] = icrsToHeliocentricGalactic(raDeg, decDeg, distanceKpc);
    return [hx - frame.galcenDistanceKpc, hy, hz + frame.zSunKpc];
  }
  function distanceModulusToKpc(modulus) {
    return 10 ** ((Number(modulus) + 5) / 5) / 1000;
  }
  function logarithmicSpiral(radiusRefKpc, azimuthRad, azimuthRefRad, pitchDeg) {
    return radiusRefKpc * Math.exp((azimuthRad - azimuthRefRad) * Math.tan(pitchDeg * DEG));
  }
  function sceneRadiusKpc(radiusKpc, mode, domain = "milky-way") {
    if (mode === "scientific") return radiusKpc * 1e6;
    const base = domain === "local-group" ? 4.5e7 : 2.2e7;
    return base * Math.log10(1 + Math.max(0, radiusKpc));
  }
  function scenePosition(cartesianKpc, mode, domain = "milky-way") {
    const radius = Math.hypot(...cartesianKpc);
    if (!radius) return [0, 0, 0];
    const mapped = sceneRadiusKpc(radius, mode, domain);
    return cartesianKpc.map(value => value / radius * mapped);
  }

  global.PCSPhase3Coordinates = Object.freeze({DEG, KPC_TO_LY, ICRS_TO_GALACTIC, FRAME, sphericalToCartesian, icrsToHeliocentricGalactic, galacticToGalactocentric, icrsToGalactocentric, distanceModulusToKpc, logarithmicSpiral, sceneRadiusKpc, scenePosition});
})(typeof window === "undefined" ? globalThis : window);
