# PCS Milky Way Human Visual Review

Status: **HUMAN ACCEPTED / PRODUCTION VERIFICATION PENDING**

Layer status: `[x] Milky Way — human visual acceptance recorded`

Evidence date: 2026-08-13

Starting/final working HEAD: `15a07fde209071b0b1356100c6bfeb3f1d91dad6`

Alvin confirmed the visual evidence on 2026-08-13. Commit, push, deployment, production verification, and the new freeze record still follow this gate. Galactic Center and Magellanic System remain navigation anchors and have not been accepted as independent scales.

## Acceptance scope

- Recalibrated Fit Milky Way and retained Face-on, Oblique, Edge-on, Focus Sun, and Back history.
- Increased disk/arm readability while preserving the black scientific visual language and keeping catalog objects visually distinct from representative tracers.
- Kept Sun, Galactic Center, LMC, and SMC visible as navigation anchors without presenting GC or the Magellanic System as completed scales.
- Reorganized Unified Object Cards into PRIMARY, SCIENTIFIC, PROVENANCE, and LIMITATIONS; only PRIMARY opens by default.
- Added one Milky Way model-time state with Observation Epoch, +1, +10, +50, and +100 Myr presets and 1× to 10,000× playback controls.
- Added differential rotation and catalog propagation without a rigid Milky Way root rotation.

## Scientific motion contract

Adopted model: `pcs-mw-differential-rotation-eilers2019-v1`, version `2026.08-human-reopen-v1`.

For eligible circular-orbit components:

`Vc(R) = 229.0 km/s - 1.7 km/s/kpc × (R - 8.178 kpc)`

`Ω(R) = Vc(R) / R`; `φ(t) = φ₀ + orientation × Ω(R) × Δt`

The Eilers et al. 2019 curve is restricted to `5 ≤ R ≤ 25 kpc`; the barred inner region is excluded. The Sun, 148 eligible HMSFR records, 2,543 disk tracers, and 1,923 arm-population tracers use this radius-dependent model. This is an axisymmetric reconstruction, not a full Milky Way N-body prediction.

Gaia EDR3/GCNS records use the documented uniform rectilinear astrometric model only when full 6D inputs exist. The cap is `|Δt| ≤ 1 Myr`; 847 records have complete velocity input and 353 remain static because 3D velocity is incomplete. Missing radial velocity is never replaced by zero.

Static by policy: Galactic Center origin, inner bar, bulge, stellar halo, spiral-arm reconstruction guide, LMC, and SMC. LMC/SMC are not attached to the rotating disk. The time UI says Model Evolution / Dynamical Reconstruction / Scientific Analysis and does not claim Exact Future.

Primary references:

- Eilers et al. 2019, *The Circular Velocity Curve of the Milky Way from 5 to 25 kpc*, DOI `10.3847/1538-4357/aaf648`.
- ESA Gaia EDR3 documentation, *Epoch transformation and propagation of astrometric data*.

## Visual and data results

At 1920×1080 face-on, the disk occupies `68.8%` of the available viewer width, all `11,000 / 11,000` disk/arm points are inside the measured view, and no main disk clipping was detected. The target was 65–80%.

| Resolution | Width coverage | Visible disk/arm | Average FPS | Lowest FPS |
| --- | ---: | ---: | ---: | ---: |
| 1920×1080 | 68.8% | 11,000 / 11,000 | 60.29 | 56.50 |
| 2560×1440 | 67.4% | 11,000 / 11,000 | 43.19 | 29.15 |
| 3840×2160 | 63.5% | 11,000 / 11,000 | 21.03 | 14.99 |
| 5120×2160 | 47.3% | 11,000 / 11,000 | 15.26 | 10.00 |
| 390×844 mobile | 90.6% | 3,800 / 3,800 mobile LOD | 60.19 | 56.50 |

The 3840×2160 and 5120×2160 width shares are below the desktop target because the full circular disk is kept unclipped inside a height-limited viewport; they are retained as measured limitations rather than hidden. The required 1920×1080 and 2560×1440 desktop targets pass.

Visibility and identity:

- Sun: visible.
- Galactic Center: visible and fixed as the reference origin.
- LMC / SMC: visible and static under Milky Way disk evolution.
- Catalog-derived records: 199 HMSFR + 1,200 Gaia/GCNS + 2 Magellanic anchors.
- Representative tracers: 11,450 on desktop; deterministic seed `4172019`; non-selectable and without invented identities.
- Visible points at desktop Milky Way LOD: 13,115.
- Model-integrated count: 4,614.
- Static-object count: 7,393.
- Incomplete-motion catalog count: 353.

The T0/+1/+10/+50/+100 Myr captures use identical camera position, direction, and up vectors. The Sun and eligible disk tracer positions change; Galactic Center, LMC, and SMC remain fixed. Play/pause advances model time without moving the camera.

## Lifecycle, browser, and regression evidence

- Automated tests: `247 / 247 PASS`.
- Stress: model-time/view changes ×30; Deep Space open/close ×20.
- Viewer: `1 → 1`.
- Cesium canvas: `1 → 1`; total canvas: `2 → 2`.
- Primitives: `12 → 12`; DataSources: `4 → 4`.
- Listener counters unchanged: changed 5, moveStart 0, moveEnd 4, postRender 2, preRender 0.
- Active RAF: `1 → 1`; Cosmic Time subscribers: `1`.
- Four-language runtime: Traditional Chinese, English, Japanese, and Korean labels/groups passed with one time state.
- Console exceptions: `0`.
- Required local network failures: `0`.
- Browser heap: 219,743,247 → 281,456,829 bytes. This is not GC-normalized and is recorded without claiming a leak-free memory bound; lifecycle object counts remained stable.

Machine-readable evidence: `../test-results/milky-way-human-review-2026-08-13/acceptance-report.json`.

## Screenshot set

- `../test-results/milky-way-human-review-2026-08-13/01-face-on-1920x1080.png`
- `../test-results/milky-way-human-review-2026-08-13/02-oblique-1920x1080.png`
- `../test-results/milky-way-human-review-2026-08-13/03-edge-on-1920x1080.png`
- `../test-results/milky-way-human-review-2026-08-13/04-sun-focus-1920x1080.png`
- `../test-results/milky-way-human-review-2026-08-13/05-face-on-2560x1440.png`
- `../test-results/milky-way-human-review-2026-08-13/06-mobile-390x844.png`
- `../test-results/milky-way-human-review-2026-08-13/MW-T0.png`
- `../test-results/milky-way-human-review-2026-08-13/MW-1Myr.png`
- `../test-results/milky-way-human-review-2026-08-13/MW-10Myr.png`
- `../test-results/milky-way-human-review-2026-08-13/MW-50Myr.png`
- `../test-results/milky-way-human-review-2026-08-13/MW-100Myr.png`

## Known limitations

- The circular model is axisymmetric and bounded to 5–25 kpc; it is not a full Galactic potential integration.
- No defensible bar/bulge pattern-speed model is adopted, so those components remain static.
- HMSFR evolution uses the adopted circular model, not a complete measured 6D phase-space solution for every record.
- Gaia linear propagation is intentionally capped at ±1 Myr; +10 to +100 Myr frames do not extrapolate Gaia stars beyond that cap.
- LMC/SMC remain catalog anchors in this stage; Magellanic System dynamics belong to a later independent acceptance stage.
- Performance figures are single local-browser observations, not a universal FPS guarantee.

## Human gate

- [x] Visual appearance accepted by Alvin — 2026-08-13.
- [x] Milky Way human acceptance recorded.
- [x] Commit authorized by the acceptance gate.
- [x] Push/deployment/production verification authorized by the acceptance gate.
- [ ] Commit/push/deployment completed.
- [ ] Production verification passed and freeze recorded.

The current state is **HUMAN ACCEPTED / PRODUCTION VERIFICATION PENDING**. The new implementation is not Production Verified/Frozen until the deployment gate passes.
