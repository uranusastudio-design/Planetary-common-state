# PCS data connection matrix

Runtime date: 2026-08-13. `CONNECTED` requires non-empty, valid, current,
provenance, cache/error handling, frontend binding, and runtime confirmation.
`PARSED` means live retrieval succeeded but one or more acceptance gates remain.

| Connector | Domain | Source | Status | Records | Latest timestamp | API | License | Frontend | Residual candidate | Runtime verified | Notes |
|---|---|---|---:|---:|---|---|---|---|---|---|---|
| NASA GISTEMP | Atmosphere | NASA GISS | AVAILABLE_PROTOTYPE | existing | 2025 | public file | recorded previously | existing prototype | L_T prototype | Prior baseline only | Not revalidated this round |
| NOAA Mauna Loa CO2 | Atmosphere/Chemistry | NOAA GML | AVAILABLE_PROTOTYPE | existing | 2025 | public file | recorded previously | existing prototype | L_C prototype | Prior baseline only | Not revalidated this round |
| Global Mean Sea Level | Ocean | NOAA LSA | CONNECTED | 1,557 | 2025-02-16 | public CSV | acknowledgment recorded | `/api/layers` evidence binding production-tested | TBD | Endpoint/cache/expiry/stale/retry/timeout/browser/console/network passed; production LIVE | Production value 80.98 mm relative to 1990 reference |
| NSIDC Sea Ice | Cryosphere | NOAA/NSIDC G02135 v4 | CONNECTED | 31,614 | 2026-08-12 | public CSV | citation recorded | `/api/layers` evidence binding production-tested | TBD | Endpoint/cache/expiry/stale/retry/timeout/both hemispheres/browser/console/network passed | Production Arctic 5.726 and Antarctic 15.971 million km² |
| NASA GPM IMERG | Hydrology | NASA GPM | AUTH_REQUIRED | 0 | null | CMR discovery + Earthdata Login GES DISC download | review pending | Existing precipitation metadata binding only | TBD | Public CMR endpoint verified; no sample download | `EARTHDATA_TOKEN` missing; metadata is not counted as IMERG retrieval |
| NASA FIRMS | Biosphere/Disaster | NASA FIRMS | AUTH_REQUIRED | 0 | null | official Area API / MAP_KEY | review pending | Existing wildfire binding | observation_only | Auth check/parser/secret-redaction tests passed | `FIRMS_MAP_KEY` missing; official limit 5,000 transactions/10 minutes |
| NDVI | Biosphere | provider unresolved | EMPTY | 0 | null | unresolved | unresolved | Not tested | L_T candidate | Empty probe | Upstream selection required |
| Argo Ocean | Ocean | Argo GDAC | EMPTY | 0 | null | local CSV/JSON only | review pending | Not tested | L_T candidate | Empty probe | Native NetCDF/live GDAC not implemented |
| CWA Weather | Atmosphere/Regional | Taiwan CWA | AUTH_REQUIRED | 0 | null | official token API | review pending | Not tested | TBD | Env auth and secret-redaction tests passed | `CWA_API_KEY` missing |
| ERA5 | Atmosphere | Copernicus CDS preferred | PLANNED | 0 | null | not implemented | review pending | Not tested | L_T candidate | No | Open-Meteo only cross-validation candidate |
| GRACE TWS | Hydrology | NASA/GRACE-FO preferred | PLANNED | 0 | null | not implemented | review pending | Not tested | L_T candidate | No | Formal connector absent |

Regional datasets: Global is source-dependent; Taiwan/Japan/Korea independent
regional data contracts are not yet validated. UI must display `Regional data
unavailable` rather than silently substituting a camera-filtered global feed.
