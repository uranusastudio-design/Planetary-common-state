# PCS Observatory geographic marker audit

Date: 2026-07-22

## Scope and renderers

All selectable layer definitions, static checkboxes, mode-driven markers, action-driven markers, and nested regional observations were inventoried. The renderers found were Cesium points, labels, billboards, ellipses, polylines, KML/data sources, and imagery layers. No production HTML geographic overlay currently exists; `geographic-markers.js` nevertheless supplies one shared, lifecycle-safe HTML overlay controller for future use.

The marker-bearing paths now share validated longitude/latitude/height normalization, `Cartesian3.fromDegrees`, stable `${layerId}:${markerId}` IDs, update-in-place behavior, stale-record reconciliation, and development drift inspection. The one remaining infinite depth-test distance belongs to the documented non-geographic celestial observation disc at `Cartesian3.ZERO`, shown only while the globe is hidden.

## Drift causes repaired

- Layer-specific entity construction bypassed common coordinate validation.
- Refresh paths could replace complete collections instead of updating stable records.
- Visitor heat and visitor location records did not consistently reconcile stale IDs.
- User, Moon, earthquake, coastal, fire, cyclone, and science-station markers used inconsistent surface-height/depth settings.
- Regional and automatic refresh paths did not share a single in-flight refresh guard.
- Coordinate aliases and GeoJSON coordinate order were not normalized at one boundary.

## Layer acceptance matrix

The machine-readable matrix is `marker-layer-acceptance.json`; its coverage test automatically fails when a static or provider-defined layer is absent.

| Layers inspected | Renderer | Result |
| --- | --- | --- |
| Clouds, Rain, Temp/Temperature, Global Temperature, Precipitation, NDVI, Sea Ice | Imagery | Pass — no geographic marker positions |
| Sea Level, CO2, Visitor Locations, Visitor Heat, Moon Landing Sites | Cesium native | Pass — shared pipeline and synthetic drift/refresh tests |
| Tropical Cyclones, Regional Earthquakes | Cesium native / provider data | Shared pipeline pass; live enable remains provider-dependent |
| Wildfire / NASA FIRMS | Cesium native / provider data | Shared pipeline pass; live enable requires provider authorization |
| Regional Coastal, coastal sea-surface-temperature observations | Cesium native / regional data | Shared pipeline pass; live records remain region-dependent |
| Visitor Network | Cesium polyline | Pass — normalized geographic endpoints and stable reconciliation |
| User Location | Cesium native | Shared pipeline pass; live enable remains browser-permission-dependent |
| Shipping, Aviation, Satellite Observations | Disabled metadata entries | Not applicable — no marker renderer exists |
| NASA SMAP | Metadata only | Not implemented as a selectable layer |
| Alerts / hazards | Metadata only | Not implemented as a selectable marker layer |

## Verification

- `node --test PCS_OBSERVATORY/*.test.js`: 24/24 passed.
- React viewer `npm run typecheck`: passed.
- React viewer `npm run build`: passed.
- `node --check` for the shared marker module and Observatory application: passed.
- `git diff --check`: passed (line-ending notices only).
- Automated checks cover coordinate order/range rejection, stable upsert/reconcile, simulated camera movement, intentional drift detection, one HTML `postRender` listener with cleanup, source-level unsafe-position audit, and dynamic layer-matrix coverage.

The local in-app browser loaded the document and responsive DOM, but its verification profile did not execute page scripts (including the existing inline `CESIUM_BASE_URL` assignment), so it could not provide a trustworthy live Cesium/WebGL or named Chrome/Edge result. Provider-, authorization-, region-, permission-, and browser-dependent rows are therefore deliberately not reported as unconditional live passes.

## Changed files

- `PCS_OBSERVATORY/geographic-markers.js`
- `PCS_OBSERVATORY/geographic-markers.test.js`
- `PCS_OBSERVATORY/marker-layer-acceptance.json`
- `PCS_OBSERVATORY/app.js`
- `PCS_OBSERVATORY/index.html`
- `PCS_OBSERVATORY/pcs-evidence.test.js`
- `Apps/PCS-Weather-Earth/src/utils/geographicMarkers.ts`
- `Apps/PCS-Weather-Earth/src/components/EarthViewer.tsx`
- `Apps/PCS-Weather-Earth/src/App.tsx`
- `Apps/PCS-Weather-Earth/src/index.css`
- `Apps/PCS-Weather-Earth/tsconfig.tsbuildinfo` (TypeScript build metadata)
