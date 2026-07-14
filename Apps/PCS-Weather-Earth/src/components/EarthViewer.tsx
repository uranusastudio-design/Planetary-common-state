import { useCallback, useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import type { WeatherDebugInfo, WeatherLayerId } from '../types/weather';
import type { CelestialBodyId, VisitorLocation } from '../types/observatory';
import { fetchVisitorLocations, VISITOR_LOCATIONS_REFRESH_INTERVAL_MS } from '../config/observatoryNetwork';
import { buildOpenWeatherTileUrl, getWeatherLayerConfig } from '../config/weatherLayers';

interface EarthViewerProps {
  activeLayerIds: WeatherLayerId[];
  backendUrl: string;
  currentBody: CelestialBodyId;
  onDebugInfoChange: (debugInfo: WeatherDebugInfo) => void;
}

/**
 * Renders a full-screen interactive Cesium 3D globe and layers selected
 * weather tile overlays on top of it. Tile requests are routed through the
 * Cloudflare worker proxy so browser traffic stays on the PCS backend host.
 */
export default function EarthViewer({ activeLayerIds, backendUrl, currentBody, onDebugInfoChange }: EarthViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const visitorDataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
  const visitorLocationByEntityIdRef = useRef<Map<string, VisitorLocation>>(new Map());
  const weatherLayersRef = useRef<Array<{ layer: Cesium.ImageryLayer; removeErrorListener: () => void }>>([]);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [visitorLayerReady, setVisitorLayerReady] = useState(false);
  const [selectedVisitorLocation, setSelectedVisitorLocation] = useState<VisitorLocation | null>(null);

  const updateDebugInfo = useCallback(
    (latestTileError: string | null, tileUrls: string[] = [], latestFailedTileUrl: string | null = null) => {
      onDebugInfoChange({
        hasBackend: true,
        activeLayerIds,
        tileUrls,
        latestFailedTileUrl,
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

  const renderVisitorLocations = useCallback((locations: VisitorLocation[]) => {
    const visitorDataSource = visitorDataSourceRef.current;
    if (!visitorDataSource) return;

    visitorDataSource.entities.removeAll();
    visitorLocationByEntityIdRef.current.clear();

    for (const [index, location] of locations.entries()) {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) continue;

      const count = Math.max(1, location.count);
      const pointSize = Math.min(11, 5 + Math.log2(count + 1) * 1.6);
      const entityId = `pcs-visitor-location-${index}`;
      const placeName = formatVisitorPlace(location);

      visitorDataSource.entities.add({
        id: entityId,
        name: placeName,
        position: Cesium.Cartesian3.fromDegrees(location.longitude, location.latitude),
        point: {
          pixelSize: pointSize,
          color: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.82),
          outlineColor: Cesium.Color.fromCssColorString('#e0f2fe').withAlpha(0.9),
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      visitorLocationByEntityIdRef.current.set(entityId, location);
    }
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

    const visitorDataSource = new Cesium.CustomDataSource('PCS Global Observatory Network');
    visitorDataSource.show = currentBody === 'earth';
    viewer.dataSources.add(visitorDataSource);
    visitorDataSourceRef.current = visitorDataSource;
    setVisitorLayerReady(true);

    viewer.screenSpaceEventHandler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(click.position);
      const entityId = picked?.id instanceof Cesium.Entity ? picked.id.id : null;
      const visitorLocation = entityId ? visitorLocationByEntityIdRef.current.get(entityId) : null;
      setSelectedVisitorLocation(visitorLocation ?? null);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewer.camera.flyHome(0);
    viewerRef.current = viewer;

    return () => {
      clearWeatherLayers();
      viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      if (visitorDataSourceRef.current) {
        viewer.dataSources.remove(visitorDataSourceRef.current, true);
      }
      viewer.destroy();
      viewerRef.current = null;
      visitorDataSourceRef.current = null;
      visitorLocationByEntityIdRef.current.clear();
      weatherLayersRef.current = [];
      setVisitorLayerReady(false);
    };
  }, []);

  useEffect(() => {
    const visitorDataSource = visitorDataSourceRef.current;
    if (!visitorDataSource) return;

    visitorDataSource.show = currentBody === 'earth';
    if (currentBody !== 'earth') {
      setSelectedVisitorLocation(null);
    }
  }, [currentBody]);

  useEffect(() => {
    if (!visitorLayerReady || currentBody !== 'earth') return;

    let cancelled = false;

    const refreshVisitorLocations = async () => {
      try {
        const response = await fetchVisitorLocations();
        if (!cancelled) {
          renderVisitorLocations(response.locations);
        }
      } catch (error) {
        console.warn('Failed to refresh PCS Global Observatory Network locations:', error);
      }
    };

    void refreshVisitorLocations();
    const interval = window.setInterval(refreshVisitorLocations, VISITOR_LOCATIONS_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentBody, renderVisitorLocations, visitorLayerReady]);

  // Rebuild the selected weather imagery layers whenever the toggle state changes.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    clearWeatherLayers();

    setWeatherError(null);
    updateDebugInfo(null, []);

    if (activeLayerIds.length === 0) return;

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
        updateDebugInfo(message, tileUrls, tileUrl);
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
      {selectedVisitorLocation && (
        <div className="absolute bottom-4 left-4 z-10 w-64 rounded-lg border border-accent/30 bg-panel/95 px-4 py-3 font-mono text-xs text-slate-200 shadow-panel backdrop-blur">
          <button
            type="button"
            onClick={() => setSelectedVisitorLocation(null)}
            className="absolute right-2 top-1 text-slate-500 transition-colors hover:text-slate-200"
            aria-label="Close visitor observation details"
          >
            ×
          </button>
          <p className="pr-4 text-sm font-semibold text-slate-100">{formatVisitorPlace(selectedVisitorLocation)}</p>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-slate-500">Recent Visitors</dt>
              <dd className="text-accent">{selectedVisitorLocation.count.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last Activity</dt>
              <dd className="text-slate-200">{formatVisitorActivity(selectedVisitorLocation.lastSeen)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-slate-500">Approximate Location</p>
        </div>
      )}
    </div>
  );
}

function formatVisitorPlace(location: VisitorLocation): string {
  if (location.city && location.country) return `${location.city}, ${location.country}`;
  if (location.city) return location.city;
  if (location.country) return location.country;
  return 'Unknown Region';
}

function formatVisitorActivity(isoTime: string): string {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}
