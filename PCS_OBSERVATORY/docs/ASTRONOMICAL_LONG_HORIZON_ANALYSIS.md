# PCS Solar System Long-Horizon Analysis

Status: **IMPLEMENTATION CANDIDATE — NOT COMPLETE / NOT FROZEN**

This document records the current correction work for the real Observatory runtime. It does not claim that PCS knows the exact Solar-System configuration at AD 100000.

## Runtime boundary audit

The former 1800–2050 stop was enforced in more than one place:

- `deep-space-registry.js`: `PLANET_VALID_RANGE` and the published JPL approximate-element validity range;
- `deep-space-ephemeris.js`: provider selection returned `solar-system-position-unavailable` outside that range;
- `deep-space.js`: playback start/end, date clamping, boundary pause, visible copy, speed/step controls, and debug metadata;
- `solar-system-playback.acceptance.mjs`: explicit 2050 clamp acceptance;
- `solar-system-playback.test.js`, `solar-system-ss02a.test.js`, and related regression tests;
- `SOLAR_SYSTEM_SS02.md`, `SOLAR_SYSTEM_DATA_ARCHITECTURE.md`, `ORBIT_PRECISION.md`, and `CHANGELOG.md`.

The existing promoted Horizons cache remains authoritative for its 2025-01-01 through 2028-01-01 coverage. The 1800–2050 approximate elements remain a documented fallback when no long-horizon release bundle is loaded; they are not promoted to long-term ephemeris.

## Provider contract

`resolveSolarSystemTimeProvider(epoch)` returns exactly one of:

- `AUTHORITATIVE_EPHEMERIS`;
- `PCS_NUMERICAL_ANALYSIS`;
- `UNSUPPORTED`.

The renderer continues to request `stateAt(epoch)` through the shared ephemeris adapter. Scientific state is barycentric Cartesian ICRF/J2000 ecliptic, expressed in AU and AU/day. The display layer derives heliocentric coordinates without overwriting the barycentric state.

The runtime bundle has two major-planet segments:

1. JPL DE441 long-term ephemeris anchors with bounded N-body interpolation.
2. PCS numerical analysis initialized at the common DE441 boundary and integrated to AD 100000.

The second segment is labelled `PCS Numerical Dynamical Analysis` / `Long-Term Dynamical Reconstruction`, never NASA/JPL prediction or precision ephemeris.

## Source and time contracts

- JPL DE440/DE441 definition: Park et al. (2021), *The JPL Planetary and Lunar Ephemerides DE440 and DE441*, DOI `10.3847/1538-3881/abd414`.
- Long kernels: official NAIF `de441_part-1.bsp` and `de441_part-2.bsp`; both release inputs must match the NAIF checksum list before use.
- Gravitational parameters: official NAIF `gm_de440.tpc`.
- Time scale: TDB for dynamics and ephemeris state.
- Public calendar input: proleptic Gregorian analysis date. Outside the validated leap-second table it is interpreted directly as a TDB analysis epoch and is not described as future UTC.
- Frame: Solar-System barycentric ICRF/J2000 ecliptic state; heliocentric render transform.

The first release uses the Sun and eight planet-system states. In DE441, outer-planet entries are system barycenters; Earth is the Earth-Moon barycenter. Moon rendering retains its separate, object-specific provider and validity contract.

## Numerical model

Offline checkpoints use REBOUND WHFast with:

- fixed 4-day step;
- symplectic corrector 11;
- DE441 boundary state and JPL GM values;
- Sun plus Mercury, Venus, Earth-Moon, Mars, Jupiter, Saturn, Uranus, and Neptune system barycenters.

The browser uses a bounded gravitational velocity-Verlet interpolation from the nearest deployed checkpoint. It does not use fixed Kepler ellipses, constant-period extrapolation, screen coordinates, or frame-number animation.

Known excluded effects in the current candidate model include:

- the hundreds of asteroids and TNO perturbing masses represented in DE441;
- relativistic corrections;
- internal satellite dynamics beyond the adopted system barycenters;
- solar mass loss and other extremely long-horizon model choices;
- covariance/ensemble propagation.

These omissions make the post-DE441 result model-dependent. They must remain visible in the release metadata and human report.

## Validation design

The release generator deliberately integrates independently from a DE441 initial state and compares against held-out DE441 checkpoints at AD 2000, 2500, 5000, 7500, 9999, 12000, 15000, and 17000 when covered.

Per body it records:

- heliocentric 3D position residual;
- heliocentric velocity residual;
- orbital phase error;
- semi-major-axis difference;
- eccentricity difference;
- inclination difference.

The release report also records:

- total-energy drift;
- angular-momentum drift;
- 2 / 4 / 8-day timestep convergence at AD 20000, 25000, 50000, 75000, and 100000;
- bounded browser-interpolation residual between adjacent DE441 anchors;
- exact provider-boundary state continuity;
- exact integrator version and step;
- source kernel hashes;
- common DE441 coverage;
- model version.

No observational covariance ensemble is currently available for this nine-body model. The report therefore exposes numerical convergence and divergence from held-out DE441 states without calling either one a complete physical uncertainty envelope. A visually stable orbit is not acceptance evidence.

## Runtime controls

The candidate UI keeps day playback and adds:

- ±1, ±10, ±100, and ±1,000 years;
- direct historical, current, DE441, and PCS-analysis checkpoints from 13200 BCE through AD 100000;
- custom integer year entry.

The fidelity badge and coverage text derive from the selected provider metadata. Crossing a provider boundary must keep the same Viewer, Cesium canvas, selection, camera, origin, and reference frame.

## Current verification status

Local candidate generated on 2026-08-13:

- Official `de441_part-2.bsp` MD5 `ad8dfa4e505ef0e3a5d587a5b4705632`: verified against the NAIF checksum list.
- Official `gm_de440.tpc` MD5 `a6bb37afab6815c9573a3ec208a8199a`: verified against the NAIF checksum list.
- Official `de441_part-1.bsp` MD5 `7e5fcf9ecb5d08e1ab70c049baa60cd3`: verified against the NAIF checksum list.
- Complete deployed DE441 coverage: JDTDB −3100015.5 through 8000016.5 (approximately 13200 BCE through AD 17191). Astronomical year −13199 is the first whole-year preset because it denotes 13200 BCE.
- Runtime anchors: 3,057 DE441 anchors plus 8,288 PCS numerical checkpoints.
- Browser checkpoint validation: all nine required bodies produced finite position and velocity states at 23 checkpoints from 13200 BCE through AD 100000.
- DE441 holdout maximum across the recorded experiments: 3,561,111.801 km position and 3,245.774 m/s velocity. This divergence is model/body/epoch dependent and is not a uniform uncertainty bound.
- Bounded browser interpolation maximum: 2,323.555 km position and 2.069 m/s velocity across the recorded five-year midpoint tests.
- Exact provider-boundary continuity: maximum position and velocity residual are both zero because the PCS segment is initialized from the final DE441 state.
- AD 100000 conservation diagnostics: relative energy drift −3.863×10⁻¹³; relative angular-momentum drift 9.928×10⁻¹⁴.
- 2/4-day convergence maximum: 4,596.052 km position and 3.312 m/s velocity across the recorded AD 20000–100000 checkpoints. The 8-day coarse solution diverges more strongly and is retained as evidence that timestep choice matters.
- Repository regression tests: 259/259 passing.
- Local browser acceptance: passing at 1920×1080 and 390×844, including 10001 BCE, 5001 BCE, AD 1, 1800, 2026, 2050, 5000, 10000, 17000, 18000, 20000, and 100000; fixed-epoch evidence is captured while playback is paused; one Viewer, one Cesium canvas, DataSources 3→3, primitives 1→1, required Console errors 0, and required Network failures 0.
- Fidelity transition verified in the running UI: DE441 historical/long-term ephemeris outside the promoted precision cache; 2026 precision ephemeris; 2050–17000 authoritative long-term ephemeris; 18000 onward PCS N-body numerical analysis.
- Object Card epoch/provider/fidelity now update at every tested checkpoint rather than retaining the previously selected epoch classification.
- Dwarf planets, main-belt objects, TNOs, comets, and interstellar current-position markers keep separate validity contracts. They become unavailable/hidden outside their deployed object-specific epoch coverage and cannot block or masquerade as major-planet long-horizon states.
- Production deployment: not authorized/performed.
- Human acceptance: pending.

Machine-readable evidence:

- `data/analysis/solar-system-long-horizon-validation.json`
- `data/analysis/solar-system-long-horizon-runtime-checkpoints.json`
- `test-results/solar-long-horizon-local-2026-08-13/acceptance-report.json`

Therefore the feature remains **OPEN / NOT COMPLETE**.
