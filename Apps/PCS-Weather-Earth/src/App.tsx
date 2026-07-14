import { useCallback, useState } from 'react';
import EarthViewer from './components/EarthViewer';
import ControlPanel from './components/ControlPanel';
import type { CelestialBodyId, VisitorAnalytics } from './types/observatory';
import type { WeatherDebugInfo, WeatherLayerId } from './types/weather';
import { PCS_BACKEND_URL } from './config/weatherLayers';

const OBSERVATION_HEAT_KEY = 'pcs_observation_heat_enabled';
const NETWORK_CONNECTIONS_KEY = 'pcs_network_connections_enabled';

function storedBoolean(key: string): boolean {
  return window.localStorage.getItem(key) === 'true';
}

export default function App() {
  const currentBody: CelestialBodyId = 'earth';
  const [activeLayerIds, setActiveLayerIds] = useState<WeatherLayerId[]>(['clouds']);
  const [visitorAnalytics, setVisitorAnalytics] = useState<VisitorAnalytics | null>(null);
  const [observationHeatEnabled, setObservationHeatEnabled] = useState(() => storedBoolean(OBSERVATION_HEAT_KEY));
  const [networkConnectionsEnabled, setNetworkConnectionsEnabled] = useState(() =>
    storedBoolean(NETWORK_CONNECTIONS_KEY)
  );
  const [debugInfo, setDebugInfo] = useState<WeatherDebugInfo>({
    hasBackend: true,
    activeLayerIds: ['clouds'],
    tileUrls: [],
    latestFailedTileUrl: null,
    imageryLayerCount: 0,
    latestTileError: null,
  });

  const toggleLayer = useCallback((layerId: WeatherLayerId) => {
    setActiveLayerIds((current) =>
      current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId]
    );
  }, []);

  const toggleObservationHeat = useCallback((enabled: boolean) => {
    window.localStorage.setItem(OBSERVATION_HEAT_KEY, String(enabled));
    setObservationHeatEnabled(enabled);
  }, []);

  const toggleNetworkConnections = useCallback((enabled: boolean) => {
    window.localStorage.setItem(NETWORK_CONNECTIONS_KEY, String(enabled));
    setNetworkConnectionsEnabled(enabled);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      <main className="relative h-full min-w-0 flex-1">
        <EarthViewer
          activeLayerIds={activeLayerIds}
          backendUrl={PCS_BACKEND_URL}
          currentBody={currentBody}
          visitorAnalytics={visitorAnalytics}
          observationHeatEnabled={observationHeatEnabled}
          networkConnectionsEnabled={networkConnectionsEnabled}
          onDebugInfoChange={setDebugInfo}
        />
      </main>
      <ControlPanel
        activeLayerIds={activeLayerIds}
        onToggleLayer={toggleLayer}
        debugInfo={debugInfo}
        observationHeatEnabled={observationHeatEnabled}
        networkConnectionsEnabled={networkConnectionsEnabled}
        onObservationHeatToggle={toggleObservationHeat}
        onNetworkConnectionsToggle={toggleNetworkConnections}
        onAnalyticsUpdate={setVisitorAnalytics}
      />
    </div>
  );
}
