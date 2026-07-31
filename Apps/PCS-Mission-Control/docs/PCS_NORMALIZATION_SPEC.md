# PCS Residual Normalization Specification

**Milestone:** MC-09
**Version:** v1.1 Draft
**Status:** Under Review
**Owner:** Alvin Lin
**Last updated:** 2026-07-31

---

## MC-09 Milestone Breakdown

| Phase | Description | Status |
|-------|-------------|--------|
| MC-09.1 | Specification template established | ✅ Completed |
| MC-09.2 | Residual scientific definitions | ⏳ Pending |
| MC-09.3 | Normalization review and approval | ⏳ Pending |
| MC-09.4 | Implementation into normalization.mjs | 🔒 Locked |

Scope:

MC-09 establishes the scientific specification only.

No normalization equation may be implemented until the corresponding residual reaches Approved status through the review process.

---

## Purpose

Define the normalization mapping for each PCS residual **before implementation**.
Only mappings **approved** here may be committed to `normalization.mjs`.

L(t) must never mix raw physical units. Every residual is normalized to `[0, 1]` (or `null` if unavailable) before entering the weighted aggregation:

```
L(t) = Σ(normalized_i · weight_i) / Σ available weights
```

---

## Approval Workflow

Each residual passes three states:

1. **Draft** — mapping proposed, not yet reviewed
2. **Review** — under scientific review by Alvin
3. **Approved** — signed off; may be implemented in `normalization.mjs`

Only **Approved** mappings are compiled into code.

---

## Specification Template

Each residual answers the following before any equation is chosen:

| Field | Meaning |
|-------|---------|
| **Raw Data** | What physical quantity is being observed? |
| **Unit** | Native measurement unit |
| **Reference Baseline** | Zero-point / preindustrial / pre-anomaly value |
| **Upper Reference** | Value that maps to `1.0` in normalized space |
| **Reasonable Range** | Physically plausible bounds |
| **Clamp?** | Should values outside range be clamped to `[0, 1]`? |
| **Linearity** | Linear, log, S-curve, piecewise? |
| **Out-of-range behavior** | What happens above upper reference? |
| **Data Source** | Concrete dataset(s) providing the raw feed |
| **Update cadence** | How often the raw feed updates |
| **Draft Equation** | Proposed mapping |
| **Assumptions** | Scientific assumptions the equation depends on |
| **Status** | Draft / Review / Approved |

---

## L_T · Thermal

| Field | Value |
|-------|-------|
| Raw Data | Global Mean Surface Temperature Anomaly |
| Unit | °C |
| Reference Baseline | 1850–1900 average |
| Upper Reference | *TBD* — candidates: 1.5 °C (Paris), 2.0 °C (IPCC AR6 threshold), 4.0 °C (RCP8.5) |
| Reasonable Range | −0.5 °C to +5.0 °C |
| Clamp? | *TBD* — proposed: yes, `clamp(0, 1)` |
| Linearity | *TBD* — proposed: linear |
| Out-of-range behavior | *TBD* |
| Data Source | NASA GISTEMP, HadCRUT5, ERA5, NOAA GlobalTemp |
| Update cadence | Monthly |
| Draft Equation | `L_T = clamp(ΔT / T_max, 0, 1)`, `T_max = 2.0` |
| Assumptions | Linear relationship between anomaly and constraint pressure up to threshold |
| Status | **Draft** |

### Residual Definition

- **Purpose:** L_T represents the thermal component of the planetary common-state constraint: the degree to which the Earth's global mean surface-temperature state has departed from a defined historical reference climate. It is a scalar summary of large-scale surface-temperature departure, not a direct temperature measurement.
- **Physical Meaning:** L_T is a normalized residual derived from a raw observation. The raw observation is the global mean surface temperature anomaly ΔT (°C) relative to a specified baseline. The residual expresses the relative position of the observed anomaly between a selected reference level and an explicitly defined upper reference used for PCS aggregation. It does not independently measure thermodynamic disequilibrium, ocean heat content, top-of-atmosphere energy imbalance, radiative forcing, local temperature, regional heatwaves, or any specific ecological, economic, or sea-level impact.
- **Scientific Scope:** L_T is a global, low-dimensional indicator intended for comparison and aggregation with the other PCS residuals. It is not a substitute for full climate diagnostics, not a forecast, not a probability of impact, and not a complete measure of the Earth's thermal state. Its scope is limited to representing normalized global surface-temperature departure within L(t).

### Normalization Philosophy

- **Design Goal:** Map the observed anomaly ΔT onto [0, 1] such that 0 corresponds to the selected historical reference level and 1 corresponds to an explicitly defined upper representational bound for PCS aggregation. The mapping must be monotonic, dimensionless, transparent, and comparable in scale with L_C, L_F, L_I, and L_S. Reaching 1 indicates index saturation only; it does not imply that the physical system cannot experience further warming or additional consequences.
- **Why this mapping?** The mapping is intended to support aggregation rather than predict impacts. Different functional forms encode different assumptions about how normalized thermal departure should change with ΔT. No single form is uniquely defensible until the purpose and interpretation of the upper reference are fixed.
- **Chosen Method:** No method has been selected. The expression `L_T = clamp(ΔT / T_max, 0, 1)` with `T_max = 2.0 °C` remains a documentary placeholder for evaluation. It is not approved and is not active in `normalization.mjs`.
- **Rejected Alternatives:** None rejected. All candidates remain subject to scientific review, sensitivity testing, and comparison with the definitions adopted for the other PCS residuals.

### Alternative Candidates

- **Candidate A — Linear with fixed upper reference**
  - Form: `L_T = clamp(ΔT / T_max, 0, 1)` for a chosen `T_max`.
  - Note on candidate upper references: `1.5 °C` and `2.0 °C` correspond to policy / risk-communication thresholds of distinct origin, while `4.0 °C` reflects a high-warming scenario scale rather than the same class of threshold. They represent different normalization philosophies about what the upper representational bound *means*, not merely different numeric parameters.
  - Advantages: transparent, easy to interpret, easy to communicate, minimal parameters.
  - Limitations: assumes constant marginal contribution per °C; sensitive to the choice of `T_max`; saturates abruptly at the upper reference with no distinction retained above it.
- **Candidate B — Convex power mapping**
  - Form: `L_T = clamp((ΔT / T_max)^p, 0, 1)`, with `p > 1`.
  - Advantages: allows the normalized residual to increase more rapidly at higher anomalies; can represent the hypothesis that additional warming becomes progressively more constraining.
  - Limitations: the exponent `p` is an additional free parameter; convexity cannot be justified from GMST alone; may over-amplify uncertainty near the upper reference.
- **Candidate C — Rescaled sigmoid**
  - Form: `L_T = clamp((S(ΔT) - S(0)) / (S(T_max) - S(0)), 0, 1)`, where `S(x) = 1 / (1 + exp[-k(x - T_mid)])`.
  - Advantages: smooth, bounded after rescaling, and capable of representing a transition region without a discontinuous slope.
  - Limitations: introduces at least two parameters; the midpoint and steepness are not directly observed quantities; different parameter choices can produce substantially different historical trajectories.
- **Candidate D — Piecewise**
  - Form: piecewise mapping defined by explicit scientific or operational criteria (e.g. empirically defined transition ranges, physical regime changes, observation-quality ranges, or documented policy thresholds).
  - Advantages: can encode known inflection points or regime boundaries directly into the mapping.
  - Limitations: discontinuities in slope require explicit justification; introduces additional parameters; the selection of breakpoints must not be assumed to coincide with physical transitions without evidence.
- **Candidate E (optional, comparison only) — Concave / logarithmic**
  - Form: `L_T = clamp( log(1 + ΔT / T_ref) / log(1 + T_max / T_ref), 0, 1)` or similar concave mapping.
  - Advantages: compresses display range at high anomalies; reduces influence of outliers.
  - Limitations: concavity implies that additional warming produces smaller marginal residual, which is difficult to justify for a "constraint pressure" interpretation. Retained only as a display-compression / sensitivity reference, not as a primary scientific candidate.

Additional design candidate (implementation-neutral, specification-level only): retain both a clamped and an unclamped normalized value as a diagnostic pair — `normalized = clamp(raw_normalized, 0, 1)` and `unclamped = raw_normalized`. Only `normalized` would enter L(t); `unclamped` would be preserved for research and diagnostics so that regimes above the upper reference are not indistinguishable. This is recorded as a specification candidate only and does not modify `normalization.mjs`.

Reason for future evaluation: selection among A–D (and treatment of E) depends on (i) what the upper representational bound is defined to mean inside the PCS index, (ii) whether L_T is intended to be interpretable in isolation or only inside the aggregate L(t), and (iii) sensitivity of L(t) to the choice, which cannot be assessed until at least two other residuals are also specified.

### Validation Strategy

- **Historical validation:** For each candidate mapping, compute L_T over the available instrumental record using a designated primary dataset. Evaluate whether the transformation preserves the observed temporal structure and long-term trend of ΔT without introducing artificial discontinuities, excessive compression, or parameter-driven artifacts. L_T is not required to be strictly monotonic because the underlying temperature anomaly contains genuine interannual variability. No validation has yet been performed.
- **Cross-dataset validation:** Recompute L_T using GISTEMP, HadCRUT5, ERA5, and NOAA GlobalTemp after aligning baseline periods and temporal resolution. Quantify the spread in L_T(t), long-term trend, and threshold-crossing dates. A quantitative tolerance criterion must be defined before inter-dataset agreement can be used as an approval test. Not yet performed.
- **Sensitivity analysis:** Vary the upper reference, functional form, and any additional parameters independently. Compare changes in the historical trajectory, present-day value, threshold timing, and eventual contribution to L(t). Distinguish parameter sensitivity from structural sensitivity. Not yet performed.
- **Uncertainty propagation:** Propagate uncertainty in ΔT and baseline estimation through each candidate mapping. For nonlinear candidates, assess whether the transformed uncertainty becomes asymmetric or disproportionately amplified near transition or saturation regions. Not yet performed.
- **Known limitations:** The 1850–1900 baseline is a selected historical convention rather than a physical zero. GMST anomaly represents only one component of the Earth's thermal state and excludes ocean heat content and top-of-atmosphere energy imbalance. Mapping to [0, 1] necessarily compresses information, while clamping makes all values above the upper reference indistinguishable unless an unclamped diagnostic value is retained separately. L_T is not a forecast, impact probability, or complete thermal-state estimate.

---

## L_F · Flow

| Field | Value |
|-------|-------|
| Raw Data | *TBD* — candidates: AMOC transport (Sv), ENSO index, global wind kinetic energy |
| Unit | *TBD* |
| Reference Baseline | *TBD* |
| Upper Reference | *TBD* |
| Reasonable Range | *TBD* |
| Clamp? | *TBD* |
| Linearity | *TBD* |
| Out-of-range behavior | *TBD* |
| Data Source | ERA5 Wind, Argo (ocean), Copernicus Marine, RAPID-MOCHA |
| Update cadence | *TBD* |
| Draft Equation | *pending residual definition* |
| Assumptions | *pending* |
| Status | **Draft — awaiting Raw Data selection** |

### Residual Definition

- **Purpose:** (TBD)
- **Physical Meaning:** (TBD)
- **Scientific Scope:** (TBD)

### Normalization Philosophy

- **Design Goal:** (TBD)
- **Why this mapping?** (TBD)
- **Chosen Method:** (TBD)
- **Rejected Alternatives:** (TBD)

### Alternative Candidates

- **Candidate A:** (TBD)
- **Candidate B:** (TBD)
- **Candidate C:** (TBD)
- **Reason for future evaluation:** (TBD)

### Validation Strategy

- **Historical validation:** (TBD)
- **Cross-dataset validation:** (TBD)
- **Sensitivity analysis:** (TBD)
- **Known limitations:** (TBD)

---

## L_C · Chemical

| Field | Value |
|-------|-------|
| Raw Data | Atmospheric CO₂ concentration |
| Unit | ppm |
| Reference Baseline | 280 ppm (preindustrial) |
| Upper Reference | *TBD* — candidates: 560 ppm (doubling), 700 ppm (RCP6.0), 1000 ppm (RCP8.5) |
| Reasonable Range | 280–1200 ppm |
| Clamp? | *TBD* — proposed: yes |
| Linearity | *TBD* — proposed candidates: linear, logarithmic (`log(ppm/280)/log(2)`), S-curve |
| Out-of-range behavior | *TBD* |
| Data Source | NOAA GML Mauna Loa, Scripps CO₂, MERRA-2 |
| Update cadence | Weekly / monthly |
| Draft Equation | `L_C = clamp((ppm − 280) / (560 − 280), 0, 1)` |
| Assumptions | Linear approximation between preindustrial and doubling threshold |
| Status | **Draft** |

### Residual Definition

- **Purpose:** (TBD)
- **Physical Meaning:** (TBD)
- **Scientific Scope:** (TBD)

### Normalization Philosophy

- **Design Goal:** (TBD)
- **Why this mapping?** (TBD)
- **Chosen Method:** (TBD)
- **Rejected Alternatives:** (TBD)

### Alternative Candidates

- **Candidate A:** (TBD)
- **Candidate B:** (TBD)
- **Candidate C:** (TBD)
- **Reason for future evaluation:** (TBD)

### Validation Strategy

- **Historical validation:** (TBD)
- **Cross-dataset validation:** (TBD)
- **Sensitivity analysis:** (TBD)
- **Known limitations:** (TBD)

---

## L_I · Informational

| Field | Value |
|-------|-------|
| Raw Data | *TBD* — candidates: NDVI global mean, GBIF biodiversity index, MODIS land cover entropy, Shannon index of species distribution |
| Unit | *TBD* |
| Reference Baseline | *TBD* |
| Upper Reference | *TBD* |
| Reasonable Range | *TBD* |
| Clamp? | *TBD* |
| Linearity | *TBD* |
| Out-of-range behavior | *TBD* |
| Data Source | MODIS NDVI, GBIF, ESA Land Cover CCI |
| Update cadence | *TBD* |
| Draft Equation | *pending residual definition* |
| Assumptions | *pending* |
| Status | **Draft — awaiting Raw Data selection** |

### Residual Definition

- **Purpose:** (TBD)
- **Physical Meaning:** (TBD)
- **Scientific Scope:** (TBD)

### Normalization Philosophy

- **Design Goal:** (TBD)
- **Why this mapping?** (TBD)
- **Chosen Method:** (TBD)
- **Rejected Alternatives:** (TBD)

### Alternative Candidates

- **Candidate A:** (TBD)
- **Candidate B:** (TBD)
- **Candidate C:** (TBD)
- **Reason for future evaluation:** (TBD)

### Validation Strategy

- **Historical validation:** (TBD)
- **Cross-dataset validation:** (TBD)
- **Sensitivity analysis:** (TBD)
- **Known limitations:** (TBD)

---

## L_S · Structural

| Field | Value |
|-------|-------|
| Raw Data | *TBD* — candidates: Antarctic + Greenland ice-mass loss (GRACE), sea-ice extent (NSIDC), land-use conversion rate |
| Unit | *TBD* (Gt/yr, %, km²) |
| Reference Baseline | *TBD* |
| Upper Reference | *TBD* |
| Reasonable Range | *TBD* |
| Clamp? | *TBD* |
| Linearity | *TBD* |
| Out-of-range behavior | *TBD* |
| Data Source | GRACE / GRACE-FO, ICESat-2, NSIDC, Global Forest Watch |
| Update cadence | *TBD* |
| Draft Equation | *pending residual definition* |
| Assumptions | *pending* |
| Status | **Draft — awaiting Raw Data selection** |

### Residual Definition

- **Purpose:** (TBD)
- **Physical Meaning:** (TBD)
- **Scientific Scope:** (TBD)

### Normalization Philosophy

- **Design Goal:** (TBD)
- **Why this mapping?** (TBD)
- **Chosen Method:** (TBD)
- **Rejected Alternatives:** (TBD)

### Alternative Candidates

- **Candidate A:** (TBD)
- **Candidate B:** (TBD)
- **Candidate C:** (TBD)
- **Reason for future evaluation:** (TBD)

### Validation Strategy

- **Historical validation:** (TBD)
- **Cross-dataset validation:** (TBD)
- **Sensitivity analysis:** (TBD)
- **Known limitations:** (TBD)

---

## Weights

Default weights are equal (`1.0` each) in `weights.json`.
Any reweighting must be justified in this document with:

- Reason (e.g. "Thermal is the most well-observed and least ambiguous residual")
- Sensitivity check (how much does the change move L(t)?)
- Approval date

Current: no reweighting approved.

---

## Version Control

| Version | Date | Change | Approver |
|---------|------|--------|----------|
| v1.0 Draft | 2026-07-30 | Initial specification skeleton with all 5 residuals in Draft state | — |
| v1.1 Draft | 2026-07-31 | Added specification template sections (Residual Definition, Normalization Philosophy, Alternative Candidates, Validation Strategy) to all five residuals. MC-09.1 completed. | Alvin Lin |

---

## Implementation Gate

**Do not modify `normalization.mjs` until at least one residual reaches `Approved` status here.**

When a residual is approved:

1. Update its `Status` in this document to `Approved`
2. Record approver + date in Version Control table
3. Replace the corresponding `return null` in `normalization.mjs` with the approved equation
4. Re-run dashboard; `L(t)` label auto-flips from **Development Value** → **PCS Unified Constraint Index** once ≥1 residual is normalized

---

## References

- Dashboard implementation: `../pcs-state-adapter.mjs`, `../normalization.mjs`, `../weights.json`
- Live endpoint: `http://127.0.0.1:4173/local-api/pcs-state`
- Governing formula (locked): `L(t) = Σ(normalized_i · weight_i) / Σ available weights`
