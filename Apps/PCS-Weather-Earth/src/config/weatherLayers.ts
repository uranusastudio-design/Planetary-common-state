import type { WeatherLayerConfig, WeatherLayerId } from '../types/weather';

export const PCS_BACKEND_URL = 'https://pcs-backend.uranusastudio.workers.dev';

/** Weather layer catalogue exposed through the PCS backend tile proxy. */
export const WEATHER_LAYERS: WeatherLayerConfig[] = [
  {
    id: 'temperature',
    label: 'Temperature',
    description: 'Global surface air temperature',
    proxyPath: 'temp',
    opacity: 0.6,
  },
  {
    id: 'clouds',
    label: 'Clouds',
    description: 'Cloud coverage percentage',
    proxyPath: 'clouds',
    opacity: 0.5,
  },
  {
    id: 'rain',
    label: 'Rain',
    description: 'Precipitation intensity',
    proxyPath: 'rain',
    opacity: 0.6,
  },
  {
    id: 'wind',
    label: 'Wind',
    description: 'Wind speed',
    proxyPath: 'wind',
    opacity: 0.6,
  },
];

export function getWeatherLayerConfig(id: WeatherLayerId): WeatherLayerConfig | undefined {
  return WEATHER_LAYERS.find((layer) => layer.id === id);
}

/**
 * Builds the tile URL template Cesium's UrlTemplateImageryProvider expects.
 * Requests are routed through the Cloudflare worker tile proxy so browser
 * traffic only targets the PCS backend host.
 */
export function buildOpenWeatherTileUrl(layerPath: string, backendUrl: string): string {
  const base = backendUrl.replace(/\/$/, '');
  return `${base}/tiles/openweather/${layerPath}/{z}/{x}/{y}.png`;
}
