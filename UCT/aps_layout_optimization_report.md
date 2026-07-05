# APS Layout Optimization Report

Date: 2026-07-04

Project: `UCT/`

## Scope

Optimized layout only. Scientific content, equations, references, captions, labels, and figure files were not changed.

## Figure Layout

- Converted Figures 1--7 to APS-compatible placement with `\begin{figure}[tb]`.
- Preserved Figures 1--7 at `width=\columnwidth`.
- Converted Figure 8 to `\begin{figure*}[tb]` for full-width placement while using the requested height-based scaling:

```tex
\includegraphics[height=0.82\textheight,keepaspectratio]{figures/fig08_realtime_dashboard.png}
```

- No `[H]` float placement was introduced.
- Figure labels and captions were preserved.

## Table Layout

- Converted all six table floats to `[tb]` placement to reduce orphan-table risk.
- Added `\footnotesize` inside each table float for one-column APS fit.
- Shortened table cell text where needed for layout.
- Shortened obvious dataset names in the appendix data-source table:
  - `Living Planet Database` to `LPD`
  - `National energy statistics` to `Energy statistics`
  - `National statistics` to `Statistics`
- Preserved all table captions and labels.
- Retained conservative REVTeX `ruledtabular` format.

## Static Verification

- [x] Figures 1--7 use `figure[tb]`.
- [x] Figures 1--7 use `width=\columnwidth`.
- [x] Figure 8 uses `figure*[tb]`.
- [x] Figure 8 uses `height=0.82\textheight,keepaspectratio`.
- [x] No `[H]` figure placement.
- [x] All table floats use `[tb]`.
- [x] All tables include `\footnotesize`.
- [x] No `p{...}` column types.
- [x] No `tabularx`.
- [x] No `longtable`.
- [x] No `resizebox`.
- [x] No `makecell`.
- [x] No `arraybackslash`.
- [x] No missing graphics.
- [x] No undefined references.
- [x] No duplicate labels.

## Counts

- Single-column figures: 7
- Full-width figures: 1
- Tables optimized: 6
- Labels: 14
- References: 14
- Undefined references: 0
- Duplicate labels: 0

## Final Status

PASS. The manuscript layout has been optimized for APS-style float behavior and one-column table fit without changing scientific content, equations, references, captions, labels, or figure files.
