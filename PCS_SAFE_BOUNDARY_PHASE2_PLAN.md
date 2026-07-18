# PCS Safe Boundary v0.1 — Phase 2 Plan

> **Planning only.** Snapshot: `25e7b6e0db348dcde8dcb90d70f3fe200a240de0` on `main`, inspected 2026-07-18 (Asia/Taipei). The worktree was clean before these Phase 2 reports were created. No file was moved, copied to another repository, deleted, committed, pushed, deployed, branched, or rewritten.

## 1. Phase 1 Report Validation

The three reports exist and are readable:

- `PCS_SAFE_BOUNDARY_MOVE_PLAN.md`
- `PCS_DEPENDENCY_TREE.md`
- `PCS_SECURITY_CLASSIFICATION_REPORT.md`

They are adequate as a baseline, but their recorded snapshot is `55afb69d132dcdf4700064cb58421bf97549a5f3`. The current repository is 17 commits later at `25e7b6e`, with 717 tracked files instead of 685. The new commits add PCS intelligence Worker routes, scheduled jobs, D1 migrations, provider registries, frontend evidence panels, Observatory assets, and other public UI changes. Phase 3 must therefore use this Phase 2 manifest, not the older reports alone.

### Classification consistency

Most principal boundaries agree:

- `PCS_ENGINE`, `PCS_LIVE`, `PCS_DASHBOARD`, and non-infrastructure variable semantics belong in `PCS-Core`.
- `cloudflare`, its deployment workflow, and server-side API implementation belong in `PCS-Backend`.
- `PCS_VALIDATION`, `UCT`, unpublished outputs, prompts, comparisons, and research libraries belong in `PCS-Lab`.
- Observatory, landing, Cesium, reviewed assets, and browser-only UI stay in `Planetary-common-state`.

The following conflicts or post-snapshot coverage gaps require conservative decisions:

| Path | Report A | Report B | Conflict | Conservative Decision |
| --- | --- | --- | --- | --- |
| `PCS_CONNECTORS/**` | Security report: `PRIVATE-CORE` | Move plan: `PCS-Backend` | Model-centric security label conflicts with the prescribed server-side/connector boundary | `PCS-Backend`; expose a versioned ingestion contract to `PCS-Core` and change hard-coded Engine output paths before removal |
| `demo/demo_pipeline.py` and mathematical/projection specifications | Security report: `PRIVATE-CORE` | Move plan: `PCS-Lab/prototypes/demo` | Executable normalization/state logic is Core, while prototype/research material is Lab | `DO-NOT-MOVE-YET`; split reusable model code to `PCS-Core` and retain a non-equivalent educational demo or Lab prototype only after review |
| `docs/PCS_ENGINE/output/latest_state.json` and `.csv` | Security report: `PUBLIC-SAFE` if minimized | Move plan: target `PCS-Core` | Current file path is a public Pages dependency, but the complete generated artifact is produced by private Core | Keep a reviewed minimal public artifact in `Planetary-common-state`; private full-fidelity source/output belongs in `PCS-Core`; never remove before replacement |
| `PCS_DATA/processed/demo_annual_dataset.csv` | Move/security reports: `PCS-Lab` | Dependency report: direct Engine default/test fixture | Classification agrees, but ownership and runtime dependency differ | Full dataset to `PCS-Lab`; create an explicitly licensed, minimal Core test fixture before later public removal |
| `PCS_DATA_REGISTRY/INFRASTRUCTURE_DATASETS.md`, `PCS_VARIABLE_REGISTRY/Infrastructure/**`, `PCS_VARIABLE_REGISTRY/CATALOG/INFRASTRUCTURE.md` | Security report: restricted dual-use | Move plan: `PCS-Lab` / quarantine | Destination is consistent but quarantine level must override ordinary Lab placement | `PCS-Lab/restricted-quarantine`; no workflow, deployment, public index, or automatic execution |
| `cloudflare/src/pcs/**`, `cloudflare/src/providers/**`, `cloudflare/migrations/0001*`, `0002*` | Not present at Phase 1 snapshot | Parent `cloudflare` classified Backend | New deployed code and schemas were added after the reports | `PCS-Backend`; treat as high-risk deployment unit and do not include in Phase 3A |
| `Apps/PCS-Weather-Earth/src/components/PcsPanels.tsx` and new PCS types | Not present at Phase 1 snapshot | Parent app classified public UI | New browser consumers now call PCS intelligence APIs | Retain public; maintain only sanitized response types and public endpoint contracts |
| New `PCS_OBSERVATORY` moon assets, registries, scripts, tests | Not present at Phase 1 snapshot | Parent Observatory classified public UI | Coverage gap, not a boundary disagreement | Retain reviewed imagery, source metadata, UI registries, and build helper; keep them out of private migration batches |
| The three safe-boundary reports and this Phase 2 report set | Governance artifacts added after the security snapshot | Not classified | Reports reveal migration topology but are also active control documents | `DO-NOT-MOVE-YET`; keep uncommitted until reviewed, then store an approved governance copy in `PCS-Lab` if desired |

## 2. Migration Batch Design

### Batch 0 — Preconditions

No actual copying may start until every item passes:

- `PCS-Core`, `PCS-Backend`, and `PCS-Lab` exist and show the **Private** badge on GitHub.
- GitHub Desktop is signed in to the intended GitHub account and organization.
- All three private repositories are cloned to distinct, clearly named local folders.
- `Planetary-common-state` shows **0 changed files** in GitHub Desktop.
- All unrelated/uncommitted work is backed up outside the four repository folders.
- Record public repository SHA `25e7b6e0db348dcde8dcb90d70f3fe200a240de0`; re-record it if `main` changes before Phase 3A.
- Independently confirm that the historical OpenWeather key is revoked; repository text cannot prove provider-side revocation.
- Each repository's primary remote URL points to the intended GitHub repository; the public checkout currently points to `uranusastudio-design/Planetary-common-state`.
- There is enough disk space for four working copies plus a separate backup.
- No copied selection contains a nested `.git` directory.
- No copied selection contains `.env`, `.env.local`, `.env.production`, credentials, or local provider configuration.
- Do not copy ignored local build/state directories such as `node_modules`, `dist`, `.wrangler`, or Python bytecode.
- Create a written path manifest and file-count baseline before selecting any files in Explorer.

Current precondition findings: the public worktree was clean; only the repository-root `.git` exists; the tracked tree contains `.env.example` but no current `.env`; ignored local `node_modules`, `dist`, and `.wrangler` state exist and must never be selected. Some old `.wrangler` cache/bundle files and a Python `.pyc` are tracked and must be explicitly excluded rather than replicated.

### Batch 1 — Lowest-Risk Research Isolation

Target: `PCS-Lab`.

Eligible groups are non-runtime research, prompts, comparison protocols, unpublished manuscript work, and restricted planning. The first execution slice is the 26-file Phase 3A recommendation in Section 6. Remaining Batch 1 candidates are:

- `UCT/**`, root `main.tex`, `outputs/**`, `work/**`, and root `tables/**` as a later atomic manuscript set.
- General `PCS_SCIENTIFIC_LIBRARY/**` after separating the already quarantined network subsection.
- Non-runtime research plans under `PCS_DATA_REGISTRY/**`.
- `docs/PCS_CROSS_PLATFORM_AI_ROADMAP.md` only after the `docs/` source-of-truth decision; it is not in Phase 3A.
- Safe-boundary governance reports after the migration owner decides whether they remain public.

These files do not currently participate in the Worker, Vite build, Observatory runtime, Pages data fetch, or public API implementation. Documentation references, manuscript-relative links, and licensing still require verification before later public removal.

### Batch 2 — Static Data and Validation Isolation

Target: `PCS-Lab`.

- `PCS_DATA/**`
- `PCS_VALIDATION/**`
- `demo/data/**` and research acquisition notes
- validation figures/tables/results and unpublished processed/normalized datasets
- connector source snapshots only if they are research archives rather than Backend fixtures

Required split:

| Full/private material | Public-safe replacement |
| --- | --- |
| Complete processed/normalized datasets and trajectories | Small explicitly licensed demo dataset with no private intermediate history |
| Full validation results and leave-one-out/correlation artifacts | Aggregate methodology, limitations, and approved summary metrics |
| Complete Engine benchmark fixture | Minimal deterministic test fixture stored with Core or generated in private CI |
| Full state history | Coarsened, schema-versioned public snapshot or API response |

Do not remove `PCS_DATA/processed/demo_annual_dataset.csv` until Engine defaults/tests and UCT references have replacement paths. Batch 2 is replication preparation, not public removal.

### Batch 3 — Backend Replication Preparation

Target: `PCS-Backend`.

| Source group | Copy readiness | Relative-path work | Secret condition | Public/deploy dependency |
| --- | --- | --- | --- | --- |
| `PCS_CONNECTORS/**` | Copy source only after manifest review | Yes: connector defaults write to `PCS_ENGINE/input` | Secret names such as `CWA_API_KEY`; no real current value found in tracked files | Offline ingestion/refresh; not directly imported by current Worker |
| `cloudflare/src/index.js` | Copy with all Worker modules | Package-relative imports must stay intact | Uses secret bindings, not literal production values | Main router; removal breaks future builds/deploys |
| `cloudflare/src/nasa/**` | Copy as one module | Package-relative TypeScript imports | `EARTHDATA_TOKEN` name | NASA Gateway |
| `cloudflare/src/astronomy.js` | Copy with router/tests | Package-relative import | No literal real secret found | Astronomy and space-weather APIs called by Observatory |
| `cloudflare/src/visitors.js` | Copy with schemas/tests | D1 binding contract | No literal real secret found | Visitor registration/stats/locations/analytics |
| `cloudflare/src/pcs/**` | Copy with D1 migrations/providers | D1/KV/AI bindings and module imports | `ADMIN_API_KEY`, `INGEST_SECRET`, AI binding names | New domain readiness, evidence, events, daily brief, admin routes and scheduled jobs |
| `cloudflare/src/providers/**` | Copy with PCS modules | Internal imports and upstream contracts | `OPENWEATHER_API_KEY`, `FIRMS_MAP_KEY` names | Provider readiness and layer APIs |
| SQL schemas and `cloudflare/migrations/**` | Copy in migration order | Database binding/migration workflow | No password belongs in SQL | D1 initialization and intelligence tables |
| `cloudflare/wrangler.toml` | Do not copy unchanged until sanitized | Binding IDs/environment config | Contains operational IDs and secret names, not secret values | Required by deployment |
| `cloudflare/package*.json`, tests, README | Copy with reviewed docs | Package-relative commands | Test placeholder values only | Install/test/deploy unit |
| `.github/workflows/deploy-cloudflare-worker.yml` | Last Backend item | Working directory and repository secrets context | References `CLOUDFLARE_API_TOKEN` | Current automatic production deployment |
| `cloudflare/.wrangler/**`, `node_modules/**` | Never copy | None; regenerate | May contain local account/state/cache material | Not source of truth |

The frontend currently calls the fixed Worker host for OpenWeather, NASA/astronomy, visitor APIs, and new PCS intelligence routes. Backend replication may happen privately, but public removal or workflow cutover must wait for a verified private deploy and rollback path.

### Batch 4 — PCS Core Replication Preparation

Target: `PCS-Core`.

| Core concern | Current location | Status / dependency |
| --- | --- | --- |
| `L(t)` / state trajectory | `PCS_ENGINE/state_engine/**`, outputs and UCT descriptions | Executable Core plus research documentation; browser consumes derived JSON only |
| Five residual/projection classes and normalization | `PCS_ENGINE/projection_engine/**`, `demo/demo_pipeline.py`, `PCS_LIVE/live_update.py` | Executable thresholds exist; duplicate prototype/live implementations must be reconciled |
| Data fusion / assimilation | `PCS_ENGINE/assimilation/**` | Mostly architecture documents; report says no active assimilation algorithm yet |
| State estimation / aggregation | `PCS_ENGINE/state_engine/**`, `aggregator/**` | Active executable paths; aggregator reads Connector JSON |
| Weights / source priority | `PCS_ENGINE/assimilation/SOURCE_WEIGHTING.md`, Connector priority documents | Documents plus future design; Backend/Core contract required |
| Thresholds / calibration | `PCS_ENGINE/projection_engine/projections.py`, `PCS_LIVE/live_update.py`, demo specifications | Executable and high risk; Core only |
| Anomaly detection | Prompt/validation/PCS intelligence documents and routes | Mixed prototype/document/backend implementation; do not merge into Core without ownership review |
| Cross-validation | `PCS_VALIDATION/**`, comparison plans, Engine tests | Lab owns research validation; Core receives deterministic conformance tests |
| Scenario analysis | UCT, demo and research outputs | Lab/prototype unless executable production model is extracted |

Path decisions:

- `PCS_ENGINE/**`: `COPY-THEN-REMOVE-LATER`; imports are package-local but workspace paths to `PCS_DATA` and output publication need refactoring.
- `PCS_LIVE/**`: `COPY-THEN-REMOVE-LATER`; remove tracked `__pycache__`, reconcile duplicated thresholds, and document data access.
- `PCS_DASHBOARD/**`: Core client; direct dependency on `PCS_ENGINE/output/latest_state.json`.
- Non-infrastructure `PCS_VARIABLE_REGISTRY/**`: Core vocabulary; publish only an approved schema subset.
- `demo/demo_pipeline.py`: `DO-NOT-MOVE-YET` until prototype versus reusable Core logic is split.
- No reviewed Core Python module was found inside the current browser bundles. Browser exposure is through JSON/data contracts and public Worker responses, not direct Python imports.

### Batch 5 — Public Dependency Replacement

No source removal may occur until these replacements exist:

| Current dependency/exposure | Required replacement |
| --- | --- |
| `PCS_OBSERVATORY/app.js` reads `../PCS_ENGINE/output/latest_state.json` and regional paths | Versioned, allowlisted public JSON or a read-only aggregated Backend endpoint |
| `docs/PCS_OBSERVATORY/app.js` reads `docs/PCS_ENGINE/output` | Deterministic build-time public artifact generated from reviewed schema |
| `docs/PCS_ENGINE/output/full_state_history.csv` exposes full history | Coarsened public time series, approved API response, or removal of the unused history feature |
| Engine default/tests read full Lab dataset | Minimal Core fixture or private artifact dependency |
| Connector scripts write to public-workspace Engine paths | Backend-to-Core ingestion interface/configuration |
| Public routes may return endpoints, evidence details, intermediate analysis, or operational metadata | Response allowlists, aggregation, privacy review, and public schema tests |
| Tracked `.wrangler/tmp/**/index.js.map` exposes compiled source | Stop tracking generated bundle/source maps; regenerate privately |
| Worker source, config, schemas, and public build live in one repository | Private Backend deployment plus public API contract only |
| Frontend evidence panels depend on complete Backend response shapes | Stable sanitized DTOs with fallback/unavailable states |
| `docs/` is a stale manual copy | One canonical source plus deterministic Pages build |

Allowed replacement patterns are public-safe JSON, aggregate API responses, Backend endpoints, minimized demo datasets, build-time public artifacts, removal of unused functions, or explicit temporary disablement with user-visible fallback.

### Batch 6 — Public Removal (Future Only)

Exact removal candidates, only after all gates pass:

- `PCS_AI_COPILOT/**`
- `PCS_COMPARISON/**`
- `PCS_SCIENTIFIC_LIBRARY/**`
- `PCS_DATA_REGISTRY/**` except a reviewed public source catalog
- restricted infrastructure registry/catalog files
- `UCT/**`, `outputs/**`, `work/**`, root `main.tex`, and research `tables/**`
- `PCS_VALIDATION/**` and private portions of `PCS_DATA/**`
- private portions of `demo/**`
- `PCS_CONNECTORS/**`
- `PCS_ENGINE/**`, `PCS_LIVE/**`, and `PCS_DASHBOARD/**`
- private portions of `PCS_VARIABLE_REGISTRY/**`
- `cloudflare/**` and `.github/workflows/deploy-cloudflare-worker.yml` only after private Backend deployment cutover
- `docs/PCS_ENGINE/output/full_state_history.csv` and any non-minimized snapshot
- tracked generated artifacts: `cloudflare/.wrangler/**` and `PCS_LIVE/__pycache__/**`

For every path: private copy exists, secret scan passes, dependency replacement is deployed, public smoke tests pass, and rollback is documented. Phase 2 performs none of these removals.

### Batch 7 — `docs/` Synchronization

Findings:

- No tracked GitHub Pages workflow exists. The actual repository setting cannot be proven from the checkout alone and must be verified in **Repository Settings → Pages** before Phase 3.
- Commit `5e4752a` is titled “restore PCS Observatory GitHub Pages deployment” and added `docs/PCS_OBSERVATORY/**` plus `docs/PCS_ENGINE/output/**`; this is strong evidence that `main` `/docs` is or was the intended Pages source.
- The primary source is now `PCS_OBSERVATORY/**`: it has 30 files not present in the `docs` copy, including landing/intro support, celestial registries, moon imagery, tests, and a build helper.
- `docs/PCS_OBSERVATORY` has one docs-only `favicon.svg`.
- Every common functional file currently differs: `app.js`, `index.html`, `style.css`, README, all four locale JSON files, and the i18n README.
- Canonical `PCS_OBSERVATORY/app.js` now calls new evidence/domain/event APIs; the docs copy does not contain the current implementation.
- `docs/PCS_ENGINE/output` is currently a manually committed publication artifact; no tracked synchronization workflow was found.

Recommended single source of truth:

1. Keep reviewed UI source in `PCS_OBSERVATORY/`.
2. Define a deterministic static build that copies only allowlisted UI/assets and a minimized, schema-versioned public state artifact to the configured Pages output.
3. Treat `docs/` as generated output, never as an independently edited source.
4. Compare file inventory and hashes in CI; fail if `docs/` is stale or contains unapproved Core/Backend files.
5. Do not generate public source maps for private Backend/Core code.
6. Confirm the Pages source in GitHub settings, build locally, preview anonymously, then change publication only in a separately approved phase.

### Batch 8 — License and Git History (Always Last)

Current evidence:

- No `LICENSE` file is present at HEAD.
- Commit `70528df47b0fa839f8dfff6ba1d9de7c1d098efd` added an MIT License on 2026-07-10; commit `cb1dc04ed8628e55506295b80ad08c228033f1aa` deleted it on 2026-07-14.
- Current `cloudflare/package.json` and `Apps/PCS-Weather-Earth/package.json` have no `license` field.
- Current README/package files do not declare the repository itself MIT, but third-party assets/data retain separate licensing/provenance obligations.
- Historical OpenWeather material appears in reachable commits involving `Apps/PCS-Weather-Earth/.env` (`ce81904`, `8a86fe2`, removed by `bb310ca`) and an `Apps/PCS-Weather-Earth/ev` path (`ef02d60`). Exact affected refs/blobs must be re-audited immediately before any rewrite without printing the key.

Last-batch plan:

1. Obtain an owner/legal decision on current and future licensing; deleting a license does not retroactively erase rights already granted for historical versions.
2. Confirm key revocation at the provider, inventory forks/releases/caches, and create offline backups of all four repositories.
3. Record affected commits/refs and choose the smallest defensible rewrite range.
4. Announce the rewrite window to collaborators; freeze merges and deployments.
5. Create recovery references/backups outside the public remote before rewriting; do not create a public tag that preserves the secret blob.
6. Prepare Cloudflare/Pages deployment recovery and fresh-clone instructions.
7. Rewrite only after private separation and public removal are stable; force-push implications affect every clone and open branch.
8. Revoke/rotate again if exposure status is uncertain, re-scan every ref, and require all collaborators to re-clone.

## 3. Batch Acceptance Table

| Batch | Entry Conditions | Validation | Pass Criteria | Failure Action | Rollback |
| ---: | --- | --- | --- | --- | --- |
| 0 | Private repos exist; correct account; clean public tree; SHA/key status recorded | Desktop repository/remote/privacy checks; disk, `.git`, `.env`, ignored-artifact inspection | Every precondition has owner/date/evidence | Do not begin copying | No repository content changed |
| 1 | Approved Lab paths and counts; no runtime refs; secret scan clean | Compare 26-file Phase 3A manifest, inspect Changes only in Lab | Exact files only; quarantine has no workflow/deploy entry | Discard target changes | Public source remains untouched; discard uncommitted Lab files |
| 2 | Public/private dataset split defined; Core fixtures planned | Dataset hashes/counts, provenance, validation reproducibility | Full Lab set intact; public subset explicitly approved | Stop removal; correct Lab copy/fixture | Retain public originals; discard or correct private copy |
| 3 | Private Backend clone ready; bindings/secrets inventory; deploy rehearsal plan | Install/test in private context, route contract and migration review | No real secret; all routes/tests/config accounted for; rollback artifact exists | Do not cut workflow or public source | Public Worker/deploy source remains authoritative |
| 4 | Backend/Core interface and Lab fixture available | Core unit/conformance tests, output-schema comparison | Equivalent private outputs; browser receives only safe contract | Keep public Core paths; repair private imports | Delete/discard private uncommitted copy or corrective private commit |
| 5 | Versioned public contract and fallback approved | Static build, schema allowlist, API privacy tests, source-map check | No private fields/files in public artifact; UI handles unavailable APIs | Block removal and deployment | Restore previous public artifact/config |
| 6 | Private copies, replacements, site checks and rollback all pass | Exact deletion manifest plus anonymous production smoke test | Only approved paths removed; no new console/network failures | Restore source paths before commit/push | Revert with a normal corrective commit if already pushed; no force push |
| 7 | Pages source confirmed and canonical build exists | Source/docs inventory/hash comparison and preview | One source of truth; Pages matches approved UI; no Core history leak | Retain current publication and fix build | Restore last known Pages artifact/settings |
| 8 | All boundaries stable; legal/owner approval; key revoked; collaborator freeze | All-ref secret/license scan and fresh-clone/deploy recovery rehearsal | Historical secret unreachable from intended public refs; licensing decision documented | Abort rewrite; preserve stable remotes | Restore from offline backups and coordinated recovery plan |

### Minimum private-repository acceptance

- GitHub displays **Private**.
- No real secret, `.env`, nested `.git`, local cache, `node_modules`, build bundle, or source map copied accidentally.
- No repository-level MIT License or package license field is added without the explicit licensing decision.
- File count and source-to-target manifest match.
- Every file retains source-path traceability.
- Restricted content has no deployment entry, public workflow, scheduled job, or automatic execution.
- Only the intended private repository shows changes in GitHub Desktop.

### Minimum public-repository acceptance before any future removal

- Landing and ENTER render.
- PCS Observatory renders and loads a safe state response.
- Cesium Earth and planet/moon switching work.
- GitHub Pages serves the intended build.
- OpenWeather works or shows the approved fallback.
- NASA Gateway and astronomy routes work.
- Visitor registration/statistics/locations/analytics work at the approved privacy level.
- New PCS evidence/domain/event panels work or fail safely.
- Basic mobile layout works.
- Browser console/network panel shows no new errors or private path/source-map exposure.
- `docs/` matches the canonical source and approved generated artifacts.

## 4. Phase 3A Recommendation

Phase 3A should be a small Batch 1 copy into `PCS-Lab`, with public sources retained. It uses five top-level source areas and 26 tracked files.

| Source Path | Target Repository | Target Path | File Count | Why Safe | Verification |
| --- | --- | --- | ---: | --- | --- |
| `PCS_AI_COPILOT/**` | PCS-Lab | `research/PCS_AI_COPILOT/**` | 10 | Plans/prompts only; no runtime/build/API reference found | Compare 10 paths; scan content; no workflow/deploy entry |
| `PCS_COMPARISON/**` | PCS-Lab | `research/PCS_COMPARISON/**` | 5 | Research protocols only; sole external reference is descriptive text in `CONTRIBUTING.md` | Compare 5 paths; retain public source; verify no executable files |
| `PCS_SCIENTIFIC_LIBRARY/09_NETWORK/**` | PCS-Lab | `restricted-quarantine/PCS_SCIENTIFIC_LIBRARY/09_NETWORK/**` | 8 | Non-runtime methods; conservative quarantine for network/cascade dual-use topics | Compare 8 paths; ensure quarantine is not indexed/deployed |
| `PCS_DATA_REGISTRY/INFRASTRUCTURE_DATASETS.md` | PCS-Lab | `restricted-quarantine/PCS_DATA_REGISTRY/INFRASTRUCTURE_DATASETS.md` | 1 | Planning document; no runtime reference found; dual-use classification | Compare file and ensure no deployment workflow sees quarantine |
| `PCS_VARIABLE_REGISTRY/CATALOG/INFRASTRUCTURE.md` | PCS-Lab | `restricted-quarantine/PCS_VARIABLE_REGISTRY/CATALOG/INFRASTRUCTURE.md` | 1 | Catalog-only restricted infrastructure mapping | Compare file and keep quarantine isolated |
| `PCS_VARIABLE_REGISTRY/Infrastructure/**` | PCS-Lab | `restricted-quarantine/PCS_VARIABLE_REGISTRY/Infrastructure/**` | 1 | Registry planning only; no current deployed feature | Compare one path and keep quarantine isolated |
| **Total** | **PCS-Lab** | — | **26** | One private repository, no current runtime/Pages/Worker/API dependency, no real secret pattern found | Exact manifest and Desktop Changes review |

Phase 3A expected public impact is **none**, because it is copy-only and the public originals remain unchanged. Phase 2 does not execute it.

## 5. Phase 3A Rollback Readiness

- Before any public deletion, abandoning Phase 3A means discarding only the uncommitted 26-file changes in `PCS-Lab`; the public repository is untouched.
- If files are pasted into the wrong repository, use GitHub Desktop's Changes list to confirm every selected path, then **Discard Changes** only in that mistaken repository before switching repositories.
- If committed but not pushed in the private repository, use **Repository → Undo Most Recent Commit**; verify the files return to Changes, then discard or correct them.
- If pushed to the private repository, do not force-push. Add a normal corrective commit that deletes or relocates the mistaken private copy, then push that correction.
- Never use rollback to modify or delete anything in `Planetary-common-state` during Phase 3A.

## 6. Required Final Answers

1. **Are Phase 1 reports sufficient?** Sufficient as a baseline, not as the sole execution manifest. The current tree is 17 commits and 32 tracked files beyond their snapshot; this Phase 2 refresh is required.
2. **Are there classification conflicts?** Yes. The material conflicts are Connector ownership, demo prototype/Core splitting, and public snapshot versus private Core ownership; there are also post-snapshot coverage gaps.
3. **Which Batch should execute first?** Batch 1, limited to the 26-file Phase 3A slice.
4. **Exact Phase 3A source paths?** The six rows in Section 4: `PCS_AI_COPILOT/**`, `PCS_COMPARISON/**`, the complete `PCS_SCIENTIFIC_LIBRARY/09_NETWORK/**`, and the three infrastructure registry/catalog paths.
5. **Target repository?** `PCS-Lab` only.
6. **Public-site impact?** None when performed as copy-only with all public sources retained.
7. **What absolutely must not move now?** `PCS_ENGINE`, `PCS_LIVE`, `PCS_DASHBOARD`, `PCS_CONNECTORS`, `PCS_DATA`, `demo/demo_pipeline.py`, `cloudflare`, `.github/workflows`, `docs/**`, `PCS_OBSERVATORY`, `Apps/PCS-Weather-Earth`, Engine/public state outputs, and any active frontend/API contract. They require dependency replacement, deployment verification, or ownership splitting first.
8. **How many execution stages remain?** At least seven after Phase 2: Phase 3A small Lab quarantine, Phase 3B remaining research, Phase 4 data/validation, Phase 5 Backend, Phase 6 Core, Phase 7 public replacement/removal/Pages synchronization, and Phase 8 license/history remediation.
