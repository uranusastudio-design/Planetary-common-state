# PCS Security Classification and Project Progress Audit

> Audit snapshot: 2026-07-15 05:41 UTC  
> Repository: `uranusastudio-design/Planetary-common-state`  
> HEAD: `55afb69d132dcdf4700064cb58421bf97549a5f3` (`main`)  
> Scope: 685 tracked files, all 179 commits reachable from local refs, current working tree, deployment configuration, executable routes, tests, browser-visible assets, documents, data and generated outputs.  
> Method: read-only static review, Git object/history inspection, redacted secret-pattern scan, JS syntax checks, Node test runner without process isolation, direct Python assertions, and a local browser smoke test. No production endpoint or deployment was changed.  
> Snapshot note: during evidence collection, responsive changes to `PCS_OBSERVATORY/index.html`, `PCS_OBSERVATORY/intro-screen.js`, and `PCS_OBSERVATORY/style.css` first appeared outside the audit and were subsequently committed as `55afb69` (`fix: make PCS dashboard responsive at 100 percent zoom`). The browser smoke test used that same content. Final Git status contains only this untracked report.

## 1. Executive Summary

**Overall security risk: CRITICAL.** The repository mixes the public Observatory, deployable backend, database/KV identifiers and schemas, executable normalization thresholds, PCS state calculations, connector cleaning rules, complete state-history outputs, unpublished manuscript/research material, AI planning, and infrastructure dataset planning in one public history.

Content that should not be public already exists in the current tree. The clearest examples are `PCS_ENGINE/**`, `PCS_LIVE/**`, `demo/demo_pipeline.py`, `cloudflare/**`, `docs/PCS_ENGINE/output/full_state_history.csv`, the UCT manuscript/work products, and infrastructure/network planning. In addition, a 32-character non-placeholder `VITE_OPENWEATHER_API_KEY` was committed in `Apps/PCS-Weather-Earth/.env`; the file is deleted now, but the blob remains reachable in Git history. `SECURITY.md` independently acknowledges that history exposure.

The three most urgent issues are:

1. Treat the historical OpenWeather key as exposed until independently confirmed revoked and the public history is purged.
2. Stop publishing core/backend/research artifacts, especially full PCS state history, thresholds, Worker source/configuration and D1/KV metadata.
3. Resolve the deployment-source split: `docs/PCS_OBSERVATORY/**` is materially older than `PCS_OBSERVATORY/**` (15 differing paths; 2,188-line `app.js` divergence), while no Pages workflow exists. A feature may work locally yet not be the code served by GitHub Pages.

Recommendation: **pause net-new features** except safety, inventory, backup and deployment-verification work. Do not delete or rewrite yet; first make a verifiable backup and private copies. The public landing page and non-sensitive visualization shell can remain public during a staged split.

## 2. File Classification Table

The table covers every tracked file through homogeneous path groups; security-relevant exceptions are listed individually and override their parent row. “Git history” means the path or equivalent content is reachable from current refs, not that it was necessarily deployed.

| Path | Classification | Risk | Browser Exposed | Git History | Recommended Action | Deployment Impact |
| --- | --- | --- | --- | --- | --- | --- |
| `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md` | PUBLIC-SAFE | MEDIUM | Yes, GitHub | Yes | Keep public after removing operational identifiers and contradictory setup text; retain security disclosure without key material | Low |
| `.gitignore`, `.gitattributes` | PUBLIC-SAFE | LOW | GitHub | Yes | Keep | None |
| `.github/workflows/deploy-cloudflare-worker.yml` | PRIVATE-BACKEND | HIGH | GitHub | Yes | Move to backend repo; public repo should call a narrowly scoped release interface if needed | Worker auto-deploy changes |
| `cloudflare/src/index.js` | PRIVATE-BACKEND | HIGH | GitHub, not browser bundle | Yes | Move; expose only documented public API contract | Worker must deploy from private repo |
| `cloudflare/src/nasa/**`, `cloudflare/src/astronomy.js` | PRIVATE-BACKEND | HIGH | API responses; source on GitHub | Yes | Move; keep response filtering and public schema docs only | NASA/NOAA/JPL routes depend on it |
| `cloudflare/src/visitors.js` | PRIVATE-BACKEND | HIGH | Public unauthenticated API responses | Yes | Move; add privacy review, retention, abuse controls and response coarsening | Visitor network/regions depend on it |
| `cloudflare/schema.sql`, `visitor_schema.sql*`, `visitor_compat_migration.sql` | PRIVATE-BACKEND | HIGH | GitHub | Yes | Move; keep only non-sensitive conceptual schema publicly | D1 initialization/migration changes |
| `cloudflare/wrangler.toml` | PRIVATE-BACKEND | HIGH | GitHub | Yes | Move; it exposes live D1 database ID and KV namespace ID; keep template with placeholders publicly | Binding/deploy source changes |
| `cloudflare/package*.json`, `cloudflare/test/**`, `cloudflare/README.md` | PRIVATE-BACKEND | MEDIUM | GitHub | Yes | Move with Worker; publish sanitized API docs/test summary if desired | Worker CI/testing changes |
| `Apps/PCS-Weather-Earth/src/**`, static config and package files | PUBLIC-SAFE | MEDIUM | Yes, compiled bundle | Yes | Keep only as a public visualization client; remove unused future PCS module registry if it reveals roadmap | Weather globe can remain public |
| `Apps/PCS-Weather-Earth/.env.example` | PUBLIC-SAFE | LOW | GitHub | Yes | Keep placeholder only; reconcile README contradiction (frontend no env required vs required `VITE_PCS_BACKEND_URL`) | Low |
| `Apps/PCS-Weather-Earth/.env` (historical, deleted) | SECRET-CRITICAL | CRITICAL | Was in public Git history / former frontend build path | Yes, many reachable commits | Confirm revocation; inventory forks/caches; purge only after coordinated backup and approval | History rewrite affects all clones |
| `PCS_OBSERVATORY/index.html`, `style.css`, `intro-screen.*`, `i18n*`, logo | PUBLIC-SAFE | LOW | Directly | Yes | Keep as canonical public shell after responsive and deployment verification | Required for Observatory |
| `PCS_OBSERVATORY/app.js` except noted lines | PUBLIC-SAFE | MEDIUM | Direct JS source | Yes | Keep visualization/event code; consume only filtered public responses | Required for current Observatory |
| `PCS_OBSERVATORY/app.js:43` `SPACE_WEATHER_UI_THRESHOLDS` | PRIVATE-CORE | HIGH | Direct JS source | Yes | Remove from browser; compute category server-side or publish explicitly reviewed educational bands | Space-weather badges need API change |
| `PCS_OBSERVATORY/app.js` visitor session/local preference storage | PUBLIC-SAFE | MEDIUM | localStorage/session behavior | Yes | Keep only non-sensitive preferences; document retention. No IndexedDB use found | Low |
| `docs/PCS_OBSERVATORY/**` | PUBLIC-SAFE | HIGH | Likely Pages publication source | Yes | Choose one canonical build; regenerate from reviewed public shell. Current copy is stale and omits landing/solar-system work | High risk of deployed/local mismatch |
| `docs/PCS_ENGINE/output/latest_state.json`, `latest_state.csv` | PUBLIC-SAFE | MEDIUM | Yes if `docs/` is Pages source | Yes | Replace with a deliberately minimized public response/snapshot and provenance | Observatory data loading changes |
| `docs/PCS_ENGINE/output/full_state_history.csv` | PRIVATE-CORE | HIGH | Yes if Pages source; downloadable | Yes | Remove from public artifact after private copy; provide aggregated/non-reversible public series if approved | Historical charts may need API |
| `PCS_ENGINE/state_engine/**`, `projection_engine/**`, `data_adapters/**`, `run_engine.py` | PRIVATE-CORE | HIGH | GitHub; outputs can reach browser | Yes | Move to `PCS-Core` | Public UI must use filtered API/snapshot |
| `PCS_ENGINE/projection_engine/projections.py` (`TEMP_REF`, `TEMP_CRIT`, `CO2_REF`, `CO2_CRIT`) | PRIVATE-CORE | HIGH | GitHub | Yes | Move immediately after backup; thresholds are executable | Rebuild outputs privately |
| `PCS_ENGINE/assimilation/**`, architecture/config/quality documents | PRIVATE-CORE | HIGH | GitHub | Yes | Move; they describe weighting, mapping and future fusion boundaries | None until activated, then core dependency |
| `PCS_ENGINE/input/**`, `output/**`, `logs/**`, `aggregator/**` | PRIVATE-CORE | HIGH | Some duplicated into `docs/` | Yes | Move; expose only filtered results | Observatory must use public contract |
| `PCS_ENGINE/tests/**` | PRIVATE-CORE | MEDIUM | GitHub | Yes | Move with engine; publish only black-box conformance tests if useful | Private CI needed |
| `PCS_LIVE/**` | PRIVATE-CORE | HIGH | GitHub | Yes | Move; contains identical thresholds and live download/normalization path | Live state generation changes |
| `demo/demo_pipeline.py`, mathematical/projection specification, processed demo results | PRIVATE-CORE | HIGH | GitHub | Yes | Move to Core; publish a simplified non-equivalent educational demo if desired | Public reproducibility demo changes |
| `demo/data/**`, `PCS_DATA/**` | PRIVATE-LAB | HIGH | GitHub; some outputs could be served | Yes | Move to Lab/Core according to provenance; do not expose intermediate state trajectories | Demo figures/data links may change |
| `PCS_CONNECTORS/**` executable connectors, schemas, validation | PRIVATE-CORE | HIGH | GitHub | Yes | Move; these encode parsing, cleaning, standardization, null and fallback rules | Private ingestion required |
| `PCS_DATA_REGISTRY/**` except infrastructure row | PRIVATE-LAB | MEDIUM | GitHub | Yes | Move until dataset selection/coverage is publication-ready; publish curated source catalog later | Low |
| `PCS_DATA_REGISTRY/INFRASTRUCTURE_DATASETS.md`, `PCS_VARIABLE_REGISTRY/Infrastructure/**`, `CATALOG/INFRASTRUCTURE.md` | RESTRICTED-DUAL-USE | HIGH | GitHub | Yes | Isolate for review: explicitly enumerates roads, rail, ports, airports, communications, power/water and exposure | No current deployed feature |
| `PCS_VARIABLE_REGISTRY/**` other domains | PRIVATE-CORE | MEDIUM | GitHub | Yes | Move; publish only reviewed vocabulary/schema | Low now; future core dependency |
| `PCS_VALIDATION/**`, `PCS_COMPARISON/**` | PRIVATE-LAB | HIGH | GitHub | Yes | Move; contains validation results, comparison plans and research figures | No current UI dependency |
| `PCS_AI_COPILOT/**`, `docs/PCS_CROSS_PLATFORM_AI_ROADMAP.md` | PRIVATE-LAB | HIGH | GitHub | Yes | Move; current files are plans/boundaries, not an active AI pipeline | No active runtime impact |
| `PCS_SCIENTIFIC_LIBRARY/**` general method/reference files | PRIVATE-LAB | MEDIUM | GitHub | Yes | Move pending publication and quality review; many are template-only | No runtime impact |
| `PCS_SCIENTIFIC_LIBRARY/09_NETWORK/{CASCADE_RISK,COUPLED_NETWORK_FAILURE,DEPENDENCY_MAPPING}.md` | RESTRICTED-DUAL-USE | MEDIUM | GitHub | Yes | Isolate for dual-use review even though currently template-only | None |
| `PCS_SCIENTIFIC_LIBRARY/20_FUTURE_METHODS/**`, `18_NOTEBOOKS/**`, case studies | PRIVATE-LAB | MEDIUM | GitHub | Yes | Move | None |
| `UCT/**`, root `main.tex`, `outputs/**`, `work/**`, tables/reports | PRIVATE-LAB | HIGH | GitHub | Yes | Move as unpublished manuscript/research working set; publish only accepted materials | None for Observatory |
| `PCS_DASHBOARD/**`, `PCS_TOOLS/**`, `PCS_LIVE/**` generated/support tools | PRIVATE-CORE | HIGH | GitHub | Yes | Move with Core/Lab after per-file review | CLI/dashboard changes |
| `assets/**` generic placeholders/readmes | PUBLIC-SAFE | LOW | Potentially | Yes | Keep only assets actually used by the public shell with verified licenses | Low |
| Root roadmap/freeze/audit documents | PRIVATE-LAB | MEDIUM | GitHub | Yes | Move private; publish a sanitized public roadmap | None |
| Historical `LICENSE` (deleted from current tree) | PUBLIC-SAFE | HIGH legal impact | Git history | Yes | Legal review before relicensing/removal; deletion does not undo prior MIT grants | Contributor/distribution expectations |

### Browser exposure findings

- Direct browser-readable: all `PCS_OBSERVATORY/*.js`, HTML/CSS, i18n JSON, the fixed Worker hostname, public API responses, and `docs/PCS_ENGINE/output/*` if Pages publishes `docs/`.
- `localStorage` stores language/region/weather and visualization preferences; a visitor session ID is stored in browser storage. No IndexedDB implementation was found.
- Source maps were not tracked, but the React app's local `dist/` exists outside Git tracking. Any Pages/build process must explicitly exclude maps and secrets.
- Public endpoints include `/latest`, `/variables`, visitor analytics/locations, NASA gateway, astronomy, and OpenWeather tile proxy. `/variables` exposes residual-group semantics; visitor location responses expose coordinates derived from Cloudflare metadata without authentication.

## 3. Top 10 Immediate Risks

1. **Historical live API key (CRITICAL):** a 32-character non-placeholder OpenWeather key remains in reachable `.env` history.
2. **Core and public layers are co-located (HIGH):** executable PCS thresholds, normalization and state aggregation are public.
3. **Full state history is a Pages candidate (HIGH):** `docs/PCS_ENGINE/output/full_state_history.csv` is directly downloadable if `docs/` is published.
4. **Backend internals are public (HIGH):** Worker routes, ingest logic, schemas, D1 ID and KV ID are exposed.
5. **Deployment source drift (HIGH):** canonical and `docs/` Observatory copies differ materially; repository has no Pages deployment workflow or verification.
6. **Visitor privacy/abuse boundary (HIGH):** unauthenticated location and analytics routes expose aggregated/approximate geolocation; no retention, rate limiting or audit control is implemented.
7. **No general rate limiting/auth/admin boundary (HIGH):** only `/ingest/v1` uses a bearer secret; other routes rely on open access and permissive CORS.
8. **Unpublished research is public (HIGH):** UCT manuscripts, working DOCX, validation figures, comparison results and research plans are in history.
9. **Dual-use infrastructure catalog (HIGH):** public planning names ports, airports, communications, power/water and infrastructure exposure data sources.
10. **License uncertainty (HIGH):** MIT was granted in history and later deleted. Removal does not retroactively cancel permissions already granted to recipients.

## 4. Public Repository Minimum Set

After migration and boundary changes, the public repository should contain only:

```text
README.md                       sanitized public purpose/status
SECURITY.md                     reporting process; no operational identifiers
CODE_OF_CONDUCT.md
CONTRIBUTING.md                 public UI contributions only
public-observatory/
  index.html
  style.css
  intro-screen.css
  intro-screen.js
  i18n.js
  i18n/*.json
  app.public.js                 no thresholds, inference, admin or private routes
  moon-lighting.public.js       visualization-only reviewed logic
  assets/*                      used, licensed public assets only
public-api/
  openapi.json                  filtered read-only response contracts
  examples/latest.public.json   synthetic or deliberately minimized snapshot
.github/workflows/pages.yml     deterministic build, secret scan, artifact manifest
LICENSE-or-NOTICE               only after legal decision
```

Do not retain `PCS_ENGINE`, `PCS_LIVE`, `PCS_CONNECTORS`, Worker source, D1/KV configuration, full history data, UCT/work/outputs, AI plans or infrastructure registries in the public repository.

## 5. Proposed Repository Structure

```text
Planetary-common-state/        Public
  public-observatory/
  public-api/
  public-docs/

PCS-Core/                      Private
  engine/
  projections/
  normalization/
  assimilation/
  connectors/
  validation-core/
  tests/

PCS-Backend/                   Private
  cloudflare-worker/
  migrations/
  deployment/
  rate-limit-auth-audit/
  integration-tests/

PCS-Lab/                       Private
  UCT/
  manuscripts/
  notebooks/
  experiments/
  comparisons/
  validation-results/
  prompts-and-agent-workflows/

PCS-Restricted/                Private / isolated
  infrastructure-mapping/
  cascade-and-dependency-analysis/
  high-resolution-tracking/
  dual-use-review-register/
```

## 6. Migration Plan

1. **Backup:** create immutable local and remote backups of refs, tags, issues, releases, Pages artifact, Worker config and D1/KV export; record hashes.
2. **Create private repositories:** apply least privilege, branch protection, secret scanning and audit logging before content is copied.
3. **Copy private content:** copy by classification; preserve provenance and commit mapping; do not delete public content yet.
4. **Validate private versions:** run Core tests, connector fixtures, Worker tests, D1 migrations and reproducibility checks privately.
5. **Define public/API boundary:** create a versioned, read-only filtered schema. Server computes categories; browser receives no weights, thresholds or intermediate values.
6. **Verify Pages:** select one canonical build source, add deterministic Pages workflow, artifact manifest, broken-link check, smoke test and rollback artifact.
7. **Remove public core:** only after steps 1–6 pass, remove Core/Backend/Lab/Restricted paths from the public tip and verify the Observatory.
8. **Resolve license:** obtain legal/contributor decision; add explicit current notice. Do not assume deleting `LICENSE` removes past MIT rights.
9. **Handle Git history:** inventory forks/releases/caches, rotate any still-valid secrets, coordinate maintenance window, rewrite all refs if approved, force-push, invalidate old clones and verify object absence.
10. **Final verification:** clone anonymously, build from scratch, scan Git objects and Pages artifact, enumerate network calls, verify Cloudflare responses, and approve a signed exposure manifest.

## 7. Rollback Plan

| Step | Success gate | Rollback |
| --- | --- | --- |
| Backup | Hashes and restore drill pass | Stop; do not create/delete/move anything until backup is restorable |
| Private repos | Access tests and branch protection pass | Delete only empty/unshared setup repos if approved; public remains unchanged |
| Copy | File/hash manifest matches | Re-copy from immutable backup; no public rollback needed |
| Private validation | Core/Worker/migration tests pass | Restore private branch/tag to pre-migration snapshot |
| API boundary | Contract and Observatory compatibility tests pass | Point staging client back to existing endpoint/snapshot |
| Pages switch | Anonymous smoke test and asset checks pass | Redeploy previously signed Pages artifact / restore previous Pages source setting |
| Public removal | Public build and API tests pass | Revert removal commit from backup branch; do not restore secrets |
| License | Written legal decision exists | Restore prior notice while review continues; avoid new release claims |
| History rewrite | Mirror, refs and collaborator plan verified | Keep pre-rewrite mirror offline; if rewrite fails, restore refs from mirror during maintenance window |
| Final cutover | Anonymous clone scan is clean | Roll back Pages/Worker independently to last known-good signed artifacts |

## 8. Git History Exposure

### Confirmed historical exposures

| Date / commit | Exposure | Current reachability / impact |
| --- | --- | --- |
| 2026-07-08 `ef02d60`, `8a86fe2` and surrounding commits | OpenWeather key introduced/updated in frontend `.env` | `.env` exists in many reachable commits through 2026-07-10 merges. One inspected version is a non-placeholder 32-character value. Treat as compromised. |
| 2026-07-09 `5ce21c0` | Commit message says “purge .env history” | It removed the tip file but did not erase earlier commits from all reachable refs; history still contains the blob. |
| 2026-07-08 onward | PCS Engine, projection thresholds, state outputs, connector rules | Still present in current tree and all subsequent history. |
| 2026-07-08 onward | Cloudflare Worker, D1/KV IDs, schemas and ingest design | Current and historical exposure. |
| 2026-07-05 onward | UCT/manuscript, research outputs and work products | Current and historical exposure. |
| 2026-07-10 `70528df` | MIT License added | License text remains obtainable from history. |
| 2026-07-14 `cb1dc04` | `LICENSE` deleted | Deletion does not revoke grants made while MIT was distributed. |

Seven historical paths are absent from the current tip: `.env`, `env`, `ev`, `cloudflare/src/db.js`, `cloudflare/src/eo_adapters`, `LICENSE`, and `wrangler.jsonc`. Absence from the tip is not remediation. No current tracked file matched common AWS/GitHub/OpenAI/Google/private-key token shapes, but pattern scans cannot prove the absence of all proprietary formats.

## 9. License Findings

- No current `LICENSE`, `LICENSE.md`, or `COPYING` exists.
- No current `package.json` has a `license` field.
- Commit `70528df` added the standard MIT License, including permission to use, modify, publish, distribute, sublicense and sell copies.
- Commit `cb1dc04` deleted `LICENSE`; merge `6d849ef` preserves that deletion on current `main`.
- Practical impact: recipients who obtained MIT-licensed versions may retain those rights. A later private split can protect new/private work, but cannot assume retroactive withdrawal of already granted rights. Obtain legal advice before publishing a new license or making exclusivity claims.

## 10. Final Recommendation

- **Can continue public:** landing page, multilingual UI, general Cesium/planet visualization, public attribution, non-sensitive API schema, deliberately minimized public snapshots and published research summaries.
- **Stop public immediately after safe private copy:** Core engine/projections/thresholds, connector parsing/cleaning rules, full state history, Worker source/config IDs, D1/KV schemas, unpublished UCT/research, validation results and AI workflow plans.
- **Move first to private:** `PCS_ENGINE`, `PCS_LIVE`, `PCS_CONNECTORS`, `cloudflare`, `PCS_DATA`, `PCS_VALIDATION`, `PCS_COMPARISON`, `UCT`, `outputs`, `work`, `PCS_AI_COPILOT`.
- **Completely isolate:** infrastructure/port/airport/communication/power/water exposure planning and cascade/dependency analysis; any future high-resolution tracking or actionable geospatial inference.
- **Before split is complete:** do not add data sources or analytical features. Limit work to backup, access control, tests, deterministic public build, response filtering, privacy/rate-limit controls and migration rehearsal.

## 11. Project Progress Audit

Status vocabulary: `COMPLETED`, `PARTIALLY-COMPLETED`, `PROTOTYPE-ONLY`, `PLANNED-NOT-IMPLEMENTED`, `BROKEN-OR-UNVERIFIED`, `UNKNOWN`.

### 11.1 Overall Project Progress

| Area | Completion % | Status | Evidence | Missing Work | Risk |
| --- | ---: | --- | --- | --- | --- |
| PCS research concept and public positioning | 70% | PARTIALLY-COMPLETED | Manuscript, architecture, public prototype labels and pipeline docs exist | Peer-reviewed/public boundary, stable terminology, license | HIGH |
| Public Observatory / landing / ENTER | 78% | PARTIALLY-COMPLETED | Local browser: landing renders; ENTER enters and focuses `#page-title`; JSON loads | Deployment parity, accessibility/mobile regression suite | MEDIUM |
| Desktop UI | 72% | PARTIALLY-COMPLETED | Full dashboard, Cesium, controls and data panels render locally without console errors | Production/network E2E and stale-copy cleanup | MEDIUM |
| Mobile UI | 60% | BROKEN-OR-UNVERIFIED | Commit `55afb69` adds width constraints, responsive grids and horizontal scrolling for solar/scale controls | True 390px device/E2E test; browser harness could not go below 900 CSS px | HIGH |
| GitHub Pages deployment | 45% | BROKEN-OR-UNVERIFIED | `docs/` artifact exists; commits claim restoration | No Pages workflow/settings proof; `docs/PCS_OBSERVATORY` is stale vs canonical | HIGH |
| Cesium Earth and celestial visualization | 72% | PARTIALLY-COMPLETED | Earth, Moon, Sun, planets implemented; astronomy tests pass | Production imagery E2E, visual accuracy and zoom QA | MEDIUM |
| Weather/live environmental layers | 42% | PROTOTYPE-ONLY | Four OpenWeather proxy tiles; two annual PCS sources; UI controls | Most layer APIs/data absent; production health not verified | HIGH |
| Visitor Observatory Network | 60% | PARTIALLY-COMPLETED | Register/ping/stats/location/analytics routes and D1 schema; UI implemented | Deployment verification, privacy retention, rate limiting, schema migration proof | HIGH |
| Cloudflare backend | 58% | PARTIALLY-COMPLETED | Worker routes, D1/KV bindings, caching, sanitized NASA responses, 28/31 tests pass | Three SMAP regressions, auth/rate/audit/admin/staging/rollback | HIGH |
| PCS Core | 30% | PROTOTYPE-ONLY | Executable `L_T`/`L_C` normalization and mean `S_demo`; direct assertions pass | Five residuals, weights, fusion, CV, state estimation, reproducibility | CRITICAL |
| AI collaboration | 12% | PLANNED-NOT-IMPLEMENTED | Role/boundary documents only; UI says inactive | No executable model/tool workflow | MEDIUM |
| Security and license split | 8% | BROKEN-OR-UNVERIFIED | `.gitignore`, server-side secrets, ingest auth, security doc | No repository split/history purge/current license/rate limit/audit | CRITICAL |
| Tests and operations | 38% | PARTIALLY-COMPLETED | 31 Worker tests, engine unit file, JS syntax checks | CI, frontend E2E, deployment checks, backup/restore/staging | HIGH |
| **Overall project** | **45%** | **PROTOTYPE-ONLY** | Strong public UI and several real routes | Security boundary, stable live data, deployment proof and complete Core | **HIGH** |

### 11.2 Evidence-Based Feature Inventory

| Feature | Status | Relevant Files | Actual Behavior / Evidence | Missing Parts | Recommended Next Step |
| --- | --- | --- | --- | --- | --- |
| Homepage, logo, ENTER | PARTIALLY-COMPLETED | `index.html`, `intro-screen.*`, logo | Browser smoke test passed ENTER/focus | Production and mobile E2E | Add deterministic public build test |
| Navigation, language, region | PARTIALLY-COMPLETED | `i18n.js`, `i18n/*.json`, `app.js` | Selectors and translation DOM exist | Data source/AI selectors are placeholders; regional outputs absent | Separate functional and placeholder controls |
| Desktop dashboard | PARTIALLY-COMPLETED | Observatory HTML/CSS/JS | Local DOM rendered all panels; no console errors | Network/production E2E | Add screenshot/interaction regression tests |
| Mobile controls / horizontal scroll | BROKEN-OR-UNVERIFIED | `style.css`, commit `55afb69` | CSS adds horizontal scroll for solar/scale at ≤820px and the responsive fix is committed | Real 390px verification | Test on real mobile viewport before release |
| Cesium Earth / geolocation / HD base | PARTIALLY-COMPLETED | `app.js` | Cesium initialized; ArcGIS high-resolution imagery; geolocation is opt-in | Production tile and permission tests | Add provider fallback and attribution tests |
| Sun | PARTIALLY-COMPLETED | `app.js`, `astronomy.js` | NOAA/JPL numerical path, SDO/SOHO imagery, procedural visualization; tests pass | Visual/production validation | Keep display logic public, route private |
| Mercury, Venus, Mars | PARTIALLY-COMPLETED | same | JPL body route + NASA/USGS imagery; route/image tests pass | Visual scale/seam/zoom QA | Add golden-image tests |
| Jupiter, Saturn, Uranus, Neptune | PARTIALLY-COMPLETED | same | JPL ephemeris + archival NASA imagery; Saturn rings rendered | Storm/detail accuracy and zoom QA | Scientific visual review |
| Earth and Moon | PARTIALLY-COMPLETED | `app.js`, `moon-lighting.js`, tests | Earth viewer; Moon phase/lighting/image/landing markers; tests pass | Production data/imagery E2E | Verify deployed Worker and attribution |
| Major satellites | PLANNED-NOT-IMPLEMENTED | UI/docs only | No major-satellite models/routes | Entire implementation | Keep out of public claims |
| Deep Space / solar system / galaxy / observable universe | PROTOTYPE-ONLY | Deep Space button, docs | Deep Space is explicitly “Preview”; no galaxy/universe model | Models, navigation, data | Define educational-only milestone |
| Planet/comet orbits | PLANNED-NOT-IMPLEMENTED | none executable found | JPL point ephemeris is not orbit rendering | Orbit propagation/visualization | Do not claim implemented |
| Future-time simulation / timeline | PLANNED-NOT-IMPLEMENTED | timeline UI | UI explicitly says placeholder | Time-series engine and controls | Remove/disable until data exists |
| Monitoring Scale | PROTOTYPE-ONLY | `app.js`, controls | Planet active; other scales show pending | Regional/local data and behavior | Implement one validated scale end-to-end |
| Weather: cloud/rain/temperature/wind | PARTIALLY-COMPLETED | OpenWeather tile proxy + controls | Real tile proxy route; local test showed proxy unavailable because production access was not verified | Production health, retries, quotas | Private backend E2E |
| High-res base map | PARTIALLY-COMPLETED | `EARTH_IMAGERY_CONFIG` | ArcGIS imagery provider active locally | Provider SLA/fallback | Add fallback and attribution |
| Sea level / sea temperature / tides | PROTOTYPE-ONLY | connector plans/empty outputs/UI | Sea-level connector output empty; SST/tides not wired | Live API and frontend layer | Complete one source with fixtures |
| Precipitation | PROTOTYPE-ONLY | GPM connector/UI | Connector output empty; UI planned | Auth/data ingest/display | Validate GPM ingest |
| Air pollution | PLANNED-NOT-IMPLEMENTED | no executable route | No live source or layer | Entire feature | Keep disabled |
| Earthquake | PLANNED-NOT-IMPLEMENTED | USGS documents only | No Worker/frontend route | Live USGS connector/layer | Implement after split |
| Wildfire | PROTOTYPE-ONLY | FIRMS connector/NASA route/UI | Route exists; connector output empty; UI planned | Credential/live display | Validate FIRMS end-to-end |
| Tropical cyclone | PLANNED-NOT-IMPLEMENTED | UI placeholder | No NOAA route/layer | Entire feature | Keep disabled |
| Moon phase / sunrise-sunset | PARTIALLY-COMPLETED | astronomy routes/tests | Moon phase implemented; sunrise/sunset not found | Sunrise/sunset route/UI | Split statuses in UI |
| Solar activity / UV / thermal monitoring | PARTIALLY-COMPLETED | NOAA space weather routes | Kp, solar wind, X-ray, alerts implemented; UV/thermal Earth monitoring absent | Remaining datasets and deploy proof | Publish only supported sources |
| Satellite active/decommissioned stats | PLANNED-NOT-IMPLEMENTED | no executable source | No catalog/API/display | Entire feature | Do not claim |
| Visitor register / ping / stats | PARTIALLY-COMPLETED | `visitors.js`, schemas | Routes and UI calls exist | Production/migration/privacy/rate tests | Private backend hardening |
| Active now / last 24h / last two weeks | PARTIALLY-COMPLETED | visitor stats/analytics | Active/today/24h/7d/30d implemented; “two weeks” exact range absent | 14d contract and verification | Add explicit range if required |
| Recent Observation Regions | PARTIALLY-COMPLETED | visitor locations + UI | Approximate markers/list implemented; unavailable locally | Production response/privacy validation | Coarsen and rate-limit |
| Country/region switching | PROTOTYPE-ONLY | region config/select | Camera/context changes; regional state falls back global | Valid regional outputs | Implement one country end-to-end |
| Taiwan/Japan panels | PLANNED-NOT-IMPLEMENTED | region options only | No validated panel datasets | APIs, outputs, UI panels | Do not equate option with feature |
| NASA Earthdata gateway | PARTIALLY-COMPLETED | `nasa/routes.ts` | GIBS/MODIS/VIIRS/FIRMS/SMAP metadata routes | Deployment and 3 SMAP fallback regressions | Fix tests privately |
| NASA GIBS | PARTIALLY-COMPLETED | NASA route/config | Gateway exists; canonical Observatory mainly uses other imagery | Verified frontend layer | Add explicit display E2E |
| NASA FIRMS | PROTOTYPE-ONLY | route/connector | API route exists; local connector empty | Live data/display | Complete pipeline |
| NASA SMAP | BROKEN-OR-UNVERIFIED | NASA route/tests | Main path works; 3 fallback/no-results tests fail | Correct fallback state | Fix regression before claim |
| NOAA | PARTIALLY-COMPLETED | CO2 connector, astronomy | Annual CO2 and space weather paths exist | General NOAA weather/ocean coverage | Define bounded source list |
| USGS | PROTOTYPE-ONLY | lunar/planet imagery | Imagery only; no earthquake live route | Seismic pipeline | Rename scope accurately |
| OpenWeather | PARTIALLY-COMPLETED | Worker tile proxy | Server-side key path and four layers | Production health/quota verification | Add deploy smoke test |
| KV / cache | PARTIALLY-COMPLETED | bindings, astronomy/NASA cache | Cache API/KV fallbacks used | Metrics, invalidation, isolation tests | Private observability |
| D1 | PARTIALLY-COMPLETED | schemas, Worker queries | PCS observations and visitor tables/routes exist | Migration/version/backup verification | Add private migrations |
| API Gateway / CORS / errors / timeout / fallback | PARTIALLY-COMPLETED | Worker | Dispatch, permissive CORS, sanitized NASA errors, bounded astronomy timeout/stale fallback | Policy gateway, origin restriction, uniform timeout | Centralize middleware |
| Route version / `no_results` | BROKEN-OR-UNVERIFIED | SMAP latest route/tests | Version field exists; `no_results` test fails | Regression fix | Block release on tests |
| Rate limiting | PLANNED-NOT-IMPLEMENTED | none found | No limiter | Durable/KV limiter and tests | Implement before exposure growth |
| Identity/authentication | PROTOTYPE-ONLY | `/ingest/v1` | One bearer secret with constant-time compare | User/admin identity and authorization | Separate public/admin APIs |
| Audit logging | PLANNED-NOT-IMPLEMENTED | console request logs only | No durable audit trail | Schema, retention, access controls | Implement privately |
| Admin backend | PLANNED-NOT-IMPLEMENTED | none | No admin UI/route | Entire feature | Keep private by design |
| News / message board | PLANNED-NOT-IMPLEMENTED | none | No code/schema/routes | Entire feature | Defer |
| `L(t)` / Common State | PROTOTYPE-ONLY | engine/live/demo | `S_demo` mean of available projections; not complete `L(t)` | Formal executable model | Move and specify privately |
| Five residuals | PROTOTYPE-ONLY | state/projection code | Four columns declared; only `L_T`,`L_C` calculated; `L_S`,`L_I` forced null; no fifth complete residual | Full validated residuals | Do not call Core complete |
| Weights / thresholds / normalization | PROTOTYPE-ONLY | projections/live | Hard-coded thresholds; unweighted mean | Calibration, uncertainty, review | Private parameter registry |
| Data fusion / state estimation | PLANNED-NOT-IMPLEMENTED | assimilation docs | Documentation only | Executable tested pipeline | Private implementation |
| Cross-validation / critical slowing / Lorenz APE | PLANNED-NOT-IMPLEMENTED | library/docs | No executable implementation found | Code, datasets, tests | Research milestone |
| Reproducible experiment / validation plots | PROTOTYPE-ONLY | demo, validation outputs | Demo artifacts exist | End-to-end reproducibility and independent validation | Move to Lab, rebuild cleanly |
| PCS Core API | PROTOTYPE-ONLY | `/latest`,`/variables` | D1 latest variables, not full Core service | Versioned filtered Core service | Define public contract |
| AI multi-model / Codex / OpenClaw / Claude / Gemini | PLANNED-NOT-IMPLEMENTED | roadmap/docs | No executable orchestration | Tools, prompts, evaluation, audit | Private Lab only |
| Automated research summary / paper integration | PROTOTYPE-ONLY | docs/manuscript | Manual documents; no automated grounded pipeline | Executable workflow/evaluation | Defer until outputs stable |
| Public research website | PARTIALLY-COMPLETED | Observatory/docs | Public-facing shell exists | Deployment parity, accepted-public content boundary | Complete safe split |
| Multilingual | PARTIALLY-COMPLETED | i18n JSON/landing | EN/zh-TW/ja/ko controls exist | Full coverage/translation tests | Add locale coverage test |
| Tests | PARTIALLY-COMPLETED | Worker + engine tests | 28/31 Node tests pass; 3 SMAP fail; direct Engine assertions pass; `pytest` unavailable | CI/frontend/E2E/deploy tests | Establish private CI gates |
| Documentation | PARTIALLY-COMPLETED | extensive docs | Broad but often aspirational/template-only and sometimes contradictory | Generated truth/status registry | Label planned vs executable |
| Backup/restore | PLANNED-NOT-IMPLEMENTED | no scripts/workflows found | No evidence of tested backup/rollback | D1/KV/config/Pages restore drills | Make next milestone |

### 11.3 Frontend Progress

- Homepage, logo and ENTER are implemented in the observed working tree; ENTER passed local interaction testing.
- Cesium Earth, body switching and astronomy fetch logic are real, not just buttons. Node tests cover all configured JPL body IDs and imagery validation.
- Mercury/Venus/planet texture quality has been repeatedly changed in history; automated scientific visual comparison is absent, so zoom/distortion/storm accuracy remains unverified.
- Monitoring Scale changes status/context, but only Planet is functional; Continent/Country/City/Satellite are placeholders.
- Most Earth-system checkboxes only report planned/waiting state. Only OpenWeather weather tiles actually add Cesium imagery layers.
- Local run produced no console errors after ENTER. It did show weather and visitor services unavailable because the deployed Worker was not validated from the local harness.
- Canonical and `docs/` frontend copies are seriously divergent, creating a likely deployed regression risk.
- Mobile CSS has targeted fixes, including horizontal scroll at ≤820px, but a true phone-width runtime test was not possible in the in-app harness and remains unverified.

### 11.4 Backend Progress

- Implemented dispatch: astronomy/space-weather, NASA gateway, visitor routes, OpenWeather health/tiles, authenticated ingest, latest and variables.
- D1 and KV bindings are configured; schemas exist, but visitor schema required a compatibility migration, and repository evidence does not prove production migration state.
- CORS is permissive; errors are partly sanitized. Astronomy has timeouts/stale cache; OpenWeather and some ingest fetches lack a uniform timeout strategy.
- `/ingest/v1` is authenticated; no general identity, admin authorization, rate limiting or durable audit log exists.
- Test result: 28/31 pass. The failing SMAP cases incorrectly retain `48_hours` and `ok` when fallback/no-results behavior is expected.

### 11.5 Data Source Progress

| Data Source | Connected | Live Data | Frontend Displayed | Cached | Error Handling | Status |
| --- | --- | --- | --- | --- | --- | --- |
| NASA Earthdata | Yes, gateway | Metadata/live upstream when deployed | Partial | Cache API | Sanitized | PARTIALLY-COMPLETED |
| NASA GIBS | Route exists | Unverified in production | Not clearly active in canonical UI | 1h config | Yes | BROKEN-OR-UNVERIFIED |
| NASA FIRMS | Route + connector | Connector output 0 | Planned only | 30m config | Yes | PROTOTYPE-ONLY |
| NASA SMAP | Yes | Main test path | No confirmed layer | 12h config | Fallback regression | BROKEN-OR-UNVERIFIED |
| NASA GISTEMP | Yes | Snapshot/input through 2026; engine latest uses 2024 | PCS values/source list | Local files/D1 | Parser errors | PARTIALLY-COMPLETED |
| NOAA CO2 | Yes | Snapshot through 2025 | PCS value/source list | Local files/D1 | Parser errors | PARTIALLY-COMPLETED |
| NOAA space weather | Yes | Upstream NOAA routes | Sun/space panel | Cache/stale | Timeout/stale | PARTIALLY-COMPLETED |
| USGS | Imagery only | Archival/current imagery | Moon/planet imagery | Browser/Worker cache | Validation | PROTOTYPE-ONLY |
| OpenWeather | Yes, proxy | Expected live tiles | Four layers | Provider/browser | Health and tile errors | PARTIALLY-COMPLETED |
| Air pollution | No | No | No | No | No | PLANNED-NOT-IMPLEMENTED |
| Sea temperature | No | No | No | No | No | PLANNED-NOT-IMPLEMENTED |
| Tropical cyclone | No | No | Placeholder | No | No | PLANNED-NOT-IMPLEMENTED |
| Earthquake | No | No | No | No | No | PLANNED-NOT-IMPLEMENTED |
| Wildfire | Partial | Input 0 records | Placeholder | Route cache | Partial | PROTOTYPE-ONLY |
| Moon phase | Yes | JPL/current calculation | Yes | Cache | Tested unavailable path | PARTIALLY-COMPLETED |
| Tides | No | No | No | No | No | PLANNED-NOT-IMPLEMENTED |
| Solar activity | Yes | NOAA/SDO/SOHO | Yes | Cache/stale | Tested | PARTIALLY-COMPLETED |
| Satellite data/stats | No | No | Placeholder only | No | No | PLANNED-NOT-IMPLEMENTED |
| Visitor data | Routes/schema | Production unverified | UI exists; local unavailable | D1 | Partial | BROKEN-OR-UNVERIFIED |

Current connector artifacts confirm only NASA GISTEMP (27 records) and NOAA CO2 (67 records). CWA, NSIDC sea ice, GPM, FIRMS, Argo, sea level and NDVI files contain zero records; ERA5 and GRACE expected files are absent.

### 11.6 Research and PCS Core Progress

The repository contains an executable demo, not a complete PCS Core. `compute_projections()` calculates two normalized projections with hard-coded reference/critical values; `compute_state_history()` takes their unweighted mean. Structural and informational terms are forced missing, coverage is two, and metadata explicitly says no prediction/interpolation. There is no executable five-residual model, calibrated weights, cross-validation, critical-slowing analysis, Lorenz APE integration, scenario engine or AI inference workflow. Classification: **PROTOTYPE-ONLY, 30%**.

### 11.7 Deployment Status

```text
GitHub repository (exists; public remote)
  → Pages build (not defined in workflows; settings/manual behavior unknown)
  → docs/PCS_OBSERVATORY (exists but stale vs canonical)
  → PCS Observatory (local canonical smoke test passes)
  → pcs-backend Cloudflare Worker (deploy workflow exists)
  → D1 PCS_DB / KV PCS_CACHE (bindings and IDs exist; live state not proven)
  → NASA/NOAA/JPL/OpenWeather APIs (routes exist; production availability not audited)
```

| Layer | Exists/configured | Repository proof | Single point / private info | Rollback / staging / verification |
| --- | --- | --- | --- | --- |
| GitHub | Yes | Remote/main/179 commits | Public history is exposure source | No documented tested rollback |
| Build | Partial | Vite scripts; no root/Pages workflow | Manual/source ambiguity | No artifact signing |
| GitHub Pages | Unverified | `docs/` copy only | Stale copy is single-point risk | No workflow rollback/staging |
| Observatory | Yes locally | Browser smoke test | Fixed Worker hostname | No production E2E |
| Worker | Configured | Auto-deploy on main `cloudflare/**` | Workflow/secrets and one production service | No staging/rollback job |
| D1/KV | Configured | IDs/schema/queries | IDs exposed; production migration unknown | No export/restore drill |
| External APIs | Partial | Route code/tests | Provider outage/quota | Some stale fallback, not uniform |

### 11.8 Git History Progress Timeline

| Date / Commit | Feature or Change | Current Status | Still Used | Regressed | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-07-05 `f683bcc` | Initial prototype | PROTOTYPE-ONLY | Yes | No | Foundation |
| 2026-07-06 `fe15424` | Observatory milestone claimed complete | PARTIALLY-COMPLETED | Yes | Deployment copy drift | Claim exceeded current evidence |
| 2026-07-06 `1aa3a85` | PCS Engine “Core v1.0” | PROTOTYPE-ONLY | Yes | No | Only two projections executable |
| 2026-07-06 `20b6859` | Assimilation framework | PLANNED-NOT-IMPLEMENTED | Docs only | No | No executable assimilation |
| 2026-07-06 `9255c99` | AI Copilot framework | PLANNED-NOT-IMPLEMENTED | Docs/UI only | No | No AI runtime |
| 2026-07-07 `77707f8` | Cloudflare Worker prototype | PARTIALLY-COMPLETED | Yes | No | Became backend base |
| 2026-07-08 `64c20df` | Ingest pipeline | PARTIALLY-COMPLETED | Yes | Unknown production | Auth added later |
| 2026-07-08 `ef02d60` / `8a86fe2` | Frontend API key | SECRET-CRITICAL | Deleted from tip | Security regression | Key remains in history |
| 2026-07-09 `5ce21c0` | Security hardening/history “purge” | PARTIALLY-COMPLETED | Yes | Purge incomplete | Tip safe, history not clean |
| 2026-07-09–10 repeated Pages/weather fixes | Base paths, weather lifecycle | PARTIALLY-COMPLETED | Yes | Repeated regressions | Many fix branches/commits |
| 2026-07-12 `5e4752a` | Restore Pages | BROKEN-OR-UNVERIFIED | `docs/` exists | Canonical/docs diverged later | No Pages workflow proof |
| 2026-07-12 `2fb2131` | NASA/SMAP routes | PARTIALLY-COMPLETED | Yes | 3 tests failing | Fallback regression |
| 2026-07-13 `a5e544e`–`9412483` | Solar system and rendering | PARTIALLY-COMPLETED | Yes | Visual QA unknown | Route tests strong |
| 2026-07-14 `e0b7ec3`–`0e2b25d` | Visitor network | PARTIALLY-COMPLETED | Yes | Schema compatibility issue addressed | Production unverified |
| 2026-07-14 `cb1dc04` | Delete MIT License | BROKEN-OR-UNVERIFIED | Current tip no license | Legal ambiguity | Historical grant remains |
| 2026-07-15 `30252c2`, `82e48a7` | Landing and i18n | PARTIALLY-COMPLETED | Yes canonical | Not synced to `docs/` | ENTER local test passes |
| 2026-07-15 `55afb69` | Responsive dashboard at 100% zoom | PARTIALLY-COMPLETED | Yes canonical | Phone-width runtime remains unverified; not synced to `docs/` | Commits the CSS/ENTER resize changes observed during audit |

Recent development focus is presentation quality, celestial visualization, visitor analytics and responsive landing/UI work—not completion of the scientific Core.

### 11.9 Progress Summary

1. Public-display prototype: **68%**.
2. Real-data observation platform: **38%**.
3. Sustainably operated system: **32%**.
4. PCS Core: **30%**.
5. Security split: **8%**.
6. Five closest to completion: landing/ENTER, desktop Observatory shell, Cesium Earth, astronomy body API/tests, GISTEMP+CO2 demo pipeline.
7. Five least complete: complete PCS Core/five residuals, AI multi-model workflow, admin/auth/audit/rate-limit plane, broad live environmental layers, backup/staging/rollback.
8. Five main blockers: public/private mixing; historical secret; Pages/canonical drift; incomplete live data/Core; absent operational controls/tests.
9. Looks complete but is prototype: monitoring scales, most Earth layers, timeline, alert levels, AI summary, domain panels, Evidence Explorer, animation/sound framework.
10. Possible regressions: SMAP fallback/no-results; Pages copy lag; repeated weather/Pages fixes; committed mobile layout fix still lacks phone-width verification; visitor schema compatibility.
11. It is **not appropriate to continue broad feature addition** before the safety/deployment boundary milestone.
12. Next milestone: **PCS Safe Boundary v0.1**—verified backups, private Core/Backend/Lab copies, one canonical public build, versioned filtered API, clean anonymous-clone scan, passing SMAP tests and a tested rollback.

### 11.10 Completion Percentage Rules Applied

Percentages were deliberately conservative: documents/buttons alone score 10–25%; executable but partial demos score 25–50%; functional routes/UI without production, security or test proof score 50–75%; no area received 90% because no complete chain is proven deployed, live, tested, documented, secured and recoverable.

## Audit Limitations

- No production GitHub Pages settings, Cloudflare dashboard, live D1/KV contents, secret store, forks, release assets or external caches were accessed.
- The browser smoke test used a local static server and the Observatory content later committed as `55afb69`, as described in the audit header. It did not validate the production Worker; network-dependent weather/visitor functions therefore remain unverified.
- The in-app browser enforced a minimum effective CSS viewport, so phone-width behavior was assessed from CSS/current changes rather than a definitive 390px runtime.
- `pytest` was unavailable. Equivalent direct Engine assertions passed without writing files. Node tests ran with test isolation disabled because the sandbox blocks child-process spawning.
- Secret pattern scanning is evidence, not proof of absence. Proprietary or encoded formats may evade pattern matching.
