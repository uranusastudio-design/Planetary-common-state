# Pointer-Anchored Navigation

Status: **Functionally completed; physical-gesture acceptance pending**

## Interaction contract

Mouse-wheel input uses the pointer position over the Cesium canvas. Mac trackpad pinch delivered as a control-modified wheel event uses the same pointer anchor. Two-touch mobile pinch uses the gesture center. The camera moves only along the camera-to-anchor ray, which keeps the anchor near its original screen position without changing the selected object.

Anchor priority is a valid picked scene position, the selected or focused object, then a bounded screen-center ray fallback. Orbit polylines are explicitly rejected as scene anchors so they cannot cause a remote jump.

Each input step is clamped to a distance ratio of 0.78–1.28. Minimum clearance is the selected rendered-body radius or four times the active near plane. Maximum travel respects the existing Cesium controller maximum zoom distance. The operation is immediate and deterministic; it does not add delayed animation tails or another animation loop.

## Lifecycle

The implementation reuses the existing Viewer and Deep Space lifecycle. Native Cesium zoom is disabled only while the custom navigation controller is active. Wheel and touch listeners share one `AbortController`, are removed on close, and native zoom state is restored. Drag rotation, explicit object focus, Reset, Return, Follow, scale state, and selected-object state remain independent.

## Accessibility and reduced motion

Pointer navigation does not replace keyboard controls or existing focus behavior. No animation is introduced, so reduced-motion mode does not require a separate transition path.

## Known limitations

- Browser/OS gesture delivery differs; Mac trackpad and mobile hardware acceptance must use real gesture input where automation cannot synthesize trusted events.
- Depth picking availability depends on the active Cesium scene and rendered object. The documented fallback order is used when no valid depth position exists.
- The controller does not treat an orbit line as an object-selection action.
