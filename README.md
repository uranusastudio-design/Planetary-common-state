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
| `INGEST_SECRET`       | ****** required to call `POST /ingest/v1`          |

```bash
cd cloudflare
wrangler secret put OPENWEATHER_API_KEY   # paste key when prompted
wrangler secret put INGEST_SECRET         # paste a strong random token
```

> **Never** hard-code these values in source files or commit them to git.

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
wrangler deploy
```

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

