import { useState } from 'react';
import EarthViewer from './components/EarthViewer';
import ControlPanel from './components/ControlPanel';
import type { WeatherDebugInfo, WeatherLayerId } from './types/weather';
import { isPcsBackendConfigured } from './config/weatherLayers';

const PCS_BACKEND_URL = import.meta.env.VITE_PCS_BACKEND_URL ?? '';
const HAS_BACKEND = isPcsBackendConfigured(PCS_BACKEND_URL);

export default function App() {
  const [activeLayerId, setActiveLayerId] = useState<WeatherLayerId | null>('clouds');
  const [debugInfo, setDebugInfo] = useState<WeatherDebugInfo>({
    hasBackend: HAS_BACKEND,
    activeLayerId: 'clouds',
    tileUrl: '',
    imageryLayerCount: 0,
    latestTileError: null,
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      <main className="relative h-full min-w-0 flex-1">
        <EarthViewer
          activeLayerId={activeLayerId}
          backendUrl={PCS_BACKEND_URL}
          onDebugInfoChange={setDebugInfo}
        />
      </main>
      <ControlPanel
        activeLayerId={activeLayerId}
        onSelectLayer={setActiveLayerId}
        hasBackend={HAS_BACKEND}
        debugInfo={debugInfo}
      />
    </div>
  );
}
