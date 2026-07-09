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
- A deployed `pcs-backend` Cloudflare Worker with `OPENWEATHER_API_KEY` set as
  a Worker secret (see the [cloudflare/](../../cloudflare/) directory).  
  The frontend **never** handles or stores the OpenWeather API key — all tile
  requests are proxied through the Worker.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure the backend URL**

   Copy the example env file and fill in your worker URL:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```
   VITE_PCS_BACKEND_URL=https://pcs-backend.YOUR_ACCOUNT.workers.dev
   ```

   > `.env` is already listed in `.gitignore` — it will never be committed.
   > **Never** add `VITE_OPENWEATHER_API_KEY` to `.env`; the API key lives
   > exclusively in the Cloudflare Worker secret and must not appear in browser
   > code or environment files.

3. **Run the dev server**

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

`src/config/weatherLayers.ts` defines the four supported OpenWeather tile
layers (`temp_new`, `clouds_new`, `precipitation_new`, `wind_new`) and builds
tile URLs that route through the `pcs-backend` Cloudflare Worker proxy:

```
/tiles/openweather/{layer}/{z}/{x}/{y}
```

The Worker internally fetches:

```
https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=<secret>
```

The browser never sees the `appid` query parameter — it is attached server-side
by the Worker using `env.OPENWEATHER_API_KEY`.

`EarthViewer.tsx` keeps a reference to the single active Cesium
`ImageryLayer`. Whenever the selected layer changes, it removes the previous
imagery layer (if any) and adds the new one via
`Cesium.UrlTemplateImageryProvider`, so only one weather layer is ever shown
at a time. `LayerSelector.tsx` highlights whichever layer is currently active
and animates the transition.

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
- **Weather tiles don't appear** — verify `.env` exists (not just `.env.example`)
  and `VITE_PCS_BACKEND_URL` points to the deployed `pcs-backend` worker. Also
  confirm the worker has `OPENWEATHER_API_KEY` set as a secret
  (`wrangler secret put OPENWEATHER_API_KEY`). New OpenWeather keys can take up
  to a couple of hours to activate.
- **Yellow warning banner in the control panel** — means `VITE_PCS_BACKEND_URL`
  is empty or missing at build time.
