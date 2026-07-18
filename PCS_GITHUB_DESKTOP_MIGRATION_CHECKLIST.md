# PCS GitHub Desktop Migration Checklist

> Future manual workflow only. This checklist requires no command line. Phase 2 does not perform any copy, delete, commit, push, branch, PR, deployment, or history operation.

## 1. Repository Preparation in GitHub Desktop

### Clone the three private repositories

Repeat these steps separately for `PCS-Core`, `PCS-Backend`, and `PCS-Lab`:

1. In GitHub Desktop choose **File → Clone repository…**.
2. On the **GitHub.com** tab, select the exact repository under the intended owner. If it is not listed, use the **URL** tab and paste its GitHub repository URL.
3. Choose a local parent folder that is **outside** `Planetary-common-state`. Each repository must have its own sibling folder; never clone one inside another.
4. Confirm the displayed repository name and local path, then choose **Clone**.
5. Stop if GitHub Desktop offers to initialize, publish, or create a repository; the prerequisite is an already-created private repository.

Recommended sibling layout, adjusted to the user's actual GitHub Desktop local path:

- `<Local Parent>/Planetary-common-state/`
- `<Local Parent>/PCS-Core/`
- `<Local Parent>/PCS-Backend/`
- `<Local Parent>/PCS-Lab/`

### Confirm the current repository before every action

- Use the **Current Repository** selector at the upper left.
- Read both the repository name and local path. Similar names are not sufficient.
- Choose **Repository → Show in Explorer** and confirm the Explorer address bar before pasting files.
- Return to GitHub Desktop and confirm the **Changes** view belongs to the same repository.
- Keep only one repository Explorer window open for the current copy step, or label windows clearly as `SOURCE PUBLIC` and `TARGET PRIVATE`.

### Confirm the repository is Private

1. Choose **Repository → View on GitHub**.
2. On GitHub, verify the **Private** badge beside `PCS-Core`, `PCS-Backend`, or `PCS-Lab`.
3. Open **Settings → General** and confirm the repository visibility is Private if the account permits access to Settings.
4. Return to GitHub Desktop without changing any setting.
5. A local folder name containing “Private” is not evidence; only GitHub's visibility badge/settings is authoritative.

### Confirm the primary remote

1. In GitHub Desktop select the repository.
2. Open **Repository → Repository settings… → Remote**.
3. Verify the primary remote URL names the intended owner and exact repository.
4. For the current public checkout, the expected repository is `uranusastudio-design/Planetary-common-state`.
5. For each private checkout, the URL must end in its corresponding `PCS-Core`, `PCS-Backend`, or `PCS-Lab` name.
6. GitHub Desktop exposes the **primary remote URL** more clearly than arbitrary remote names. A normal Desktop clone uses the primary remote conventionally named `origin`; record both the displayed primary URL and expected name `origin`. If the UI shows an unexpected configuration, stop rather than editing it.
7. Close Settings without editing the URL.

### Check Changes and deliberately avoid committing

- Select the **Changes** tab; record the changed-file count and scan every path.
- Before Phase 3A, `Planetary-common-state` must show no changes.
- During a copy-only batch, only the intended private repository should show new files.
- Leave the summary and description boxes empty during verification.
- Do not select **Commit to main**, **Push origin**, **Publish branch**, or **Create Pull Request** until the separately approved execution phase reaches its explicit approval gate.
- GitHub Desktop auto-refreshes. Wait for its file list to settle after an Explorer paste before evaluating counts.

### Prevent accidental paste into the public repository

- Pin or label the source Explorer window as `PUBLIC — READ ONLY`.
- Open the target by choosing **Show in Explorer** from the selected private repository, not from a recent-folder shortcut.
- Before paste, read the full target address and verify it contains the private repository name.
- After paste, switch to `Planetary-common-state` in Desktop. It must still show zero changes.
- If the public repository shows new files, do not commit; follow the mistaken-repository rollback in Section 4.

## 2. Common Pre-Copy Inspection

For every future batch:

- In Explorer enable **View → Show → Hidden items** and **File name extensions**.
- Never select `.git`, `.env`, `.env.local`, `.env.production`, `.wrangler`, `node_modules`, `dist`, `__pycache__`, `.pyc`, local database files, cache files, or editor settings.
- Open likely configuration files as text and look for real credentials. Secret *names* may be required documentation; secret *values* must never be copied.
- Use the Phase 2 file manifest as the only selection list. Do not copy a whole repository root.
- Record source SHA, source path, target path, and expected file count in the batch handoff.
- The source files remain in the public repository until a later, separately approved removal batch.

## 3. Per-Batch Desktop Procedures

### Batch 0 — Preconditions

1. **Source local path:** `<Local Parent>/Planetary-common-state/`; no files are selected.
2. **Target local paths:** the three sibling private repository folders.
3. **Do not copy:** everything; Batch 0 is verification only.
4. **`.git` check:** each repository has its own root metadata, and no repository is nested inside another.
5. **`.env` check:** only a placeholder `.env.example` may be visible in the public app; no real `.env` is accepted.
6. **Secret check:** confirm historical OpenWeather revocation with the provider/owner; do not display or paste the old key.
7. **Suggested future commit name:** none; Batch 0 creates no content commit.
8. **Pre-push check:** not applicable; verify all repositories still show no unexpected changes.
9. **Report to Codex:** privacy badges, repository owner/name, local paths, remote URLs (without credentials), public SHA, changed-file counts, key-revocation confirmation, and any warning.
10. **Rollback:** close Explorer/Desktop without saving settings; no repository content should have changed.

### Batch 1 — Lowest-Risk Research Isolation

1. **Source local paths:** Phase 3A uses `PCS_AI_COPILOT/`, `PCS_COMPARISON/`, `PCS_SCIENTIFIC_LIBRARY/09_NETWORK/`, `PCS_DATA_REGISTRY/INFRASTRUCTURE_DATASETS.md`, `PCS_VARIABLE_REGISTRY/CATALOG/INFRASTRUCTURE.md`, and `PCS_VARIABLE_REGISTRY/Infrastructure/`.
2. **Target local repository/path:** `<Local Parent>/PCS-Lab/`; use `research/…` for AI/comparison and `restricted-quarantine/…` for network/infrastructure content.
3. **Do not copy:** repository root metadata, safe-boundary reports, UCT/data/validation, any unrelated scientific-library folder, caches, `.env`, or deployment files.
4. **`.git` check:** no `.git` appears anywhere under the six target path groups.
5. **`.env` check:** no environment file should exist in the 26-file selection.
6. **Secret check:** inspect all 26 files; expected result is no real secret or credential.
7. **Suggested future commit name:** `chore(lab): quarantine initial safe-boundary research batch`.
8. **Pre-push check:** exactly 26 new files, only `PCS-Lab` has changes, quarantine has no workflow/package/deploy entry, public repo remains unchanged.
9. **Report to Codex:** source SHA, six source groups, target paths, Desktop changed-file count, screenshot/text of privacy badge, secret result, unexpected references, and whether the public repo remains clean.
10. **Rollback:** before commit, discard the 26 Lab changes; after local commit but before push, undo the most recent commit; after private push, make a normal corrective commit—never force-push and never touch Public.

### Batch 2 — Static Data and Validation Isolation

1. **Source local paths:** `PCS_DATA/`, `PCS_VALIDATION/`, approved `demo/data/` material, and explicitly assigned source snapshots.
2. **Target local repository/path:** `<Local Parent>/PCS-Lab/data/`, `validation/`, and `prototypes/demo/data/`.
3. **Do not copy:** `.git`, environment files, Core output history as a “demo,” unapproved provider downloads, or Backend connector code.
4. **`.git` check:** no nested repository metadata in datasets or archives.
5. **`.env` check:** no environment files inside data packages.
6. **Secret check:** inspect raw metadata, acquisition notes, CSV headers, and embedded URLs/tokens; provider credentials are prohibited.
7. **Suggested future commit name:** `chore(lab): replicate private datasets and validation artifacts`.
8. **Pre-push check:** file counts/hashes match; provenance exists; public-safe subset is identified; Engine fixture replacement is not assumed complete.
9. **Report to Codex:** exact included/excluded datasets, counts, provenance/license status, hash comparison result, Core/UCT dependencies, and proposed public subset.
10. **Rollback:** retain all public originals; discard uncommitted Lab files or add a normal corrective private commit if already pushed.

### Batch 3 — Backend Replication Preparation

1. **Source local paths:** `PCS_CONNECTORS/`, reviewed `cloudflare/` source/tests/schema/package/config, and later `.github/workflows/deploy-cloudflare-worker.yml`.
2. **Target local repository/path:** `<Local Parent>/PCS-Backend/connectors/` and `<Local Parent>/PCS-Backend/worker/`; workflow goes to the target root `.github/workflows/` only at cutover.
3. **Do not copy:** any `.wrangler` directory/file, `node_modules`, local SQLite/WAL/SHM files, generated bundles/maps, `.env`, real secrets, or account caches.
4. **`.git` check:** neither `PCS_CONNECTORS` nor `cloudflare` selection may contain root or nested `.git`.
5. **`.env` check:** no Cloudflare/provider environment file is accepted; secrets must later be configured in the private deployment platform.
6. **Secret check:** distinguish binding names (`OPENWEATHER_API_KEY`, `EARTHDATA_TOKEN`, `FIRMS_MAP_KEY`, `INGEST_SECRET`, `ADMIN_API_KEY`) from values; any real value blocks the batch.
7. **Suggested future commit names:** `chore(backend): replicate connectors and worker source` and, only at cutover, `ci(backend): add verified worker deployment workflow`.
8. **Pre-push check:** source/tests/migrations are complete; relative imports are preserved; operational IDs are reviewed; no workflow runs restricted content; production source remains unchanged.
9. **Report to Codex:** connector/Worker file counts, excluded generated files, binding names only, route inventory, migration order, Desktop Changes, and private test/deploy rehearsal result.
10. **Rollback:** before commit discard Backend changes; after private push add a normal corrective commit; never disable the public workflow or delete public Worker source until production cutover is separately approved.

### Batch 4 — PCS Core Replication Preparation

1. **Source local paths:** `PCS_ENGINE/`, `PCS_LIVE/`, `PCS_DASHBOARD/`, approved variable registries, and only the reviewed Core part of the demo pipeline.
2. **Target local repository/path:** `<Local Parent>/PCS-Core/engine/`, `live/`, `dashboard/`, and `variable-registry/`.
3. **Do not copy:** `__pycache__`, `.pyc`, public docs output as canonical private source, full Lab datasets without ownership approval, or Backend connectors.
4. **`.git` check:** no nested repository metadata under any Core path.
5. **`.env` check:** no environment/provider credential file is allowed.
6. **Secret check:** inspect configuration, logs, inputs, and output metadata; real provider keys or tokens block the batch.
7. **Suggested future commit name:** `chore(core): replicate engine and private state model`.
8. **Pre-push check:** package imports, Lab fixture, Backend ingestion contract, thresholds, state outputs, and tests are accounted for; no browser bundle contains Core source.
9. **Report to Codex:** exact Core paths/counts, excluded outputs/cache, duplicated threshold findings, import/path blockers, test results, and output-schema comparison.
10. **Rollback:** retain all public Core files; discard uncommitted private copies or use a normal corrective private commit after push.

### Batch 5 — Public Dependency Replacement

1. **Source local paths:** public Observatory/React client, current `docs/PCS_ENGINE/output`, and reviewed public API schemas; no private implementation is copied back.
2. **Target local repository/path:** `Planetary-common-state` only after a separately approved implementation phase; private producer code remains in Core/Backend.
3. **Do not copy:** Engine source, full history, validation internals, Worker source, schemas, config, source maps, or restricted data into public artifacts.
4. **`.git` check:** generated public artifact must not contain any private repository metadata.
5. **`.env` check:** browser build/output must not contain environment files or provider keys.
6. **Secret check:** inspect built JavaScript, JSON, CSV, maps, and API responses; any secret/private field fails validation.
7. **Suggested future commit name:** `refactor(public): consume versioned safe data boundary`.
8. **Pre-push check:** safe JSON/API schema, fallback behavior, anonymous preview, no source maps/private paths, and full UI smoke test pass.
9. **Report to Codex:** old/new data contract, field allowlist, endpoint list, build artifact inventory, console/network results, and rollback artifact.
10. **Rollback:** discard public changes before commit or revert with a normal corrective commit after push; restore last-known public artifact without changing private histories.

### Batch 6 — Public Removal

1. **Source local path:** exact approved removal rows in `PCS_SAFE_BOUNDARY_FILE_MANIFEST.md` inside `Planetary-common-state`.
2. **Target local repository/path:** no new copy during removal; verified private copies must already exist.
3. **Do not remove:** public UI, landing/ENTER, Observatory/Cesium assets, safe JSON/API contracts, required Pages output, or any path not on the approved manifest.
4. **`.git` check:** removal must never affect repository metadata.
5. **`.env` check:** no environment file should be involved; discovering one stops the batch for incident handling.
6. **Secret check:** run the approved current-tree scan before removal; history cleanup remains Batch 8.
7. **Suggested future commit name:** `chore(public): remove verified private-source batch` followed by the batch identifier.
8. **Pre-push check:** private copy/hash exists, public site tests pass, rollback is available, and Changes shows only approved deletions/retained replacements.
9. **Report to Codex:** deletion manifest, private evidence, Desktop Changes count, all public acceptance results, and rollback commit/artifact identifier.
10. **Rollback:** before commit discard deletions; after push use a normal revert/corrective commit restoring files from the verified private/offline source—no force push.

### Batch 7 — `docs/` Synchronization

1. **Source local path:** canonical `PCS_OBSERVATORY/` and an approved public artifact producer; verify the configured Pages source first.
2. **Target local repository/path:** the exact Pages output folder shown by GitHub Settings, likely `Planetary-common-state/docs/` based on repository history.
3. **Do not copy:** private Engine/Backend/Lab source, full state history, source maps, caches, or unreviewed roadmap content.
4. **`.git` check:** generated Pages output contains no nested metadata.
5. **`.env` check:** generated output contains no environment files.
6. **Secret check:** inspect HTML, JS, JSON, CSV, and maps before publication.
7. **Suggested future commit name:** `build(pages): regenerate observatory from canonical public source`.
8. **Pre-push check:** GitHub Settings → Pages source recorded; source/output inventory matches allowlist; anonymous/mobile preview and all site/API checks pass.
9. **Report to Codex:** Pages setting, canonical input, generated output list, source-only/docs-only/different counts, preview URL/result, and field/source-map scan.
10. **Rollback:** restore the last-known Pages artifact with a normal corrective commit or restore the prior Pages setting under an approved deployment rollback; do not improvise a new source folder.

### Batch 8 — License and Git History

1. **Source local path:** all four backed-up repositories plus an offline affected-commit/ref inventory; no Explorer file copy is the history-rewrite mechanism.
2. **Target local repository/path:** coordinated remotes only after owner/legal/security approval; this batch is not a normal Desktop copy batch.
3. **Do not copy/preserve publicly:** the historical secret blob, secret-bearing backups, or a public tag/branch retaining affected objects.
4. **`.git` check:** backups must be deliberate repository backups outside working copies; never drag `.git` folders between repositories.
5. **`.env` check:** all current and historical environment paths are included in the security inventory without exposing values.
6. **Secret check:** verify provider revocation and scan all intended refs; never paste the key into an issue, report, commit message, or screenshot.
7. **Suggested future commit name:** not applicable to the rewrite itself; any post-remediation metadata commit must be explicitly approved.
8. **Pre-push check:** collaborator freeze, backup/recovery test, affected refs, Pages/Worker recovery, legal decision, and re-clone instructions are complete.
9. **Report to Codex:** key-revocation confirmation, affected commit IDs only, backup location class (not credentials), collaborator list/status, recovery rehearsal, and approval record.
10. **Rollback:** stop before remote rewrite if any gate fails; if a coordinated rewrite fails, follow the pre-approved backup recovery plan. Do not attempt ad-hoc force pushes through GitHub Desktop.

## 4. Phase 3A Rollback Without Command Line

### Public source has not been deleted

Because Phase 3A is copy-only, the public repository remains authoritative. To abandon the private copy:

1. Select `PCS-Lab` in GitHub Desktop.
2. Confirm the Changes list contains only the intended new Phase 3A files.
3. Select those files, right-click, and choose **Discard Changes…**.
4. Confirm the warning only after reading the file count.
5. Select `Planetary-common-state` and verify it still has no changes.

### Files pasted into the wrong repository

1. Stop immediately; do not switch branches, commit, or push.
2. In GitHub Desktop select the mistaken repository and inspect **Changes**.
3. Confirm the listed additions match the accidental paste and do not include pre-existing user work.
4. Select only the accidental additions and choose **Discard Changes…**.
5. Reopen the target private repository through **Show in Explorer** before trying again.

### Committed locally but not pushed

1. Confirm the selected repository is `PCS-Lab` and the top commit is the mistaken Phase 3A commit.
2. Choose **Repository → Undo Most Recent Commit**.
3. Verify the files return to **Changes**.
4. Correct the paths or discard the new files.
5. Do not use this if later unrelated commits exist; stop and request review instead.

### Already pushed to the Private repository

1. Do not force-push and do not rewrite history.
2. Make the correction in `PCS-Lab` only: remove or relocate the mistaken private copies.
3. Review the resulting changes carefully.
4. Create a new normal corrective commit with a clear explanation and push it.
5. Confirm `Planetary-common-state` was never changed.

## 5. Codex Handoff Template

After each future manual batch, report:

- Batch and sub-batch identifier
- Public source SHA before copying
- Source repository name and full relative source paths
- Target private repository name and full relative target paths
- Expected and actual file counts
- GitHub **Private** badge verified: yes/no
- Primary remote owner/repository verified: yes/no
- Nested `.git` found: yes/no
- `.env` found: yes/no
- Real secret found: yes/no (never include the value)
- Generated/cache files excluded: list by category
- Only intended private repository shows Changes: yes/no
- Public repository still shows zero changes: yes/no
- Commit status: uncommitted / local only / pushed private
- Validation results and any failed gate
- Rollback readiness and the exact Desktop action available

If any answer is uncertain, stop at the uncommitted copy stage and do not proceed to commit, push, removal, deployment, or the next batch.
