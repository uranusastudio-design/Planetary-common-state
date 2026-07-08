/**
 * Future PCS subsystem registry.
 *
 * v0.1 only ships the "weather" module. This file exists to give later
 * modules a predictable place to register themselves without having to
 * restructure the app shell (App.tsx / ControlPanel.tsx).
 *
 * Planned modules, each intended to live under src/modules/<name>/ with
 * its own config + types + components, mirroring the weather module:
 *   - ocean              (SST, currents, sea level anomaly)
 *   - cryosphere         (sea ice extent, snow cover)
 *   - biosphere          (vegetation index, land cover)
 *   - energy             (radiative balance, solar irradiance)
 *   - human              (population density, emissions, infrastructure)
 *   - pcsStateEstimation (fused planetary-critical-systems state model)
 *
 * When adding a module:
 *   1. Create src/modules/<name>/{config,types,components}.
 *   2. Register a SubsystemDescriptor below.
 *   3. Render it from ControlPanel via the `subsystems` list instead of
 *      importing weather-specific components directly.
 */

export type SubsystemId =
  | 'weather'
  | 'ocean'
  | 'cryosphere'
  | 'biosphere'
  | 'energy'
  | 'human'
  | 'pcsStateEstimation';

export interface SubsystemDescriptor {
  id: SubsystemId;
  label: string;
  /** Whether the module is implemented and selectable in the UI yet. */
  enabled: boolean;
}

export const SUBSYSTEMS: SubsystemDescriptor[] = [
  { id: 'weather', label: 'Weather', enabled: true },
  { id: 'ocean', label: 'Ocean', enabled: false },
  { id: 'cryosphere', label: 'Cryosphere', enabled: false },
  { id: 'biosphere', label: 'Biosphere', enabled: false },
  { id: 'energy', label: 'Energy', enabled: false },
  { id: 'human', label: 'Human', enabled: false },
  { id: 'pcsStateEstimation', label: 'PCS State Estimation', enabled: false },
];
