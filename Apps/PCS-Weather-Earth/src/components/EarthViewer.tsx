import { useCallback, useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import type { WeatherDebugInfo, WeatherLayerId } from '../types/weather';
import {
  buildOpenWeatherTileUrl,
  getWeatherLayerConfig,
  isPcsBackendConfigured,
  maskOpenWeatherTileUrl,
} from '../config/weatherLayers';

interface EarthViewerProps {
  activeLayerId: WeatherLayerId | null;
  backendUrl: string;
  onDebugInfoChange: (debugInfo: WeatherDebugInfo) => void;
}

/**
 * Renders a full-screen interactive Cesium 3D globe and layers a single
 * OpenWeather tile layer on top of it. Tile requests are routed through the
 * Cloudflare worker proxy so the API key is never exposed in browser URLs.
 * Switching `activeLayerId` removes the previous weather imagery layer before
 * adding the new one.
 */
export default function EarthViewer({ activeLayerId, backendUrl, onDebugInfoChange }: EarthViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const weatherLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const updateDebugInfo = useCallback(
    (latestTileError: string | null, tileUrl = '') => {
      onDebugInfoChange({
        hasBackend: isPcsBackendConfigured(backendUrl),
        activeLayerId,
        tileUrl: tileUrl ? maskOpenWeatherTileUrl(tileUrl) : '',
        imageryLayerCount: viewerRef.current?.imageryLayers.length ?? 0,
        latestTileError,
      });
    },
    [activeLayerId, backendUrl, onDebugInfoChange]
  );

  // Initialize the Cesium viewer once on mount.
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      baseLayerPicker: false,
      selectionIndicator: false,
      infoBox: false,
      shouldAnimate: true,
    });

    // Dark scientific look: hide credits UI clutter, dim atmosphere slightly.
    viewer.scene.globe.enableLighting = true;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.hueShift = -0.02;
    }
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#020617');
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0b1220');
    (viewer.bottomContainer as HTMLElement).style.display = 'none';

    viewer.camera.flyHome(0);

    viewerRef.current = viewer;
    updateDebugInfo(null);

    return () => {
      viewer.destroy();
      viewerRef.current = null;
      weatherLayerRef.current = null;
    };
  }, []);

  // Swap the active weather imagery layer whenever selection or key changes.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Always remove the previous weather layer first.
    if (weatherLayerRef.current) {
      viewer.imageryLayers.remove(weatherLayerRef.current, true);
      weatherLayerRef.current = null;
    }

    setWeatherError(null);
    updateDebugInfo(null);

    if (!activeLayerId) return;

    // Verify the backend URL exists before attempting to load any tiles.
    if (!isPcsBackendConfigured(backendUrl)) {
      const message =
        'PCS backend URL not configured. Set VITE_PCS_BACKEND_URL in a local .env file (see .env.example), then restart the dev server.';
      console.error(message);
      setWeatherError(message);
      updateDebugInfo(message);
      return;
    }

    const layerConfig = getWeatherLayerConfig(activeLayerId);
    if (!layerConfig) return;
    const tileUrl = buildOpenWeatherTileUrl(layerConfig.id, backendUrl);

    const provider = new Cesium.UrlTemplateImageryProvider({
      url: tileUrl,
      tilingScheme: new Cesium.WebMercatorTilingScheme(),
      credit: 'Weather data © OpenWeather',
      minimumLevel: 0,
      maximumLevel: 8,
      tileWidth: 256,
      tileHeight: 256,
      enablePickFeatures: false,
    });

    // Surface tile-load failures (e.g. an invalid/unauthorized key) clearly
    // instead of failing silently with a blank overlay.
    const removeErrorListener = provider.errorEvent.addEventListener((error) => {
      console.error(`Failed to load "${layerConfig.label}" weather tiles:`, error);
      const statusCode =
        error.error && typeof error.error === 'object' && 'statusCode' in error.error
          ? ` (${error.error.statusCode})`
          : '';
      const message = `Failed to load "${layerConfig.label}" weather tiles${statusCode}. Check that VITE_PCS_BACKEND_URL points to the deployed pcs-backend worker and the worker's OPENWEATHER_API_KEY secret is set.`;
      setWeatherError(message);
      updateDebugInfo(message, tileUrl);
    });

    const layer = viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = layerConfig.opacity;
    weatherLayerRef.current = layer;
    updateDebugInfo(null, tileUrl);

    return () => {
      removeErrorListener();
    };
  }, [activeLayerId, backendUrl, updateDebugInfo]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {weatherError && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 w-[min(90%,32rem)] -translate-x-1/2 rounded-lg border border-red-500/40 bg-red-950/90 px-4 py-3 text-center font-mono text-xs text-red-200 shadow-panel backdrop-blur transition-opacity duration-300">
          {weatherError}
        </div>
      )}
    </div>
  );
}
