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
  /** OpenWeather tile layer path segment, e.g. "temp_new". */
  owmLayer: string;
  /** Tile opacity applied on top of the Cesium base imagery. */
  opacity: number;
}

/** Runtime state describing which layer is currently active. */
export interface WeatherLayerState {
  activeLayerId: WeatherLayerId | null;
}

/** Temporary diagnostics for the OpenWeather imagery layer. */
export interface WeatherDebugInfo {
  hasApiKey: boolean;
  activeLayerId: WeatherLayerId | null;
  tileUrl: string;
  imageryLayerCount: number;
  latestTileError: string | null;
}
