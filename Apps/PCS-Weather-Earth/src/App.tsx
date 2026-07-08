import { useState } from 'react';
import EarthViewer from './components/EarthViewer';
import ControlPanel from './components/ControlPanel';
import type { WeatherDebugInfo, WeatherLayerId } from './types/weather';
import { isOpenWeatherApiKeyConfigured } from './config/weatherLayers';

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY ?? '';
const HAS_OPENWEATHER_API_KEY = isOpenWeatherApiKeyConfigured(OPENWEATHER_API_KEY);

export default function App() {
  const [activeLayerId, setActiveLayerId] = useState<WeatherLayerId | null>('clouds');
  const [debugInfo, setDebugInfo] = useState<WeatherDebugInfo>({
    hasApiKey: HAS_OPENWEATHER_API_KEY,
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
          apiKey={OPENWEATHER_API_KEY}
          onDebugInfoChange={setDebugInfo}
        />
      </main>
      <ControlPanel
        activeLayerId={activeLayerId}
        onSelectLayer={setActiveLayerId}
        hasApiKey={HAS_OPENWEATHER_API_KEY}
        debugInfo={debugInfo}
      />
    </div>
  );
}
