# PCS data connection matrix

Runtime date: 2026-08-13. `CONNECTED` requires non-empty, valid, current,
provenance, cache/error handling, frontend binding, and runtime confirmation.
`PARSED` means live retrieval succeeded but one or more acceptance gates remain.

| Connector | Domain | Source | Status | Records | Latest timestamp | API | License | Frontend | Residual candidate | Runtime verified | Notes |
|---|---|---|---:|---:|---|---|---|---|---|---|---|
| NASA GISTEMP | Atmosphere | NASA GISS | AVAILABLE_PROTOTYPE | existing | 2025 | public file | recorded previously | existing prototype | L_T prototype | Prior baseline only | Not revalidated this round |
| NOAA Mauna Loa CO2 | Atmosphere/Chemistry | NOAA GML | AVAILABLE_PROTOTYPE | existing | 2025 | public file | recorded previously | existing prototype | L_C prototype | Prior baseline only | Not revalidated this round |
| Global Mean Sea Level | Ocean | NOAA LSA | PARSED | 1,557 | 2025-02-16 | public CSV | acknowledgment recorded | Not tested | L_T candidate | Endpoint/schema/non-empty/timestamp/unit/null/error tested | Cache and frontend gates remain |
| NSIDC Sea Ice | Cryosphere | NOAA/NSIDC G02135 v4 | PARSED | 31,614 | 2026-08-12 | public CSV | citation recorded | Not tested | L_T candidate | Endpoint/schema/non-empty/timestamp/unit/null/error tested | Cache and frontend gates remain |
| NASA GPM IMERG | Hydrology | NASA GPM | AUTH_REQUIRED | 0 | null | Earthdata route | review pending | Not tested | L_T candidate | Empty probe | No credential supplied |
| NASA FIRMS | Biosphere/Disaster | NASA FIRMS | AUTH_REQUIRED | 0 | null | MAP_KEY | review pending | Not tested | observation_only | Empty probe | Free key required; no synthetic fallback |
| NDVI | Biosphere | provider unresolved | EMPTY | 0 | null | unresolved | unresolved | Not tested | L_T candidate | Empty probe | Upstream selection required |
| Argo Ocean | Ocean | Argo GDAC | EMPTY | 0 | null | local CSV/JSON only | review pending | Not tested | L_T candidate | Empty probe | Native NetCDF/live GDAC not implemented |
| CWA Weather | Atmosphere/Regional | Taiwan CWA | AUTH_REQUIRED | 0 | null | token API | review pending | Not tested | L_T candidate | Empty probe | Authorization token absent |
| ERA5 | Atmosphere | Copernicus CDS preferred | PLANNED | 0 | null | not implemented | review pending | Not tested | L_T candidate | No | Open-Meteo only cross-validation candidate |
| GRACE TWS | Hydrology | NASA/GRACE-FO preferred | PLANNED | 0 | null | not implemented | review pending | Not tested | L_T candidate | No | Formal connector absent |

Regional datasets: Global is source-dependent; Taiwan/Japan/Korea independent
regional data contracts are not yet validated. UI must display `Regional data
unavailable` rather than silently substituting a camera-filtered global feed.
