# PCS Observatory Prototype v1.0

PCS Observatory Prototype v1.0 is the Milestone 1 user-interface prototype for the Planetary Common State platform.

This milestone finalizes the initial read-only observatory interface before real scientific connector implementation begins.

## Purpose

The purpose of the prototype is to show how PCS estimates, domain values, data coverage, future layer controls, and a 3D Earth viewport can be organized in a single scientific interface.

The prototype is intentionally conservative. It does not claim a complete planetary assessment, does not infer missing observations, and does not render real geospatial overlays.

## Current Architecture

The Observatory is a static frontend made from:

- `index.html` for page structure.
- `style.css` for the full-width responsive layout.
- `app.js` for read-only JSON loading, display formatting, CesiumJS initialization, local time, and UI-only layer-control messages.
- CesiumJS for the experimental 3D Earth visualization layer.

The page reads:

```text
../PCS_ENGINE/output/latest_state.json
```

The page refreshes that JSON every 10 seconds without reloading the full browser page.

## Current Connected Datasets

The current prototype displays two confirmed data sources:

- NASA GISTEMP: Global Temperature
- NOAA Mauna Loa CO2: Atmospheric CO2

These sources support the current Prototype PCS Estimate and the connected Thermal Residual and Chemical Residual displays.

## Current UI Components

- Prototype PCS Estimate
- Prototype Data Coverage
- Prototype Domain Values
- Confirmed Data Sources
- Waiting for Data
- CesiumJS 3D Earth viewport
- Earth System Layer Control
- Scientific Domain Panels
- Milestone footer

## Current Limitations

- This is a prototype estimate from partial observations, not a complete planetary assessment.
- Only two data sources are currently connected.
- Sea level and NDVI remain waiting for future connector implementation.
- Future layers are visible in the UI but do not draw overlays on the globe.
- No prediction is implemented.
- No scientific calculation is performed in the Observatory.
- No fake data are added.

## CesiumJS Viewport

CesiumJS is used only as a visualization engine. PCS values continue to come from `PCS_ENGINE/output/latest_state.json`.

The initial camera is centered near longitude 120 degrees and latitude 20 degrees, with the full Earth visible at a stable altitude. User rotation and zoom remain enabled.

## Earth System Layer Control

The Earth System Layer Control is the UI registry for future Cesium overlays.

Connected layers:

- Global Temperature
- CO2

Waiting layers:

- Sea Level
- NDVI

Planned layers:

- Precipitation
- Tropical Cyclones
- Wildfire
- Sea Ice
- Shipping
- Aviation
- Satellite Observations

Selecting a layer only displays its status. No geospatial overlay rendering is implemented yet.

## Next Milestone

Milestone 2 should begin real scientific connector preparation and implementation planning. Priority should remain:

1. Connector metadata finalization.
2. First real dataset connector implementation.
3. Provenance and validation checks.
4. Observatory display updates only after validated connector output exists.

## Milestone Status

Current milestone: Milestone 1 Complete

Ready for Milestone 2 after review.
