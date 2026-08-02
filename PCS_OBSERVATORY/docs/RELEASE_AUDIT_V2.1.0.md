# PCS Observatory v2.1.0 Release Audit

## Decision

**Interrupted — release candidate remains open.**

Deep Space Phase 3 is functionally complete and its catalog, lifecycle, production,
and deployment evidence passed the checks recorded below. The release is not yet
formally closed because the production Phase 3 scale heading does not rerender in
the selected language after a runtime language change. The existing acceptance
test records the stale heading but does not assert its translated value.

Consequently this audit does **not** mark Phase 3 release metadata completed, does
**not** mark v2.1.0 frozen, and does **not** begin Phase 4.

## Audit baseline

- Audit date: 2026-08-02 (Asia/Taipei)
- Audited branch: `main`
- Audited commit: `1a99ee1ff790c98bd46f616b57a3b33ba8ae1e79`
- Remote: `origin` (`uranusastudio-design/Planetary-common-state`)
- Production: <https://uranusastudio-design.github.io/Planetary-common-state/PCS_OBSERVATORY/>
- Pages source: legacy Pages build from `main` at repository root
- Latest Pages build at audit time: built from `1a99ee1ff790c98bd46f616b57a3b33ba8ae1e79`
- Production query used for preflight: `?v=2.1.0-release-audit-preflight`
- Browser: Google Chrome through OpenClaw CDP on macOS
- Desktop emulation: 1280 × 900 for Phase 3; release-center zoom checks at 100%, 67%, 50%, and 33%
- Mobile emulation: 390 × 844, device scale factor 2

Before this report was added, tracked files were clean and the branch matched
`origin/main`. `git diff` and `git diff --check` were empty. No staged files were
present.

## Commit consistency

All specified commits exist and are ancestors of the audited HEAD. Dates below are
commit dates and do not imply an order beyond the repository history.

| Role | Commit | Result |
| --- | --- | --- |
| Phase 1 feature | `74b892c4d2f8638288ed0ca150d69a57f9ded593` | ancestor of HEAD |
| Phase 2 feature | `d47397777cf5e1c8fdb74a0f542a3a3e815ebb71` | ancestor of HEAD |
| Changelog feature | `bd30bac710b32b8d6c7e056e97c6337765068f2f` | ancestor of HEAD |
| Phase 3 feature | `35fc50cca9d9cb03bea9b8eb92efa344e7709ad0` | ancestor of HEAD |
| Phase 3 evidence / audited HEAD | `1a99ee1ff790c98bd46f616b57a3b33ba8ae1e79` | HEAD and deployed Pages commit |

Direct SHA-256 comparisons matched production for `index.html`, `app.js`,
`deep-space.js`, `deep-space.css`, `milky-way-layer.js`,
`local-group-layer.js`, Phase 3 `catalog-metadata.json`, and
`data/releases.json`. This establishes alignment for the audited application and
metadata assets; it is not a cryptographic inventory of every repository file.

## Worktree and untracked-file classification

No unknown item was deleted during the interrupted audit.

| Path | Classification | Finding / disposition |
| --- | --- | --- |
| `PCS_OBSERVATORY/PCS_OBSERVATORY/` | accidental nested test-output tree / local runtime residue | Not a second application tree. It contains only `test-results/earth-viewer/` (75 files) and `test-results/deep-space-phase-3/` (4 files). The Phase 3 script defaults to `path.join(process.cwd(), "PCS_OBSERVATORY", "test-results", ...)`; running it from the application directory reproduced the nesting. Preserve until cleanup is approved as part of a passing follow-up audit. |
| `PCS_OBSERVATORY/test-results/deep-space-phase-3-production-final/` | optional archival evidence | Production Phase 3 report and screenshots; compact report overlaps tracked Phase 3 evidence, screenshots are not required source. Preserve pending evidence-retention decision. |
| `PCS_OBSERVATORY/test-results/deep-space-phase-3-production/` | optional archival evidence | Earlier production Phase 3 run; superseded by the final run. Preserve pending cleanup decision. |
| `PCS_OBSERVATORY/test-results/earth-viewer-production-28bfc39/` | optional archival evidence | Commit-specific Earth marker production evidence; outside the Phase 3 source contract. Preserve pending cleanup decision. |
| `PCS_OBSERVATORY/test-results/earth-viewer-production-bbcbc35/` | optional archival evidence | Commit-specific Earth marker production evidence; outside the Phase 3 source contract. Preserve pending cleanup decision. |
| `PCS_OBSERVATORY/test-results/earth-viewer-production-cf1a14f/` | optional archival evidence | Commit-specific Earth marker production evidence; outside the Phase 3 source contract. Preserve pending cleanup decision. |
| `PCS_OBSERVATORY/test-results/earth-viewer/` | required test artifact under the current Earth Viewer documentation, but currently untracked | `docs/EARTH_VIEWER_REPAIR.md` explicitly refers to this report, matrix, and screenshots. Do not delete until the documentation/evidence policy is resolved. |

No scanned JSON, HTML, text, or log evidence contained `/Users/...`, `file://`,
or Windows absolute paths. The repository has tracked compact evidence for the
changelog and Deep Space Phase 2/3, but no general `test-results` ignore policy.
Bulky or machine-specific evidence was not committed during this audit.

## Automated tests and validators

- Node test suite: **87 passed, 0 failed**.
- Nearby Stars validator: **23,204 tier records**, **10,000 unique deployed sources**, 22 landmark records.
- Phase 3 validator: **199 HMSFR + 102 Local Group = 301 valid catalog records**.
- `git diff --check` before audit modifications: passed.
- Tracked source scan for local absolute paths: no findings.

## Phase 1 findings

Passed in production:

- one Cesium Viewer; total page canvas count remained stable at two (one Cesium canvas plus the existing non-Cesium page canvas);
- Sun, eight planets, and the eleven-satellite registry contract;
- open/close, 20 open/close cycles, and 30 body switches;
- Scientific and Exhibition Scale notices;
- UTC controls and separate Deep Space epoch contract;
- JPL Horizons DE441 cached-vector source and orbital-element fallback;
- offline-after-load state retained nine primary bodies and displayed the offline/fallback notice;
- mobile overlay had no horizontal overflow, and close/collapse controls were reachable;
- Console exceptions: 0; required Network failures: 0.

Memory observations: the first measured heap interval increased by 9,082,300
bytes; the continued post-cycle interval increased by 360,012 bytes. These are
single-session observations and are **not** a zero-memory-leak claim.

## Phase 2 findings

Catalog and implementation contracts passed:

- Gaia EDR3 GCNS is the bounded catalog source; documented Gaia DR3 landmark supplements are separate;
- tier files contain 303 / 4,901 / 8,000 / 10,000 records;
- tier-file total is 23,204 and the nested unique union is 10,000;
- source-ID nesting and deduplication passed;
- missing radial velocity remains null;
- proper-motion analysis is bounded linear astrometric propagation at ±100 years;
- four dictionaries, search/aliases, quality, LOD, and reduced-catalog contracts passed static tests;
- production full-mode points were 312 / 4,910 / 8,000 / 10,000 because the runtime merges non-duplicate landmark supplements into the two inner rendered layers; the catalog tier counts themselves remain unchanged;
- reduced production mode rendered 22 records;
- 20 Nearby/Solar cycles and 30 focus searches passed;
- Phase 1 restored after Phase 2 and close/reopen retained one Viewer and a stable total canvas count;
- mobile rendered the configured 5,000-point cap with no horizontal overflow;
- Console exceptions: 0; required Network failures: 0.

The active Chrome configuration did not expose comparable `performance.memory`
values for this script, so Phase 2 heap values are recorded as unavailable rather
than passed.

## Phase 3 data and coordinate contract

Passed:

- Reid et al. 2019 HMSFR role and VizieR `J/ApJ/885/131/table1` source;
- McConnachie catalog role and VizieR `J/AJ/144/4/catalog` source;
- source DOI, reproducible queries, query dates, retained raw TSV files, and source metadata;
- raw HMSFR SHA-256 `9e1ed78253b93ef0471aa8e3733d5d0df3784b13eb0a0f2b96207904f674e45a`;
- raw Local Group SHA-256 `15454e33f672af4f066b767607f4a4bfbeead5e2ef82bdc1444312c146478ef5`;
- fixed right-handed frame, `R0 = 8.15 kpc`, Sun at `[-8.15, 0, 0.0208] kpc`;
- explicit ICRS → Galactic → Galactocentric transformations;
- Local Group remains heliocentric Galactic Cartesian; no precise barycenter is asserted;
- scientific coordinates remain linear and Exhibition compression is display-only;
- catalog generation is scripted and validation binds raw checksums; no evidence of hand-edited deployed coordinates was found.

## Phase 3 catalog findings

- Reid HMSFR: 199 records, unique stable IDs, finite transformed coordinates, and arm membership preserved.
- Local Group: 102 rows; 101 have catalog-derived heliocentric Galactic Cartesian positions.
- The no-distance Milky Way catalog row is named `The Galaxy`, retains null distance and null transformed position, and is not assigned fabricated catalog coordinates.
- The observer-origin Milky Way reference marker is separately documented as representative visualization.
- Missing values remain null rather than zero; distance uncertainty bounds are retained.
- Total validated Phase 3 source records: 301.

## Phase 3 production visual and lifecycle findings

Passed:

- Milky Way view rendered 201 points (199 HMSFR tracers plus Sun and Sagittarius A*), 21 line primitives, two labels, disk context, the representative 27° bar, and Reid-arm reconstruction;
- Local Group rendered all 102 catalog rows, five landmark labels, 99 available uncertainty graphics, and one representative boundary;
- M31, M33, LMC, SMC, and Sagittarius A* searches passed;
- scale isolation removed Milky Way primitives before Local Group and removed all Nearby/Milky Way/Local Group primitives on return to Solar;
- 20 Nearby → Milky Way → Local Group cycles and 30 Phase 3 focus searches passed;
- Viewer count stayed one and total page canvas count stayed two;
- desktop Phase 3 overflow checks passed at 100%, 67%, 50%, and 33%;
- 390 × 844 mobile overflow check passed;
- Console exceptions: 0; required Network failures: 0.

The one-second headless/CDP render sample measured about 3.05 FPS. This is a
constrained audit measurement, not a general performance claim. Heap increased by
21,221,070 bytes over the Phase 3 scenario; a single before/after observation is
insufficient to establish or exclude a leak.

The UI contains the required distinctions: **Catalog observation**,
**Observation-based reconstruction**, and **Representative visualization**. It
also states that the reconstruction is not an external photograph of the Milky
Way and that galaxy marker sizes are visually enhanced rather than physical
diameter scale.

## Full navigation, desktop, mobile, and accessibility

The automated production path exercised Earth/Solar entry, all four Nearby tiers,
Milky Way, Sagittarius A* / Galactic Center context, Local Group, return to
Milky Way/Nearby/Solar, close, and reopen. Magellanic landmarks LMC and SMC were
searched and focused inside the Phase 3 state machine. No second state machine,
Viewer, or scale collection survived cleanup.

Release Center layout passed all four requested desktop zoom factors and 390 × 844
mobile layout. Tabs, links, keyboard/focus attributes, modal behavior, and four
dictionary vocabularies passed automated tests. Cesium touch zoom is enabled and
the viewport is configured for application-controlled touch gestures. A physical
pinch gesture was not injected in this CDP run; that item remains **not manually
verified**, not failed.

## Console and network

Across Phase 1, Phase 2, Phase 3, and Release Center production runs:

- Console exceptions: 0
- Unhandled failures captured by the acceptance listeners: 0
- Required Network failures: 0
- Required resource 404 responses observed by the acceptance runs: 0
- Tracked application scan found no local absolute path or `file://` dependency

Optional third-party warning inventory was not promoted to a pass/fail claim
because the acceptance collectors recorded no release-blocking warning or error.

## Titania known issue

Titania remains unchanged and deferred.

- Texture SHA-256: `0072035ace144f4ae4eb0ae20739b7a94e8e870dc03e9bb290df87d0c10f15c7`
- Metadata SHA-256: `c1aa52463e34f7ecc4f8abb6c31da63d62c454986cee3c8ee676dbd33c7aa555`

The release registry and UI continue to identify the lower-hemisphere imagery
coverage/projection issue as deferred. This audit did not repair or mark it fixed.

## Release metadata consistency

Before audit closure, `data/releases.json`, `CHANGELOG.md`, Release Center text,
and `docs/CHANGELOG_SYSTEM.md` consistently keep Phase 3 in progress / pending
release audit, Phase 4 planned and not started, and Titania deferred. Production
serves the same current metadata asset as audited HEAD.

No metadata was changed to completed because the final audit conditions did not
all pass. Historical release evidence was not rewritten.

## Release blocker

The production Phase 3 acceptance report captured this language sequence after
runtime language changes:

- `zh-TW`: Level 9 heading remained `국부 은하군`; search label became `搜尋`
- `en`: Level 9 heading remained `국부 은하군`; search label became `Search`
- `ja`: Level 9 heading remained `국부 은하군`; search label became `検索`
- `ko`: Level 9 heading was `국부 은하군`; search label became `검색`

This demonstrates that dictionary selection works while the dynamic scale heading
is stale. The current acceptance assertion checks only non-empty content and
overflow, so it does not fail on the wrong language. Release metadata must remain
open until the heading rerenders correctly and the test asserts language-specific
content.

## Required follow-up

1. Correct the Phase 3 dynamic heading rerender behavior without changing Phase 3 scientific data or starting Phase 4.
2. Strengthen the Phase 3 acceptance test to assert the selected language, not only non-empty text.
3. Rerun Node tests, both catalog validators, Phase 1–3 production acceptance, full-path, mobile, desktop zoom, Console/Network, and lifecycle checks.
4. Resolve the documented untracked-evidence retention policy; remove only exact classified runtime residue after recording the decision.
5. Only if the follow-up audit passes, synchronize Phase 3 metadata to completed, set v2.1.0 Stable/frozen, create `release: finalize PCS Observatory v2.1.0`, push `origin/main`, and verify the resulting Pages commit.

## Final status

- ⏸ PCS Observatory v2.1.0 Release Audit interrupted
- 🔓 PCS Observatory v2.1.0 release candidate remains open
- Deep Space Phase 3: functionally completed; release metadata pending audit
- Deep Space Phase 4: planned; not started
- Titania: deferred known issue

## Resumed audit — runtime language synchronization fix

The original interruption above is retained as the first audit decision. The
release audit resumed on 2026-08-02 with a correction limited to runtime UI
translation synchronization.

### Root cause

The existing `pcs:languagechange` listener correctly called the shared
`translate()` function. That function updated Phase 3 controls, the navigator,
legend, and selected-object information, but it did not update
`[data-ds-level]`. `enterMilkyWay()` and `enterLocalGroup()` wrote a localized
string to that node only when entering the scale, so the active heading retained
the language that was selected at entry time.

### Minimal correction and files changed

- `deep-space.js`: added one `renderScaleTitle()` function that resolves the
  current stable `scaleContext` through the existing language dictionaries each
  time `translate()` runs. The same path covers Nearby Stars, Milky Way, and
  Local Group without reloading the Viewer or recreating Cesium collections.
- `deep-space.js`: the existing Phase 3 translation pass now synchronizes button
  tooltip/ARIA text and the Phase 3 search placeholder/ARIA label.
- `deep-space.test.js`: added a static regression contract proving that runtime
  translation invokes the scale-title renderer and resolves current dictionary
  values instead of storing a localized scale title.
- `phase3-smoke.acceptance.mjs`: replaced non-empty-only language checks with
  exact four-language assertions for the active title, navigator, Phase 4
  placeholder, information heading, search label/placeholder, selected object,
  scale context, Viewer/canvas counts, and listener state. It also checks exact
  Milky Way and Nearby Stars runtime titles and verifies that Korean text does not
  remain after returning to English.

No scientific catalog, coordinate, ephemeris, imagery, Titania, or Phase 4
implementation file was changed.

### Local resumed-audit result

- Node tests: **88 passed, 0 failed**.
- Nearby Stars validator: **23,204 tier records / 10,000 unique sources**, valid.
- Phase 3 validator: **199 HMSFR + 102 Local Group = 301**, valid.
- Exact Local Group titles:
  - `zh-TW`: `Level 9 — 本星系群`
  - `en`: `Level 9 — Local Group`
  - `ja`: `Level 9 — 局所銀河群`
  - `ko`: `Level 9 — 국부 은하군`
- Milky Way / Galactic Center, Magellanic navigator, Local Group navigator,
  Phase 4 placeholder, information heading, search placeholder/ARIA, and
  navigator ARIA values matched the approved four-language dictionaries.
- Switching Korean → English left no stale Korean Local Group text in the active
  heading.
- Active scale, selected object, Viewer count (1), total page canvas count (2),
  and tick-listener state remained unchanged across language switches.
- Desktop title/layout checks passed at 100%, 67%, 50%, and 33%.
- Mobile 390 × 844 title/layout check passed without horizontal overflow.
- Phase 1, Phase 2, and Release Center language/layout regressions passed.
- Local static-server runs recorded expected connection refusals to the absent
  development Worker at `127.0.0.1:8787`; these are separated from required
  Observatory assets and must be reevaluated on production.

### Resumed decision before deployment

The confirmed language blocker is fixed in the local release candidate. Final
closure remains pending deployment of the fix commit and production verification.
Release metadata therefore remains unchanged at this checkpoint.

### Production fix verification and release-finalization decision

GitHub Pages built fix commit
`21a1eaaed6fb6b9d4f415286fcdf4b4fcc71fce5`. Production verification at
`?v=2.1.0-language-fix` repeated the exact four-language Phase 3 acceptance:

- all Local Group, Milky Way / Galactic Center, Nearby Stars, navigator,
  information-heading, placeholder, tooltip, and ARIA assertions passed;
- the Korean → English switch left no stale Korean title;
- desktop zoom and 390 × 844 mobile checks passed;
- Viewer count remained 1 and total page canvas count remained 2;
- final scale cleanup returned to Solar;
- Console exceptions were 0;
- required Network failures were 0.

The release registry, Changelog, Release Center, and changelog-system policy were
then synchronized locally. Release Center acceptance showed Phase 1、2、3
completed, Phase 4 planned / not started, Titania deferred, v2.1.0 Stable, and
the completed Phase 3 milestone. Its desktop, mobile, four-language, Phase 1/2
regression, Console, and required-resource checks passed. Script cache-busters for
the language fix and release finalization were updated to prevent stale deployed
assets.

No classified untracked evidence was deleted or committed. Titania hashes remained
unchanged. No scientific catalog, coordinate, Phase 4 implementation, secret,
environment file, or local production path was introduced.

**Resumed Release Audit decision: passed.** The release-finalization commit may be
created and deployed. Final status becomes frozen only after GitHub Pages serves
that commit and the production Release Center verification passes.
