# UCT Table Insertion Report

Date: 2026-07-04

## Scope

Updated the table-placement record to follow UCT Table Placement Freeze v1.0. The prior inferred placements in temporary `main.tex` are no longer authoritative.

Generated/revised:

- `main.tex`
- `table_insertion_report.md`
- `table_placement_freeze_v1.0.md`

Not modified:

- `tables/tab01_master_notation.tex`
- `tables/tab02_observable_fields.tex`
- `tables/tab03_projection_operators.tex`
- `tables/tab04_validation_metrics.tex`
- `tables/tab05_framework_comparison.tex`
- `outputs/UCT.bib`
- figures
- any existing `references.bib`

## Source Note

No final chapter-split `.tex` files are present in the workspace. The existing `main.tex` is temporary and must not be used to determine final table placement. Temporary inferred table insertions were removed from `main.tex`; the frozen placement map is recorded in `table_placement_freeze_v1.0.md`.

## Frozen Insertions

### Table 1

- File to insert: `\input{tables/tab01_master_notation.tex}`
- Nearby reference sentence: `Table~\ref{tab:master_notation} summarizes the notation used in the framework.`
- Frozen location: Chapter 3 -- PCS Definition, after the notation and mathematical definition of PCS.
- Label referenced: `tab:master_notation`

### Table 2

- File to insert: `\input{tables/tab02_observable_fields.tex}`
- Nearby reference sentence: `Table~\ref{tab:observable_fields} summarizes representative observable fields.`
- Frozen location: Chapter 5 -- State Architecture, immediately after the discussion of observable fields.
- Label referenced: `tab:observable_fields`

### Table 3

- File to insert: `\input{tables/tab03_projection_operators.tex}`
- Nearby reference sentence: `Table~\ref{tab:projection_operators} summarizes the projection operators used here.`
- Frozen location: Chapter 5 -- State Architecture, immediately after the projection-operator section.
- Label referenced: `tab:projection_operators`

### Table 4

- File to insert: `\input{tables/tab04_validation_metrics.tex}`
- Nearby reference sentence: `Table~\ref{tab:validation_metrics} summarizes validation metrics.`
- Frozen location: Chapter 8 -- Validation, immediately after the validation methodology.
- Label referenced: `tab:validation_metrics`

### Table 5

- File to insert: `\input{tables/tab05_framework_comparison.tex}`
- Nearby reference sentence: `Table~\ref{tab:framework_comparison} summarizes the framework comparison.`
- Frozen location: Chapter 10 -- Discussion, immediately after the comparison with existing frameworks.
- Label referenced: `tab:framework_comparison`

## Static Checks

PASS.

- Temporary inferred `\input{tables/...}` insertions in `main.tex`: 0.
- Frozen placement map lists all five requested `\input{tables/...}` files.
- Frozen placement map lists one nearby reference sentence for each table label.
- Table labels remain unchanged inside the table fragments.
- No `longtable`, `tabularx`, or `resizebox` dependency was introduced.
- `main.tex` brace balance check passed.
- All five table fragments passed brace balance checks.
- No bibliography file was modified.
- No figure file was modified.

## Frozen Inputs

- `\input{tables/tab01_master_notation.tex}`
- `\input{tables/tab02_observable_fields.tex}`
- `\input{tables/tab03_projection_operators.tex}`
- `\input{tables/tab04_validation_metrics.tex}`
- `\input{tables/tab05_framework_comparison.tex}`
