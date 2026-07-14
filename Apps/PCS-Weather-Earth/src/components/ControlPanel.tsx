import { useState } from 'react';
import LayerSelector from './LayerSelector';
import GlobalObservatoryNetwork from './GlobalObservatoryNetwork';
import { SUBSYSTEMS } from '../config/subsystems';
import type { WeatherDebugInfo, WeatherLayerId } from '../types/weather';

interface ControlPanelProps {
  activeLayerIds: WeatherLayerId[];
  onToggleLayer: (id: WeatherLayerId) => void;
  debugInfo: WeatherDebugInfo;
}

/**
 * Right-side collapsible control panel. Currently hosts the weather layer
 * module; the subsystem list below is rendered as disabled placeholders so
 * future modules (ocean, cryosphere, etc.) have an obvious slot to plug into.
 */
export default function ControlPanel({ activeLayerIds, onToggleLayer, debugInfo }: ControlPanelProps) {
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

        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-400">Weather Layers</h2>
          <LayerSelector activeLayerIds={activeLayerIds} onToggle={onToggleLayer} />
        </section>

        <section className="mb-8 rounded-md border border-panel-border/70 bg-panel-light/40 px-3 py-3">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-400">Weather Debug</h2>
          <dl className="space-y-1.5 font-mono text-[11px] text-slate-300">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Backend configured</dt>
              <dd>{debugInfo.hasBackend ? 'yes' : 'no'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Active layer</dt>
              <dd>{debugInfo.activeLayerIds.length > 0 ? debugInfo.activeLayerIds.join(', ') : 'none'}</dd>
            </div>
            <div>
              <dt className="mb-0.5 text-slate-500">Tile URLs</dt>
              <dd className="break-all text-slate-300">
                {debugInfo.tileUrls.length > 0 ? (
                  <span className="flex flex-col gap-1">
                    {debugInfo.tileUrls.map((tileUrl) => (
                      <span key={tileUrl}>{tileUrl}</span>
                    ))}
                  </span>
                ) : (
                  'none'
                )}
              </dd>
            </div>
            <div>
              <dt className="mb-0.5 text-slate-500">Latest failed tile URL</dt>
              <dd className="break-all text-slate-300">{debugInfo.latestFailedTileUrl ?? 'none'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Imagery layers</dt>
              <dd>{debugInfo.imageryLayerCount}</dd>
            </div>
            <div>
              <dt className="mb-0.5 text-slate-500">Latest tile error</dt>
              <dd className="break-words text-slate-300">{debugInfo.latestTileError ?? 'none'}</dd>
            </div>
          </dl>
        </section>

        <GlobalObservatoryNetwork />

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
