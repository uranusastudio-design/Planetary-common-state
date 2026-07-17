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

### PCS observation, retrospective, and validation APIs

- `GET /api/domain-readiness` probes each registered public provider adapter and returns normalized provider, dataset, endpoint, timestamp, latency, quality flag, uncertainty, license, validation, and availability metadata.
- `GET /api/layers` returns the eleven provider-backed observation-layer adapters with visible provider errors and complete provenance.
- `GET /api/daily-brief` returns ten deduplicated primary publications plus up to five `more_intelligence` items. Publication metadata is never exposed as a scientific measurement.
- `GET /api/system-status` separates Observation, Connectors, Validation, Engine, PCS State, Data Flow, and Human/AI Review.
- `GET /api/evidence-explorer` queries event-linked snapshots and defaults causal status to `NOT_ESTABLISHED`.
- `GET /api/ai-analysis/status` reports the optional proposal-only AI adapter state.
- `GET /api/events` and `GET /api/events/:id`
- `GET /api/events/:id/retrospective`, `/timeline`, and `/evidence`
- `GET /api/evidence-ledger` and `GET /api/evidence-ledger/:id`
- `GET /api/mass-gatherings` and `GET /api/human-mobility`
- `GET /api/validation/metrics`

Administrative event, analysis, validation, source-linking, merge, and warning-rule routes use the existing bearer-token pattern. `ADMIN_API_KEY` is preferred and `INGEST_SECRET` remains a compatibility fallback. Event confirmation sources are kept separate from observation snapshots; missing measurements remain `null` or `unavailable`.

Scheduled triggers run every six hours, at daily start/end, and weekly. They refresh provider/layer health, ingest the Daily Research Brief, ingest idempotent NOAA alert and USGS earthquake event candidates, cluster compatible events, update missing-data ledger entries, and calculate validation metrics only after a sufficient sample exists. No news item is treated as a scientific measurement.

### `GET /api/nasa/status`

Returns NASA Earthdata gateway configuration status without exposing secrets.

### Phase 1 astronomy routes

- `GET /api/astronomy/moon` — NASA/JPL Horizons source-computed lunar illumination, distance, and apparent diameter, plus clearly labeled local UTC phase/age approximations. Cached 60 minutes.
- `GET /api/space-weather/summary` — normalized NOAA SWPC observed-data summary. Cached 3 minutes.
- `GET /api/space-weather/kp` — NOAA planetary K index (observed or estimated, never a forecast). Cached 10 minutes.
- `GET /api/space-weather/solar-wind` — NOAA real-time plasma and magnetic-field observations. Cached 3 minutes.
- `GET /api/space-weather/xray` — NOAA GOES X-ray observations with a locally derived flare class. Cached 3 minutes.
- `GET /api/space-weather/alerts` — current NOAA SWPC issued products. Cached 5 minutes.
- `GET /api/space-weather/solar-image?mode=...` — validated metadata for NASA SDO HMI/AIA or NASA/ESA SOHO LASCO C2 imagery. Metadata and fresh imagery are cached 10 minutes; the last valid image is retained for a bounded 24-hour stale fallback.
- `GET /api/space-weather/solar-image?mode=...&format=image` — CORS-safe validated image proxy. HTML responses and invalid JPEG/PNG signatures are rejected.
- `GET /api/astronomy/lunar-image` — validated, CORS-safe proxy for the USGS Astrogeology `LROC_WAC` global cylindrical lunar WMS mosaic. Cached 24 hours with a 7-day last-valid cache fallback.

Solar image modes are `hmi-continuum`, `hmi-magnetogram`, `aia-171`,
`aia-193`, `aia-304`, and `coronagraph`. Observation time is taken from the
official upstream image `Last-Modified` header; the Worker does not synthesize
an observation timestamp.

Every route uses the PCS Observatory response envelope and reports source,
dataset time, retrieval time, cache state, stale state, upstream response time,
and live/delayed/unavailable status. The last valid response is retained in
`PCS_CACHE` for a bounded stale fallback. Missing upstream values remain
`null`; failures never produce zero-valued observations.

Moon phase fraction and age use UTC elapsed days modulo the mean synodic month
(29.530588853 days), anchored at the 2000-01-06 18:14 UTC new moon. This is an
interface approximation, not a direct observation or a claim of research-grade
precision. Next-new/full-moon fields remain `null` until an official reliable
event source is integrated.

### Shared Solar System ephemeris route

`GET /api/astronomy/body/:body` returns normalized NASA/JPL Horizons data for
`sun`, `mercury`, `venus`, `earth`, `moon`, `mars`, `jupiter`, `saturn`,
`uranus`, and `neptune`. Missing Horizons fields remain `null`. Cache policy is
30 minutes for the Sun, 60 minutes for the Moon, 2 hours for inner planets and
Mars, and 6 hours for outer planets. A bounded last-valid response is returned
with `status: "stale"` during temporary Horizons failures.

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

## Existing D1 migration

Apply the retrospective-analysis schema to an existing production database with:

```bash
wrangler d1 execute pcsbackend --remote --file=migrations/0001_pcs_retrospective.sql
wrangler d1 execute pcsbackend --remote --file=migrations/0002_pcs_intelligence_layers.sql
```

These migrations are additive and idempotent. The heat-dome and World Cup case
shells contain metadata plus `NULL`/`unavailable` analytical fields only; they
do not contain synthetic observations.

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
wrangler secret put ADMIN_API_KEY
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
