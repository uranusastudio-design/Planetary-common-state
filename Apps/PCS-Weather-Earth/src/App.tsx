import { useState } from 'react';
import EarthViewer from './components/EarthViewer';
import ControlPanel from './components/ControlPanel';
import type { WeatherLayerId } from './types/weather';
import { isOpenWeatherApiKeyConfigured } from './config/weatherLayers';

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY ?? '';

export default function App() {
  const [activeLayerId, setActiveLayerId] = useState<WeatherLayerId | null>('clouds');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      <main className="relative h-full min-w-0 flex-1">
        <EarthViewer activeLayerId={activeLayerId} apiKey={OPENWEATHER_API_KEY} />
      </main>
      <ControlPanel
        activeLayerId={activeLayerId}
        onSelectLayer={setActiveLayerId}
        hasApiKey={isOpenWeatherApiKeyConfigured(OPENWEATHER_API_KEY)}
      />
    </div>
  );
}
