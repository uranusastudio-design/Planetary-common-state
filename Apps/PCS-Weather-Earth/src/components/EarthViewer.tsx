import { useCallback, useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import type { WeatherDebugInfo, WeatherLayerId } from '../types/weather';
import type { CelestialBodyId, VisitorAnalytics, VisitorHeatLocation, VisitorLocation } from '../types/observatory';
import { fetchVisitorLocations, VISITOR_LOCATIONS_REFRESH_INTERVAL_MS } from '../config/observatoryNetwork';
import { buildOpenWeatherTileUrl, getWeatherLayerConfig } from '../config/weatherLayers';
import { formatLocationName, formatRelativeObservation } from '../utils/observatory';
import { createGeographicMarker } from '../utils/geographicMarkers';
import LayerSelector from './LayerSelector';

const ACTIVE_OBSERVATION_MS = 90_000;
const LIVE_OBSERVATION_MS = 24 * 60 * 60 * 1000;
const MAX_LIVE_REGIONS = 100;
const SELF_LOCATION_ENTITY_ID = 'visitor-locations:self-location';

interface EarthViewerProps {
  activeLayerIds: WeatherLayerId[];
  backendUrl: string;
  currentBody: CelestialBodyId;
  visitorAnalytics: VisitorAnalytics | null;
  observationHeatEnabled: boolean;
  networkConnectionsEnabled: boolean;
  onToggleLayer: (id: WeatherLayerId) => void;
  onObservationHeatToggle: (enabled: boolean) => void;
  onNetworkConnectionsToggle: (enabled: boolean) => void;
  onDebugInfoChange: (debugInfo: WeatherDebugInfo) => void;
}

type ViewerMode = 'normal' | 'pinned' | 'expanded';

interface CameraState {
  destination: Cesium.Cartesian3;
  orientation: {
    heading: number;
    pitch: number;
    roll: number;
  };
}

/**
 * Renders a full-screen interactive Cesium 3D globe and layers selected
 * weather tile overlays on top of it. Tile requests are routed through the
 * Cloudflare worker proxy so browser traffic stays on the PCS backend host.
 */
export default function EarthViewer({
  activeLayerIds,
  backendUrl,
  currentBody,
  visitorAnalytics,
  observationHeatEnabled,
  networkConnectionsEnabled,
  onToggleLayer,
  onObservationHeatToggle,
  onNetworkConnectionsToggle,
  onDebugInfoChange,
}: EarthViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const visitorDataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
  const heatDataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
  const networkDataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
  const visitorLocationByEntityIdRef = useRef<Map<string, VisitorLocation>>(new Map());
  const weatherLayersRef = useRef<Array<{ layer: Cesium.ImageryLayer; removeErrorListener: () => void }>>([]);
  const initialCameraRef = useRef<CameraState | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [visitorLayerReady, setVisitorLayerReady] = useState(false);
  const [selectedVisitorLocation, setSelectedVisitorLocation] = useState<VisitorLocation | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>('normal');
  const [layerDrawerOpen, setLayerDrawerOpen] = useState(true);

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

  const renderVisitorLocations = useCallback((locations: VisitorLocation[], selfLocation: VisitorLocation | null) => {
    const visitorDataSource = visitorDataSourceRef.current;
    const networkDataSource = networkDataSourceRef.current;
    if (!visitorDataSource || !networkDataSource) return;

    const now = Date.now();
    const liveLocations = locations
      .filter((location) => now - new Date(location.lastSeen).getTime() < LIVE_OBSERVATION_MS)
      .slice(0, MAX_LIVE_REGIONS);
    const nextVisitorIds = new Set<string>();
    const nextPulseIds = new Set<string>();
    const lowPerformanceDevice = prefersReducedMotionOrLowPerformance();

    for (const location of liveLocations) {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) continue;

      const count = Math.max(1, location.count);
      const pointSize = Math.min(10, 5 + Math.log2(count + 1) * 1.25);
      const marker = createGeographicMarker({ layerId: 'visitor-locations', markerId: visitorEntityId(location), type: 'point', ...location });
      if (!marker) continue;
      const entityId = marker.id;
      const entity = visitorDataSource.entities.getById(entityId) ?? visitorDataSource.entities.add({ id: entityId });
      entity.name = formatLocationName(location);
      entity.position = new Cesium.ConstantPositionProperty(marker.position);
      entity.point = new Cesium.PointGraphics({
        pixelSize: pointSize,
        color: Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.82),
        outlineColor: Cesium.Color.fromCssColorString('#a7f3d0').withAlpha(0.72),
        outlineWidth: 1.25,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      });
      nextVisitorIds.add(entityId);

      visitorLocationByEntityIdRef.current.set(entityId, location);

      const isActive = now - new Date(location.lastSeen).getTime() < ACTIVE_OBSERVATION_MS;
      if (isActive && !lowPerformanceDevice) {
        const pulseId = `pcs-active-pulse-${entityId}`;
        const pulse = networkDataSource.entities.getById(pulseId) ?? networkDataSource.entities.add({ id: pulseId });
        pulse.position = new Cesium.ConstantPositionProperty(marker.position);
        pulse.point = new Cesium.PointGraphics({
          pixelSize: new Cesium.CallbackProperty(() => {
            const phase = (Date.now() % 2_000) / 2_000;
            return 10 + Math.sin(phase * Math.PI) * 5;
          }, false),
          color: Cesium.Color.TRANSPARENT,
          outlineColor: new Cesium.CallbackProperty(() => {
            const phase = (Date.now() % 2_000) / 2_000;
            return Cesium.Color.fromCssColorString('#34d399').withAlpha(0.28 * (1 - phase));
          }, false),
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        });
        nextPulseIds.add(pulseId);
      }
    }

    for (const entity of [...visitorDataSource.entities.values]) {
      if (entity.id !== SELF_LOCATION_ENTITY_ID && !nextVisitorIds.has(entity.id)) {
        visitorDataSource.entities.remove(entity);
        visitorLocationByEntityIdRef.current.delete(entity.id);
      }
    }
    for (const entity of [...networkDataSource.entities.values]) {
      if (!nextPulseIds.has(entity.id)) networkDataSource.entities.remove(entity);
    }

    if (selfLocation && Number.isFinite(selfLocation.latitude) && Number.isFinite(selfLocation.longitude)) {
      const marker = createGeographicMarker({ layerId: 'visitor-locations', markerId: 'self-location', type: 'point', ...selfLocation });
      if (!marker) return;
      const selfEntity = visitorDataSource.entities.getById(SELF_LOCATION_ENTITY_ID)
        ?? visitorDataSource.entities.add({ id: SELF_LOCATION_ENTITY_ID });
      selfEntity.name = 'You are here';
      selfEntity.position = new Cesium.ConstantPositionProperty(marker.position);
      selfEntity.point = new Cesium.PointGraphics({
        pixelSize: 8,
        color: Cesium.Color.fromCssColorString('#3b82f6').withAlpha(0.95),
        outlineColor: Cesium.Color.fromCssColorString('#dbeafe'),
        outlineWidth: 1.5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      });
    } else {
      visitorDataSource.entities.removeById(SELF_LOCATION_ENTITY_ID);
    }
  }, []);

  const renderHeatLocations = useCallback((locations: VisitorHeatLocation[]) => {
    const heatDataSource = heatDataSourceRef.current;
    if (!heatDataSource) return;

    const nextIds = new Set<string>();

    for (const location of locations.slice(0, 100)) {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) continue;

      const weight = Math.max(1, Math.min(100, location.weight));
      const size = Math.min(18, 7 + Math.sqrt(weight) * 1.1);
      const alpha = Math.min(0.22, 0.06 + weight / 700);

      const marker = createGeographicMarker({ layerId: 'observation-heat', markerId: `${location.latitude}|${location.longitude}`, type: 'heat-point', ...location });
      if (!marker) continue;
      const entity = heatDataSource.entities.getById(marker.id) ?? heatDataSource.entities.add({ id: marker.id });
      entity.position = new Cesium.ConstantPositionProperty(marker.position);
      entity.point = new Cesium.PointGraphics({
          pixelSize: size,
          color: Cesium.Color.fromCssColorString('#0ea5e9').withAlpha(alpha),
          outlineColor: Cesium.Color.fromCssColorString('#7dd3fc').withAlpha(alpha + 0.12),
          outlineWidth: 1,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      });
      nextIds.add(marker.id);
    }

    for (const entity of [...heatDataSource.entities.values]) {
      if (!nextIds.has(entity.id)) heatDataSource.entities.remove(entity);
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
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 2_500;
    (viewer.bottomContainer as HTMLElement).style.display = 'none';

    const visitorDataSource = new Cesium.CustomDataSource('PCS Global Observatory Network');
    visitorDataSource.show = currentBody === 'earth';
    viewer.dataSources.add(visitorDataSource);
    visitorDataSourceRef.current = visitorDataSource;

    const heatDataSource = new Cesium.CustomDataSource('PCS Observation Heat');
    heatDataSource.show = currentBody === 'earth' && observationHeatEnabled;
    viewer.dataSources.add(heatDataSource);
    heatDataSourceRef.current = heatDataSource;

    const networkDataSource = new Cesium.CustomDataSource('PCS Observatory Network Connections');
    networkDataSource.show = currentBody === 'earth' && networkConnectionsEnabled;
    viewer.dataSources.add(networkDataSource);
    networkDataSourceRef.current = networkDataSource;

    setVisitorLayerReady(true);

    viewer.screenSpaceEventHandler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(click.position);
      const entityId = picked?.id instanceof Cesium.Entity ? picked.id.id : null;
      const visitorLocation = entityId ? visitorLocationByEntityIdRef.current.get(entityId) : null;
      setSelectedVisitorLocation(visitorLocation ?? null);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewer.screenSpaceEventHandler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const pickedPosition = (
        viewer.scene.pickPositionSupported
          ? viewer.scene.pickPosition(movement.position)
          : undefined
      ) ?? viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);

      if (!pickedPosition) return;

      const cameraHeight = viewer.camera.positionCartographic.height;
      const targetRadius = Cesium.Math.clamp(cameraHeight * 0.18, 5_000, 2_500_000);
      viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(pickedPosition, targetRadius), {
        duration: 0.8,
      });
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    viewer.camera.flyHome(0);
    initialCameraRef.current = {
      destination: Cesium.Cartesian3.clone(viewer.camera.positionWC),
      orientation: {
        heading: viewer.camera.heading,
        pitch: viewer.camera.pitch,
        roll: viewer.camera.roll,
      },
    };
    viewerRef.current = viewer;

    const resizeObserver = new ResizeObserver(() => {
      if (viewer.isDestroyed()) return;
      viewer.resize();
      viewer.scene.requestRender();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearWeatherLayers();
      resizeObserver.disconnect();
      viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      if (visitorDataSourceRef.current) {
        viewer.dataSources.remove(visitorDataSourceRef.current, true);
      }
      if (heatDataSourceRef.current) {
        viewer.dataSources.remove(heatDataSourceRef.current, true);
      }
      if (networkDataSourceRef.current) {
        viewer.dataSources.remove(networkDataSourceRef.current, true);
      }
      viewer.destroy();
      viewerRef.current = null;
      visitorDataSourceRef.current = null;
      heatDataSourceRef.current = null;
      networkDataSourceRef.current = null;
      visitorLocationByEntityIdRef.current.clear();
      weatherLayersRef.current = [];
      initialCameraRef.current = null;
      setVisitorLayerReady(false);
    };
  }, []);

  const resizeViewer = useCallback(() => {
    window.requestAnimationFrame(() => {
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed()) return;
      viewer.resize();
      viewer.scene.requestRender();
    });
  }, []);

  useEffect(() => {
    resizeViewer();
  }, [layerDrawerOpen, resizeViewer, viewerMode]);

  useEffect(() => {
    document.body.classList.toggle('pcs-earth-overlay-open', viewerMode === 'expanded');
    return () => document.body.classList.remove('pcs-earth-overlay-open');
  }, [viewerMode]);

  const resetView = useCallback(() => {
    const viewer = viewerRef.current;
    const initialCamera = initialCameraRef.current;
    if (!viewer || !initialCamera) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.clone(initialCamera.destination),
      orientation: { ...initialCamera.orientation },
      duration: 1,
    });
  }, []);

  const togglePinned = useCallback(() => {
    setViewerMode((mode) => mode === 'pinned' ? 'normal' : 'pinned');
  }, []);

  const toggleExpanded = useCallback(() => {
    setLayerDrawerOpen(true);
    setViewerMode((mode) => mode === 'expanded' ? 'normal' : 'expanded');
  }, []);

  useEffect(() => {
    const visitorDataSource = visitorDataSourceRef.current;
    const heatDataSource = heatDataSourceRef.current;
    const networkDataSource = networkDataSourceRef.current;
    if (!visitorDataSource || !heatDataSource || !networkDataSource) return;

    visitorDataSource.show = currentBody === 'earth';
    heatDataSource.show = currentBody === 'earth' && observationHeatEnabled;
    networkDataSource.show = currentBody === 'earth' && networkConnectionsEnabled;
    if (currentBody !== 'earth') {
      setSelectedVisitorLocation(null);
    }
  }, [currentBody, networkConnectionsEnabled, observationHeatEnabled]);

  useEffect(() => {
    const heatDataSource = heatDataSourceRef.current;
    if (!heatDataSource) return;

    heatDataSource.show = currentBody === 'earth' && observationHeatEnabled;
    if (!observationHeatEnabled) {
      heatDataSource.entities.removeAll();
      return;
    }

    renderHeatLocations(visitorAnalytics?.heatLocations ?? []);
  }, [currentBody, observationHeatEnabled, renderHeatLocations, visitorAnalytics]);

  useEffect(() => {
    if (!visitorLayerReady || currentBody !== 'earth') return;

    let cancelled = false;

    const refreshVisitorLocations = async () => {
      try {
        const response = await fetchVisitorLocations();
        if (!cancelled) {
          renderVisitorLocations(response.locations, response.selfLocation ?? null);
        }
      } catch (error) {
        console.warn('Failed to refresh PCS Global Observatory Network locations:', error);
      }
    };

    if (document.visibilityState === 'visible') {
      void refreshVisitorLocations();
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshVisitorLocations();
      }
    }, VISITOR_LOCATIONS_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshVisitorLocations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  const viewerFrameClass = viewerMode === 'expanded'
    ? 'fixed inset-3 z-[1000] overflow-hidden rounded-xl border border-accent/40 bg-slate-950 shadow-2xl'
    : viewerMode === 'pinned'
      ? 'fixed right-[21rem] top-[72px] z-[900] aspect-[16/10] w-[min(440px,38vw)] overflow-hidden rounded-xl border border-accent/50 bg-slate-950 shadow-2xl max-sm:bottom-3 max-sm:left-3 max-sm:right-3 max-sm:top-auto max-sm:w-auto'
      : 'relative h-full w-full';

  return (
    <div className={viewerFrameClass} data-viewer-mode={viewerMode}>
      <div ref={containerRef} className="h-full w-full" />
      <div
        className="absolute right-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-1.5 rounded-lg border border-slate-600/70 bg-slate-950/85 p-1.5 font-mono text-[11px] text-slate-200 shadow-panel backdrop-blur-md"
        role="toolbar"
        aria-label="Earth viewer controls"
      >
        <ViewerControlButton label="Reset View" title="Return to the initial Earth view" onClick={resetView}>
          <span aria-hidden="true">↺</span>
        </ViewerControlButton>
        <ViewerControlButton
          label={viewerMode === 'pinned' ? 'Unpin' : 'Pin'}
          title={viewerMode === 'pinned' ? 'Restore viewer to the dashboard' : 'Keep a compact Earth viewer visible'}
          active={viewerMode === 'pinned'}
          onClick={togglePinned}
        >
          <span aria-hidden="true">⌖</span>
        </ViewerControlButton>
        {viewerMode === 'expanded' && (
          <ViewerControlButton
            label="Layers"
            title="Show or hide layer controls"
            active={layerDrawerOpen}
            onClick={() => setLayerDrawerOpen((open) => !open)}
          >
            <span aria-hidden="true">☷</span>
          </ViewerControlButton>
        )}
        <ViewerControlButton
          label={viewerMode === 'expanded' ? 'Restore' : 'Expand'}
          title={viewerMode === 'expanded' ? 'Restore the dashboard viewer' : 'Expand the Earth viewer'}
          active={viewerMode === 'expanded'}
          onClick={toggleExpanded}
        >
          <span aria-hidden="true">{viewerMode === 'expanded' ? '✕' : '⛶'}</span>
        </ViewerControlButton>
      </div>
      {viewerMode === 'expanded' && layerDrawerOpen && (
        <aside className="absolute bottom-3 right-3 top-16 z-20 w-[min(20rem,calc(100%-1.5rem))] overflow-y-auto rounded-lg border border-panel-border bg-panel/95 p-4 shadow-panel backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-slate-300">Layers</h2>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => setLayerDrawerOpen(false)}
              aria-label="Close layer drawer"
              title="Close layer drawer"
            >
              ✕
            </button>
          </div>
          <LayerSelector activeLayerIds={activeLayerIds} onToggle={onToggleLayer} />
          <div className="mt-5 space-y-3 border-t border-panel-border pt-4 font-mono text-xs text-slate-300">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={observationHeatEnabled}
                onChange={(event) => onObservationHeatToggle(event.target.checked)}
                className="h-4 w-4 rounded border-panel-border bg-slate-900 text-accent focus:ring-accent"
              />
              Observation heat
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={networkConnectionsEnabled}
                onChange={(event) => onNetworkConnectionsToggle(event.target.checked)}
                className="h-4 w-4 rounded border-panel-border bg-slate-900 text-accent focus:ring-accent"
              />
              Network markers
            </label>
          </div>
        </aside>
      )}
      {weatherError && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 w-[min(90%,32rem)] -translate-x-1/2 rounded-lg border border-red-500/40 bg-red-950/90 px-4 py-3 text-center font-mono text-xs text-red-200 shadow-panel backdrop-blur transition-opacity duration-300">
          {weatherError}
        </div>
      )}
      {selectedVisitorLocation && (
        <div className="absolute bottom-4 left-4 z-10 w-[min(16rem,calc(100%-2rem))] rounded-lg border border-accent/30 bg-panel/95 px-4 py-3 font-mono text-xs text-slate-200 shadow-panel backdrop-blur">
          <button
            type="button"
            onClick={() => setSelectedVisitorLocation(null)}
            className="absolute right-2 top-1 text-slate-500 transition-colors hover:text-slate-200"
            aria-label="Close visitor observation details"
          >
            ×
          </button>
          <p className="pr-4 text-sm font-semibold text-slate-100">{formatLocationName(selectedVisitorLocation)}</p>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-slate-500">City</dt>
              <dd>{selectedVisitorLocation.city || 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Country</dt>
              <dd>{selectedVisitorLocation.country || selectedVisitorLocation.countryCode || 'Unknown'}</dd>
            </div>
            <div><dt className="text-slate-500">Status</dt><dd className="text-emerald-300">Recent observation</dd></div>
            <div><dt className="text-slate-500">Last activity</dt><dd>{formatRelativeObservation(selectedVisitorLocation.lastSeen)}</dd></div>
            <div><dt className="text-slate-500">Approximate location</dt><dd>Cloudflare region metadata</dd></div>
            <div><dt className="text-slate-500">Visits</dt><dd className="text-accent">{selectedVisitorLocation.count.toLocaleString()}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}

interface ViewerControlButtonProps {
  active?: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  title: string;
}

function ViewerControlButton({ active = false, children, label, onClick, title }: ViewerControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
        active
          ? 'border-accent/70 bg-accent/20 text-cyan-100 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
          : 'border-slate-600/70 bg-slate-900/80 hover:border-accent/60 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function visitorEntityId(location: VisitorLocation): string {
  const region = [location.countryCode, location.country, location.city, location.latitude, location.longitude]
    .filter((value) => value !== null && value !== undefined)
    .join('|');
  let hash = 0;
  for (let index = 0; index < region.length; index += 1) {
    hash = ((hash << 5) - hash + region.charCodeAt(index)) | 0;
  }
  return `pcs-visitor-location-${Math.abs(hash)}`;
}

function prefersReducedMotionOrLowPerformance(): boolean {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4)
    || (typeof deviceMemory === 'number' && deviceMemory <= 4);
}
