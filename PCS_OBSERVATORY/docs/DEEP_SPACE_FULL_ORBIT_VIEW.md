# Deep Space Full-Orbit View

Status: **local implementation and acceptance complete; frozen pending human review**

## Scope

This upgrade changes only the PCS Deep Space camera, orbit framing, navigation controls, and responsive layout. It does not modify the PCS core model, `L(t)`, the five residuals, Earth Viewer, or any frozen v2.1.0 scientific feature. It does not start v2.2.0.

Display references are:

- minimum: 1920 × 1080;
- standard: 3840 × 2160;
- recommended research workstation: 5120 × 2160 ultrawide.

These are layout references, not astronomical visibility presets. Camera distance is calculated from astronomical geometry, the active projection, and the actual viewer aspect ratio.

## Astronomical Camera Scale System

`astronomical-camera-scale.js` defines seven camera states:

1. `PLANETARY`
2. `INNER SOLAR SYSTEM`
3. `SOLAR SYSTEM`
4. `COMET ORBIT`
5. `HELIOSPHERE`
6. `INTERSTELLAR`
7. `GALACTIC`

Classification uses astronomical distance and an explicit view intent. It does not use screen-resolution branches. The current state is displayed in the existing Deep Space header and uses the existing four-language runtime.

## Generic `fitOrbit(object)` contract

For any selected deployed small body with orbital elements, `fitOrbit(object)`:

1. samples one closed osculating path from eccentric anomaly 0 through 2π;
2. calculates an enclosing bounding sphere and the orbit-plane normal;
3. derives camera range from the sphere radius, vertical field of view, actual canvas aspect ratio, and a 1.28 fit factor;
4. flies toward the orbit-plane view with cubic easing;
5. updates near/far clipping planes and maximum zoom distance from the calculated range;
6. marks perihelion and aphelion from the same source-element path.

The fit factor leaves about 10.9% theoretical safety margin per limiting viewport dimension. The real WebGL acceptance requires at least 7.5% after projection.

Halley is a reference test only. Camera code contains no Halley name, catalog ID, distance, or resolution-specific camera preset.

## Scientific and rendering contract

The closed path is derived from deployed NASA/JPL SBDB osculating elements. It is a complete catalog-element orbit for visualization, not a time-resolved numerical ephemeris and not a mission-navigation trajectory. No random points or invented trajectory are used.

The orbit uses relative heliocentric scene coordinates and `Cesium.ArcType.NONE`, avoiding geodetic arc interpolation. Near and far planes are recalculated for orbit extent; pointer zoom can expand those planes while the user moves so the orbit is not lost at tens-of-AU scale. The existing single Cesium Viewer, canvas, renderer, selection state, Object Card, search, and language system remain in use.

## Camera history

Selecting a Solar System object records the pre-selection camera position, direction, up vector, frustum, maximum zoom distance, scale state, and selection state. `FIT ORBIT` does not replace that baseline. A blank-space click or Back restores the pre-selection camera smoothly; this is history-based and does not hard-code a return to the Sun.

## Responsive layout

Desktop canvas bounds stop before the visible Object Panel and expand when controls collapse. On 390 × 844 mobile, the canvas reserves the upper view region while the scrollable Object Card occupies the lower region, so the card cannot cover a fitted orbit. The mobile card keeps Search, Focus, FIT ORBIT, Back, and the viewer usable without requiring every research field to be visible simultaneously.

## Acceptance evidence

Real Cesium WebGL acceptance at a fixed display epoch searched `1P/Halley`, focused it, invoked FIT ORBIT, verified the 361-point closed path, Sun, Halley, perihelion, aphelion, full Neptune reference orbit, zoom in/out, and blank-space Back.

| Viewport | Minimum measured margin | Result |
| --- | ---: | --- |
| 1920 × 1080 | 13.76% | PASS |
| 2560 × 1440 | 13.65% | PASS |
| 3840 × 2160 | 13.33% | PASS |
| 5120 × 2160 | 12.26% | PASS |
| 390 × 844 mobile | 19.36% | PASS |

All five runs kept Viewer = 1 and Cesium canvas = 1. Required console errors and required network failures were zero. The absent optional localhost connector was retained in raw diagnostics and excluded only from required production-asset failures.

Evidence is stored in `test-results/deep-space-full-orbit-local/acceptance-report.json` and the five adjacent PNG screenshots.

## Regression

- focused camera/orbit/lifecycle tests: 15/15 PASS;
- complete `PCS_OBSERVATORY` Node suite: 206/206 PASS;
- WebGL viewport matrix: 5/5 PASS;
- screenshots: manually inspected at all five viewports.

No push or deployment is part of this task. Human review is the next gate.
