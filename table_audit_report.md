# UCT Table Audit Report

Date: 2026-07-04

## Scope

Audited the five requested table fragments only:

- `tables/tab01_master_notation.tex`
- `tables/tab02_observable_fields.tex`
- `tables/tab03_projection_operators.tex`
- `tables/tab04_validation_metrics.tex`
- `tables/tab05_framework_comparison.tex`

No changes were made to `main.tex`, bibliography files, figures, or the manuscript.

## Summary

Status: PASS after minor corrections.

Corrections were necessary in three table files to keep terminology and operators aligned with the cited manuscript:

- `tab01_master_notation.tex`: caption changed from "Master Notation of the Planetary Common State Framework" to "Master Notation" because "Planetary Common State" is not used in the audited manuscript text.
- `tab03_projection_operators.tex`: caption changed from "Projection Operators from Observation Space to PCS" to "Projection Operators from Observation Space" because "PCS" is not used in the audited manuscript text.
- `tab03_projection_operators.tex`: the `\mathcal{P}_V` input list was changed from `population, infrastructure, adaptive capacity` to `population, adaptive capacity`, matching the explicit operator definition in Chapter 8.
- `tab05_framework_comparison.tex`: the column heading "Planetary Common State (PCS)" was changed to "UCT" to match manuscript terminology.

## Audit Results

### 1. Symbols Defined in Manuscript

PASS. Symbols used in Table 1 and Table 3 are defined or explicitly used in the manuscript, including:

- `\mathbb{L}`
- `\mathcal{S}`
- `\mathcal{C}`
- `\pi_i`
- `L_i`
- `\mathbf{L}`
- `L`
- `F`
- `w_i`
- `\mathcal{M}_{\mathbb{L}}`
- `g_{ij}`
- `ds_{\mathbb{L}}^2`
- `V_{\mathbb{L}}`
- `\Psi`
- `\mathcal{F}`
- `\mathcal{F}_k`
- `C_{ij}`
- `\Gamma`
- `\mathcal{V}`
- `\Phi`
- `\Omega_i`
- `\Omega`
- `\mathcal{P}_i`
- `\hat{\mathbb{L}}`
- `\mathcal{H}`
- `\mathcal{U}`

### 2. No Invented Symbols

PASS after correction. Symbols from the original task examples that are not present in the manuscript, such as `S(t)`, `\Xi(t)`, `\mathcal{E}_{ij}`, and `\Phi_{ij}`, are not included.

### 3. No Invented Datasets

PASS. Table 2 uses datasets or observation sources already present in the manuscript or Appendix C, including CERES, ERA5, NOAA, Copernicus, Argo, RAPID, SOCAT, MODIS, GBIF, IUCN, Living Planet Database, UN, World Bank, IEA, national statistics, Landsat, Sentinel, GRACE, and ICESat.

### 4. No Invented Operators

PASS after correction. Projection operators in Table 3 are explicitly defined or used in Chapter 8:

- `\pi_i`
- `\mathcal{P}_i`
- `\mathcal{P}_T`
- `\mathcal{P}_F`
- `\mathcal{P}_C`
- `\mathcal{P}_S`
- `\mathcal{P}_I`
- `\mathcal{P}_V`

### 5. Terminology Matches Manuscript

PASS after correction. The table files now use UCT/manuscript terminology rather than "PCS" or "Planetary Common State."

Caveat: Table 5 retains the requested columns "Earth System Models" and "Digital Twin Earth." The manuscript text audited here does not explicitly discuss "Digital Twin Earth" by name, so the table uses the neutral phrase "Not assessed in this chapter" for that column and makes no scientific claim about it.

### 6. REVTeX Compatibility

PASS. Each file uses:

- `\begin{table}`
- `\centering`
- `\caption{...}`
- `\label{...}`
- `\begin{tabular}{...}`
- `\end{tabular}`
- `\end{table}`

Each table fragment is standalone and can be included in a REVTeX manuscript.

### 7. No Forbidden Table Environments

PASS. No file uses:

- `longtable`
- `tabularx`
- `resizebox`
- `adjustbox`

### 8. Captions Concise

PASS. Captions are concise:

- `Master Notation`
- `Representative Observable Fields`
- `Projection Operators from Observation Space`
- `Validation Metrics`
- `Comparison with Existing Earth-System Frameworks`

### 9. Labels Consistent

PASS. Labels match the required list:

- `tab:master_notation`
- `tab:observable_fields`
- `tab:projection_operators`
- `tab:validation_metrics`
- `tab:framework_comparison`

### 10. Static Syntax Check

PASS. Static checks found:

- Exactly five table files in `tables/`.
- One `table` environment per file.
- One `tabular` environment per file.
- Balanced braces in all five files.
- No extra table files.
- No missing requested files.

## Revised Files

Corrections were made only where necessary:

- `tables/tab01_master_notation.tex`
- `tables/tab03_projection_operators.tex`
- `tables/tab05_framework_comparison.tex`

No other files were modified.
