# PCS Observatory Changelog System

The PCS Updates panel is a project-status presentation layer. It does not change Observatory selections, Deep Space state, scientific datasets, rendering, or calculations.

## Registry

`data/releases.json` is the single source of release and roadmap content. Its top-level fields identify the current semantic version, release status, active phase, update time, repository, release records, roadmap, and compact latest-additions list.

Allowed release states are `stable`, `preview`, and `archived`. Allowed roadmap states are `completed`, `in-progress`, `planned`, `blocked`, and `deferred`. There should be one active `in-progress` milestone unless a future release explicitly documents parallel milestones.

## Update workflow

1. Update `data/releases.json` once the underlying work is verified.
2. Add localized release title and summary values for `en`, `zh-TW`, `ja`, and `ko`.
3. Add full commit hashes and the previous commit used by each compare link.
4. Add only documentation paths that exist under `PCS_OBSERVATORY` and deploy through GitHub Pages.
5. Run `node --test PCS_OBSERVATORY/*.test.js` from the repository root.
6. Review the panel at desktop zoom levels and at 390 × 844 before deployment.

Commit URLs are derived as `/commit/{hash}` and diff URLs as `/compare/{previous}...{hash}` from the registry repository URL. The browser does not query the GitHub API.

## Translation and interaction

`release-center.js` owns release-center interface translations and reads the existing `PCSI18n` language state. It creates no language selector. The expanded state is kept in `sessionStorage`; tabs use ARIA tab semantics, arrow-key navigation, focus restoration, and Escape collapse.

## Validation

`project-update-banner.test.js` validates the registry schema, semantic-version uniqueness, ISO dates, statuses, commit hashes, repository URL, documentation existence, roadmap order, current-phase consistency, known issues, absence of local paths, single Viewer/canvas host, and absence of a new renderer or animation loop.

## Phase 3 completion workflow

Only after Phase 3 implementation, tests, commit, deployment, and production verification are complete may its roadmap status change from `in-progress` to `completed`. At that time add a release entry with the verified Phase 3 commit and compare base, update `currentVersion`, and select the next genuinely active milestone. Phase 4 must not be marked active merely because Phase 3 finishes.

## Known limitations

- The registry is static deployment metadata; it deliberately does not poll GitHub.
- Release detail strings remain canonical technical wording where no separate scientific translation has been approved.
- No numeric overall percentage is shown because milestone weights have not been defined.
- Titania remains a deferred known imagery issue.
