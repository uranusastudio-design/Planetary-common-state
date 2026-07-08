import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import type { WeatherLayerId } from '../types/weather';
import {
  buildOpenWeatherTileUrl,
  getWeatherLayerConfig,
  isOpenWeatherApiKeyConfigured,
} from '../config/weatherLayers';

interface EarthViewerProps {
  activeLayerId: WeatherLayerId | null;
  apiKey: string;
}

/**
 * Renders a full-screen interactive Cesium 3D globe and layers a single
 * OpenWeather tile layer on top of it. Switching `activeLayerId` removes
 * the previous weather imagery layer before adding the new one.
 */
export default function EarthViewer({ activeLayerId, apiKey }: EarthViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const weatherLayerRef = useRef<Cesium.ImageryLayer | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);

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

    if (!activeLayerId) return;

    // Verify the API key exists before attempting to load any tiles.
    if (!isOpenWeatherApiKeyConfigured(apiKey)) {
      const message =
        'OpenWeather API key missing. Set VITE_OPENWEATHER_API_KEY in a local .env file (see .env.example), then restart the dev server.';
      console.error(message);
      setWeatherError(message);
      return;
    }

    const layerConfig = getWeatherLayerConfig(activeLayerId);
    if (!layerConfig) return;

    const provider = new Cesium.UrlTemplateImageryProvider({
      url: buildOpenWeatherTileUrl(layerConfig.owmLayer, apiKey),
      credit: 'Weather data © OpenWeather',
      minimumLevel: 0,
      maximumLevel: 8,
    });

    // Surface tile-load failures (e.g. an invalid/unauthorized key) clearly
    // instead of failing silently with a blank overlay.
    const removeErrorListener = provider.errorEvent.addEventListener((error) => {
      console.error(`Failed to load "${layerConfig.label}" weather tiles:`, error);
      setWeatherError(
        `Failed to load "${layerConfig.label}" weather tiles. Check that VITE_OPENWEATHER_API_KEY is a valid, active OpenWeather API key.`
      );
    });

    const layer = viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = layerConfig.opacity;
    weatherLayerRef.current = layer;

    return () => {
      removeErrorListener();
    };
  }, [activeLayerId, apiKey]);

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
