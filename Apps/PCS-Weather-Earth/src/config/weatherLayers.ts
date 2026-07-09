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
 * Verifies that a PCS backend URL is present (non-empty string).
 * Used to fail fast with a clear message instead of silently loading broken tiles.
 */
export function isPcsBackendConfigured(backendUrl: string | undefined | null): backendUrl is string {
  return typeof backendUrl === 'string' && backendUrl.trim().length > 0;
}

/**
 * Builds the tile URL template Cesium's UrlTemplateImageryProvider expects.
 * Requests are routed through the Cloudflare worker tile proxy so the
 * OpenWeather API key is never embedded in browser network traffic.
 *
 * Proxy endpoint: {backendUrl}/tiles/openweather/{layerId}/{z}/{x}/{y}.png
 */
export function buildOpenWeatherTileUrl(layerId: string, backendUrl: string): string {
  const base = backendUrl.replace(/\/$/, '');
  return `${base}/tiles/openweather/${layerId}/{z}/{x}/{y}.png`;
}

export function maskOpenWeatherTileUrl(url: string): string {
  return url.replace(/([?&]appid=)[^&]*/i, '$1***');
}
