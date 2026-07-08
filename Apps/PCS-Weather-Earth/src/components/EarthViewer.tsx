import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import type { WeatherLayerId } from '../types/weather';
import { buildOpenWeatherTileUrl, getWeatherLayerConfig } from '../config/weatherLayers';

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

    if (!activeLayerId) return;

    if (!apiKey) {
      console.warn(
        'VITE_OPENWEATHER_API_KEY is not set. Add it to a local .env file (see .env.example).'
      );
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

    const layer = viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = layerConfig.opacity;
    weatherLayerRef.current = layer;
  }, [activeLayerId, apiKey]);

  return <div ref={containerRef} className="h-full w-full" />;
}
