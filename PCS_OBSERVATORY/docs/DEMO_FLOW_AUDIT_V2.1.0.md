# PCS Observatory v2.1.0 Demo Flow Audit

## Decision

**Passed — v2.1.0 is ready for an external demonstration and remains frozen.**

No Critical, Security, Browser compatibility, or Demo blocker was found. No
production code, scientific data, SITE content, video asset, Titania asset, or
Phase 4 implementation was changed. The only repository changes from this task
are the two Demo Flow documents.

## Audit baseline

- Audit date: 2026-08-02 (Asia/Taipei)
- Branch: `main`
- Audited and deployed commit: `9dde3c083e24129ff6c1938c6134db870535511c`
- Production: <https://uranusastudio-design.github.io/Planetary-common-state/PCS_OBSERVATORY/>
- Browser: Google Chrome through an existing OpenClaw CDP session on macOS
- Desktop viewport: 1280 × 720; zoom checks at 100%, 67%, 50%, and 33%
- Mobile emulation: 390 × 844, device scale factor 2
- Pages status at baseline: built from the audited commit

The tracked worktree was clean before documentation was added. Existing untracked
test-output and nested evidence paths retained their prior Release Audit
classification and were not deleted, modified, staged, or committed.

## Version and release metadata

Production Release Center and `data/releases.json` agreed:

- v2.1.0: Stable
- Deep Space Phase 1, 2, and 3: completed
- Deep Space Phase 4: planned / not started
- Titania: deferred known issue
- v2.2.0 was not displayed as In Development

Latest, Changelog, Roadmap, and Release Notes rendered with working deployment,
commit, and documentation links. The Release Center stayed readable at all tested
desktop zooms and at 390 × 844.

## Full path result

The following production path was exercised directly or by the release’s focused
acceptance flows:

```text
PCS Observatory / Earth
→ Taiwan
→ Japan
→ Planetary System
→ Representative Natural Satellites
→ Deep Space / Solar System
→ Nearby Stars 10 / 25 / 50 / 100 pc
→ Milky Way
→ Galactic Center
→ Magellanic System
→ Local Group
→ Release Center
→ Solar System / Observatory
```

Ten additional demonstration cycles traversed the representative Earth/planetary
and satellite selections, Nearby Stars 10 pc, Milky Way, Local Group, the return
path, and Deep Space close. All ten completed without a failed transition or stale
active Deep Space state. Observed cycle durations in headless Chrome ranged from
1.073 to 4.626 seconds after resources had loaded; these figures are diagnostic,
not end-user performance guarantees.

## Earth and Regional Mode

### Earth

- One real Cesium WebGL viewer was present and the startup error panel was absent.
- Earth controls, Reset, pin, expand, and restore were reachable.
- Regional layer activation preserved the numeric camera position, orientation,
  and height.
- Console exceptions: 0.
- Required Network failures: 0.

### Taiwan and Japan

The production Earth acceptance loaded both region profiles. Recent-earthquake and
coastal-station demonstrations passed in each region:

- Taiwan: 3 earthquake markers and 5 coastal-station markers.
- Japan: 25 earthquake markers and 4 coastal-station markers.
- Stable coordinates, labels, far-side occlusion, duplicate prevention, and stale
  previous-region cleanup passed.

Wildfire authorization and browser geolocation were not exercised because they
require additional authorization/permission. They are not part of the recommended
Demo route and are recorded as unverified, not failed.

## Planetary System

Production selections passed for the Sun and all eight planets. The recommended
Earth → Mars → Jupiter → Saturn → Neptune route updated the active control, camera
focus, title/status, and information panel while Viewer and canvas counts remained
stable. No startup, texture-load, white-sphere, black-sphere, or transparent-sphere
error was reported during the production run.

## Representative natural satellites

All eleven registered selections returned a named information record and a
visualization status while maintaining the shared Viewer:

Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Titania,
and Triton.

The concise Demo route is Moon → Europa → Titan → Triton. Titania was verified
only as a registered deferred item and is excluded from the main route. Its assets
were unchanged:

- Texture SHA-256: `0072035ace144f4ae4eb0ae20739b7a94e8e870dc03e9bb290df87d0c10f15c7`
- Metadata SHA-256: `c1aa52463e34f7ecc4f8abb6c31da63d62c454986cee3c8ee676dbd33c7aa555`

## Deep Space Phase 1

- Open, close/reopen, UTC state, Play/Pause contract, focus, Scientific Scale, and
  Exhibition Scale passed.
- Sun plus eight planets remained available.
- Scale notices distinguished linear scientific scale from compressed exhibition
  scale.
- Offline-after-load retained nine primary bodies and displayed the documented
  cached-ephemeris / orbital-approximation fallback notice.
- The deliberate offline test produced one expected
  `ERR_INTERNET_DISCONNECTED`; it is separated from online production failures.
- Twenty open/close cycles and thirty body switches passed in the focused Phase 1
  acceptance.

## Nearby Stars / Phase 2

- 10 pc: 312 rendered records in the acceptance layer (303 catalog-tier rows plus
  merged/supplemental display records under the existing contract).
- 25 pc: 4,910 rendered records.
- 50 pc: 8,000 rendered records.
- 100 pc: 10,000 rendered records.
- Reduced mode: 22 representative records.
- Proxima Centauri and Barnard’s Star exact searches, selection, aliases,
  information, quality state, LOD, labels, and bounded proper-motion controls
  passed.
- Focused load observations were 685 ms, 1,707 ms, 2,223 ms, and 2,005 ms for the
  four tiers in this headless session. These are observations, not service-level
  guarantees.
- Twenty scale cycles and thirty focus runs passed; Phase 1 remained functional.

## Milky Way, Magellanic System, and Local Group / Phase 3

- Milky Way rendered 201 scene records, including the Sun and Galactic Center
  context, with 199 HMSFR tracers available under the catalog contract.
- Sagittarius A*, labels, search, reconstruction toggle, and the
  “observation-based reconstruction — not an external photograph” distinction
  passed.
- Magellanic System navigation exposed LMC and SMC within the Phase 3 route.
- Local Group loaded 102 catalog rows, 5 primary labels, and 99 finite uncertainty
  renderings; catalog, uncertainty, full/reduced, search, M31, M33, and return flows
  passed.
- Focused load observations: Nearby 10 pc 127 ms, Milky Way 632 ms, Local Group
  215 ms.
- Twenty Phase 3 lifecycle cycles and thirty searches passed with final cleanup
  returning to Solar.

## Desktop and mobile

At 100%, 67%, 50%, and 33% desktop zoom, the main controls, title, Deep Space
entry, Release Center controls, information content, and close/return flow stayed
reachable without horizontal document overflow. Recommended recording zoom is
100%; 67% is an optional overview setting. Text becomes unnecessarily small at
50% and 33%, even though layout acceptance passes.

At 390 × 844, Earth controls, planetary controls, the Deep Space entry, Nearby
Stars, Phase 3, close/return controls, and Release Center remained reachable with
no horizontal document overflow or trapped modal path. Cesium zoom remained
enabled. Browser emulation confirms the touch input contract, but it does not
measure real-device gesture comfort; physical-device rehearsal remains advisable.

## Four-language result

Traditional Chinese, English, Japanese, and Korean runtime switching passed for
Nearby Stars, Milky Way, Galactic Center, Magellanic System, Local Group, Deep
Space controls, and Release Center tabs/status. Local Group exact active titles
were:

- Traditional Chinese: `Level 9 — 本星系群`
- English: `Level 9 — Local Group`
- Japanese: `Level 9 — 局所銀河群`
- Korean: `Level 9 — 국부 은하군`

Navigator labels, search placeholder, information heading, tooltip/ARIA state,
and active scale stayed synchronized. No stale Korean title remained after
switching away. Canonical object names such as Proxima Centauri, Sagittarius A*,
M31, and M33 remained canonical rather than being rewritten as new scientific
identifiers.

## Stability, Console, Network, and memory

- Cesium Viewer count: 1 throughout.
- Total page canvas count: 2 throughout (one Cesium canvas plus one existing
  non-Cesium page canvas).
- Required online production Console exceptions: 0.
- Required online production Network failures: 0.
- Focused Phase 1, Phase 2, and Phase 3 lifecycle cleanup passed.
- Ten complete representative Demo cycles passed.
- The custom ten-cycle interval measured heap growth of 12,659,096 bytes before
  and after forced collection. The focused Phase 3 interval measured a decrease of
  27,940,264 bytes, while focused Phase 1 showed an initial increase of 8,196,748
  bytes and a subsequent interval increase of 1,258,360 bytes.

These heap values depend on browser caching, catalog residency, garbage collection,
and headless rendering. They do not prove either a leak or zero memory leakage.

## Accessibility observations

Keyboard/focus behavior, modal focus containment, close controls, tab selection,
ARIA labels, and four-language interface vocabulary passed the automated release
tests. Visual readability and control reachability passed the tested desktop and
mobile layouts. This Demo Flow Audit did not perform a complete WCAG conformance
assessment or screen-reader study.

## Automated regression result

The full PCS Observatory Node test suite passed: **88 tests, 0 failures**. This
included the single-Viewer contract, Phase 1–3 registries and coordinates,
runtime language synchronization, Release Center schema/accessibility, imagery
provenance, and local-path scans.

## Classification

### Release blockers

None found.

### Demo blockers

None found.

### Non-blocking UX observations

- Live regional providers can make Demo timing variable.
- Dense labels and long information cards make mobile less suitable for a polished
  2–3 minute recording than desktop.
- At 50% and 33% zoom the layout remains functional but text is too small for a
  comfortable public presentation.
- The full control set is scientifically useful but too dense for a short Demo;
  the script therefore selects only two or three explanatory toggles.

No UX modification was made because frozen v2.1.0 permits only Critical,
Security, or Browser compatibility fixes.

### Deferred / outside scope

- Titania imagery repair.
- Deep Space Phase 4A–4F.
- Comets, asteroids, spacecraft paths, orbit-uncertainty bands, and civilization
  analysis.
- SITE changes and video production.

## Final decision

The production v2.1.0 path is coherent and suitable for the 90-second, 2-minute,
and 3-minute scripts in `DEMO_FLOW_V2.1.0.md`. The release remains Stable / Frozen.
The next external status remains `v2.2.0 — Planned`; Phase 4A is not In
Development.

```text
PCS Observatory v2.1.0 Demo Flow Audit — completed
v2.1.0 — Stable / Frozen
v2.2.0 — Planned
Phase 4A–4F — Planning only / not started
```
