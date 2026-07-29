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

- `/local-api/phase-registry`: loopback-only, read-only adapter that validates and reads the MC-01 audit registry and status matrix directly.
- `./local-admin-status.json`: single runtime-safe adapter source for MC-01/MC-02 and the validated `chatgpt-pcs-history` status.
- Existing `GET /api/project-updates/latest`: latest PCS Update source.
- Existing Observatory paths: Earth, Solar System and Deep Space links.

The registry adapter verifies the MC-01 source checksum, schema, 48 record IDs,
seven namespaces and evidence matrix before returning records. It never writes
to the audit artifact and never falls back to the repository runtime copy when
the source is unavailable or invalid.

Unknown operational values are truth-labelled `UNAVAILABLE`, `NOT_CONNECTED` or `COMING_IN_MC-XX`.

The history source status is metadata only. MC-02 never renders private conversation text, automatically imports new conversations, or writes query results to OpenClaw memory.
