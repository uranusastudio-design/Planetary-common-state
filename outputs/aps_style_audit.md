# APS Style Audit v1.0

Date: 2026-07-04

Project audited: `UCT/`

## Scope

Publication-style static audit for APS Physical Review / REVTeX conventions. No manuscript text, equations, captions, labels, references, figures, or tables were modified.

## Overall Assessment

Static REVTeX compatibility is generally sound. The manuscript uses `revtex4-2`, APS/PRE options, APS bibliography style, standard figure/table environments, balanced math delimiters, and resolved citations/cross-references.

The main APS-style issues are not compile blockers. They are presentation-level concerns: explicit "Chapter" headings, draft-like "Chapter question" lines with checkmarks, unnumbered display equations, several unused BibTeX entries, and full-width figure placement for all figures.

## REVTeX Setup

- Status: PASS
- Document class: `revtex4-2`
- Options: `aps,pre,reprint,superscriptaddress,nofootinbib`
- Bibliography style: `apsrev4-2`
- Packages detected: `amsmath`, `amssymb`, `array`, `graphicx`, `fontenc`, `inputenc`
- No obvious package conflicts detected.
- No `caption`, `subcaption`, `subfigure`, `wrapfigure`, `longtable`, `tabularx`, `resizebox`, or `minipage` usage detected.

## Figure Caption Style

- Status: PASS with minor style notes
- Eight figure captions are present and labels follow captions.
- Captions are descriptive and do not contain unresolved references.
- Figure captions use sentence-style explanatory text, which is acceptable for APS.
- Minor note: Figure 5 and Figure 8 have very short captions compared with the other figures. This is not a compile issue, but APS reviewers may expect captions to be sufficiently self-contained.

## Table Caption Style

- Status: PASS
- Six table captions are present and labels follow captions.
- Captions are concise and compatible with APS style.
- Table files use standard `table`, `centering`, `caption`, `label`, and `tabular`.
- No non-REVTeX table environments were found.

## Equation Formatting

- Status: PASS with style note
- Numbered equation environments: 0
- Display math blocks: 48 opening / 48 closing delimiters
- Inline math delimiters: 224 opening / 224 closing delimiters
- No broken `\eqref{...}` commands detected.
- Style note: all displayed equations are written with `\[...\]`, so they will be unnumbered. This is acceptable only if the manuscript does not need equation numbering or equation cross-references. For APS submissions, important equations often use numbered `equation` or `align` environments when later discussion refers to them.

## Inline Mathematics

- Status: PASS with minor style notes
- Inline math delimiters are balanced.
- Symbols such as `\mathbb{L}`, `\mathcal{F}`, `\Omega_i`, `L_i`, and `C_{ij}` are consistently typeset in math mode.
- Raw dollar signs were detected only in draft-style `$\checkmark$` markers, not in mathematical expressions requiring repair.

## Variable Italics and Roman Operators

- Status: PASS with minor style notes
- Variables are generally italicized by math mode.
- Roman formatting is used for several operators and descriptors, including `\mathrm{RMSE}`, `\mathrm{Cov}`, `\mathrm{obs}`, `\mathrm{model}`, and dataset-style subscripts.
- `\arg\min` is used for the minimization expression and is acceptable.
- Minor note: final copyediting should verify every descriptive subscript is roman and every physical variable is italic, especially in table entries and composite subscripts.

## Citation Format

- Status: PASS
- Citation commands use LaTeX `\cite{...}` format.
- All citation keys resolve to entries in `references.bib`.
- No undefined citation keys were detected.
- APS numeric styling will be controlled by `apsrev4-2`.

## BibTeX Consistency

- Status: PASS with cleanup note
- BibTeX entries detected: 46
- Duplicate BibTeX keys: none detected
- Entry types: 28 articles, 16 books, 2 misc entries
- Undefined cited keys: none detected
- Cleanup note: 13 BibTeX entries are present but not cited in the current manuscript. This is not a compile blocker, but unused bibliography entries should normally be removed before final submission unless they are expected to be cited later.

Unused BibTeX keys detected:

- `ArmstrongMcKay2022Tipping`
- `Brier1950`
- `CopernicusC3S`
- `Fawcett2006ROC`
- `Holling1973Resilience`
- `JolliffeStephenson2012`
- `Lenton2008Tipping`
- `Mezic2005Koopman`
- `MurphyWinkler1987`
- `NewmanNetworks`
- `NOAAGML`
- `Scheffer2001Catastrophic`
- `WilksAtmosphericStats`

## Reference Ordering

- Status: PASS / BibTeX-controlled
- The `.bib` file order itself is not decisive for APS output.
- Final reference ordering will be produced by BibTeX using `apsrev4-2`.
- Static audit cannot confirm final rendered reference order without running LaTeX/BibTeX.

## Figure Placement and Float Placement

- Status: PASS with style notes
- Eight figures use `\begin{figure*}[t]`, as requested.
- All graphics paths resolve.
- Each figure is referenced near its insertion point.
- Style note: all figures are full-width `figure*` floats. This is REVTeX-compatible, but in two-column APS layouts full-width floats can migrate substantially. A rendered proof should verify figure order and page placement.
- Style note: several figures appear immediately after a section heading. This is legal, but APS readability is often better when each figure follows at least a short introductory paragraph.

## Section Hierarchy

- Status: WARNING
- The manuscript uses `\section{Chapter ...}` headings throughout. APS Physical Review articles conventionally use section titles without "Chapter" wording.
- Internal numbering is not strictly sequential by file order:
  - `05_state_architecture.tex` begins with `Chapter 8`
  - `06_eos_interoperability.tex` begins with `Chapter 9`
  - `07_state_evolution.tex` contains Chapters 5, 6, and 7
  - `09_demonstration_cases.tex` also begins with `Chapter 9`
- This is not a TeX compile error, but it is a significant journal-style issue for an APS article.
- The repeated draft phrase `Chapter question.` appears in multiple sections and reads more like review scaffolding than final PRE prose.
- The `\checkmark` markers associated with chapter questions are nonstandard in an APS manuscript.

## Display Equations

- Status: PASS with style note
- Display equations are balanced.
- No equation labels are present.
- No equation references are present.
- Important equations may need numbered environments if the final manuscript discusses them by number.

## Tables

- Status: PASS
- All table labels are referenced.
- All tables use standard `tabular`.
- No long tables or resizing commands are used.
- Width choices using `p{...}` columns appear REVTeX-compatible, but rendered output should be checked for overfull boxes in two-column mode.

## APS Submission Readiness Notes

Recommended before final APS submission:

1. Remove or convert "Chapter" wording in section titles if the frozen structure allows it.
2. Remove draft scaffolding such as `Chapter question.` lines and `\checkmark` markers if the frozen content rules allow it.
3. Decide whether major displayed equations should be numbered.
4. Check rendered figure placement because all figures are full-width `figure*` floats.
5. Remove unused BibTeX entries or cite them if they are intentionally retained.
6. Perform a full LaTeX/BibTeX compile and inspect the rendered PDF for float order, table width, overfull boxes, and reference formatting.

## Final Status

Static APS/REVTeX style audit: PASS with non-blocking publication-style warnings.

The project is structurally compatible with REVTeX, but final APS polish should address section-heading convention, draft markers, rendered float placement, and unused bibliography entries before journal submission.
