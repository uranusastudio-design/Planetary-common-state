# PCS Mission Control — MC-02

> **Local administration only. Not for public deployment.**
>
> Do not bind this server to `0.0.0.0`. Do not expose it through a tunnel,
> reverse proxy, LAN share or public hosting. Do not publish local telemetry.

This module is a `LOCAL_ADMIN_ONLY`, dependency-free browser shell for Alvin's
Mac. There is no public mode, anonymous Mission Control route or mode switch.
It does not provide MC-03 health APIs, operational telemetry, resource
monitoring, WhatsApp access, task execution or administration.

## Run locally

Use Node.js 24.18.0:

```sh
npm start
```

Open `http://127.0.0.1:4173/Apps/PCS-Mission-Control/`.

The server is hard-bound to `127.0.0.1` and accepts only `127.0.0.1` or
`localhost` Host headers. It does not enable wildcard CORS, directory listings,
environment disclosure or external host overrides.

The repository root `_config.yml` excludes this application and its runtime
registry from GitHub Pages output. Do not remove those exclusions without
Alvin's explicit reopening approval.

Run automated checks with:

```sh
npm test
```

## Data sources

- `../../data/phase-registry.json`: runtime-safe copy of the MC-01 canonical audit registry.
- Existing `GET /api/project-updates/latest`: latest PCS Update source.
- Existing Observatory paths: Earth, Solar System and Deep Space links.

The phase registry source SHA-256 and audit ID are preserved in its `source` object. The 48 phase records, their statuses and the Phase 7.2 gate are unchanged. Local absolute paths from the audit artifact are intentionally excluded from the browser-safe source.

Unknown operational values are truth-labelled `UNAVAILABLE`, `NOT_CONNECTED` or `COMING_IN_MC-XX`.
