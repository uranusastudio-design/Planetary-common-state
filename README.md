# Planetary-common-state

Planetary Common State (PCS): An open research platform for Earth-system state estimation, data integration, and reproducible monitoring.

---

## Repository layout

```
cloudflare/          Cloudflare Worker (pcs-backend) — API, tile proxy, D1 ingest
  src/index.js       Worker source
  schema.sql         D1 database schema (apply once per fresh deployment)
  wrangler.toml      Worker configuration
Apps/
  PCS-Weather-Earth/ React/Vite/CesiumJS weather-globe frontend
PCS_CONNECTORS/      Python data-connector scripts
PCS_OBSERVATORY/     Standalone observatory viewer
docs/                Additional documentation
```

---

## Cloudflare Worker

### Required secrets

Set these in Cloudflare via `wrangler secret put` before deploying:

| Secret                | Description                                              |
|-----------------------|----------------------------------------------------------|
| `OPENWEATHER_API_KEY` | OpenWeather API key for server-side tile proxying        |
| `EARTHDATA_TOKEN`     | NASA Earthdata bearer token for server-side NASA access  |
| `INGEST_SECRET`       | ****** required to call `POST /ingest/v1`          |

```bash
cd cloudflare
wrangler secret put OPENWEATHER_API_KEY   # paste key when prompted
wrangler secret put EARTHDATA_TOKEN        # paste NASA Earthdata bearer token
wrangler secret put INGEST_SECRET         # paste a strong random token
```

> **Never** hard-code these values in source files or commit them to git.
> The frontend does not receive NASA Earthdata credentials; all NASA requests
> are proxied through the Worker.

### NASA Earth Observation API

The Worker provides a server-side NASA Earthdata gateway under `/api/nasa/*`.
It authenticates to NASA with the `EARTHDATA_TOKEN` Cloudflare secret, returns
normalized JSON, applies Cloudflare Cache API TTLs per dataset, and never logs
or returns the bearer token.

Supported datasets:

| Route             | Dataset | Cache TTL  |
|-------------------|---------|------------|
| `/api/nasa/gibs`  | GIBS    | 1 hour     |
| `/api/nasa/modis` | MODIS   | 6 hours    |
| `/api/nasa/viirs` | VIIRS   | 6 hours    |
| `/api/nasa/firms` | FIRMS   | 30 minutes |
| `/api/nasa/smap`  | SMAP collection discovery | 12 hours   |

Status:

```bash
curl https://<pcs-backend>/api/nasa/status
```

Example dataset request:

```bash
curl "https://<pcs-backend>/api/nasa/modis?page_size=5&keyword=NDVI"
```

SMAP granule metadata discovery:

```bash
curl "https://<pcs-backend>/api/nasa/smap/granules?collection_concept_id=<collection-id>&start=2024-01-01T00:00:00Z&end=2024-01-02T00:00:00Z"
```

Latest PCS SMAP granule metadata defaults to `SPL4SMGP` version `008`
(`C3480440870-NSIDC_CPRD`) and checks 48 hours, 7 days, 30 days, then latest
available granules:

```bash
curl "https://<pcs-backend>/api/nasa/smap/latest"
```

All dataset routes return a normalized envelope:

```json
{
  "success": true,
  "source": "NASA Earthdata",
  "dataset": "MODIS",
  "status": 200,
  "timestamp": "2026-07-12T00:00:00.000Z",
  "data": {}
}
```

Errors are sanitized:

```json
{
  "success": false,
  "source": "NASA Earthdata",
  "dataset": "MODIS",
  "error": "NASA Earthdata request failed",
  "timestamp": "2026-07-12T00:00:00.000Z"
}
```

### Visitor observatory network API

The Worker also provides anonymous visitor telemetry endpoints for
`PCS_OBSERVATORY`:

- `POST /api/visitors/register`
- `POST /api/visitors/ping`
- `GET /api/visitors/stats`
- `GET /api/visitors/locations`

These routes use Cloudflare `request.cf` metadata, round coordinates to 2
decimals, never store full IP addresses, and keep location responses grouped to
at most 100 recent points.

### D1 database initialisation

Run once against a fresh D1 database:

```bash
# Remote (production)
wrangler d1 execute pcsbackend --file=cloudflare/schema.sql

# Local development
wrangler d1 execute pcsbackend --local --file=cloudflare/schema.sql
```

The `cloudflare/schema.sql` file contains all table definitions and seed data
required for a clean deployment.

### Deployment

```bash
cd cloudflare
npm install          # or: pnpm install
wrangler deploy --keep-vars
```

GitHub Actions production deploys should use
`.github/workflows/deploy-cloudflare-worker.yml`,
which deploys from `cloudflare/` with `--keep-vars` so dashboard runtime
secrets remain bound.

### Local development

```bash
cd cloudflare
wrangler dev
```

---

## PCS-Weather-Earth frontend

See [`Apps/PCS-Weather-Earth/README.md`](Apps/PCS-Weather-Earth/README.md) for
full setup instructions.

Quick start:

```bash
cd Apps/PCS-Weather-Earth
cp .env.example .env          # then set VITE_PCS_BACKEND_URL
npm install
npm run dev
```

**Required environment variable:**

| Variable              | Description                               |
|-----------------------|-------------------------------------------|
| `VITE_PCS_BACKEND_URL`| URL of the deployed `pcs-backend` Worker  |

> The frontend does **not** handle any OpenWeather API key. All weather tile
> requests are proxied through the Worker.

---

## Security

See [SECURITY.md](SECURITY.md) for:

- Vulnerability reporting
- Leaked-secret remediation and git history purge commands
- Worker secret setup
- Environment file rules
