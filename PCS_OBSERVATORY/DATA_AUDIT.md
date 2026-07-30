# PCS Observatory — Data Connection Audit

**Generated:** 2026-07-30
**Deployed URL:** https://uranusastudio-design.github.io/Planetary-common-state/PCS_OBSERVATORY/
**Backend:** `https://pcs-backend.uranusastudio.workers.dev`

Purpose: enumerate every dashboard placeholder (`—`) and map it to its data source + current endpoint health, so Alvin and collaborators can prioritise fixes without blind editing.

---

## 1. Backend Endpoint Health (live probe)

| Endpoint | HTTP | Bytes | Status |
|----------|-----:|------:|--------|
| `/api/astronomy/body/sun` | 200 | 642 | ✅ JPL Horizons OK |
| `/api/astronomy/moon` | 200 | 3,258 | ✅ OK |
| `/api/daily-brief` | 200 | 40,052 | ✅ OK |
| `/api/regional/observation` | 200 | 9,378 | ✅ OK |
| `/api/evidence-ledger` | 200 | 1,946 | ✅ OK |
| `/api/events` | 200 | 45,789 | ✅ OK |
| `/api/domain-readiness` | 200 | ok | ✅ OK |
| `/api/project-updates/latest` | 200 | ok | ✅ OK |
| `/api/history/status` | untested | — | ⚠️ needs probe |
| `/api/history/days` | untested | — | ⚠️ needs probe |
| `/api/visitors/analytics` | untested | — | ⚠️ needs probe |
| `/api/mass-gatherings` | untested | — | ⚠️ needs probe |
| `/api/evidence-explorer` | untested | — | ⚠️ needs probe |
| **`/api/space-weather/summary`** | **503** | 404 | ❌ NOAA SWPC upstream unavailable |
| **`/api/space-weather/alerts`** | **503** | 390 | ❌ NOAA SWPC upstream unavailable |
| **`/api/space-weather/solar-image`** | untested | — | ⚠️ likely same as above |
| **`/api/system-status`** | **timeout** | 0 | ❌ Worker did not respond in 10s |
| **`/api/layers`** | **timeout** | 0 | ❌ Worker did not respond in 10s |
| `/api/layers/nhc-gis` | untested | — | ⚠️ needs probe |

**Legend:** ✅ working · ⚠️ not probed in this pass · ❌ confirmed failure

---

## 2. Frontend Placeholder Groups

Every group below shows `—` in the browser when its endpoint fails. Grouped by data domain.

### 2.1 Moon Data — `/api/astronomy/moon`

Endpoint health: ✅ 200

| Placeholder | Field |
|-------------|-------|
| `data-moon-value="phase_name"` | Current lunar phase name |
| `data-moon-value="moon_age_days"` | Moon age in days |
| `data-moon-value="illumination_percent"` | Illumination % |
| `data-moon-value="earth_distance_km"` | Earth–Moon distance |
| `data-moon-value="next_new_moon"` | Next new moon UTC |
| `data-moon-value="next_full_moon"` | Next full moon UTC |
| `data-moon-value="calculation_time"` | When calculated |
| `data-moon-value="source"` | Data attribution |
| `data-moon-imagery-value="source"` | Imagery provider |
| `data-moon-imagery-value="product"` | Product name (LROC WAC etc.) |
| `data-moon-imagery-value="mosaic_date"` | Mosaic date |
| `data-moon-imagery-value="status"` | Image load status |
| `data-moon-imagery-value="attribution"` | Attribution string |

**Diagnosis:** endpoint healthy → if placeholders show `—`, cause is likely front-end rendering timing / stale cache. **Should just work.**

### 2.2 Planet Data — `/api/astronomy/body/<id>`

Endpoint health: ✅ 200 (probed sun; other bodies likely same)

| Placeholder | Field |
|-------------|-------|
| `data-planet-value="earth_distance_km"` | Distance from Earth |
| `data-planet-value="sun_distance_km"` | Distance from Sun |
| `data-planet-value="light_time_minutes"` | Light travel time |
| `data-planet-value="apparent_magnitude"` | Apparent magnitude |
| `data-planet-value="illumination_percent"` | Illumination |
| `data-planet-value="phase_angle_deg"` | Phase angle |
| `data-planet-value="right_ascension"` | RA |
| `data-planet-value="declination"` | Dec |
| `data-planet-meta="observed_at"` | Observation timestamp |
| `data-planet-meta="source"` | Data source |
| `data-planet-meta="status"` | Data status |
| `data-planet-imagery-value="*"` (9 fields) | Product / mission / instrument / projection etc. |

**Diagnosis:** endpoint healthy. Planet imagery uses static mission-imagery-registry.js — should render.

### 2.3 Sun Ephemeris — `/api/astronomy/body/sun`

Endpoint health: ✅ 200

| Placeholder | Field |
|-------------|-------|
| `data-sun-value="earth_distance_km"` | Earth–Sun distance |
| `data-sun-value="light_time_minutes"` | Light time |
| `data-sun-value="right_ascension"` | RA |
| `data-sun-value="declination"` | Dec |
| `#sun-ephemeris-time` | Ephemeris timestamp |

**Diagnosis:** should work.

### 2.4 Solar Weather — `/api/space-weather/summary` + `/api/space-weather/alerts`

Endpoint health: ❌ **503 — NOAA SWPC upstream unavailable**

| Placeholder | Field | Root cause |
|-------------|-------|------------|
| `data-solar-value="kp_index"` | Kp geomagnetic index | NOAA down |
| `data-solar-value="geomagnetic_status"` | Storm level | NOAA down |
| `data-solar-value="solar_wind_speed_km_s"` | Solar wind speed | NOAA down |
| `data-solar-value="solar_wind_density_p_cm3"` | Wind density | NOAA down |
| `data-solar-value="imf_bz_nt"` | IMF Bz | NOAA down |
| `data-solar-value="xray_flux_w_m2"` | X-ray flux | NOAA down |
| `data-solar-value="xray_class"` | Flare class | NOAA down |
| `data-solar-value="sunspot_number"` | Sunspot number | NOAA down |
| `data-solar-value="active_alert_count"` | Alerts count | NOAA down |
| `data-solar-value="observed_at"` | Timestamp | NOAA down |
| `data-solar-value="source_status"` | Source health | NOAA down |
| `data-solar-image-value="*"` (5 fields) | SDO/SOHO image metadata | Likely same |

**Diagnosis:** waiting on NOAA. Nothing to fix on our side. Frontend could display `NOAA upstream unavailable` instead of `—` to reduce ambiguity.

### 2.5 System Status Panel — `/api/system-status`

Endpoint health: ❌ **timeout (>10s, no response)**

| Placeholder | Purpose |
|-------------|---------|
| `#connected-dataset-count` | Dataset count in header |
| `#connected-dataset-list` | Full list |
| `#build-timestamp` | Last build time |
| `#auto-refresh-countdown` | Next refresh in |

**Diagnosis:** Worker route not responding. **Action:** inspect Worker deployment / logs.

### 2.6 Layers — `/api/layers`

Endpoint health: ❌ **timeout**

Impact: satellite / marker layers may not render. Needs Worker investigation.

### 2.7 History Replay — `/api/history/*`

Endpoint health: ⚠️ not probed

| Placeholder | Field |
|-------------|-------|
| `#history-utc-time` | Playback timestamp |
| History replay controls | Timeline data |

**Action:** probe `/api/history/status` first.

### 2.8 Visitor Analytics — `/api/visitors/*`

Endpoint health: ⚠️ not probed

Live pings to backend for visitor stats.

### 2.9 Location Panel

| Placeholder | Field | Source |
|-------------|-------|--------|
| `#location-latitude` | Client latitude | Browser Geolocation API (user opt-in) |
| `#location-longitude` | Client longitude | Browser Geolocation API |
| `#location-accuracy` | GPS accuracy | Browser Geolocation API |

**Diagnosis:** shows `—` until user grants location permission. **Not a bug.**

---

## 3. Root-Cause Summary

| Cause | Placeholders affected | Fix owner |
|-------|----------------------|-----------|
| NOAA SWPC upstream 503 | ~17 solar/space-weather fields | ⏳ wait for NOAA (no action on our side) |
| Worker endpoint timeout: `/api/system-status`, `/api/layers` | ~5+ header/layer fields | 🔧 **investigate Cloudflare Worker deployment** |
| Untested endpoints (history/visitors/mass-gatherings/evidence-explorer/layers-nhc-gis) | unknown | 🔎 **probe next** |
| Frontend rendering (endpoint OK but shows —) | possibly Moon / Planet / Sun sections | 🔎 open browser devtools console on deployed page |
| Geolocation (user permission) | 3 location fields | ✅ expected behaviour |

---

## 4. Recommended Action Order

1. **Probe untested endpoints** (5 min): history/status, visitors/analytics, mass-gatherings, evidence-explorer, layers/nhc-gis → complete this table
2. **Worker investigation** for `/api/system-status` and `/api/layers` timeouts — check Cloudflare dashboard logs
3. **Optional frontend polish**: replace `—` in space-weather block with explicit `NOAA upstream unavailable` message so users understand it's not a bug
4. **Defer** NOAA-dependent fields until upstream recovers (nothing we can do)

---

## 5. What NOT to Do

- ❌ Don't blindly edit `app.js` — 3,300 lines, production-facing
- ❌ Don't fake data for failed endpoints (breaks scientific integrity)
- ❌ Don't push frontend changes before understanding backend state

---

## Appendix: How this audit was performed

- Probed 12 endpoints via `curl -m 5/10 -o /tmp/r.json -w "%{http_code}"`
- Enumerated frontend placeholders via `grep -oE 'data-[a-z-]+-value="[a-z_]+"|id="[a-z-]+"' index.html`
- Cross-referenced with `app.js` fetch calls (30+ `/api/*` paths detected)
- No frontend, backend, or dataset was modified.
