# Deep Space Camera-Motion Star Streaks

Status: **Correction candidate for v2.2.0 — automated local regression passed; awaiting human visual acceptance**

## Purpose

Motion Streaks is an interactive navigation visualization for Nearby Stars, Milky Way tracers, and eligible distant Local Group point markers. During active user navigation, a small deterministic subset of visible point objects receives a short tapered motion halo. After movement stops, it contracts back to the unchanged point rendering over approximately 120 ms. The star core remains dominant at every frame.

The scientific status is:

- **Camera-motion visualization**
- **Navigation-induced apparent streak**
- **Representative navigation visualization**

The effect does not represent physical stellar velocity, stellar proper motion, energy output translated into motion, Earth-rotation star trails, relativistic travel, or Doppler shift. A brighter point may receive a thicker visual streak, but is not asserted to move faster.

## Rendering architecture

`deep-space-motion-streaks.js` creates one removable Cesium `PolylineCollection` inside the existing Viewer. All dynamic two-vertex streaks share that collection. The controller subscribes to the existing `scene.postRender` event and requests another Cesium frame only while the motion state is starting, moving, or settling.

It does not create another Viewer, canvas, WebGL context, state machine, DOM trail field, per-star Entity, or independent `requestAnimationFrame` loop. Closing Deep Space removes the post-render listener and collection.

## Camera-motion derivation

Each rendered frame compares:

- camera world position;
- camera direction;
- camera up vector;
- camera frustum field of view or width.

Camera displacement determines direction and length, but activation also requires a recent pointer, wheel, trackpad, or touch navigation signal. A normalized 0.65 px/frame dead zone rejects small numerical camera jitter. Automated focus, reset, and scale-transition flights do not activate the micro-trail field.

The explicit motion state is:

`idle → starting → moving → settling → idle`

The starting ramp is approximately 45 ms. The settling target is 120 ms. Idle hides the entire trail collection and accumulates no glow.

## Screen-space direction and length

For every selected candidate, the existing Cesium point primitive computes its rendered screen-space position. This avoids reconstructing a second projection and remains valid for the Phase 3 coordinate domains near the scene origin. The previous and current window coordinates produce the apparent screen displacement. The streak endpoint lies behind the current point along the inverse displacement vector, on the camera-depth plane through the source object.

The conceptual length mapping is:

```
clamp(
  screen-space velocity
  × mode gain
  × context response
  × depth response
  × motion activation
  × automated-flight policy,
  0,
  context maximum
)
```

Nearby Stars uses the strongest response. Milky Way is shorter. Local Group is deliberately shortest so distant galaxy markers do not resemble nearby moving stars. Every mode has a hard maximum.

The rejected implementation allowed 22 px in Subtle, 38 px in Standard, and 58 px in Cinematic. The correction caps these modes at 6 px, 10 px, and 18 px respectively; 18 px is also the absolute maximum. At ordinary input speeds the intended range is roughly 3–8 px. No mode may recreate long astronomical trails.

## Thickness, brightness, and identity

Thickness priority is the existing rendered point size, which already incorporates the catalog layer's approved visual mapping. The controller preserves the existing point color and applies only bounded alpha and width factors. It does not invent luminosity, energy, physical diameter, or velocity.

The selected candidate is always first in adaptive selection and receives a small width increase. Its original point, label, catalog ID, selection state, and Object Card remain intact. Picking a transient streak routes back to the same catalog record.

## Eligible objects and solid-body preservation

Enabled sources:

- Gaia Nearby Stars point primitives at 10, 25, 50, and 100 pc;
- Reid et al. Milky Way HMSFR tracer points and distant reference markers;
- Local Group point markers only in the far LOD;
- Galactic Center and Magellanic navigation through their existing Milky Way or Local Group point contexts.

Excluded sources:

- Sun, planet, and moon ellipsoids;
- close-range solid-body representations;
- galaxy meshes;
- orbit, uncertainty, guide, grid, and reconstruction lines;
- labels and UI.

Solar System has no Motion Streak source. Point-to-sphere transitions and the existing solid-body Entity path are not changed. The feature cannot replace a sphere with a point or trail.

## Adaptive density and performance modes

Candidate order is deterministic:

1. selected object;
2. landmarks;
3. existing rendered prominence;
4. distance when available;
5. stable-ID hash.

No per-frame random sampling is used. Current caps are:

| Mode | Desktop cap | Mobile cap |
| --- | ---: | ---: |
| Off | 0 | 0 |
| Subtle | 48 | 18 |
| Standard | 84 | 30 |
| Cinematic | 140 | 48 |

Milky Way uses 50% and Local Group uses 25% of the context cap. Reduced catalog or low-memory mode applies an additional deterministic reduction. Dim background stars normally remain points. The caps passed the local browser acceptance described below; no universal frame-rate claim is made.

## Controls, language, and persistence

The existing Deep Space control panel contains one compact selector:

- Traditional Chinese: `移動光軌`
- English: `Motion Streaks`
- Japanese: `移動光跡`
- Korean: `이동 광궤적`

Options are Off, Subtle, Standard, and Cinematic with exact four-language runtime text. The preference is stored under the Deep Space-local key `pcs.deepSpace.motionStreakMode`. The same PCS language event updates the label, options, status, and disclaimer; no second language state exists.

## Accessibility and comfort

When `prefers-reduced-motion: reduce` is active and no explicit user preference exists, the default is Off. A user may manually enable a mode, which then persists. The effect uses no flashes, opacity pulses, bloom, Doppler-like color shift, full-screen warp, or long persistence.

Labels and Object Cards are not hidden or rewritten. Camera motion never writes trail-derived values into scientific data fields.

## Tests

Automated unit coverage verifies:

- deterministic density selection;
- selected and landmark priority;
- pan-direction sign reversal;
- context-specific length caps;
- rendered-prominence thickness mapping;
- camera position, direction, up-vector, and frustum detection;
- use of one batched collection and `postRender`;
- absence of another Viewer, canvas, or independent animation loop.

The correction's local browser acceptance passed in Headless Chrome with SwiftShader WebGL for:

- all eight required scale contexts and the explicit long-line / barcode regression;
- mouse wheel in/out, drag/rotation, pointer-anchored zoom, control-modified trackpad path, synthetic mobile pinch, and keyboard object focus;
- 100 start/stop cycles, 50 zoom-in/out pairs, 30 pan pairs, 30 scale changes, 30 selected-object changes, and 20 Deep Space open/close cycles;
- 100/100 returns to zero visible trails and 100/100 returns to `idle` after the measured settling window;
- one Cesium Viewer, one Cesium canvas, unchanged total canvas count, one removable post-render listener, and no independent animation loop;
- preserved Proxima Centauri Object Card identity and an Earth solid-body return with zero trail candidates;
- zero required Console exceptions and zero required Network failures.

Human acceptance remains open. Automated screenshots demonstrate bounded geometry and no rain/barcode field, but they are not a substitute for the requested human visual review.

### Superseded evidence

The earlier deployment at commit `94e75f0` and its performance tables describe the human-rejected long-line implementation. Those results remain historical evidence only and do not establish acceptance of the correction. Fresh local and production reports for the micro-trail implementation must be used for current performance and release decisions.

## Known limitations

- Polyline width is subject to the renderer's supported aliased-line-width limit.
- Window projection can be unavailable for points behind the camera or outside a valid projection; those trails are hidden.
- Browser automation cannot replace the still-open Foundation requirement for physical Mac trackpad and real-device pinch evidence.
- The mobile pinch and 390 × 844 results are synthetic browser emulation, not physical-device evidence.
- SwiftShader performance is not representative of all native GPUs; no universal 60 FPS claim is made.
- This feature does not repair Titania imagery and does not begin Deep Space Phase 4.

## Cesium references

- [PolylineCollection](https://cesium.com/learn/cesiumjs/ref-doc/PolylineCollection.html)
- [PointPrimitive](https://cesium.com/docs/cesiumjs-ref-doc/PointPrimitive.html)
- [Scene](https://cesium.com/learn/cesiumjs/ref-doc/Scene.html)
