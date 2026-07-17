# PCS Weather Earth v0.1

A minimal scientific 3D Earth dashboard with live weather map layers, built as the
first module of the broader **PCS (Planetary-Critical-Systems)** dashboard.

![stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20TypeScript%20%2B%20CesiumJS%20%2B%20Tailwind-0ea5e9)

## Features

- Full-screen interactive 3D globe (CesiumJS)
- Dark, scientific UI theme (TailwindCSS)
- Collapsible right-side control panel
- Weather layer selector — Temperature, Clouds, Rain, Wind
- Layers sourced from the OpenWeather Weather Maps tile API via a server-side proxy
- OpenWeather API key lives exclusively in the Cloudflare Worker secret — never in browser code
- Only one weather layer active at a time, with smooth switch transitions
- Architecture pre-wired for future modules: Ocean, Cryosphere, Biosphere,
  Energy, Human, PCS state estimation
- Live provider-backed readiness across PCS Earth, human, infrastructure, and space domains
- Daily event retrospective panels, multi-city mass-gathering availability, and Evidence Ledger
- Traditional Chinese, English, Japanese, and Korean interface labels

## Tech stack

| Layer      | Choice                     |
|------------|-----------------------------|
| Framework  | React 18                    |
| Build tool | Vite 5                      |
| Language   | TypeScript                  |
| Globe      | CesiumJS (`vite-plugin-cesium`) |
| Styling    | TailwindCSS                 |

## Project structure

```
PCS-Weather-Earth/
├── src/
│   ├── components/
│   │   ├── EarthViewer.tsx      # Cesium globe + weather tile layer swapping
│   │   ├── ControlPanel.tsx     # Collapsible right-side panel
│   │   └── LayerSelector.tsx    # Weather layer buttons
│   ├── config/
│   │   ├── weatherLayers.ts     # OpenWeather layer catalogue + URL builder
│   │   └── subsystems.ts        # Registry stub for future PCS modules
│   ├── types/
│   │   └── weather.ts           # Weather layer types
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Prerequisites

- Node.js 18+ and npm
- The deployed `pcs-backend` Cloudflare Worker at
  `https://pcs-backend.uranusastudio.workers.dev` with
  `OPENWEATHER_API_KEY` set as a Worker secret (see the
  [cloudflare/](../../cloudflare/) directory). The frontend **never** handles
  or stores the OpenWeather API key — all tile requests are proxied through the
  Worker.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open the printed local URL (default `http://localhost:5173`).

## Available scripts

| Command           | Description                              |
|--------------------|-------------------------------------------|
| `npm run dev`      | Start the Vite dev server with HMR        |
| `npm run build`    | Type-check and build a production bundle  |
| `npm run preview`  | Preview the production build locally      |
| `npm run lint`     | Type-check only (`tsc --noEmit`)          |

## How the weather layers work

`src/config/weatherLayers.ts` defines the four supported weather proxy paths
and builds tile URLs that route through the `pcs-backend` Cloudflare Worker:

```
https://pcs-backend.uranusastudio.workers.dev/tiles/openweather/{layer}/{z}/{x}/{y}.png
```

The browser never sees an OpenWeather API key — credentials stay server-side in
the Worker secret. `EarthViewer.tsx` rebuilds the selected Cesium
`ImageryLayer`s whenever the toggle state changes, and `LayerSelector.tsx`
renders independent checkbox controls for Clouds, Rain, Temperature, and Wind.

The backend host is intentionally pinned in `src/config/weatherLayers.ts` to
the deployed worker required for this app:
`https://pcs-backend.uranusastudio.workers.dev`. If you need to point the
frontend at a different PCS backend instance, change `PCS_BACKEND_URL` there.

## Extending the dashboard

`src/config/subsystems.ts` documents the intended slots for future modules
(Ocean, Cryosphere, Biosphere, Energy, Human, PCS state estimation). Each new
module should follow the same pattern as `weatherLayers.ts` /
`LayerSelector.tsx`: a config file describing its data layers, a types file,
and a component that plugs into `ControlPanel.tsx`.

## Troubleshooting

- **Globe doesn't load / blank screen** — check the browser console; this
  usually means `vite-plugin-cesium` isn't copying Cesium's static assets.
  Confirm `vite.config.ts` includes the `cesium()` plugin and restart `npm run dev`.
- **Weather tiles don't appear** — confirm the deployed `pcs-backend` worker at
  `https://pcs-backend.uranusastudio.workers.dev` is reachable and has
  `OPENWEATHER_API_KEY` set as a secret
  (`wrangler secret put OPENWEATHER_API_KEY`). New OpenWeather keys can take up
  to a couple of hours to activate.
