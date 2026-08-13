# Known Astronomical Objects staging

Upstream snapshots enter this directory only through a phase-specific adapter. A staged snapshot is not production data.

Required state sequence:

`FETCHED → NORMALIZED → CROSS_MATCHED → VALIDATED → REVIEW_PENDING → APPROVED → PUBLISHED`

Every snapshot must pin the source, catalog/release, retrieval time, query, coordinate/time contract, units, license/citation, and checksum. Failed records and unresolved identity or relationship conflicts stay quarantined; they are never zero-filled or silently dropped.
