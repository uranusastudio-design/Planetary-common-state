# PCS Milky Way — Dynamics + Observational Asymmetry Audit

Audit date: 2026-08-13
Starting and current HEAD: `57d727c9d3c5124219d24ce8ea603144e43885ee`
Status: **READY FOR HUMAN VISUAL REVIEW — MILKY WAY NOT COMPLETE**

This audit reopens the prior Milky Way acceptance. No commit, push, deployment, production verification, completion mark, or freeze has been performed. Galactic Center work has not started.

## 1. Audit scope and acceptance boundary

This pass answers two human-review questions:

1. Does PCS use scientifically bounded differential Galactic motion rather than a rigid rotation of the entire Milky Way?
2. Which scientific or rendering population produces the apparent excess density on the Sun / Local-Arm side?

It also adds a traceable Kepler observational layer so that observed stars, Kepler targets, confirmed hosts, candidates, reconstructions, and representative tracers can be inspected independently.

Automated PASS is evidence only. Human acceptance is still required.

## 2. Coordinate and reference-frame contract

PCS uses `pcs-galactocentric-gravity2019-v2`:

- Origin: adopted Galactic Center / Sagittarius A* reference.
- `+x`: from the Sun toward Galactic longitude `l = 0°`; the Sun is initially on negative `x`.
- `+y`: heliocentric Galactic longitude `l = 90°` direction.
- `+z`: IAU Galactic North Pole.
- Sun initial position: `[-8.178, 0, 0.0208] kpc`.
- Display frame: Galactic Center fixed; **not** Sun co-moving.
- Observation measurements remain separate from derived Galactocentric display coordinates.

Face-on audit quadrants are defined as:

- Q1: `x ≥ 0, y ≥ 0`
- Q2: `x < 0, y ≥ 0`
- Q3: `x < 0, y < 0`
- Q4: `x ≥ 0, y < 0`

In the fixed face-on camera, screen-left corresponds to negative Galactocentric `x`, which is the Sun side.

## 3. Differential Galactic dynamics

### 3.1 Adopted model

- Model ID: `pcs-mw-differential-rotation-eilers2019-v1`
- Model version: `2026.08-human-reopen-v1`
- Rotation-curve source: Eilers et al. (2019), DOI `10.3847/1538-4357/aaf648`
- Adopted radial support: `5–25 kpc`
- Method: axisymmetric differential circular rotation
- Integration: analytic angular evolution of the adopted circular model
- No `rotate(milkyWayRoot)` or common angular rate is used.

For a supported model object:

```text
omega(R) = Vc(R) / R
theta(t) = theta0 + orientationSign × omega(R) × deltaT
x(t) = R cos(theta(t))
y(t) = R sin(theta(t))
```

This is a documented dynamical reconstruction, not an exact future prediction and not a general Galactic orbit integrator.

### 3.2 Numerical proof of differential rotation

All three diagnostics start at `theta0 = π`, use the same fixed camera, and keep their Galactocentric radius constant.

| Diagnostic | R (kpc) | Vφ (km/s) | ω (rad/Myr) | Δθ 1 Myr | Δθ 10 Myr | Δθ 50 Myr | Δθ 100 Myr |
|---|---:|---:|---:|---:|---:|---:|---:|
| Inner disk | 6.000 | 232.7 | 0.039665 | -2.27° | -22.73° | -113.63° | -227.26° |
| Solar radius | 8.178 | 229.0 | 0.028638 | -1.64° | -16.41° | -82.04° | -164.08° |
| Outer disk | 12.000 | 222.5 | 0.018963 | -1.09° | -10.87° | -54.33° | -108.65° |

Therefore `omega(6 kpc) != omega(8.178 kpc) != omega(12 kpc)`. The three points visibly diverge in angular displacement.

### 3.3 Sun audit

- Initial Galactocentric position: `[-8.178, 0, 0.0208] kpc`.
- Circular velocity: `229 km/s` from the adopted curve.
- Propagation: the same radius-dependent circular model as supported disk populations.
- Reference origin: Galactic Center remains fixed.
- At +10, +50, and +100 Myr the Sun moves relative to Galactic Center.
- The UI explicitly labels the result `Model Evolution` / `Dynamical Reconstruction` and states that it is not an exact or guaranteed prediction.

### 3.4 Population motion policy

| Population | Motion policy | Reason / limitation |
|---|---|---|
| Sun | Model-integrated circular orbit | Supported by adopted rotation curve; not a full orbit integration |
| HMSFR | Model-integrated where `R` is inside 5–25 kpc | Original Reid catalog measurements retained; 51 unsupported-radius records remain static |
| Thin/thick disk representative points | Differential circular model where supported | Representative, non-selectable, no fake star identity |
| Spiral-arm representative population | Differential circular model where supported | Moving points remain separate from static arm guides |
| Gaia observed stars | Uniform rectilinear catalog propagation only with complete 6D input | Capped at ±1 Myr; not forced into disk rotation |
| Kepler targets with Gaia 6D | Uniform rectilinear catalog propagation | Capped at ±1 Myr; Kepler and Gaia identities both preserved |
| Missing radial velocity | Static / insufficient motion data | `null` remains unavailable; zero is never substituted |
| Galactic bar / bulge | Static | No pattern-speed model adopted |
| Stellar halo | Static | Never inherits disk rotation |
| Spiral-arm guides | Static observation-derived reconstruction | A structure guide is not a stellar orbit |
| Galactic Center / Sgr A* | Static reference origin | Coordinate reference |
| LMC / SMC | Static catalog anchors | No Magellanic orbital integration in this Milky Way overview; never attached to disk rotation |

Current desktop audit motion inventory:

- Model-integrated rotating population: 4,617 points plus the Sun.
  - 148 HMSFR
  - 2,546 supported representative disk points
  - 1,923 supported representative arm-population points
- Gaia / GCNS: 847 complete 6D and propagatable; 353 incomplete and static.
- Kepler deployed database: 1,083 complete 6D; 11,636 incomplete and static.
- Current desktop render debug total: 14,469 static objects and 7,429 objects specifically classified as insufficient-motion-data. These runtime totals are view/LOD scoped and must not be interpreted as whole-catalog counts.

For offsets beyond ±1 Myr, Gaia/Kepler uniform linear propagation is clamped at ±1 Myr. The star does not continue following the Sun to +10/+50/+100 Myr; this prevents a false long-horizon Galactic-orbit claim.

## 4. Observational density asymmetry

### 4.1 Counts by quadrant

Populations are counted independently and are not normalized together.

| Population | Q1 | Q2 | Q3 | Q4 | Classification |
|---|---:|---:|---:|---:|---|
| Gaia observed stars | 0 | 599 | 601 | 0 | Catalog-derived, heliocentric ≤100 pc sample |
| HMSFR | 12 | 164 | 23 | 0 | Catalog-derived |
| Kepler targets | 14 | 12,705 | 0 | 0 | Observation-derived mission footprint |
| Kepler confirmed hosts | 0 | 1,978 | 0 | 0 | Multi-catalog observation-derived |
| Kepler candidate hosts | 0 | 1,628 | 0 | 0 | Observation-derived; not confirmed |
| Catalog anchors | 1 | 1 | 0 | 0 | Adopted/catalog references |
| Arm reconstruction population | 234 | 2,122 | 244 | 0 | Observation-derived reconstruction |
| Representative density tracers | 2,501 | 1,925 | 2,444 | 1,980 | Deterministic representative visualization |

Representative components remain separately inspectable:

| Component | Q1 | Q2 | Q3 | Q4 |
|---|---:|---:|---:|---:|
| Thin disk | 1,264 | 1,288 | 1,300 | 1,348 |
| Thick disk | 321 | 303 | 287 | 289 |
| Galactic bar | 359 | 93 | 347 | 101 |
| Galactic bulge | 434 | 129 | 407 | 130 |
| Stellar halo | 123 | 112 | 103 | 112 |

### 4.2 Diagnosis

The visible asymmetry has more than one cause:

1. **HMSFR observational sampling — present cause.** Reid HMSFR measurements are strongly concentrated on the Sun side in the adopted coordinates. They are not azimuthally complete and must not be mirrored.
2. **Source-bounded spiral reconstruction — principal visible cause.** The published segment ranges represented by PCS contain 2,122 reconstruction population points in Q2. The reconstruction is bounded by source fits rather than completed into a decorative symmetric galaxy.
3. **Gaia heliocentric geometry — real selection effect, not the whole-Galaxy brightness cause.** All 1,200 deployed GCNS stars lie within 100 pc of the Sun, so all appear on the Sun side at Galactic scale. The whole-Galaxy renderer distance-fades them to zero; the Gaia-only fixed-camera screenshot confirms that they do not create the current bright arms.
4. **Kepler footprint — real mission selection effect.** Kepler targets occupy a narrow sky field. They are shown only through independent debug toggles and are not normalized with Gaia, HMSFR, or representative density.
5. **Representative model — not the false-asymmetry source.** Thin disk, thick disk, and halo counts are approximately quadrant-balanced. Bar/bulge asymmetry follows their adopted orientation.
6. **Dust/extinction and catalog completeness — relevant upstream selection effects, not corrected in this pass.** PCS preserves the supplied catalog samples; it does not infer an extinction-corrected all-sky stellar density from these bounded inputs.
7. **Camera clipping / LOD / random sampling bug — not supported by evidence.** Fixed-camera layer-only captures show the expected populations without edge clipping. Representative points are deterministic, generated once per layer load, and remain approximately balanced.

Conclusion: the left/Sun-side structure must **not** be cosmetically symmetrized. The strongest visible causes are the HMSFR footprint and the bounded reconstruction geometry, not an observed complete Galactic stellar-density map.

## 5. Kepler observational layer

### 5.1 Sources and snapshot contract

Retrieval date: `2026-08-13`

- NASA Exoplanet Archive `q1_q17_dr25_ks`: Kepler Q1–Q17 DR25 stellar table.
- NASA Exoplanet Archive `cumulative`: cumulative KOI table, preserving confirmed/candidate/false-positive dispositions.
- NASA Exoplanet Archive `ps`: default confirmed planet solutions discovered by Kepler.
- Gaia DR3 `gaiadr3.gaia_source`: exact `source_id` lookup for IDs supplied by the NASA Exoplanet Archive.
- Kepler source coordinates remain ICRS/J2000; Gaia cross-match astrometry remains Gaia-CRF3/ICRS J2016.0.
- The cross-match does not perform an unpublished angular guess: it follows `ps.gaia_dr3_id`, then retrieves that exact Gaia DR3 source ID.

Exact TAP queries, batch queries, retrieval date, source URLs, original values, input checksums, and limitations are embedded in:

`assets/deep-space/milky-way-kepler/kepler-observed-stars.json`

Snapshot SHA-256: `4113e1d8685046c3d35ee8acbc321e8e22d88a31260bcce4604e6d28093d5393`

### 5.2 Counts and deterministic LOD

- Upstream Q1–Q17 DR25 stellar rows: 200,038.
- Footprint coordinates available: 199,991.
- Deployed traceable records: 12,719.
  - 9,113 deterministic ordinary target sample
  - 1,978 confirmed hosts
  - 1,628 candidate-only hosts
- Gaia DR3 identities: 1,933.
- Complete 6D records: 1,083.
- Incomplete 3D velocity: 11,636.
- Confirmed planets represented in the snapshot: 2,778.
- Planet candidates: 1,972.
- False-positive KOIs retained as status metadata: 4,736.

Database sampling policy:

- Include every record with KOI / confirmed / false-positive context.
- Add the deterministic field sample `MOD(kepid,40)=0`.
- Renderer uses additional device/scale bounds without changing catalog identity.
- The renderer never attempts to draw the complete Gaia or KIC catalogs simultaneously.

The Kepler field outline is the convex envelope in a local tangent plane of all available DR25 target coordinates. It is labeled as an angular observation-footprint guide, not a physical cone or Galactic volume.

### 5.3 Identity, status, and cards

- KIC, Kepler, KOI, and Gaia DR3 identities are preserved concurrently.
- Confirmed planets, candidates, and false positives are never collapsed into one status.
- Missing radial velocity is displayed as unavailable, never `0`.
- Search was browser-validated with `Kepler-10`, `KIC 8120608`, and `Gaia DR3 2079000330051813504` (Kepler-186 Gaia identity).
- Object Cards expose original coordinates, catalog epochs, motion mode, catalog/release, uncertainty, source, and limitations.
- Priority validation records Kepler-10, Kepler-11, Kepler-22, Kepler-62, Kepler-90, Kepler-186, and Kepler-452 are present because they resolve from the authoritative snapshot, not because an example list was blindly hard-coded.

## 6. Debug science mode

The existing one-viewer Milky Way panel now exposes independent controls for:

- Gaia observed stars
- HMSFR catalog
- arm reconstruction population
- representative tracers
- Local Arm
- spiral-arm guides
- Kepler field
- Kepler targets
- confirmed planet hosts
- planet candidates
- dynamics diagnostics

The diagnostic table is transposed so all values fit inside the right-side panel without horizontal clipping. Traditional Chinese, English, Japanese, and Korean use the existing runtime language state.

## 7. Validation results

- Node tests: `252 / 252 PASS`.
- Fixed face-on camera: identical position, direction, and up vector at Observation Epoch, +10, +50, and +100 Myr.
- Diagnostic points at 6, 8.178, and 12 kpc move to four distinct positions and diverge from each other.
- Kepler search and Object Cards: PASS.
- Four-language runtime: PASS.
- Mobile 390×844: no horizontal page overflow.
- Average FPS during bounded desktop sample: `60.22`.
- Lowest observed FPS: `56.50`.
- Viewer: `1`.
- Cesium canvas: `1`.
- Primitives: `17 → 17`.
- DataSources: `4 → 4`.
- Required console exceptions: `0`.
- Required network failures: `0`.
- Lifecycle cycles in this bounded gate: `12`.

Machine-readable evidence:

- `test-results/milky-way-dynamics-asymmetry-audit-2026-08-13/scientific-audit.json`
- `test-results/milky-way-dynamics-asymmetry-audit-2026-08-13/acceptance-report.json`

## 8. Visual evidence

All desktop comparison frames use the same face-on camera:

- `00-science-debug-ui.png`
- `00b-dynamics-diagnostics-table.png`
- `01-observation-epoch.png`
- `02-10Myr.png`
- `03-50Myr.png`
- `04-100Myr.png`
- `05-gaia-only.png`
- `06-hmsfr-only.png`
- `07-reconstruction-only.png`
- `08-representative-only.png`
- `09-kepler-field-targets.png`
- `10-confirmed-hosts.png`
- `11-planet-candidates.png`
- `12-all-combined.png`
- `13-mobile-390x844.png`
- `14-T0-vs-100Myr-difference.png`
- `15-T0-vs-100Myr-enhanced-difference.png`

The difference images prove pixel-state change under a fixed camera. They are visual diagnostics only and do not independently establish scientific validity; the numerical population-specific audit provides that evidence.

## 9. Known scientific limitations

- Circular evolution is an axisymmetric reconstruction, not a full Galactic potential integration.
- No covariance or orbit ensemble is propagated to +100 Myr.
- Gaia/Kepler uniform rectilinear motion is capped at ±1 Myr.
- Bar and bulge pattern speed is not modeled.
- Halo orbits are not integrated.
- LMC/SMC dynamics are outside this Milky Way overview acceptance and remain static anchors.
- HMSFR circular motion is a model application; its measured astrometry is preserved separately.
- The Kepler footprint is derived from target coordinates, not a spacecraft focal-plane polygon product.
- NASA Exoplanet Archive TAP tables are live services; reproducibility comes from the recorded retrieval date, queries, deployed snapshot, and checksum.
- Gaia, HMSFR, and Kepler selections are not completeness-corrected maps of the entire Galaxy.
- No claim is made that +100 Myr is a precision prediction.

## 10. Human gate

Current authoritative state:

`[ ] Milky Way — NOT COMPLETE / READY FOR HUMAN VISUAL REVIEW`

No further scale work is authorized until the human confirms:

- differential rotation is scientifically acceptable;
- motion is visually observable at the intended model-analysis timescales;
- Sun motion and fixed Galactic-Center frame are correct;
- observed stars, Kepler populations, reconstructions, and representative tracers are distinguishable;
- the documented observational/reconstruction causes explain the asymmetry;
- no false clipping, LOD, or resampling structure is present.
