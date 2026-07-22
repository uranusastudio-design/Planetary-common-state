import test from "node:test";
import assert from "node:assert/strict";
import { REGIONAL_PROFILES, handleRegionalRequest, loadRegionalObservation, newYearCities } from "../src/regional.js";

const response = (body) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const mockFetcher = async (url) => {
  const value = String(url);
  if (value.includes("api.open-meteo.com/v1/forecast")) return response({ timezone: "Asia/Taipei", current: { time: "2026-07-18T12:00", temperature_2m: 30, apparent_temperature: 34, relative_humidity_2m: 72, dew_point_2m: 24, surface_pressure: 1003, wind_speed_10m: 12, wind_direction_10m: 180, wind_gusts_10m: 20, precipitation: 1.2, snowfall: 0, cloud_cover: 80, visibility: 10000, uv_index: 2 }, current_units: { temperature_2m: "°C", apparent_temperature: "°C", relative_humidity_2m: "%", dew_point_2m: "°C", surface_pressure: "hPa", wind_speed_10m: "km/h", wind_direction_10m: "°", wind_gusts_10m: "km/h", precipitation: "mm", snowfall: "cm", cloud_cover: "%", visibility: "m", uv_index: "" } });
  if (value.includes("air-quality-api")) return response({ current: { time: "2026-07-18T12:00", us_aqi: 45, pm2_5: 8, ozone: 70 }, current_units: { us_aqi: "US AQI", pm2_5: "μg/m³", ozone: "μg/m³" } });
  if (value.includes("earthquake.usgs.gov")) return response({ features: [{ id: "us-test", geometry: { coordinates: [121.1, 23.5, 12] }, properties: { mag: 5.1, time: Date.parse("2026-07-18T10:00:00Z"), updated: Date.parse("2026-07-18T10:05:00Z"), place: "Taiwan region", status: "reviewed", tsunami: 0, cdi: 3, mmi: 4, url: "https://earthquake.usgs.gov/test" } }] });
  if (value.includes("marine-api")) return response(TAIWAN_MARINE);
  throw new Error(`Unexpected ${url}`);
};

const times = ["2026-07-18T10:00", "2026-07-18T11:00", "2026-07-18T12:00", "2026-07-18T13:00"];
const TAIWAN_MARINE = Array.from({ length: 5 }, () => ({ hourly: { time: times, wave_height: [1, 1.2, 1.1, 1], sea_surface_temperature: [28, 28, 28.1, 28.1], sea_level_height_msl: [0.1, 0.3, 0.2, 0.1] }, hourly_units: { wave_height: "m", sea_surface_temperature: "°C", sea_level_height_msl: "m" } }));

test("Phase 6.3 profile catalog has all navigation groups and required critical regions", () => {
  assert.deepEqual(new Set(Object.values(REGIONAL_PROFILES).map((item) => item.group)), new Set(["COUNTRY", "CRITICAL REGION", "SEASONAL & CIVILIZATION"]));
  for (const id of ["taiwan", "japan", "himalaya", "iceland_glaciers", "new_zealand_glaciers", "alaska_glaciers", "drylands", "amazon", "african_savanna", "niagara", "iguazu", "victoria_falls", "new_year"]) assert.ok(REGIONAL_PROFILES[id], id);
  assert.deepEqual(REGIONAL_PROFILES.taiwan.stations.map((item) => item.name), ["Keelung", "Taipei Port", "Taichung", "Kaohsiung", "Hualien"]);
});

test("regional observation keeps model forecast separate from observations and emits honest coastal classes", async () => {
  const payload = await loadRegionalObservation("taiwan", mockFetcher, new Date("2026-07-18T12:00:00Z"));
  assert.equal(payload.weather.observed.length, 0);
  assert.ok(payload.weather.forecast.every((item) => ["FORECAST", "OBSERVED"].includes(item.data_class)));
  assert.equal(payload.weather.forecast.find((item) => item.key === "temperature_2m").value, 30);
  assert.equal(payload.weather.forecast.find((item) => item.key === "uv_index").unit, "index");
  assert.equal(payload.weather.forecast.find((item) => item.key === "lightning").status, "UNAVAILABLE");
  assert.equal(payload.earthquakes.events[0].cluster_label, null);
  assert.equal(payload.coastal.stations.length, 5);
  for (const station of payload.coastal.stations) {
    assert.equal(station.modelled_sea_level.data_class, "FORECAST");
    assert.equal(station.observed_water_level.data_class, "OBSERVED_WATER_LEVEL");
    assert.equal(station.observed_water_level.status, "AUTH_REQUIRED");
    assert.equal(station.storm_surge_residual.status, "UNAVAILABLE");
  }
});

test("regional routes reject unknown profiles and New Year information stays aggregate", async () => {
  const rejected = await handleRegionalRequest(new Request("https://pcs.test/api/regional/observation?region=unknown"), mockFetcher);
  assert.equal(rejected.status, 400);
  const cities = newYearCities(new Date("2026-07-18T00:00:00Z"));
  assert.ok(cities.length >= 8);
  assert.ok(cities.every((city) => city.aggregate_crowd_status === "UNAVAILABLE" && !Object.hasOwn(city, "visitor_history")));
});
