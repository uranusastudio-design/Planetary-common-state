import { useCallback, useState } from 'react';
import EarthViewer from './components/EarthViewer';
import ControlPanel from './components/ControlPanel';
import type { WeatherDebugInfo, WeatherLayerId } from './types/weather';
import { PCS_BACKEND_URL } from './config/weatherLayers';

export default function App() {
  const [activeLayerIds, setActiveLayerIds] = useState<WeatherLayerId[]>(['clouds']);
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      <main className="relative h-full min-w-0 flex-1">
        <EarthViewer
          activeLayerIds={activeLayerIds}
          backendUrl={PCS_BACKEND_URL}
          onDebugInfoChange={setDebugInfo}
        />
      </main>
      <ControlPanel
        activeLayerIds={activeLayerIds}
        onToggleLayer={toggleLayer}
        debugInfo={debugInfo}
      />
    </div>
  );
}
