# PCS Safe Boundary Phase 2 — File Manifest

> Snapshot: `25e7b6e0db348dcde8dcb90d70f3fe200a240de0`. Planning manifest only; no listed action was executed. Glob rows cover homogeneous files, while high-risk and dependency-critical files are listed separately and override their parent row.

## Action Vocabulary

- `COPY-THEN-REMOVE-LATER`
- `COPY-AND-RETAIN-PUBLIC-SUBSET`
- `RETAIN-PUBLIC`
- `QUARANTINE`
- `DO-NOT-MOVE-YET`

## Manifest

| Batch | Source Path | Target Repository | Target Path | Action | Runtime Dependency | Refactor First | Secret Risk | Dual-Use Risk | Verification |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `.git/` | Planetary-common-state | repository metadata only | DO-NOT-MOVE-YET | Git operations | No | High if copied | Low | Confirm it is the only `.git`; never select it in Explorer |
| 0 | `.gitignore` | Planetary-common-state | `.gitignore` | RETAIN-PUBLIC | Build hygiene | No | Low | Low | Confirm `.env`, `.wrangler`, `node_modules`, bytecode remain ignored |
| 0 | `.gitattributes` | Planetary-common-state | `.gitattributes` | RETAIN-PUBLIC | Git text handling | No | Low | Low | Review attributes before cross-repository copy |
| 0 | `Apps/PCS-Weather-Earth/.env.example` | Planetary-common-state | same | RETAIN-PUBLIC | Frontend setup docs | No | Medium; placeholder only | Low | Confirm values remain placeholders |
| 0 | Ignored `**/.env`, `.env.local`, `.env.production` | Planetary-common-state | EXCLUDE | DO-NOT-MOVE-YET | Secrets/config | No | Critical | Low | Ensure none is selected or visible in target Changes |
| 0 | Ignored `**/node_modules/**`, `Apps/PCS-Weather-Earth/dist/**` | Planetary-common-state | EXCLUDE | DO-NOT-MOVE-YET | Generated build/install | No | Medium | Low | Exclude; regenerate from lockfiles |
| 0 | Ignored `cloudflare/.wrangler/state/**`, new `.wrangler/tmp/**` | PCS-Backend | EXCLUDE | DO-NOT-MOVE-YET | Local Worker emulation | No | Critical local state | Medium | Exclude every ignored state/cache/database file |
| 1 | `PCS_AI_COPILOT/**` (10 files) | PCS-Lab | `research/PCS_AI_COPILOT/**` | COPY-THEN-REMOVE-LATER | None found | No | Low | Medium | Phase 3A exact 10-file comparison; no workflow/deploy entry |
| 1 | `PCS_COMPARISON/**` (5 files) | PCS-Lab | `research/PCS_COMPARISON/**` | COPY-THEN-REMOVE-LATER | No runtime; descriptive `CONTRIBUTING.md` reference | No | Low | Medium | Phase 3A exact 5-file comparison; preserve later doc link |
| 1 | `PCS_SCIENTIFIC_LIBRARY/09_NETWORK/**` (8 files) | PCS-Lab | `restricted-quarantine/PCS_SCIENTIFIC_LIBRARY/09_NETWORK/**` | QUARANTINE | None found | No | Low | High | Phase 3A exact 8-file comparison; no index/workflow/deploy |
| 1 | `PCS_DATA_REGISTRY/INFRASTRUCTURE_DATASETS.md` | PCS-Lab | `restricted-quarantine/PCS_DATA_REGISTRY/INFRASTRUCTURE_DATASETS.md` | QUARANTINE | None found | No | Low | High | Phase 3A compare file; quarantine not published |
| 1 | `PCS_VARIABLE_REGISTRY/CATALOG/INFRASTRUCTURE.md` | PCS-Lab | `restricted-quarantine/PCS_VARIABLE_REGISTRY/CATALOG/INFRASTRUCTURE.md` | QUARANTINE | None found | No | Low | High | Phase 3A compare file; quarantine not published |
| 1 | `PCS_VARIABLE_REGISTRY/Infrastructure/**` (1 file) | PCS-Lab | `restricted-quarantine/PCS_VARIABLE_REGISTRY/Infrastructure/**` | QUARANTINE | None found | No | Low | High | Phase 3A compare file; quarantine not published |
| 1 | Remaining `PCS_SCIENTIFIC_LIBRARY/**` | PCS-Lab | `research/PCS_SCIENTIFIC_LIBRARY/**` | COPY-THEN-REMOVE-LATER | None found | No | Low | Medium | Exclude/quarantine network set; inventory 195 remaining files |
| 1 | Remaining `PCS_DATA_REGISTRY/**` | PCS-Lab | `research/PCS_DATA_REGISTRY/**` | COPY-AND-RETAIN-PUBLIC-SUBSET | No current runtime | Public source catalog split | Low | Medium | Curate a public provider catalog; quarantine infrastructure planning |
| 1 | `UCT/**` (45 files) | PCS-Lab | `research/UCT/**` | COPY-THEN-REMOVE-LATER | Manuscript build only | Preserve relative figures/tables/data refs | Low | Medium | Copy with root manuscript set; compile/reproducibility check |
| 1 | `outputs/**` (26 files) | PCS-Lab | `research/outputs/**` | COPY-THEN-REMOVE-LATER | Research outputs only | Preserve UCT links | Low | Medium | File count, document open check, bibliography links |
| 1 | `work/**` (20 files) | PCS-Lab | `research/work/**` | COPY-THEN-REMOVE-LATER | Manuscript generation | Preserve relative input paths | Low | Medium | File count and DOCX/source readability |
| 1 | Root `main.tex` | PCS-Lab | `research/main.tex` | COPY-THEN-REMOVE-LATER | LaTeX build | Yes, UCT-relative inputs | Low | Low | Compile with UCT/tables set |
| 1 | Root `tables/**` | PCS-Lab | `research/tables/**` | COPY-THEN-REMOVE-LATER | Manuscript build | Preserve relative inputs | Low | Low | Table inclusion/compile check |
| 1 | Root `table_audit_report.md`, `table_insertion_report.md`, `table_placement_freeze_v1.0.md` | PCS-Lab | `research/reports/` | COPY-THEN-REMOVE-LATER | None | No | Low | Low | Compare three files and links |
| 1 | `PCS_PROTOTYPE_FREEZE_v0.1.md` | PCS-Lab | `governance/PCS_PROTOTYPE_FREEZE_v0.1.md` | COPY-AND-RETAIN-PUBLIC-SUBSET | Governance only | Review public disclosure | Low | Medium | Owner approval for public-safe summary |
| 1 | `PCS_SECURITY_CLASSIFICATION_REPORT.md`, `PCS_SAFE_BOUNDARY_MOVE_PLAN.md`, `PCS_DEPENDENCY_TREE.md`, Phase 2 reports | PCS-Lab | `governance/safe-boundary/` | DO-NOT-MOVE-YET | Active migration control | No | Medium topology disclosure | Medium | Review before any commit or later governance copy |
| 2 | `PCS_DATA/raw/**` | PCS-Lab | `data/raw/**` | COPY-AND-RETAIN-PUBLIC-SUBSET | Research/source provenance | Public license/provenance split | Low | Low | Hashes, provider terms, approved excerpts only |
| 2 | `PCS_DATA/processed/**` | PCS-Lab | `data/processed/**` | COPY-AND-RETAIN-PUBLIC-SUBSET | Engine default/tests | Yes: Core fixture | Low | Medium | Engine test replacement and data hashes |
| 2 | `PCS_DATA/processed/demo_annual_dataset.csv` | PCS-Lab | `data/processed/demo_annual_dataset.csv` | DO-NOT-MOVE-YET | Direct Engine default/test and UCT input | Yes | Low | Medium | Do not remove until minimal Core fixture exists |
| 2 | `PCS_DATA/normalized/**` | PCS-Lab | `data/normalized/**` | COPY-THEN-REMOVE-LATER | UCT/results | Yes: research links | Low | Medium | Reproducibility and reference checks |
| 2 | `PCS_DATA/results/**`, `figures/**`, `tables/**`, `metadata/**` | PCS-Lab | `data/{results,figures,tables,metadata}/**` | COPY-AND-RETAIN-PUBLIC-SUBSET | Research publication | Curate summaries | Low | Medium | Hashes, link check, approved public summary only |
| 2 | `PCS_VALIDATION/**` (10 files) | PCS-Lab | `validation/**` | COPY-AND-RETAIN-PUBLIC-SUBSET | No current browser/Worker import | Public methodology split | Low | Medium | Results/figures/tables intact; publish only approved summary |
| 2 | `PCS_VALIDATION/validation_results.csv` | PCS-Lab | `validation/validation_results.csv` | COPY-THEN-REMOVE-LATER | Validation evidence | No | Low | Medium | Hash and reproducibility check |
| 2 | `demo/data/**`, `demo/data_sources.md`, acquisition reports | PCS-Lab | `prototypes/demo/data/**` | COPY-AND-RETAIN-PUBLIC-SUBSET | Demo/research only | Public demo split | Low | Low | Provider licenses and minimized public fixture |
| 2 | Connector source snapshots (`PCS_CONNECTORS/*/source_snapshot*`) | PCS-Backend | `connectors/fixtures/**` | DO-NOT-MOVE-YET | Connector tests/manual runs | Ownership decision with Lab | Low | Medium | Decide Backend fixture vs Lab archive; verify provenance |
| 3 | `PCS_CONNECTORS/**` (108 files) | PCS-Backend | `connectors/**` | COPY-THEN-REMOVE-LATER | Offline ingestion; writes Engine input | Yes: Backend/Core contract | Medium secret names | Medium | Full file count, connector validation, path-config review |
| 3 | `PCS_CONNECTORS/cwa_weather/connector.py` | PCS-Backend | `connectors/cwa_weather/connector.py` | COPY-THEN-REMOVE-LATER | CWA ingestion | Yes: output path/config | Medium `CWA_API_KEY` name | Low | No literal value; dry validation with placeholder/private secret later |
| 3 | `PCS_CONNECTORS/*/connector.py` | PCS-Backend | `connectors/<source>/connector.py` | COPY-THEN-REMOVE-LATER | Writes `PCS_ENGINE/input` | Yes | Medium provider auth | Medium | Replace hard-coded workspace path; connector tests |
| 3 | `PCS_CONNECTORS/validation/**` | PCS-Backend | `connectors/validation/**` | COPY-THEN-REMOVE-LATER | Ingestion validation | Yes: input paths | Low | Low | Run against copied fixtures later |
| 3 | `cloudflare/src/index.js` | PCS-Backend | `worker/src/index.js` | DO-NOT-MOVE-YET | Main Worker/API router | Preserve imports and bindings | High secret-binding names | Medium | Route inventory, tests, private deploy rehearsal |
| 3 | `cloudflare/src/nasa/**` | PCS-Backend | `worker/src/nasa/**` | DO-NOT-MOVE-YET | NASA Gateway | Package imports | High `EARTHDATA_TOKEN` name | Medium | NASA tests/status/fallback; no token copied |
| 3 | `cloudflare/src/astronomy.js` | PCS-Backend | `worker/src/astronomy.js` | DO-NOT-MOVE-YET | Astronomy/space-weather APIs | Package imports | Low | Low | Observatory route contract and tests |
| 3 | `cloudflare/src/visitors.js` | PCS-Backend | `worker/src/visitors.js` | DO-NOT-MOVE-YET | Visitor APIs | D1 schema/binding | Medium privacy/operational | Medium | Privacy review and visitor tests |
| 3 | `cloudflare/src/pcs/intelligence.js` | PCS-Backend | `worker/src/pcs/intelligence.js` | DO-NOT-MOVE-YET | Daily brief/AI proposal | D1/AI bindings | Medium binding/model names | High | Ensure proposal-only constraints and response filtering |
| 3 | `cloudflare/src/pcs/jobs.js` | PCS-Backend | `worker/src/pcs/jobs.js` | DO-NOT-MOVE-YET | Scheduled D1 jobs | D1/provider imports | Medium | High | Scheduled-run tests; no restricted source activation |
| 3 | `cloudflare/src/pcs/routes.js` | PCS-Backend | `worker/src/pcs/routes.js` | DO-NOT-MOVE-YET | Public/admin evidence/events routes | D1/KV/auth contracts | High admin/ingest names | High | Auth, privacy, allowlist and route tests |
| 3 | `cloudflare/src/providers/layers.js` | PCS-Backend | `worker/src/providers/layers.js` | DO-NOT-MOVE-YET | Layer provider API/jobs | Provider adapters | High `FIRMS_MAP_KEY` name | High shipping/aviation/infrastructure | Provider review; no secret literal; public response minimization |
| 3 | `cloudflare/src/providers/registry.js` | PCS-Backend | `worker/src/providers/registry.js` | DO-NOT-MOVE-YET | Domain readiness | D1/KV/OpenWeather | High secret-binding names | High infrastructure endpoints | Response allowlist and readiness tests |
| 3 | `cloudflare/schema.sql` | PCS-Backend | `worker/database/schema.sql` | DO-NOT-MOVE-YET | D1 base schema | Migration ownership | Medium operational schema | Medium | Fresh private D1 rehearsal; no data copied |
| 3 | `cloudflare/visitor_schema.sql`, `.txt`, `visitor_compat_migration.sql` | PCS-Backend | `worker/database/visitors/` | DO-NOT-MOVE-YET | Visitor D1 | Migration ordering | Medium privacy schema | Medium | Migration and privacy review |
| 3 | `cloudflare/migrations/0001_pcs_retrospective.sql` | PCS-Backend | `worker/migrations/0001_pcs_retrospective.sql` | DO-NOT-MOVE-YET | Intelligence D1 | Migration order | Medium schema | High | Fresh DB migration/test |
| 3 | `cloudflare/migrations/0002_pcs_intelligence_layers.sql` | PCS-Backend | `worker/migrations/0002_pcs_intelligence_layers.sql` | DO-NOT-MOVE-YET | Intelligence D1 | Migration order | Medium schema | High | Apply after 0001 in private rehearsal |
| 3 | `cloudflare/wrangler.toml` | PCS-Backend | `worker/wrangler.toml` | DO-NOT-MOVE-YET | Worker bindings/deploy | Sanitize/rebind | High operational IDs and secret names | Medium | Replace IDs with private config; verify bindings |
| 3 | `cloudflare/package.json`, `package-lock.json` | PCS-Backend | `worker/` | DO-NOT-MOVE-YET | Install/test/deploy | Preserve working directory | Low | Low | Clean install/test in private clone |
| 3 | `cloudflare/test/**` | PCS-Backend | `worker/test/**` | DO-NOT-MOVE-YET | Release confidence | Preserve imports/fixtures | Low placeholders | Medium | All tests pass in private clone |
| 3 | `cloudflare/README.md` | PCS-Backend | `worker/README.md` | COPY-AND-RETAIN-PUBLIC-SUBSET | Operator/API docs | Split internal operations from public API | Medium secret names | Medium | Publish only sanitized API contract |
| 3 | `.github/workflows/deploy-cloudflare-worker.yml` | PCS-Backend | `.github/workflows/deploy-cloudflare-worker.yml` | DO-NOT-MOVE-YET | Production deployment | Yes: repo paths/secrets | Critical deployment authority | Medium | Move last; private deploy and rollback proven |
| 3 | `cloudflare/.wrangler/cache/wrangler-account.json` | PCS-Backend | EXCLUDE | QUARANTINE | Local tooling cache | No | Critical account metadata | Low | Do not copy; remove from future tracking only in approved phase |
| 3 | `cloudflare/.wrangler/tmp/**` tracked files | PCS-Backend | EXCLUDE | QUARANTINE | Generated Worker bundle/map | No | High compiled/source exposure | Medium | Do not copy; rebuild privately |
| 4 | `PCS_ENGINE/**` (49 files) | PCS-Core | `engine/**` | DO-NOT-MOVE-YET | Core execution and public state producer | Yes: data/output/public contracts | Medium internal config | High | Core tests, schema equivalence, public artifact replacement |
| 4 | `PCS_ENGINE/run_engine.py` | PCS-Core | `engine/run_engine.py` | DO-NOT-MOVE-YET | Default Engine run | Yes: `PCS_DATA` path | Low | High | Minimal fixture plus end-to-end output comparison |
| 4 | `PCS_ENGINE/projection_engine/projections.py` | PCS-Core | `engine/projection_engine/projections.py` | QUARANTINE | Normalization/thresholds | Reconcile duplicate implementations | Low | High | Unit tests and parameter provenance |
| 4 | `PCS_ENGINE/state_engine/**` | PCS-Core | `engine/state_engine/**` | DO-NOT-MOVE-YET | State estimation/history | Package structure | Low | High | Unit tests and output-schema comparison |
| 4 | `PCS_ENGINE/aggregator/**` | PCS-Core | `engine/aggregator/**` | DO-NOT-MOVE-YET | Connector-state aggregation | Backend input contract | Low | High | Connector fixture aggregation tests |
| 4 | `PCS_ENGINE/assimilation/**` | PCS-Core | `engine/assimilation/**` | QUARANTINE | Mostly future architecture | Ownership/implementation review | Low | High | Confirm documents versus executable behavior |
| 4 | `PCS_ENGINE/data_adapters/**` | PCS-Core | `engine/data_adapters/**` | DO-NOT-MOVE-YET | Data loading | Lab fixture/source interface | Low | Medium | Adapter tests and provenance |
| 4 | `PCS_ENGINE/input/**` | PCS-Core | `engine/input-fixtures/**` | COPY-AND-RETAIN-PUBLIC-SUBSET | Aggregator inputs | Backend/Core contract | Medium source metadata | Medium | Separate fixtures from live/private ingestion |
| 4 | `PCS_ENGINE/output/latest_state.json`, `.csv` | PCS-Core | `engine/private-output/` | DO-NOT-MOVE-YET | Canonical Observatory reads JSON | Public output contract | Medium intermediate fields | High | Allowlisted public artifact available first |
| 4 | `PCS_ENGINE/output/full_state_history.csv` | PCS-Core | `engine/private-output/full_state_history.csv` | QUARANTINE | Historical analysis | Public aggregate replacement | Medium | High | Full history private; coarsened public substitute only |
| 4 | `PCS_ENGINE/logs/**` | PCS-Core | `engine/logs/` | QUARANTINE | Diagnostics | Logging policy | Medium operational | Medium | No sensitive paths/provider errors in published logs |
| 4 | `PCS_ENGINE/tests/**` | PCS-Core | `engine/tests/**` | DO-NOT-MOVE-YET | Core verification | Minimal fixtures/imports | Low | Medium | Tests pass without public workspace dependency |
| 4 | `PCS_LIVE/live_update.py` | PCS-Core | `live/live_update.py` | QUARANTINE | Live normalization/state | Reconcile thresholds/data access | Medium provider access | High | Compare with Engine rules; tests and provenance |
| 4 | `PCS_LIVE/latest_state.*`, report | PCS-Core | `live/output/` | QUARANTINE | Generated research/live output | Public contract review | Medium | High | Private-only until schema allowlist passes |
| 4 | `PCS_LIVE/__pycache__/**` | PCS-Core | EXCLUDE | QUARANTINE | None; generated bytecode | No | Medium code disclosure | Medium | Never copy; regenerate |
| 4 | `PCS_DASHBOARD/**` | PCS-Core | `dashboard/**` | DO-NOT-MOVE-YET | Direct Engine output read | Yes: output path | Low | Medium | Dashboard works against private Core contract |
| 4 | Non-infrastructure `PCS_VARIABLE_REGISTRY/**` | PCS-Core | `variable-registry/**` | COPY-AND-RETAIN-PUBLIC-SUBSET | Core schema/future contracts | Public vocabulary allowlist | Low | Medium | Schema review and subset comparison |
| 4 | `demo/demo_pipeline.py` | PCS-Core | `prototypes/demo_pipeline.py` | DO-NOT-MOVE-YET | Prototype normalization/state | Split Core vs Lab implementation | Low | High | Decide canonical implementation; equivalence tests |
| 4 | `demo/*.md`, `demo/requirements.txt`, `demo/scripts/**` | PCS-Lab | `prototypes/demo/**` | DO-NOT-MOVE-YET | Prototype/research build | Split from Core code/data | Low | Medium | Complete prototype manifest and runnable Lab copy |
| 5 | `docs/PCS_ENGINE/output/latest_state.json` | Planetary-common-state | generated public state path | DO-NOT-MOVE-YET | Pages Observatory direct read | Yes: allowlisted schema/build | Medium private fields | High | Anonymous fetch and field allowlist |
| 5 | `docs/PCS_ENGINE/output/latest_state.csv` | Planetary-common-state | generated public download | DO-NOT-MOVE-YET | Possible direct links | Public subset decision | Medium | High | Approved columns and link checks |
| 5 | `docs/PCS_ENGINE/output/full_state_history.csv` | PCS-Core | `publication-staging/full_state_history.csv` | QUARANTINE | Possible history/download | Coarsened replacement or feature removal | Medium | High | No public full history after approved replacement |
| 5 | Public Worker response DTOs and routes | Planetary-common-state | public API contract/docs | COPY-AND-RETAIN-PUBLIC-SUBSET | All network panels | Backend response allowlists | Medium metadata | High | Contract tests and privacy review |
| 5 | `cloudflare/.wrangler/tmp/dev-Wb0DJb/index.js.map` | PCS-Backend | EXCLUDE | QUARANTINE | None; generated source map | Stop tracking | High source exposure | High | Confirm no source map in public artifacts/history tip |
| 6 | `PCS_OBSERVATORY/**` | Planetary-common-state | same canonical UI source | RETAIN-PUBLIC | Landing/Observatory/Cesium | Public API/data contract only | Low | Low | Full desktop/mobile/browser smoke test |
| 6 | `Apps/PCS-Weather-Earth/**` | Planetary-common-state | same | RETAIN-PUBLIC | React/Vite/Cesium app | Sanitized Backend DTOs | Medium env/config | Low | Typecheck/build and browser smoke test later |
| 6 | `Apps/PCS-Weather-Earth/src/components/PcsPanels.tsx` | Planetary-common-state | same | RETAIN-PUBLIC | New PCS evidence panels | Backend fallback/DTO | Low | Medium | API failure fallback and no intermediate/private fields |
| 6 | `assets/**` | Planetary-common-state | same | RETAIN-PUBLIC | Public imagery/audio/models | License/source review | Low | Low | Asset provenance and public rendering |
| 6 | `README.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `ROADMAP.md` | Planetary-common-state | same | COPY-AND-RETAIN-PUBLIC-SUBSET | Public project/docs | Update stale/private path references later | Medium operational names/history | Medium | Link/content/security review |
| 6 | `TEST_WORKSPACE_OK.md` | Planetary-common-state | same or remove after review | DO-NOT-MOVE-YET | None | Purpose review | Low | Low | Confirm whether public documentation is useful |
| 7 | `docs/PCS_OBSERVATORY/**` | Planetary-common-state | generated Pages output | DO-NOT-MOVE-YET | Likely GitHub Pages source | Yes: canonical build | Low | Low | Confirm Settings → Pages; regenerate only in approved phase |
| 7 | `docs/PCS_OBSERVATORY/app.js` | Planetary-common-state | generated Pages JS | DO-NOT-MOVE-YET | Current Pages client | Replace stale manual copy | Low | Medium | Match canonical app behavior and safe API contract |
| 7 | `docs/PCS_OBSERVATORY/index.html`, `style.css`, locales | Planetary-common-state | generated Pages assets | DO-NOT-MOVE-YET | Current Pages UI | Replace stale manual copy | Low | Low | Inventory/hash/build comparison and mobile preview |
| 7 | `docs/PCS_OBSERVATORY/favicon.svg` | Planetary-common-state | canonical public asset input | RETAIN-PUBLIC | Pages favicon | Move into canonical source during later build work | Low | Low | Ensure generated output contains it |
| 7 | `docs/ARCHITECTURE/**`, `docs/DEVELOPER_GUIDE/**`, other `docs/*.md` | Planetary-common-state | reviewed public docs | COPY-AND-RETAIN-PUBLIC-SUBSET | Documentation | Remove private implementation detail/links | Medium topology | Medium | Link scan and public-boundary review |
| 7 | `docs/PCS_CROSS_PLATFORM_AI_ROADMAP.md` | PCS-Lab | `research/roadmaps/PCS_CROSS_PLATFORM_AI_ROADMAP.md` | DO-NOT-MOVE-YET | Possible Pages/public docs | Docs source decision | Low | Medium | Move only after public replacement/link decision |
| 8 | Current missing `LICENSE`; historical `LICENSE` commits `70528df`–`cb1dc04` | Planetary-common-state | legal/history plan | DO-NOT-MOVE-YET | Legal metadata | Owner/legal decision | Low | Low | Document current license decision and historical grant implications |
| 8 | `cloudflare/package.json`, `Apps/PCS-Weather-Earth/package.json` license metadata | PCS-Backend / Planetary-common-state | respective package manifests | DO-NOT-MOVE-YET | Package metadata | Explicit license decision | Low | Low | Do not add/remove license field implicitly |
| 8 | Historical `Apps/PCS-Weather-Earth/.env` commits | Planetary-common-state | history remediation only | QUARANTINE | Historical frontend secret | Provider revocation and rewrite plan | Critical | Low | Scan all refs without printing value; forks/caches review |
| 8 | Historical `Apps/PCS-Weather-Earth/ev` at `ef02d60` | Planetary-common-state | history remediation only | QUARANTINE | Historical secret-like path | Provider revocation and rewrite plan | Critical | Low | Include in affected-object inventory |
| 8 | All public refs, forks, release artifacts, Pages/Worker recovery state | Planetary-common-state | coordinated remediation | DO-NOT-MOVE-YET | Collaboration/deployment | Freeze and recovery plan | Critical | Medium | Fresh-clone scan, collaborator notice, deployment rehearsal |

## Phase 3A Exact Count

The proposed Phase 3A rows contain **26 tracked files**:

- `PCS_AI_COPILOT/**`: 10
- `PCS_COMPARISON/**`: 5
- `PCS_SCIENTIFIC_LIBRARY/09_NETWORK/**`: 8
- `PCS_DATA_REGISTRY/INFRASTRUCTURE_DATASETS.md`: 1
- `PCS_VARIABLE_REGISTRY/CATALOG/INFRASTRUCTURE.md`: 1
- `PCS_VARIABLE_REGISTRY/Infrastructure/**`: 1

The refreshed static reference scan found no runtime, build, Pages, Cloudflare Worker, or API reference to these paths. `CONTRIBUTING.md` mentions `PCS_COMPARISON/` descriptively; public sources must remain in place during Phase 3A. No current secret-value pattern, `.env`, nested `.git`, executable, workflow, or deploy configuration was found in the 26-file selection.
