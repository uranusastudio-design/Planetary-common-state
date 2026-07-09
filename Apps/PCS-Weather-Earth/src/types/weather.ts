/**
 * Domain types for weather map layers.
 *
 * Kept isolated in src/types so that future PCS subsystem modules
 * (ocean, cryosphere, biosphere, energy, human, PCS state estimation)
 * can define their own sibling type files without coupling to this one.
 */

/** Identifiers for the OpenWeather tile layers this app supports. */
export type WeatherLayerId = 'temperature' | 'clouds' | 'rain' | 'wind';

/** Static configuration describing how to fetch and label a weather layer. */
export interface WeatherLayerConfig {
  id: WeatherLayerId;
  label: string;
  description: string;
  /** Worker proxy tile path segment, e.g. "temp". */
  proxyPath: string;
  /** Tile opacity applied on top of the Cesium base imagery. */
  opacity: number;
}

/** Runtime state describing which layer is currently active. */
export interface WeatherLayerState {
  activeLayerIds: WeatherLayerId[];
}

/** Temporary diagnostics for the OpenWeather imagery layer. */
export interface WeatherDebugInfo {
  /** True when a PCS backend URL is configured so tile proxy requests can succeed. */
  hasBackend: boolean;
  activeLayerIds: WeatherLayerId[];
  tileUrls: string[];
  latestFailedTileUrl: string | null;
  imageryLayerCount: number;
  latestTileError: string | null;
}
