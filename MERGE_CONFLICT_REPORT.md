# Merge conflict preflight report

Checked: 2026-08-13 Asia/Taipei

## Divergence

- Local `main`: two PCS EARTH commits ahead of the prior base.
- `origin/main`: eighteen commits ahead of that base, all reviewed commits are
  Deep Space / Milky Way work.
- No merge, rebase, pull, push, or force operation was performed.

## Potential overlapping paths

Git's three-way comparison reports overlap at the locally introduced or changed
EARTH paths under `PCS_CONNECTORS/`, `PCS_DATA_CONNECTION_MATRIX.md`, and the
three EARTH integration/license documents. The remote commits do not contain
equivalent Phase 1 files, so integration must preserve the local additions.

The remote branch also changes many `PCS_OBSERVATORY` Deep Space files. Those
paths and the pre-existing local uncommitted Deep Space changes are outside the
PCS EARTH Connection Phase 2 scope and must not be overwritten.

## Safe integration requirement

Before any later push, merge or rebase in a clean worktree, preserve all current
uncommitted Deep Space work, integrate `origin/main` without force, and verify
that the PCS EARTH commits remain present. Any content conflict requires human
review; do not resolve it by choosing an entire side wholesale.
