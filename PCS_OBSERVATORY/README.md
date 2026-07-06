# PCS Observatory v1.1

PCS Observatory v1.1 is a static, read-only observatory page for the Planetary Common State platform.

## Scope

- Reads `../PCS_ENGINE/output/latest_state.json`.
- Displays a scientific observatory dashboard with current state, status, coverage, latest update, and projection cards for Thermal `L_T`, Chemical `L_C`, Structural `L_S`, and Informational `L_I`.
- Displays status as `Operational Prototype`.
- Displays coverage as an observed-dimension count out of four projection dimensions.
- Displays `Waiting for data` when source JSON values are null or unavailable.
- Shows horizontal progress bars for numeric projection values.
- Reloads `../PCS_ENGINE/output/latest_state.json` every 10 seconds without refreshing the page.
- Includes a static SVG Earth illustration.
- Includes a read-only data source panel and footer.
- Does not compute values.
- Does not interpolate missing values.
- Does not make prediction claims.
- Does not render charts or Earth animation.
- Includes an experimental CesiumJS 3D Earth view for visualization only.

## Files

- `index.html` contains the static page structure.
- `style.css` contains the responsive scientific visual style.
- `app.js` loads and displays the latest PCS state JSON.
- `assets/` is reserved for future static Observatory assets.

## Running Locally

Because the page reads a JSON file from the repository, serve the repository root with a local static file server and open:

```text
PCS_OBSERVATORY/index.html
```

The Observatory is intentionally framework-free: pure HTML, CSS, and JavaScript.

## CesiumJS 3D Earth Prototype

CesiumJS is used only as the 3D Earth visualization engine in this prototype.

PCS data and state estimates continue to come from `PCS_ENGINE/output/latest_state.json`. The Observatory does not compute PCS values, infer missing values, or introduce prediction.

Future versions may add NASA, NOAA, Copernicus, ESA, JAXA, and WMO layers after connector, provenance, and validation rules are defined.

The current CesiumJS integration is visualization only. If CesiumJS or WebGL is unavailable, the page displays a fallback message while the PCS data display remains operational.

## Wide Responsive Layout

The Observatory now uses a wide responsive layout for desktop viewing. The left panel contains PCS state, time, refresh, and confirmed data status. The center panel contains the CesiumJS Earth visualization. The right panel contains observed dimensions and waiting-data status.

On smaller screens, the layout stacks vertically. CesiumJS remains a visualization layer only, and PCS scientific values still come from PCS_ENGINE output.

## Scientific Domain Panels

The Observatory includes Scientific Domain Panels to prepare the interface for future 100+ Earth-system variables. The panels organize domains by active, waiting, and planned status without claiming that all variables are currently connected.

Current active data are limited to the Atmosphere domain through NASA GISTEMP and NOAA Mauna Loa CO2. Ocean and Biosphere remain waiting for sea-level, ocean, and NDVI connections. Planned domains are placeholders for future validated data integration.

## Earth System Layer Control

The Earth System Layer Control is the UI registry for future Cesium overlays. It lists planned map layers and their current connection status without rendering geospatial overlays.

Only NASA GISTEMP and NOAA Mauna Loa CO2 are currently connected as data sources. No geospatial overlay rendering is implemented yet, and selecting a layer only displays its connection status.
