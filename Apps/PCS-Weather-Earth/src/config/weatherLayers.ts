import type { WeatherLayerConfig, WeatherLayerId } from '../types/weather';

/**
 * OpenWeather "Weather Maps 1.0" tile layer catalogue.
 * Tile URL pattern: https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={API key}
 * Docs: https://openweathermap.org/api/weathermaps
 */
export const WEATHER_LAYERS: WeatherLayerConfig[] = [
  {
    id: 'temperature',
    label: 'Temperature',
    description: 'Global surface air temperature',
    owmLayer: 'temp_new',
    opacity: 0.6,
  },
  {
    id: 'clouds',
    label: 'Clouds',
    description: 'Cloud coverage percentage',
    owmLayer: 'clouds_new',
    opacity: 0.5,
  },
  {
    id: 'rain',
    label: 'Rain',
    description: 'Precipitation intensity',
    owmLayer: 'precipitation_new',
    opacity: 0.6,
  },
  {
    id: 'wind',
    label: 'Wind',
    description: 'Wind speed',
    owmLayer: 'wind_new',
    opacity: 0.6,
  },
];

export function getWeatherLayerConfig(id: WeatherLayerId): WeatherLayerConfig | undefined {
  return WEATHER_LAYERS.find((layer) => layer.id === id);
}

/**
 * Verifies that an OpenWeather API key is present (non-empty, non-placeholder).
 * Used to fail fast with a clear message instead of silently loading broken tiles.
 */
export function isOpenWeatherApiKeyConfigured(apiKey: string | undefined | null): apiKey is string {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

/**
 * Builds the OpenWeather tile URL template Cesium's UrlTemplateImageryProvider expects.
 * The API key is read from the environment at call time, never hardcoded.
 */
export function buildOpenWeatherTileUrl(owmLayer: string, apiKey: string): string {
  return `https://tile.openweathermap.org/map/${owmLayer}/{z}/{x}/{y}.png?appid=${apiKey}`;
}
