# Contributing to Planetary Common State (PCS)

Thank you for contributing to the Planetary Common State (PCS) Platform. This repository is intended to support reproducible, modular, evidence-grounded development across the PCS research, validation, engine, dashboard, live prototype, and comparison layers.

## Repository Structure

- `UCT/` contains manuscript-related Universal Constraint Theory materials. Do not modify manuscript files unless the change is explicitly requested.
- `PCS_ENGINE/` contains PCS Engine implementation logic. Do not modify engine logic unless the task explicitly calls for it.
- `PCS_VALIDATION/` contains validation framework materials and checks.
- `PCS_DATA/` contains source datasets and data-processing materials.
- `PCS_COMPARISON/` contains benchmark and comparison work.
- `PCS_LIVE/` contains live prototype materials.
- `PCS_DASHBOARD/` contains dashboard-related development materials.
- `outputs/` contains generated user-facing outputs.
- `demo/` contains demonstration materials.
- `work/` may contain intermediate development artifacts.

Always inspect the existing repository layout before creating new folders or moving files.

## Coding Style

- Keep the architecture modular and maintain clear boundaries between data, validation, engine, comparison, dashboard, and live prototype components.
- Prefer small, focused changes over broad refactors.
- Follow the style already used in the relevant module.
- Use descriptive file, function, and variable names.
- Add comments only where they clarify non-obvious reasoning or reproducibility constraints.
- Avoid hard-coded absolute paths when a repository-relative path or configuration value is appropriate.

## Pull Request Guidelines

- Keep pull requests focused on one coherent change.
- Describe the purpose of the change, the files or modules affected, and any reproducibility considerations.
- Include tests, validation notes, or manual verification steps where applicable.
- State clearly when a change touches data, validation assumptions, dashboards, or output generation.
- Do not combine manuscript edits, engine logic changes, and dashboard work in the same pull request unless explicitly approved.

## Commit Message Guidelines

Use clear, concise commit messages that describe the change and its scope.

Recommended format:

```text
area: short description
```

Examples:

```text
docs: add repository contribution guide
validation: clarify benchmark reproducibility notes
dashboard: update static prototype labels
data: document missing projection fields
```

## Reproducibility Rule

All results, reports, figures, tables, dashboards, and generated outputs must be reproducible from documented inputs and procedures. Record data sources, assumptions, scripts, parameters, and known limitations where they affect interpretation.

## No Fabricated Data Rule

Do not fabricate data. Do not invent observations, measurements, projections, benchmarks, citations, or metadata. Missing observations or unavailable projections must remain missing; preserve `NaN` or equivalent explicit missing-value markers where applicable.

## No Unsupported Prediction Rule

Do not make prediction claims that are not supported by the available data, validation framework, and documented methodology. Distinguish clearly between observed results, validated model behavior, exploratory scenarios, and unsupported speculation.

