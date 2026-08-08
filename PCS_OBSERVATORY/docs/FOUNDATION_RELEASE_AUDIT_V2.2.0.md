# PCS Observatory v2.2.0 Foundation Release Audit

Status: **Interrupted — physical gesture acceptance pending**

Audit date: 2026-08-02

Audited deployed commit: `6f219b67ff3579b39b347ad90e3ae5f3b51c358c`

Production: https://uranusastudio-design.github.io/Planetary-common-state/PCS_OBSERVATORY/

## Scope and decision

The audit covers only Orbit Precision, Pointer-Anchored Navigation, Unified Object Cards, and their integration. Deep Space Phase 4A–4F, SITE, Titania imagery repair, and future modules remain excluded.

The three modules are functionally complete. The release-finalization decision is interrupted because physical Mac trackpad pinch and real-device mobile pinch have not been observed. Automated control-modified wheel and two-touch browser events passed, but they are not substituted for hardware evidence. Therefore Foundation remains open, v2.2.0 remains In Development, and no Foundation release commit is created.

## Verified evidence

- Node tests: 102 passed, 0 failed.
- Phase 3 catalog validator: 199 HMSFR + 102 Local Group = 301 valid records.
- Orbit production acceptance: eight planet paths and all eleven representative-satellite path states passed; toggle, highlight, UTC step, Scientific / Exhibition switching, cleanup, and restore passed.
- Pointer production acceptance: mouse wheel, control-modified wheel, emulated two-touch pinch, Solar System, Nearby Stars, Milky Way, Local Group, selection preservation, cleanup, and native zoom restoration passed.
- Object Card production acceptance: Sun, Earth, Moon, Jupiter, Europa, Proxima Centauri, Sagittarius A*, M31, M33, LMC, spiral-arm reconstruction, missing-data behavior, explicit Focus, Escape, safe links, and four exact languages passed.
- Foundation stress acceptance: 20 Deep Space close/open cycles, 30 object selections, 30 orbit switches, and 50 wheel input sequences passed.
- Desktop acceptance: 100%, 67%, 50%, and 33% passed without horizontal overflow.
- Emulated mobile acceptance: 390 × 844 passed without horizontal overflow; card Focus and Close remained reachable.
- Earth / Regional regression: Taiwan and Japan, 22 region-layer matrix cases, passed.
- Phase 3 regression: 20 lifecycle cycles, 30 searches, four languages, and scale-title synchronization passed.
- Viewer count: 1. Cesium canvas count: 1. Total page canvas count: stable at 2.
- Production console exceptions: 0. Required network failures: 0.
- Heap observation: one stress run changed from 634,895,851 to 722,871,659 bytes. This isolated sample is not evidence of either a leak or zero leakage.

## Scientific and frozen-baseline checks

- Phase 3 validator retained 301 valid records; no catalogs or coordinates changed.
- Titania texture SHA-256 remained `0072035ace144f4ae4eb0ae20739b7a94e8e870dc03e9bb290df87d0c10f15c7`.
- Titania metadata SHA-256 remained `c1aa52463e34f7ecc4f8abb6c31da63d62c454986cee3c8ee676dbd33c7aa555`.
- Titania imagery remains a deferred known issue.
- v2.1.0 remains the Stable / Frozen baseline.
- v2.2.0 is displayed as In Development in all four languages.
- Phase 4A–4F remain planning only / not started.

## Exact continuation point

On production, use a physical Mac trackpad to verify pinch-center anchoring and a real touch device at approximately 390 × 844 to verify two-finger pinch-center anchoring. Confirm selection is unchanged, the camera stops after input, there is no surface penetration or scale jump, Viewer / canvas counts remain stable, and Console / required Network failures remain zero. If both pass, update Foundation metadata to completed, freeze Foundation, run the final pre-commit review, and create `release: complete v2.2.0 foundation`.

## v2.2.0 Earth → Deep Space marker ownership correction

Human review identified an Earth-owned blue point inside the 100 pc star field. The exact reproduced object is a Cesium `PointGraphics` entity with ID `global:visitor-locations:TW|Taiwan|Taipei|25.033|121.5654`, owned by `app.js` in the `visitorDataSource` CustomDataSource. Its creation path is `refreshVisitorLocations → renderVisitorLocations → upsertGeographicEntity`. It is not a Deep Space star, selection ring, or direct scene primitive.

Root cause: opening Deep Space hid the globe and imagery but did not suspend pre-existing Earth-owned DataSources or the shared geographic-marker renderer. `activeCelestialTargetId` remained `earth`, so visitor visibility logic could keep the source visible. A late visitor-location response could also call the render path after Deep Space had opened.

The v2.2.0 correction establishes an explicit Earth render-ownership contract:

- Deep Space deactivates Earth geographic rendering before changing the camera or enabling target layers.
- Existing non-Deep-Space DataSource visibility is saved and disabled at the transition boundary, then restored on close.
- Existing and newly upserted geographic entities respect the suspended owner state.
- Visitor, Earth-layer, and replay paths require an active Earth render context.
- Async visitor and Earth-layer completions compare a render-context generation before mutating the scene.
- Returning to Earth restores the saved camera and source visibility; geographic horizon/occlusion rules are recalculated.

The reusable rule is: **no primitive or DataSource owned exclusively by another scale context may remain rendered after that context is deactivated**. This is transition-driven and adds no per-frame walk through Earth markers.

Local automated evidence covers the exact object identity, 10/25/50/100 pc, Milky Way, Local Group, Earth restoration, 30 complete transition cycles, and a delayed visitor-response race. Production verification must be recorded before this bug is marked fixed. This correction does not close the still-open Foundation physical-gesture audit.
