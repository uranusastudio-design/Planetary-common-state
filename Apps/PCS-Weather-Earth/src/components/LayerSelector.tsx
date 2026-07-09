import { WEATHER_LAYERS } from '../config/weatherLayers';
import type { WeatherLayerId } from '../types/weather';

interface LayerSelectorProps {
  activeLayerIds: WeatherLayerId[];
  onToggle: (id: WeatherLayerId) => void;
}

/** Lets the user toggle each weather layer independently. */
export default function LayerSelector({ activeLayerIds, onToggle }: LayerSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {WEATHER_LAYERS.map((layer) => {
        const isActive = activeLayerIds.includes(layer.id);
        return (
          <label
            key={layer.id}
            className={`group relative flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ease-out
              ${
                isActive
                  ? 'border-accent/60 bg-accent/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                  : 'border-panel-border bg-panel-light/60 hover:border-accent/30 hover:bg-panel-light'
              }`}
          >
            <span className="flex w-full items-center justify-between">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => onToggle(layer.id)}
                  className="h-4 w-4 rounded border-panel-border bg-slate-900 text-accent focus:ring-accent"
                />
                <span
                  className={`font-mono text-sm tracking-wide transition-colors duration-200 ${
                    isActive ? 'text-accent' : 'text-slate-200'
                  }`}
                >
                  {layer.label}
                </span>
              </span>
              <span
                className={`h-2 w-2 rounded-full transition-all duration-200 ${
                  isActive ? 'scale-100 bg-accent shadow-[0_0_8px_2px_rgba(56,189,248,0.6)]' : 'scale-75 bg-slate-600'
                }`}
              />
            </span>
            <span className="mt-0.5 text-xs text-slate-400">{layer.description}</span>
          </label>
        );
      })}
    </div>
  );
}
