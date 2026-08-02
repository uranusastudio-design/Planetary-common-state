# Deep Space Phase 3 — Milky Way / Local Group

## Scope and scientific status

Phase 3 extends the existing single-Cesium-Viewer scale path from Nearby Stars to the Milky Way, Galactic Center, Magellanic System and Local Group. Phase 1, Phase 2, the frozen Earth Viewer repair and Titania are not rebuilt. Phase 4 remains a placeholder.

The interface distinguishes:

- **Catalog observation:** Reid 2019 HMSFR measurements, McConnachie 2012 Local Group rows and the referenced Sagittarius A* position.
- **Observation-based reconstruction:** Galactic disk, bar and spiral-arm geometry derived from documented measurements and arm memberships.
- **Representative visualization:** marker sizes, scale boundary and the Milky Way observer-origin reference where no catalog heliocentric distance exists.

## Data pipeline

`build-phase3-catalogs.py` downloads the two reproducible VizieR TSV results and writes versioned registries without hand-editing scientific values. `validate-phase3-catalogs.py` verifies raw SHA-256 values, 199 HMSFR rows, 102 Local Group rows, stable IDs, valid finite coordinates and metadata consistency. See `assets/deep-space/phase-3/SOURCES.md` and `catalog-metadata.json`.

## Coordinates

The Milky Way layer uses a fixed right-handed Galactocentric frame with `R0 = 8.15 kpc`, Sun position `[-8.15, 0, 0.0208] kpc`, +y toward Galactic longitude 90°, and +z toward the North Galactic Pole. Local Group catalog coordinates remain heliocentric Galactic Cartesian; no precise barycenter is asserted. Scientific coordinates remain linear. Exhibition mode applies a documented display-only compression without changing ordering or source data.

## Rendering and lifecycle

Milky Way and Local Group layers use the existing Viewer with point, label and polyline primitive collections. No second Viewer, WebGL context, canvas, worker or permanent animation loop is created. Both layers implement `load`, `show`, `hide`, `unload` and `dispose`; scale transitions unload the previous layer before rendering the next.

Milky Way full mode renders 199 HMSFR tracers plus Sun and Sagittarius A*. Reduced mode uses a deterministic one-in-four tracer subset. Local Group full mode retains 102 catalog rows and reduced mode uses documented landmarks. Missing distances and uncertainties remain unavailable rather than zero.

## Interaction and language

Local search supports canonical names, catalog IDs and imported aliases. Landmark navigation includes Sun, Sagittarius A*, M31, M33, LMC and SMC. Information cards expose source identifiers, coordinates, distance and uncertainty where available, data status, visualization status, coordinate frame and catalog. Labels, reconstruction, catalog and uncertainty layers are independently switchable.

The existing language state supplies Traditional Chinese, English, Japanese and Korean. Phase 3 does not add another selector or language store. Mobile controls use a two-column toggle layout and remain collapsible.

## Acceptance results

Local Chrome CDP acceptance used an already-created SwiftShader WebGL Cesium Viewer. The Earth imagery await was bypassed only by injecting that same Viewer into the existing manager bootstrap; no second Viewer was created.

- 20 Nearby → Milky Way → Local Group cycles: passed.
- 30 Local Group search/focus operations: passed.
- Viewer count: 1; page canvas count remained 2, of which one is the Cesium canvas.
- Four languages and page scale 33%, 50%, 67%, 100%: passed without horizontal overflow.
- 390 × 844 mobile: passed.
- Local load times: 10 pc 21 ms, Milky Way 14 ms, Local Group 6 ms in this run.
- Headless SwiftShader result: 1.87 FPS; this is environment-specific and is not a universal performance claim.
- JavaScript heap delta after the stress sequence: +29,180,539 bytes. This includes retained browser/application caches and does not prove a leak.
- Console exceptions: 0. Local backend network failures: 52; these are recorded separately and must not be reported as production-network success.

Production GitHub Pages repeated the same 20-cycle／30-search acceptance against the deployed files: 10 pc loaded in 502 ms, Milky Way in 296 ms, and Local Group in 227 ms; Console exceptions and Network failures were both 0. Headless SwiftShader measured 1.84 FPS and a heap delta of −6,257,144 bytes. These values describe only this constrained test environment and are not general browser performance guarantees.

## Limitations

- The Milky Way external perspective is an observation-based reconstruction, not an external photograph.
- Spiral-arm coverage follows published tracers and does not claim a complete physical density model.
- The Local Group catalog is the published 2012 compilation, not a continuously updated live survey.
- Marker sizes are enhanced and are not physical stellar or galaxy diameter scale.
- Cold-start offline operation still depends on the Cesium CDN.
- No Cosmic Web, Observable Universe, CMB, civilization analysis, comet or asteroid module is included.
