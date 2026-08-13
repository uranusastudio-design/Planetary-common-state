# PCS EARTH Connection Phase 2 runtime record

Run date: 2026-08-13 Asia/Taipei.

## Local release candidate

The Worker `/api/layers` binding retrieved NOAA LSA GMSL as `LIVE` with value
80.98 mm relative to the 1990 reference, and NOAA/NSIDC v4 as `LATEST` with
Arctic 5.726 and Antarctic 15.971 million km², both timestamped 2026-08-12.
Residual mapping remains `TBD`.

The cache contract uses a five-minute freshness window and retains last-valid
data for up to 24 hours. Tests cover hit, expiry, stale-on-error, three-attempt
retry for retryable HTTP statuses, bounded timeout, and no secret exposure.

A headless Chrome runtime bound the four scoped layer records from the local
Worker. Required console errors, JavaScript exceptions, and network failures
were all zero in the isolated EARTH connection harness.

## Production preflight

`https://pcs-backend.uranusastudio.workers.dev/api/layers` was reachable, but
the deployed version still identifies `sea-level` as the NOAA CO-OPS Honolulu
tide gauge and `sea-ice` as Northern Hemisphere only. Therefore neither local
release candidate is labelled `CONNECTED` yet. Deploying the Worker is a
production change and requires explicit human approval.

## Authentication blockers

- NASA FIRMS: `FIRMS_MAP_KEY` missing; no unofficial mirror or bypass used.
- CWA: `CWA_API_KEY` missing; authorization is never included in provenance.
- NASA GPM IMERG: `EARTHDATA_TOKEN` missing. Public CMR discovery returned an
  official GPM_3IMERGHH V07 granule metadata record, but this is not counted as
  a data sample. GES DISC granule download requires Earthdata Login.
