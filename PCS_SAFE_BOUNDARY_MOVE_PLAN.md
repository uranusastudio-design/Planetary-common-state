# PCS Safe Boundary Move Plan

> Analysis only. Snapshot: `55afb69d132dcdf4700064cb58421bf97549a5f3` on `main`. No file was moved, deleted, committed, pushed, deployed, or branched. Target names below are planning destinations only.

## 1. Complete Folder Inventory

`Should Stay Public?` uses `Yes`, `No`, or `Conditional` (only a reviewed/sanitized subset remains). Target Repository uses only the four authorized names.

| Folder | Purpose | Should Stay Public? | Target Repository | Reason |
| --- | --- | --- | --- | --- |
| `.github` | Repository automation | Conditional | PCS-Backend | Worker deployment automation is backend-sensitive; a future Pages-only workflow may remain public |
| `.github/workflows` | Cloudflare deploy workflow | No | PCS-Backend | Directly deploys `cloudflare/**` using GitHub secrets |
| `Apps` | Public applications | Yes | Planetary-common-state | Public client applications belong in display layer |
| `Apps/PCS-Weather-Earth` | React/Vite/Cesium weather globe | Yes | Planetary-common-state | Browser-only UI consuming public Worker endpoints |
| `Apps/PCS-Weather-Earth/src` | React application source | Yes | Planetary-common-state | Public UI implementation |
| `Apps/PCS-Weather-Earth/src/components` | Earth viewer and controls | Yes | Planetary-common-state | Presentation components |
| `Apps/PCS-Weather-Earth/src/config` | Public endpoint/layer configuration | Conditional | Planetary-common-state | Keep only public URLs and non-sensitive layer metadata |
| `Apps/PCS-Weather-Earth/src/types` | Frontend TypeScript types | Yes | Planetary-common-state | Public API/UI types |
| `assets` | Public asset placeholders | Yes | Planetary-common-state | Public Observatory assets after license review |
| `assets/animations` | Animation asset placeholder | Yes | Planetary-common-state | No private runtime logic |
| `assets/audio` | Audio asset placeholder | Yes | Planetary-common-state | No private runtime logic |
| `assets/imagery` | Imagery asset placeholder | Yes | Planetary-common-state | Public visualization assets only |
| `assets/models` | Model asset placeholder | Conditional | Planetary-common-state | Only visualization models; analytical models must not remain |
| `cloudflare` | Worker backend, D1/KV, deploy configuration | No | PCS-Backend | Server code and operational metadata |
| `cloudflare/.wrangler` | Tracked local Wrangler state | No | PCS-Backend | Generated operational cache; exclude rather than replicate |
| `cloudflare/.wrangler/cache` | Wrangler account cache | No | PCS-Backend | Contains account metadata; do not carry into clean history |
| `cloudflare/.wrangler/tmp` | Generated Worker bundles | No | PCS-Backend | Build output, not source of truth |
| `cloudflare/.wrangler/tmp/bundle-a6Jk26` | Generated middleware bundle | No | PCS-Backend | Rebuild privately; do not copy as source |
| `cloudflare/.wrangler/tmp/dev-Wb0DJb` | Generated dev bundle/source map | No | PCS-Backend | May expose compiled backend; exclude and regenerate |
| `cloudflare/src` | Worker request router and services | No | PCS-Backend | API gateway, ingest, visitors and astronomy backend |
| `cloudflare/src/nasa` | NASA Earthdata gateway | No | PCS-Backend | Server-side token use, cache and response normalization |
| `cloudflare/test` | Worker tests | No | PCS-Backend | Must move with backend source |
| `demo` | Research/demo pipeline and reports | No | PCS-Lab | Prototype calculations and unpublished specifications |
| `demo/data` | Demo datasets | No | PCS-Lab | Experimental/reproducibility data |
| `demo/data/raw` | Raw demo source area | No | PCS-Lab | Research input provenance |
| `demo/scripts` | Demo acquisition scripts | No | PCS-Lab | Experimental data workflow |
| `docs` | Candidate GitHub Pages tree and public docs | Conditional | Planetary-common-state | Pages-critical; sanitize rather than move wholesale |
| `docs/ARCHITECTURE` | Public architecture documentation | Conditional | Planetary-common-state | Retain only public boundary architecture |
| `docs/DEVELOPER_GUIDE` | Public contribution guides | Conditional | Planetary-common-state | Remove private engine/backend implementation instructions |
| `docs/PCS_ENGINE` | Public copy of engine output tree | No | PCS-Core | Core output is duplicated into Pages candidate tree; replace with filtered public API data |
| `docs/PCS_ENGINE/output` | Downloadable PCS JSON/CSV/history | No | PCS-Core | Full state history and intermediate projections must not remain public |
| `docs/PCS_OBSERVATORY` | GitHub Pages Observatory copy | Yes | Planetary-common-state | Required if Pages publishes from `docs/` |
| `docs/PCS_OBSERVATORY/i18n` | Pages translations | Yes | Planetary-common-state | Public UI localization |
| `outputs` | Manuscript, benchmark and audit outputs | No | PCS-Lab | Unpublished research artifacts and working documents |
| `PCS_AI_COPILOT` | AI roles, schemas and planned workflows | No | PCS-Lab | Research/agent planning; no active public runtime |
| `PCS_COMPARISON` | Benchmark comparison protocols | No | PCS-Lab | Unvalidated research plans/results |
| `PCS_CONNECTORS` | Data connector framework and code | No | PCS-Backend | Server-side ingestion, parsing and normalization |
| `PCS_CONNECTORS/argo_ocean` | Argo connector | No | PCS-Backend | Writes standardized engine input |
| `PCS_CONNECTORS/cwa_weather` | CWA connector | No | PCS-Backend | Uses authorization name and writes engine input |
| `PCS_CONNECTORS/DATA_SOURCES` | Source-specific connector documentation | No | PCS-Backend | Operational source mapping |
| `PCS_CONNECTORS/FRAMEWORK` | Connector lifecycle/interface specs | No | PCS-Backend | Backend implementation framework |
| `PCS_CONNECTORS/nasa_firms_wildfire` | FIRMS connector | No | PCS-Backend | Server-side dataset acquisition |
| `PCS_CONNECTORS/nasa_gistemp` | GISTEMP connector and snapshot | No | PCS-Backend | Produces `PCS_ENGINE/input` data |
| `PCS_CONNECTORS/nasa_gpm_imerg` | GPM connector | No | PCS-Backend | Server-side precipitation acquisition |
| `PCS_CONNECTORS/ndvi` | NDVI connector | No | PCS-Backend | Parsing and standardization rules |
| `PCS_CONNECTORS/noaa_mauna_loa_co2` | NOAA CO2 connector and snapshot | No | PCS-Backend | Produces `PCS_ENGINE/input` data |
| `PCS_CONNECTORS/nsidc_sea_ice` | NSIDC connector | No | PCS-Backend | Server-side source adapter |
| `PCS_CONNECTORS/sea_level` | Sea-level connector | No | PCS-Backend | Earthdata acquisition and parsing |
| `PCS_CONNECTORS/validation` | Connector-output validation | No | PCS-Backend | Backend contract validation |
| `PCS_DASHBOARD` | Text dashboard reading Core output | No | PCS-Core | Direct runtime dependency on `PCS_ENGINE/output/latest_state.json` |
| `PCS_DATA` | Benchmark/research datasets and results | No | PCS-Lab | Research data, intermediate projections and figures |
| `PCS_DATA/figures` | Benchmark figures | No | PCS-Lab | Unpublished visual results |
| `PCS_DATA/metadata` | Dataset/run manifests | No | PCS-Lab | Research provenance |
| `PCS_DATA/normalized` | Normalized projections | No | PCS-Lab | Core-derived intermediate data |
| `PCS_DATA/processed` | Processed benchmark data | No | PCS-Lab | Direct input to `PCS_ENGINE/run_engine.py` |
| `PCS_DATA/raw` | Source excerpts/acquisition notes | No | PCS-Lab | Research source material |
| `PCS_DATA/results` | Benchmark analysis | No | PCS-Lab | Unpublished results |
| `PCS_DATA/tables` | Manuscript tables | No | PCS-Lab | Research publication artifacts |
| `PCS_DATA_REGISTRY` | Dataset catalog and future source plans | No | PCS-Lab | Research planning; includes infrastructure source mapping |
| `PCS_ENGINE` | Core state engine | No | PCS-Core | State calculation, configuration, inputs and outputs |
| `PCS_ENGINE/aggregator` | Connector health/state aggregation | No | PCS-Core | Produces Observatory state envelope |
| `PCS_ENGINE/assimilation` | Assimilation/weighting design | No | PCS-Core | Core model architecture |
| `PCS_ENGINE/data_adapters` | Annual source adapters | No | PCS-Core | Core preprocessing dependency |
| `PCS_ENGINE/input` | Standardized connector outputs | No | PCS-Core | Core runtime inputs |
| `PCS_ENGINE/logs` | Aggregation logs | No | PCS-Core | Internal runtime diagnostics |
| `PCS_ENGINE/output` | Latest state and full history | No | PCS-Core | Directly read by canonical Observatory and dashboard |
| `PCS_ENGINE/output_layer` | Output writers | No | PCS-Core | Core serialization layer |
| `PCS_ENGINE/projection_engine` | Normalization/threshold rules | No | PCS-Core | Executable core model parameters |
| `PCS_ENGINE/state_engine` | Common State demo calculation | No | PCS-Core | Executable core state logic |
| `PCS_ENGINE/tests` | Core unit tests | No | PCS-Core | Must move with engine/data fixtures |
| `PCS_LIVE` | Live source download and demo state generation | No | PCS-Core | Contains executable thresholds and state calculation |
| `PCS_LIVE/__pycache__` | Tracked compiled Python cache | No | PCS-Core | Generated artifact; exclude rather than copy |
| `PCS_OBSERVATORY` | Canonical public landing/dashboard | Yes | Planetary-common-state | Core public product surface |
| `PCS_OBSERVATORY/assets` | Observatory logo/media | Yes | Planetary-common-state | Public presentation assets |
| `PCS_OBSERVATORY/i18n` | Observatory translations | Yes | Planetary-common-state | Public localization |
| `PCS_SCIENTIFIC_LIBRARY` | Method/reference research library | No | PCS-Lab | Large planned research corpus, mostly non-runtime |
| `PCS_SCIENTIFIC_LIBRARY/01_MATHEMATICS` | Mathematical methods | No | PCS-Lab | Research reference material |
| `PCS_SCIENTIFIC_LIBRARY/02_PHYSICS` | Physics methods | No | PCS-Lab | Research reference material |
| `PCS_SCIENTIFIC_LIBRARY/03_EARTH_SYSTEM` | Earth-system methods | No | PCS-Lab | Research reference material |
| `PCS_SCIENTIFIC_LIBRARY/04_DATA_ASSIMILATION` | Assimilation references | No | PCS-Lab | Research methods; executable Core remains separate |
| `PCS_SCIENTIFIC_LIBRARY/05_COMPUTATIONAL_SCIENCE` | Computational methods | No | PCS-Lab | Research reference material |
| `PCS_SCIENTIFIC_LIBRARY/06_VALIDATION` | Validation methods | No | PCS-Lab | Research reference material |
| `PCS_SCIENTIFIC_LIBRARY/07_AI` | AI research references | No | PCS-Lab | Private research/AI planning |
| `PCS_SCIENTIFIC_LIBRARY/08_VISUALIZATION` | Visualization methods | Conditional | PCS-Lab | Move library; retain only reviewed public Cesium guidance if needed |
| `PCS_SCIENTIFIC_LIBRARY/09_NETWORK` | Network/dependency/cascade methods | No | PCS-Lab | Quarantine dual-use topics before any later deployment |
| `PCS_SCIENTIFIC_LIBRARY/10_TOPOLOGY` | Topological methods | No | PCS-Lab | Unvalidated research methods |
| `PCS_SCIENTIFIC_LIBRARY/11_EARTH_OBSERVATION` | Provider/method references | No | PCS-Lab | Research source library |
| `PCS_SCIENTIFIC_LIBRARY/12_SYMBOLS` | PCS/math symbol catalogs | No | PCS-Lab | Research/core semantics |
| `PCS_SCIENTIFIC_LIBRARY/13_REFERENCES` | Bibliography/reference policy | No | PCS-Lab | Manuscript support |
| `PCS_SCIENTIFIC_LIBRARY/14_GLOSSARY` | Research glossaries | Conditional | PCS-Lab | Publish only a reviewed public glossary copy |
| `PCS_SCIENTIFIC_LIBRARY/15_HISTORY` | Scientific history notes | No | PCS-Lab | Research reference material |
| `PCS_SCIENTIFIC_LIBRARY/16_METHOD_COMPARISON` | Comparison methods | No | PCS-Lab | Unvalidated research comparisons |
| `PCS_SCIENTIFIC_LIBRARY/17_CHECKLISTS` | Research validation checklists | No | PCS-Lab | Internal research process |
| `PCS_SCIENTIFIC_LIBRARY/18_NOTEBOOKS` | Notebook placeholder | No | PCS-Lab | Future experiments |
| `PCS_SCIENTIFIC_LIBRARY/19_CASE_STUDIES` | Case-study placeholder | No | PCS-Lab | Future research |
| `PCS_SCIENTIFIC_LIBRARY/20_FUTURE_METHODS` | Future methods | No | PCS-Lab | Planned/unverified research |
| `PCS_VALIDATION` | Validation plans, data, plots and tables | No | PCS-Lab | Unpublished validation package; no deployed runtime |
| `PCS_VARIABLE_REGISTRY` | Domains, variables and source vocabulary | No | PCS-Core | Defines Core input/output semantics |
| `PCS_VARIABLE_REGISTRY/Atmosphere` | Atmosphere variable registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/Biosphere` | Biosphere variable registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/CATALOG` | Cross-domain catalog | No | PCS-Core | Core variable definitions; infrastructure subset needs review |
| `PCS_VARIABLE_REGISTRY/Cryosphere` | Cryosphere registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/Energy` | Energy registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/Food_System` | Food-system registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/Geosphere` | Geosphere registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/Human_System` | Human-system registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/Hydrology` | Hydrology registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/Infrastructure` | Infrastructure/exposure registry | No | PCS-Lab | Quarantine for dual-use review rather than activate in Core |
| `PCS_VARIABLE_REGISTRY/Ocean` | Ocean registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/Planetary_Common_State` | PCS state registry | No | PCS-Core | Core model semantics |
| `PCS_VARIABLE_REGISTRY/Space_Environment` | Space-environment registry | No | PCS-Core | Core schema semantics |
| `PCS_VARIABLE_REGISTRY/TEMPLATES` | Registry templates | No | PCS-Core | Core schema authoring templates |
| `tables` | Root manuscript tables | No | PCS-Lab | Research publication artifacts |
| `UCT` | Unified Constraint Theory manuscript package | No | PCS-Lab | Unpublished theory/manuscript |
| `UCT/figures` | Manuscript figures | No | PCS-Lab | Research outputs |
| `UCT/tables` | Manuscript tables | No | PCS-Lab | Research outputs |
| `work` | Manuscript source/conversion workspace | No | PCS-Lab | Private working material |
| `work/uct_citations` | Citation extraction/intermediate files | No | PCS-Lab | Research working data |

## 2. Major File Analysis

Homogeneous data, figures, translations and research notes are covered by their folder row above. The table below lists every major entrypoint, deployment file, public runtime file, schema, executable and root governance/research file.

| File | Current Folder | Move? | Target | Referenced By | Risk | Can Break Deployment? |
| --- | --- | --- | --- | --- | --- | --- |
| `README.md` | root | No | Planetary-common-state | GitHub visitors | LOW | No |
| `SECURITY.md` | root | No | Planetary-common-state | Maintainers/users | MEDIUM | No |
| `CONTRIBUTING.md` | root | Conditional | Planetary-common-state | Contributors; references Engine/Validation/Data | MEDIUM | No; links can break |
| `CHANGELOG.md` | root | No | Planetary-common-state | Project history | LOW | No |
| `ROADMAP.md`, `PCS_PROTOTYPE_FREEZE_v0.1.md` | root | Yes | PCS-Lab | Planning/docs | MEDIUM | No |
| `PCS_SECURITY_CLASSIFICATION_REPORT.md` | root | Yes | PCS-Lab | Safe-boundary planning | HIGH | No |
| `main.tex`, `table_*` | root | Yes | PCS-Lab | UCT manuscript build | HIGH | No website impact |
| `.github/workflows/deploy-cloudflare-worker.yml` | `.github/workflows` | Yes, last | PCS-Backend | GitHub Actions | CRITICAL | Yes: future Worker deploy stops |
| `Apps/PCS-Weather-Earth/package.json` | app root | No | Planetary-common-state | Vite build | MEDIUM | Yes if removed |
| `Apps/PCS-Weather-Earth/vite.config.*` | app root | No | Planetary-common-state | GitHub Pages base path | HIGH | Yes |
| `Apps/PCS-Weather-Earth/src/App.tsx` | frontend | No | Planetary-common-state | React entrypoint | MEDIUM | Yes |
| `EarthViewer.tsx`, `LayerSelector.tsx`, `ControlPanel.tsx` | frontend components | No | Planetary-common-state | `App.tsx` | MEDIUM | Yes |
| `weatherLayers.ts` | frontend config | No | Planetary-common-state | Earth viewer/layers | HIGH | Yes: fixed Worker URL and tiles |
| `observatoryNetwork.ts` | frontend config | No | Planetary-common-state | Visitor UI | HIGH | Visitor panels break |
| `PCS_OBSERVATORY/index.html` | canonical public UI | No | Planetary-common-state | Browser | CRITICAL | Yes |
| `PCS_OBSERVATORY/app.js` | canonical public UI | No, refactor first | Planetary-common-state | HTML/browser | CRITICAL | Yes; reads Engine JSON and Worker APIs |
| `style.css`, `intro-screen.*`, `i18n.js`, `moon-lighting.js` | canonical public UI | No | Planetary-common-state | `index.html` | HIGH | Yes |
| `docs/PCS_OBSERVATORY/index.html` | Pages copy | No | Planetary-common-state | GitHub Pages candidate | CRITICAL | Yes |
| `docs/PCS_OBSERVATORY/app.js` | Pages copy | No, regenerate | Planetary-common-state | Pages HTML/browser | CRITICAL | Yes |
| `docs/PCS_ENGINE/output/latest_state.json` | Pages data | Replace | PCS-Core | docs Observatory | CRITICAL | Yes if removed before API boundary |
| `docs/PCS_ENGINE/output/latest_state.csv` | Pages data | Yes | PCS-Core | Direct download | HIGH | Possible external links |
| `docs/PCS_ENGINE/output/full_state_history.csv` | Pages data | Yes | PCS-Core | Direct download | CRITICAL | Historical views/links may break |
| `PCS_ENGINE/run_engine.py` | Core | Yes | PCS-Core | Tests/manual engine run | CRITICAL | Canonical data generation breaks |
| `projection_engine/projections.py` | Core | Yes | PCS-Core | `run_engine.py`, tests | CRITICAL | State calculation breaks |
| `state_engine/state.py` | Core | Yes | PCS-Core | `run_engine.py`, tests | CRITICAL | State calculation breaks |
| `data_adapters/annual_sources.py` | Core | Yes | PCS-Core | `run_engine.py` | HIGH | Engine input loading breaks |
| `aggregator/aggregate_latest_state.py` | Core | Yes | PCS-Core | Manual aggregation | CRITICAL | Observatory state refresh breaks |
| `output_layer/writers.py` | Core | Yes | PCS-Core | `run_engine.py` | HIGH | Output files stop generating |
| `PCS_ENGINE/input/*.json` | Core input | Yes | PCS-Core | Aggregator/validation | HIGH | Aggregation loses data |
| `PCS_ENGINE/output/*` | Core output | Yes, last | PCS-Core | Observatory and text dashboard | CRITICAL | Yes |
| `PCS_ENGINE/tests/test_engine_core.py` | Core tests | Yes | PCS-Core | Test runner | MEDIUM | No deploy; Core verification lost |
| `PCS_LIVE/live_update.py` | Live Core | Yes | PCS-Core | Manual live update | CRITICAL | Live demo generation breaks |
| `PCS_LIVE/latest_state.*` | Live outputs | Yes | PCS-Core | Reports/manual use | HIGH | No current Pages dependency found |
| `PCS_DASHBOARD/text_dashboard.py` | Core client | Yes | PCS-Core | CLI user | HIGH | CLI breaks without Engine path rewrite |
| `PCS_CONNECTORS/*/connector.py` | Backend | Yes | PCS-Backend | Manual ingestion; writes Engine input | HIGH | No deployed API; ingestion breaks |
| `PCS_CONNECTORS/validation/validate_connector_output.py` | Backend | Yes | PCS-Backend | Connector validation | HIGH | Ingestion validation breaks |
| `cloudflare/src/index.js` | Backend | Yes, late | PCS-Backend | Wrangler, public APIs | CRITICAL | Future deploy/build breaks; live Worker remains until redeploy |
| `cloudflare/src/astronomy.js` | Backend | Yes | PCS-Backend | Worker router, Observatory | CRITICAL | Astronomy/space-weather APIs break on next deploy if missing |
| `cloudflare/src/visitors.js` | Backend | Yes | PCS-Backend | Worker router, visitor UI | CRITICAL | Visitor APIs break on next deploy |
| `cloudflare/src/nasa/routes.ts` | Backend | Yes | PCS-Backend | Worker router | CRITICAL | NASA APIs break on next deploy |
| `cloudflare/src/nasa/client.ts`, `types.ts` | Backend | Yes | PCS-Backend | NASA routes | HIGH | NASA build breaks |
| `cloudflare/wrangler.toml` | Backend config | Yes | PCS-Backend | Wrangler/Actions | CRITICAL | Worker cannot deploy/bind D1/KV |
| `cloudflare/schema.sql` | Database | Yes | PCS-Backend | D1 initialization | HIGH | Fresh database setup breaks |
| `visitor_schema.sql*`, `visitor_compat_migration.sql` | Database | Yes | PCS-Backend | D1 visitor migration | HIGH | Visitor schema maintenance breaks |
| `cloudflare/package*.json` | Backend package | Yes | PCS-Backend | npm/Actions | CRITICAL | Worker install/test/deploy breaks |
| `cloudflare/test/*.test.js` | Backend tests | Yes | PCS-Backend | Node test runner | MEDIUM | No runtime; release confidence drops |
| `cloudflare/.wrangler/cache/wrangler-account.json` | Generated cache | Exclude | PCS-Backend | Wrangler local cache | CRITICAL | No; regenerate, do not copy |
| `cloudflare/.wrangler/tmp/**` | Generated bundle | Exclude | PCS-Backend | Local Wrangler | HIGH | No; regenerate |
| `PCS_DATA/processed/demo_annual_dataset.csv` | Lab data | Yes | PCS-Lab | Engine default and tests, UCT | CRITICAL | Engine/tests break without fixture replacement |
| `PCS_DATA/normalized/demo_projection_dataset.csv` | Lab data | Yes | PCS-Lab | UCT/results | HIGH | Research reproducibility breaks |
| `PCS_VALIDATION/validation_results.csv` and figures | Validation | Yes | PCS-Lab | Validation summary | HIGH | No website runtime |
| `UCT/main.tex`, chapters, `references.bib` | Research | Yes | PCS-Lab | Manuscript build | HIGH | No website runtime |
| `UCT/figures/**`, `UCT/tables/**` | Research | Yes | PCS-Lab | UCT LaTeX | HIGH | Manuscript build breaks |
| `outputs/*.docx`, reports, `UCT.bib` | Research outputs | Yes | PCS-Lab | Manual/research workflow | HIGH | No website runtime |
| `work/build_revised_uct.py` | Research tool | Yes | PCS-Lab | DOCX generation | MEDIUM | Research build breaks |

## 3. MOVE TABLE

This is a plan, not an executed move.

| Source | Planned Destination | Preconditions |
| --- | --- | --- |
| `PCS_ENGINE` | `PCS-Core/engine` | Public Observatory must stop reading relative Engine files first |
| `PCS_LIVE` | `PCS-Core/live` | Remove tracked cache; preserve reproducible input fixtures |
| `PCS_DASHBOARD` | `PCS-Core/dashboard` | Rewrite Engine output path |
| `PCS_VARIABLE_REGISTRY` except infrastructure | `PCS-Core/variable-registry` | Review public schema subset |
| `PCS_CONNECTORS` | `PCS-Backend/connectors` | Replace hard-coded `PCS_ENGINE/input` output contract |
| `cloudflare/src` | `PCS-Backend/worker/src` | Private deployment workflow ready |
| `cloudflare/test` | `PCS-Backend/worker/test` | Preserve package-relative paths |
| `cloudflare/*.sql` | `PCS-Backend/database` and `migrations` | Record migration order |
| `cloudflare/wrangler.toml`, `package*.json` | `PCS-Backend/deployment` / `worker` | Sanitize identifiers; exclude `.wrangler` cache |
| `.github/workflows/deploy-cloudflare-worker.yml` | `PCS-Backend/.github/workflows` | Cutover only after private deploy rehearsal |
| `PCS_DATA` | `PCS-Lab/data` | Give Core a private fixture or package contract |
| `PCS_VALIDATION` | `PCS-Lab/validation` | Preserve links from comparison/research |
| `UCT` | `PCS-Lab/UCT` | Move linked tables/figures together |
| `outputs`, `work`, root `main.tex`, root `tables` | `PCS-Lab/papers` / `work` | Preserve relative bibliography and image paths |
| `demo` | `PCS-Lab/prototypes/demo` | Decide whether demo algorithm belongs in Core later |
| `PCS_AI_COPILOT` | `PCS-Lab/prompts-and-ai` | Keep non-executable and private |
| `PCS_COMPARISON` | `PCS-Lab/comparison` | Move with validation/data references |
| `PCS_SCIENTIFIC_LIBRARY` | `PCS-Lab/scientific-library` | Quarantine network/cascade topics |
| `PCS_DATA_REGISTRY` | `PCS-Lab/data-registry` | Quarantine infrastructure datasets |
| `PCS_VARIABLE_REGISTRY/Infrastructure` | `PCS-Lab/restricted-quarantine` | No deploy/workflow entry |
| `docs/PCS_ENGINE/output` | `PCS-Core/publication-staging` | Replace Pages dependency with filtered public JSON/API first |

## 4. Dependency Tree

The complete graph and edge evidence are in `PCS_DEPENDENCY_TREE.md`.

## 5. Deployment Check

| Planned Removal | Immediate breakage in public repository | API impact | Safe condition before removal |
| --- | --- | --- | --- |
| `PCS_ENGINE` | Canonical `PCS_OBSERVATORY/app.js` cannot load `../PCS_ENGINE/output/latest_state.json`; `PCS_DASHBOARD` fails; connectors lose output target | No Cloudflare route directly imports Engine | Observatory uses versioned public API/snapshot; connectors use cross-repo storage contract |
| `PCS_CONNECTORS` | No current browser bundle or Pages runtime import | No deployed Worker API directly imports connectors; offline ingestion and refresh stop | Backend connector package writes to private Core ingestion interface |
| `PCS_VALIDATION` | No public runtime break; contribution/doc links become stale | None | Move links/docs and preserve validation artifacts in Lab |
| `PCS_DATA` | `PCS_ENGINE/run_engine.py` default benchmark and engine tests fail; UCT references break | None | Core owns test fixture; UCT/Data move together |
| `cloudflare` | Current deployed Worker keeps running, but future GitHub Action deploy/build fails; source recovery is lost | On a later broken redeploy: NASA, astronomy, visitors, OpenWeather, `/latest`, `/variables`, ingest all fail | Private backend repo has verified package/config/workflow and rollback artifact |
| `UCT` | No website/runtime impact | None | Move UCT, figures, tables, bibliography, root/work outputs together |
| `docs/PCS_ENGINE/output` | Pages Observatory may lose state JSON/CSV immediately | None unless replaced with API | Change Pages app to filtered API or generated safe JSON before removal |
| `.github/workflows` | Automatic Worker deploy stops | Live API continues until changed, but no maintained deploy path | Private workflow verified and public workflow disabled only at cutover |

### What is copied into `docs/`

- `docs/PCS_ENGINE/output/{latest_state.json,latest_state.csv,full_state_history.csv}` are byte-identical copies of current `PCS_ENGINE/output` files, but no tracked build/copy workflow explains or refreshes them.
- `docs/PCS_OBSERVATORY/**` is a separate, older copy rather than a deterministic build of `PCS_OBSERVATORY/**`.
- Therefore Pages correctness currently depends on manual synchronization and is a single-point regression risk.

## 6. Public Boundary

The public repository should retain:

- `PCS_OBSERVATORY/**`: landing, ENTER, multilingual UI, public dashboard and planet viewer.
- `Apps/PCS-Weather-Earth/**`: public React/Cesium client, excluding generated `dist` and any secret-bearing environment file.
- Reviewed `assets/**`: only licensed public visualization assets.
- Sanitized `docs/PCS_OBSERVATORY/**`: generated from one canonical source.
- Sanitized public docs: README, contribution/security policy, public architecture and API schema.
- Public Weather Layer client configuration: Worker URL and documented public route contract only.
- A minimal generated public state response containing no weights, thresholds, intermediate history or private provenance.

Reason: these files demonstrate PCS, support education and visualization, and can operate through a narrow read-only API without revealing Core or Backend implementation.

## 7. Private Boundary

### PCS-Core

- `PCS_ENGINE/**`
- `PCS_LIVE/**` excluding generated cache
- `PCS_DASHBOARD/**`
- `PCS_VARIABLE_REGISTRY/**` except infrastructure quarantine
- Core-facing output schema and private public-response generator

### PCS-Backend

- `PCS_CONNECTORS/**`
- `cloudflare/src/**`, tests, packages and deployment config
- D1 schemas/migrations
- `.github/workflows/deploy-cloudflare-worker.yml`
- Exclude `cloudflare/.wrangler/**`; regenerate locally

### PCS-Lab

- `PCS_DATA/**`, `PCS_VALIDATION/**`, `UCT/**`
- `outputs/**`, `work/**`, `tables/**`, root manuscript files
- `demo/**`, `PCS_COMPARISON/**`, `PCS_AI_COPILOT/**`
- `PCS_SCIENTIFIC_LIBRARY/**`, `PCS_DATA_REGISTRY/**`
- `PCS_VARIABLE_REGISTRY/Infrastructure/**` in restricted quarantine

## 8. Safest Move Order

No step should remove source content until a private copy, manifest and rollback point are verified.

1. `PCS_AI_COPILOT` → PCS-Lab; no runtime references.
2. `PCS_COMPARISON` → PCS-Lab; research-only.
3. `PCS_SCIENTIFIC_LIBRARY` → PCS-Lab; quarantine network/cascade topics.
4. `PCS_VALIDATION` → PCS-Lab; preserve reports and links.
5. `work` and `outputs` → PCS-Lab; keep UCT-relative structure manifest.
6. `UCT`, root manuscript files and `tables` → PCS-Lab as one atomic research group.
7. `PCS_DATA_REGISTRY`, infrastructure registry/quarantine → PCS-Lab.
8. `PCS_DATA` → PCS-Lab only after Core receives a private benchmark/test fixture contract.
9. `demo` → PCS-Lab; review executable normalization overlap with Core.
10. `PCS_VARIABLE_REGISTRY` → PCS-Core; keep only a sanitized public schema copy.
11. `PCS_LIVE` and `PCS_DASHBOARD` → PCS-Core after path rewrites.
12. `PCS_CONNECTORS` → PCS-Backend after replacing direct `PCS_ENGINE/input` paths.
13. Cloudflare schemas/tests/source → PCS-Backend; keep public Worker deployment untouched.
14. Establish and rehearse private Worker workflow/config/rollback.
15. Change Observatory to a versioned filtered public API or generated safe JSON.
16. Move `docs/PCS_ENGINE/output` and `PCS_ENGINE/output`; verify Pages anonymously.
17. Move remaining `PCS_ENGINE` implementation to PCS-Core.
18. Move Cloudflare deployment workflow last; verify live API and rollback.
19. Regenerate `docs/PCS_OBSERVATORY` from canonical public source and remove stale duplication only in a later approved phase.

## 9. Required Answers

### Five folders that can move first

1. `PCS_AI_COPILOT`
2. `PCS_COMPARISON`
3. `PCS_SCIENTIFIC_LIBRARY`
4. `PCS_VALIDATION`
5. `work`

These have no current browser or Worker runtime dependency. Their documentation links must still be updated in the eventual removal phase.

### Five folders that must move last

1. `.github/workflows`
2. `cloudflare`
3. `PCS_ENGINE`
4. `PCS_ENGINE/output`
5. `docs/PCS_ENGINE/output`

They are the deploy path or current data boundary. Removing them before private deployment/API cutover causes operational loss or Pages breakage.

### Folders that will definitely break the website if removed now

- `docs/PCS_OBSERVATORY` if GitHub Pages is configured from `/docs`.
- `docs/PCS_ENGINE/output` because the Pages copy reads its state JSON.
- `PCS_OBSERVATORY` for the canonical/non-Pages static entrypoint.
- `PCS_ENGINE/output` because canonical `PCS_OBSERVATORY/app.js` reads it by relative path.
- `Apps/PCS-Weather-Earth` if that app path is an active Pages entry.
- `cloudflare` does not immediately stop the already-deployed Worker, but it guarantees future deploy/maintenance failure and can break every network-backed panel on the next deployment.

### Estimated number of phases

**Six phases**:

1. Analysis, manifests and dependency freeze.
2. Private repository replication and secret-clean verification.
3. Core/Backend package path repair and private validation.
4. Public API/data boundary plus deterministic `docs/` build.
5. Staged public removal, Pages/Worker cutover and rollback verification.
6. Git-history/license remediation and final anonymous exposure audit.
