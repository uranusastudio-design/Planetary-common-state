# PCS Cloudflare Backend Prototype

## Purpose

This folder contains the first Cloudflare Worker backend prototype for the Planetary Common State (PCS) platform.

The Worker is a backend service prototype only. It does not run scientific connectors, compute PCS values, fabricate observations, or modify existing Engine, Connector, or Observatory files.

In the target architecture, Cloudflare Workers will provide a lightweight REST API that PCS Observatory can read as a live backend. GitHub Pages remains the frontend-only deployment surface.

## Current Endpoints

### `GET /`

Returns service metadata for the PCS backend prototype.

### `GET /health`

Returns a simple health response.

### `GET /latest`

Returns prototype JSON shaped for future compatibility with `latest_state.json`.

No scientific values are included in this prototype endpoint.

## Future Architecture

```text
Internet

NASA
NOAA
ESA
Copernicus
CWA

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

Start local development server:

```bash
npx wrangler dev
```

Deploy when ready:

```bash
npx wrangler deploy --keep-vars
```

## Verification

Expected checks:

- `/` returns online PCS backend JSON.
- `/health` returns healthy status JSON.
- `/latest` returns prototype latest-state-compatible JSON.
