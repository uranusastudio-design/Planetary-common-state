import { useCallback, useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import type { WeatherDebugInfo, WeatherLayerId } from '../types/weather';
import {
  buildOpenWeatherTileUrl,
  getWeatherLayerConfig,
  isPcsBackendConfigured,
} from '../config/weatherLayers';

interface EarthViewerProps {
  activeLayerIds: WeatherLayerId[];
  backendUrl: string;
  onDebugInfoChange: (debugInfo: WeatherDebugInfo) => void;
}

/**
 * Renders a full-screen interactive Cesium 3D globe and layers selected
 * weather tile overlays on top of it. Tile requests are routed through the
 * Cloudflare worker proxy so browser traffic stays on the PCS backend host.
 */
export default function EarthViewer({ activeLayerIds, backendUrl, onDebugInfoChange }: EarthViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const weatherLayersRef = useRef<Array<{ layer: Cesium.ImageryLayer; removeErrorListener: () => void }>>([]);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const updateDebugInfo = useCallback(
    (latestTileError: string | null, tileUrls: string[] = []) => {
      onDebugInfoChange({
        hasBackend: isPcsBackendConfigured(backendUrl),
        activeLayerIds,
        tileUrls,
        imageryLayerCount: viewerRef.current?.imageryLayers.length ?? 0,
        latestTileError,
      });
    },
    [activeLayerIds, backendUrl, onDebugInfoChange]
  );

  const clearWeatherLayers = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    for (const { layer, removeErrorListener } of weatherLayersRef.current) {
      removeErrorListener();
      viewer.imageryLayers.remove(layer, true);
    }

    weatherLayersRef.current = [];
  }, []);

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
      clearWeatherLayers();
      viewer.destroy();
      viewerRef.current = null;
      weatherLayersRef.current = [];
    };
  }, [clearWeatherLayers, updateDebugInfo]);

  // Rebuild the selected weather imagery layers whenever the toggle state changes.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    clearWeatherLayers();

    setWeatherError(null);
    updateDebugInfo(null, []);

    if (activeLayerIds.length === 0) return;

    if (!isPcsBackendConfigured(backendUrl)) {
      const message = 'PCS backend URL is not configured.';
      console.error(message);
      setWeatherError(message);
      updateDebugInfo(message, []);
      return;
    }

    const tileUrls: string[] = [];

    for (const activeLayerId of activeLayerIds) {
      const layerConfig = getWeatherLayerConfig(activeLayerId);
      if (!layerConfig) continue;

      const tileUrl = buildOpenWeatherTileUrl(layerConfig.proxyPath, backendUrl);
      tileUrls.push(tileUrl);

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

      const removeErrorListener = provider.errorEvent.addEventListener((error) => {
        console.error(`Failed to load "${layerConfig.label}" weather tiles:`, error);
        const upstreamStatus =
          error.error &&
          typeof error.error === 'object' &&
          'statusCode' in error.error &&
          (typeof error.error.statusCode === 'number' || typeof error.error.statusCode === 'string')
            ? error.error.statusCode
            : null;
        const statusCode = upstreamStatus ? ` (${upstreamStatus})` : '';
        const message = `Failed to load "${layerConfig.label}" weather tiles${statusCode}. Check that the deployed pcs-backend worker is reachable and its OPENWEATHER_API_KEY secret is set.`;
        setWeatherError(message);
        updateDebugInfo(message, tileUrls);
      });

      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = layerConfig.opacity;
      weatherLayersRef.current.push({ layer, removeErrorListener });
    }

    updateDebugInfo(null, tileUrls);

    return () => {
      clearWeatherLayers();
    };
  }, [activeLayerIds, backendUrl, clearWeatherLayers, updateDebugInfo]);

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
