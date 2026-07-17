/** Provider-backed PCS domains. Runtime readiness comes exclusively from
 * /api/domain-readiness; this registry contains no status or numeric counts. */
export const SUBSYSTEMS = [
  'atmosphere', 'ocean', 'cryosphere', 'biosphere', 'hydrology', 'geosphere',
  'human_system', 'energy', 'food', 'infrastructure', 'space_environment',
  'planetary_common_state',
] as const;

export type SubsystemId = typeof SUBSYSTEMS[number];
