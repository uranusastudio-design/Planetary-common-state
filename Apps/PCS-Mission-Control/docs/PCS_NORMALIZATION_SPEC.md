# PCS Residual Normalization Specification

**Milestone:** MC-09
**Version:** v1.0 Draft
**Status:** Under Review
**Owner:** Alvin Lin
**Last updated:** 2026-07-30

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
