# PCS Cloudflare Backend Prototype

## Purpose

This folder contains the first Cloudflare Worker backend prototype for the Planetary Common State (PCS) platform.

The Worker is a backend service prototype only. It does not run scientific connectors, compute PCS values, fabricate observations, or modify existing Engine, Connector, or Observatory files.

In the target architecture, Cloudflare Workers will provide a lightweight REST API that PCS Observatory can read as a live backend. GitHub Pages remains the frontend-only deployment surface.

## Current Endpoints

### `GET /`

Returns service metadata for the PCS backend prototype.

### `GET /health/openweather`

Returns OpenWeather backend configuration and upstream tile health.

### `GET /latest`

Returns prototype JSON shaped for future compatibility with `latest_state.json`.

No scientific values are included in this prototype endpoint.

### `GET /api/nasa/status`

Returns NASA Earthdata gateway configuration status without exposing secrets.

### `GET /api/nasa/gibs`

Returns normalized NASA Earthdata JSON for GIBS discovery results. Cached for
1 hour.

### `GET /api/nasa/modis`

Returns normalized NASA Earthdata JSON for MODIS discovery results. Cached for
6 hours.

### `GET /api/nasa/viirs`

Returns normalized NASA Earthdata JSON for VIIRS discovery results. Cached for
6 hours.

### `GET /api/nasa/firms`

Returns normalized NASA Earthdata JSON for FIRMS discovery results. Cached for
30 minutes.

### `GET /api/nasa/smap`

Returns normalized NASA Earthdata JSON for SMAP collection discovery results.
This endpoint discovers SMAP collections; it does not return soil-moisture
measurements. Cached for 12 hours.

PCS prefers the following SMAP collection for granule discovery:

- `short_name`: `SPL4SMGP`
- `version_id`: `008`
- `concept_id`: `C3480440870-NSIDC_CPRD`
- `title`: `SMAP L4 Global 3-hourly 9 km EASE-Grid Surface and Root Zone Soil Moisture Geophysical Data V008`

### `GET /api/nasa/smap/granules`

Returns normalized SMAP granule metadata and download links for a specific CMR
collection and time range.

Required query parameters:

- `collection_concept_id`
- `start`
- `end`

Optional query parameter:

- `bounding_box`

Example:

```bash
curl "https://<pcs-backend>/api/nasa/smap/granules?collection_concept_id=<collection-id>&start=2024-01-01T00:00:00Z&end=2024-01-02T00:00:00Z"
```

### `GET /api/nasa/smap/latest`

Uses the preferred `SPL4SMGP` version `008` collection concept ID and returns
the latest available granule metadata. The route tries 48 hours, 7 days, 30
days, then latest available without a temporal filter. If a `bounding_box`
returns no granules, it retries globally and marks `spatial_filter_relaxed`.
Optional query parameters are `bounding_box`, `end`, and `page_size`.

Example:

```bash
curl "https://<pcs-backend>/api/nasa/smap/latest?bounding_box=-125,24,-66,50"
```

All NASA dataset endpoints use the Cloudflare secret `EARTHDATA_TOKEN` as a
server-side bearer token. The token is attached only by the Worker and is never
sent to the frontend, returned in JSON, or written to logs.

Example:

```bash
curl "https://<pcs-backend>/api/nasa/modis?page_size=5&keyword=NDVI"
```

Error responses are sanitized:

```json
{
  "success": false,
  "source": "NASA Earthdata",
  "dataset": "MODIS",
  "error": "NASA Earthdata request failed",
  "timestamp": "2026-07-12T00:00:00.000Z"
}
```

## Future Architecture

```text
Internet

NASA
NOAA
ESA
Copernicus
CWA
USGS

PCS Connectors

Aggregation

Cloudflare Worker

REST API

PCS Observatory
```

## Architecture Boundary

- PCS Engine remains the scientific computation layer.
- PCS Connectors remain the data ingestion layer.
- PCS Observatory remains the frontend interface.
- Cloudflare Worker becomes the PCS backend service layer.
- Python aggregation remains local until a future migration phase.

## Future Phases

### CF-2

Serve generated `latest_state.json` through the Worker.

### CF-3

Add scheduled refresh support.

### CF-4

Evaluate live connector execution or connector-result ingestion.

### CF-5

Operate a production PCS Backend API.

## Local Development

Install dependencies:

```bash
npm install
```

Configure runtime secrets:

```bash
wrangler secret put OPENWEATHER_API_KEY
wrangler secret put EARTHDATA_TOKEN
wrangler secret put INGEST_SECRET
```

Start local development server:

```bash
npx wrangler dev
```

Deploy when ready:

```bash
npx wrangler deploy --keep-vars
```

For repository-controlled production deploys, use
`.github/workflows/deploy-cloudflare-worker.yml`
to ensure deployment runs from this directory and preserves dashboard runtime
secrets with `--keep-vars`.

## Verification

Expected checks:

- `/` returns online PCS backend JSON.
- `/health/openweather` returns OpenWeather health JSON.
- `/latest` returns prototype latest-state-compatible JSON.
- `/api/nasa/status` reports NASA Earthdata configuration status.
- `/api/nasa/modis?page_size=1` returns normalized NASA Earthdata JSON when
  `EARTHDATA_TOKEN` is configured.
