# PCS Observatory Earth Viewer Repair

## Production entry

The visible `Earth — Living Planet` globe is the `#cesium-globe` element inside `.globe-panel` in `PCS_OBSERVATORY/index.html`. `PCS_OBSERVATORY/app.js` calls `initializeCesiumGlobe()` and creates the single `Cesium.Viewer`. The project does not mount a React Earth-viewer component. `PCS_OBSERVATORY/geographic-markers.js` is the shared geographic marker pipeline.

## Production region registry

The production selector is rebuilt from `regionConfig`, which mirrors the Worker `REGIONAL_PROFILES` registry. It contains 23 canonical profiles:

- Global, Taiwan, Japan, Korea, Canada, United Kingdom, United States, China, Singapore, Dubai
- Tibetan Plateau & Himalaya, Iceland Glaciers, New Zealand Glaciers, Alaska Glaciers, Global Drylands & Desertification, Amazon Basin, African Savanna, Niagara Falls, Iguazú Falls, Victoria Falls
- Global New Year Observatory, Taiwan Seasonal Observatory, Japan Seasonal Observatory

No URL, selector, or provider alias registry currently maps alternate IDs to these profiles. Therefore the normalized `aliases` arrays are empty rather than invented. Seasonal profiles remain independent canonical profiles, not aliases of their country profiles.

## Marker-producing layers

The runtime audit API enumerates the active production controller registry and automatic marker sources. Marker-producing layers are:

- NOAA CO-OPS station (`sea-level`)
- NOAA GML station (`co2`)
- NOAA NHC tropical cyclone centers and KML (`tropical-cyclones`)
- NASA FIRMS detections (`wildfire`, authorization-dependent)
- USGS regional earthquakes (`regional-earthquakes`)
- regional coastal stations (`regional-coastal`)
- approximate visitor locations (`visitor-locations`)
- aggregate visitor heat (`visitor-heat`)
- aggregate visitor network polylines (`visitor-network`)
- browser user location (`user-location`, permission-dependent)
- Moon landing sites (`moon-landing-sites`, Moon mode only)

Weather and GIBS raster imagery layers do not create markers. Shipping, aviation, satellite-observation, alert, and NASA SMAP metadata are not presented as implemented marker layers.

## Repair

Scientific altitude and rendering offset are now separate fields: `observedAltitudeMeters`, `visualOffsetMeters`, and derived `renderedHeight`. Marker IDs use `canonicalRegionId:layerId:sourceRecordId`. GeoJSON remains longitude then latitude. Invalid coordinates are rejected before Cesium entity creation.

The previous buried-marker failure was caused by `CLAMP_TO_GROUND` on points and labels whose Cartesian positions had positive heights. Active marker renderers now use normal depth testing and `HeightReference.NONE`; marker-category offsets are reduced across four camera-height bands and are recalculated only when a camera movement crosses a band.

The shared HTML overlay controller retains one `postRender` callback. It requires an in-canvas projection and front-facing ellipsoid test with a `0.03` horizon safety threshold. Cesium-native geographic markers retain globe depth testing and are also hidden by the same safety threshold after the camera settles, preventing partial rear-side arcs without per-marker render listeners. No geographic marker has infinite `disableDepthTestDistance`.

The one retained infinite depth-test exception is the documented non-geographic observation-disc preview used while the Earth globe itself is hidden. It is not a geographic Earth marker.

Layer activation, deactivation, refresh, and stale-response cleanup capture numeric camera position, orientation, and height before and after the operation. A generation token prevents a late response for an old region from repopulating that region. Region selection and explicit Reset/Locate/Focus remain the only intentional camera moves.

The toolbar is mounted in the actual production viewer shell. `normal`, `pinned`, and `expanded` are mutually exclusive values. All modes reuse one Viewer and one Cesium canvas. Reset uses the active region camera profile; ResizeObserver and double animation-frame resize handle shell changes; Escape restores expanded mode.

## Validation artifacts

- `test-results/earth-viewer/region-layer-acceptance-matrix.json`
- `test-results/earth-viewer/acceptance-report.json`
- `test-results/earth-viewer/*.png`

The matrix distinguishes `pass`, `unavailable-provider`, `authorization-required`, `permission-required`, `no-regional-records`, `not-executed-browser`, `not-executed-webgl`, and `not-executed-live-api`. Unexecuted or unavailable combinations are not reported as passes.

## Limitations

- Geolocation requires an explicit user permission and is not inferred from browser test automation.
- NASA FIRMS requires a configured backend credential.
- A provider can legitimately return no regional events or no configured station.
- Screenshot evidence documents the tested Chrome/WebGL environment only; it does not establish universal browser or GPU behavior.
