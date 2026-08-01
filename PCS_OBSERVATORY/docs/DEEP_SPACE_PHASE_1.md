# Deep Space Phase 1 — Solar System Foundation

## Scope

Phase 1 adds a full-screen Solar System presentation to the existing PCS Observatory. It includes the Sun, eight planets, and the eleven representative natural satellites already present in PCS. It deliberately stops at the outer Solar System.

The overlay reuses and temporarily reparents the existing Cesium canvas. PCS still creates exactly one `Cesium.Viewer`, one WebGL context, and the existing Cesium render loop. Closing Deep Space removes its data source and event handlers, restores the canvas to its original location, and restores the Earth scene state.

## Architecture

- `deep-space-registry.js` — centralized object and provenance registry.
- `deep-space-ephemeris-cache.js` — dated, traceable NASA/JPL Horizons DE441 vectors.
- `deep-space-ephemeris.js` — `getBodyState`, `getCachedEphemeris`, `getFallbackOrbitalState`, and satellite mean-orbit calculations.
- `deep-space.js` — overlay, time state, Cesium data-source lifecycle, camera, LOD-oriented object presentation, focus mode, and cleanup.
- `deep-space.css` — responsive PCS instrument styling without changing the Observatory design system.

Later expansion is registry/provider based. The Phase 1 providers for comets, asteroids, and uncertainty bands intentionally return unavailable/empty states.

## Coordinates and ephemerides

Planet positions use a Sun-centered ecliptic coordinate frame referenced to J2000. The cache sample is a geometric vector from the official NASA/JPL Horizons API, DE441, at `2026-08-01T00:00:00 TDB` (represented in the static cache with an explicit UTC-labelled serialization for browser parsing). Position is AU and velocity is AU/day. The UI exposes the epoch, frame, source, and status.

For epochs without a nearby cached vector, PCS calculates an analytical fallback from JPL's published approximate Keplerian elements and secular rates for 1800–2050. It solves Kepler's equation, including eccentricity, inclination, longitude of ascending node, and argument of perihelion. This is labelled:

> Orbital-element approximation — Not mission-navigation precision

Sources:

- NASA/JPL Horizons: <https://ssd.jpl.nasa.gov/horizons/>
- JPL approximate planet positions: <https://ssd.jpl.nasa.gov/planets/approx_pos.html>
- NASA Solar System Exploration: <https://science.nasa.gov/solar-system/>

## Scale modes

Scientific Scale uses kilometres for both body radii and inter-body distance. Large empty regions are intentional. Exhibition Scale is the default and uses a logarithmic distance mapping plus readable representative radii. It is explicitly labelled as visually compressed and not a single linear scale.

Parent-system focus expands only the representative satellites belonging to the selected planet. Satellite orbital distances may be compressed in Exhibition Scale and use mean-orbit catalogue values. High-resolution satellite textures are not loaded by the Solar System overview.

## Time system

Deep Space owns an independent UTC epoch and does not modify Observatory refresh timers or Earth observation time. Controls include current time, play/pause, day steps, reset-to-now, and speeds of 1×, 60×, one hour/second, one day/second, and 30 days/second. A removable Cesium clock listener updates positions from elapsed time; no second animation loop is created and position does not depend on frame count.

## LOD and performance

The overview uses colored ellipsoids/markers, orbit polylines, and labels in one removable Cesium `CustomDataSource`. Parent-system satellites appear only after focus. Deep Space does not preload mission textures. Mobile uses the same data source, a smaller/collapsible control surface, touch-enabled Cesium camera controls, and reduced labels at constrained widths.

No fixed FPS target is claimed. Deployment acceptance records the observed browser/device conditions and any limitations.

## Data status

The data contract distinguishes catalog data, ephemeris-derived cache values, orbital-element approximation, mission imagery, representative visualization, and unavailable providers. Visualization-only material is never labelled measured.

## Error and lifecycle behavior

Invalid epochs throw a bounded validation error. A missing cache selects the orbital-element fallback. Later-phase providers return explicit unavailable states. The overlay can always be closed with its Close control or Escape; it does not own the Observatory's network requests. WebGL context recovery remains managed by the single existing Cesium Viewer.

Deep Space itself makes no runtime ephemeris request. Once the Observatory and its existing Cesium dependency have loaded, a later network loss does not remove the local JPL vector cache or the bundled orbital-element fallback; the overlay announces offline mode and continues with explicit provenance. A cold first load with no browser cache still depends on the Observatory's existing CDN-hosted Cesium build. Phase 1 does not vendor or replace Cesium, so it does not claim cold-start offline support.

## Known issue — frozen

Titania mission texture currently shows incomplete lower-hemisphere coverage or projection fill. Repair is deferred until after Deep Space Phase 1. This phase does not modify Titania imagery, metadata, source records, or any satellite mission texture. Titania remains selectable and the information card identifies the deferred issue; its visual texture is not accepted by this phase.

## Not included

- Nearby Stars or Gaia catalog
- Milky Way, Local Group, Cosmic Web, or Observable Universe
- Complete comet or asteroid databases
- Orbit uncertainty bands
- Earth civilization-variable analysis
- Titania texture repair
- Additional natural satellites
