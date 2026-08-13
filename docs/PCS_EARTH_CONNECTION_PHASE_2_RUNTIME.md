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

## Production acceptance

`https://pcs-backend.uranusastudio.workers.dev/api/layers` is deployed at
commit `4e608b2`. Three consecutive endpoint probes and an independent Chrome
fetch returned NOAA LSA GMSL `LIVE` at 80.98 mm relative to the 1990 reference,
plus NSIDC v4 Arctic 5.726 and Antarctic 15.971 million km² at 2026-08-12.
The second request used the versioned cache. Console errors, JavaScript
exceptions, and required network failures were zero. GMSL and NSIDC are
therefore `CONNECTED`; residual mapping remains `TBD`.

Confirmed core sources are now four: NASA GISTEMP, NOAA Mauna Loa CO₂, NOAA
LSA Global Mean Sea Level, and NOAA/NSIDC Sea Ice Index v4.

## Authentication blockers

- NASA FIRMS: `FIRMS_MAP_KEY` missing; no unofficial mirror or bypass used.
- CWA: `CWA_API_KEY` missing; authorization is never included in provenance.
- NASA GPM IMERG: `EARTHDATA_TOKEN` missing. Public CMR discovery returned an
  official GPM_3IMERGHH V07 granule metadata record, but this is not counted as
  a data sample. GES DISC granule download requires Earthdata Login.
