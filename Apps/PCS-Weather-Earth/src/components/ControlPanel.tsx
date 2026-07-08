import { useState } from 'react';
import LayerSelector from './LayerSelector';
import { SUBSYSTEMS } from '../config/subsystems';
import type { WeatherLayerId } from '../types/weather';

interface ControlPanelProps {
  activeLayerId: WeatherLayerId | null;
  onSelectLayer: (id: WeatherLayerId | null) => void;
  hasApiKey: boolean;
}

/**
 * Right-side collapsible control panel. Currently hosts the weather layer
 * module; the subsystem list below is rendered as disabled placeholders so
 * future modules (ocean, cryosphere, etc.) have an obvious slot to plug into.
 */
export default function ControlPanel({ activeLayerId, onSelectLayer, hasApiKey }: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative h-full shrink-0 border-l border-panel-border bg-panel/95 font-sans backdrop-blur
        transition-[width] duration-300 ease-in-out
        ${collapsed ? 'w-12' : 'w-80'}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand control panel' : 'Collapse control panel'}
        className="absolute -left-4 top-6 flex h-8 w-8 items-center justify-center rounded-full border border-panel-border bg-panel-light text-accent shadow-panel transition-transform duration-300 hover:scale-105"
      >
        <span
          className={`inline-block transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
        >
          ›
        </span>
      </button>

      <div
        className={`h-full overflow-y-auto px-5 py-6 transition-opacity duration-200 ${
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <header className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent/80">PCS · Weather Earth</p>
          <h1 className="mt-1 text-lg font-semibold text-slate-100">Control Panel</h1>
          <p className="mt-1 text-xs text-slate-500">v0.1 — scientific 3D Earth dashboard</p>
        </header>

        {!hasApiKey && (
          <div className="mb-5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            No OpenWeather API key detected. Set{' '}
            <code className="font-mono text-amber-200">VITE_OPENWEATHER_API_KEY</code> in a local{' '}
            <code className="font-mono text-amber-200">.env</code> file.
          </div>
        )}

        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-400">Weather Layers</h2>
          <LayerSelector activeLayerId={activeLayerId} onSelect={onSelectLayer} />
        </section>

        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-400">
            Planetary Subsystems
          </h2>
          <div className="flex flex-col gap-1.5">
            {SUBSYSTEMS.filter((s) => s.id !== 'weather').map((subsystem) => (
              <div
                key={subsystem.id}
                className="flex items-center justify-between rounded-md border border-panel-border/70 bg-panel-light/30 px-3 py-2 text-xs text-slate-500"
              >
                <span>{subsystem.label}</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                  Planned
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
