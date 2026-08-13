# World Monitor source gap matrix

Audit date: 2026-08-13. Reference: World Monitor `main` official README,
architecture, environment example, data-sources catalog, source attribution,
and AGPL-3.0 repository license. This matrix covers the structured providers
material to PCS priority domains. World Monitor also lists hundreds of RSS and
OSINT hosts; those are not equivalent to validated structured observations and
remain outside integration scope pending per-feed legal and provenance review.

| Category | World Monitor Provider | Original Upstream Source | PCS Existing Connector | PCS Status | Direct API Available | Authentication | Rate Limit | License | Attribution | Refresh Interval | Geographic Coverage | Historical Coverage | Recommended Integration | Priority | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Human System | ACLED | ACLED | No | Missing | Yes | OAuth/token | Plan-specific | Terms-controlled | Required | 10 min in WM | Global | Multi-year | LICENSE_REVIEW | P1 | Conflict/protest; observation_only |
| Human System | UCDP GED | Uppsala University | No | Missing | Yes | None/varies | Published API policy | Dataset terms | Required | Candidate monthly + annual | Global | Long historical | DIRECT_UPSTREAM | P1 | Candidate release is provisional |
| Human System | GDELT | GDELT Project | No | Missing | Yes | None | Public service limits | GDELT terms | Required | Near real-time | Global | 1979+ varies by product | DIRECT_UPSTREAM | P1 | Event/news inference; observation_only |
| Human System | OCHA HAPI | UN OCHA | No | Missing | Yes | None | Published API limits | UN/OCHA terms | Required | Provider cadence | Global | Dataset-specific | DIRECT_UPSTREAM | P1 | Displacement counts; do not infer mobility tracks |
| Human System | UNHCR | UNHCR | No | Missing | Yes | None | Published API limits | CC BY 4.0 reported by WM env docs | Required | Provider cadence | Global | Multi-year | DIRECT_UPSTREAM | P1 | Verify exact endpoint license |
| Infrastructure | Cloudflare Radar | Cloudflare Radar | No | Missing | Yes | API token | Product-specific | Cloudflare terms | Required | 5 min seed in WM | Global | API-window-specific | DIRECT_UPSTREAM | P1 | Candidate L_I only |
| Infrastructure | Submarine Cable Map | TeleGeography | No | Missing | Limited | Varies | Not established | Proprietary/terms review | Required | Static/irregular | Global | Current inventory | LICENSE_REVIEW | P1 | Do not scrape or redistribute without permission |
| Infrastructure | NGA warnings | US NGA navigational warnings | No | Missing | Feed/site | None/varies | Not established | US government/source-specific | Required | Provider cadence | Maritime global | Limited archive | DIRECT_UPSTREAM | P2 | Cable health is inferred context, not cable sensor data |
| Infrastructure | Static ports | WM curated dataset | Multiple original references | No | No single API | None | N/A | AGPL code/data boundary unclear | WM + originals | Irregular | Selected 62 ports | Snapshot | DO_NOT_INTEGRATE | P3 | Build from authoritative port sources instead |
| Infrastructure | Pipelines | WM curated/static sources | Multiple | No | Varies | Varies | Varies | Source-specific | Original sources | Irregular | Global selected | Snapshot | LICENSE_REVIEW | P2 | Physical infrastructure separate from market data |
| Connectivity | gpsjam.org | gpsjam.org / ADS-B derived | No | Missing | Download/feed | None/varies | Not established | Terms review | Required | Daily/near-daily | ADS-B-covered regions | Limited | LICENSE_REVIEW | P1 | Derived interference estimate; candidate L_I |
| Connectivity | Service status | Vendor status pages | AWS/Azure/GCP/etc. | No | RSS/API varies | Usually none | Vendor-specific | Vendor terms | Vendor | Minutes | Service footprint | Short | DIRECT_UPSTREAM | P2 | Outage observation, not impact estimate |
| Energy physical | GIE AGSI+ | Gas Infrastructure Europe | No | Missing | Yes | API key | Terms-specific | GIE terms | Required | Daily | Europe | Multi-year | LICENSE_REVIEW | P1 | Gas storage, physical lane |
| Energy physical | EIA | U.S. Energy Information Administration | No | Missing | Yes | API key | Published | US government data policy | EIA citation | Weekly/daily | US + selected global | Long historical | DIRECT_UPSTREAM | P1 | Keep inventories separate from prices |
| Energy physical | IEA | International Energy Agency | No | Missing | Limited | Key/subscription varies | Product-specific | IEA terms | Required | Dataset-specific | OECD/global | Dataset-specific | LICENSE_REVIEW | P2 | Avoid paid data absent approval |
| Energy market | Yahoo Finance | Yahoo | No | Missing | Unofficial endpoints | None/key varies | Aggressive throttling | Terms review | Required | 1–8 min in WM | Global markets | Product-specific | DO_NOT_INTEGRATE | P3 | Prefer official exchanges or licensed market feed |
| Energy market | FRED | Federal Reserve Bank of St. Louis | No | Missing | Yes | API key | Published | FRED series-specific | Required | Release cadence | US/global series | Long historical | DIRECT_UPSTREAM | P2 | Market/economic lane only |
| Aviation | FAA ASWS | FAA NAS status XML | No | Missing | Yes | None | Not established | US government/source terms | FAA | 5–10 min | 14 US hubs in WM | Operational window | DIRECT_UPSTREAM | P1 | Delays, ground stops, closures |
| Aviation | AviationStack | AviationStack | No | Missing | Yes | API key | Plan-specific | Commercial terms | Required | 5–10 min | Global selected airports | Plan-specific | LICENSE_REVIEW | P2 | No paid plan without approval |
| Aviation | ICAO NOTAM API | ICAO | No | Missing | Yes | Credentials | Contract-specific | Restricted/contract terms | Required | Near real-time | Authorized coverage | Operational | LICENSE_REVIEW | P1 | Legal accessibility must be established |
| Aviation | adsb.lol | adsb.lol | No | Missing | Yes | None/varies | Published fair-use | ODbL reported by WM | Required | Near real-time | Global receiver coverage | Limited | DIRECT_UPSTREAM | P1 | Aircraft observations; coverage not uniform |
| Aviation | Wingbits | Wingbits | No | Missing | Yes/partner | Key/agreement | Contract-specific | Provider terms | Required | Near real-time | Receiver coverage | Limited | LICENSE_REVIEW | P2 | World Monitor acknowledgement is not PCS permission |
| Aviation | OpenSky | OpenSky Network | No | Missing | Yes | Optional/required by use | Published | Dataset/API terms | Required | Near real-time | Receiver coverage | Limited | LICENSE_REVIEW | P2 | Research/commercial terms differ |
| Maritime | AIS relay | AISStream | No | Missing | WebSocket | API key | Provider-specific | Provider terms | Required | Real-time | Receiver coverage | Limited | LICENSE_REVIEW | P1 | Vessel observation; never call globally complete |
| Maritime | IMF PortWatch | IMF PortWatch | No | Missing | Download/API varies | None/varies | Published | IMF terms | Required | Daily/weekly varies | Major ports/chokepoints | Multi-year | DIRECT_UPSTREAM | P1 | Port/chokepoint activity, may be model-derived |
| Disaster | USGS | USGS Earthquake Hazards | No | Missing | Yes | None | Published | US government policy | USGS | 5 min | Global | Long historical | DIRECT_UPSTREAM | P1 | Tier 1 authoritative |
| Disaster | NASA FIRMS | NASA FIRMS | Yes | AUTH_REQUIRED | Yes | MAP_KEY | 10-minute quota window | NASA/FIRMS terms | NASA FIRMS + sensor | 10 min in WM | Global | Product-specific | DIRECT_UPSTREAM | P1 | WM only cross-validation/fallback |
| Disaster | NASA EONET | NASA EONET | No | Missing | Yes | None | Published | NASA terms | NASA EONET | 3 h in WM bundle | Global | API archive | DIRECT_UPSTREAM | P2 | Secondary event catalog |
| Disaster | GDACS | UN/EC JRC GDACS | No | Missing | Feeds/API | None | Published | GDACS terms | Required | 3 h in WM bundle | Global | Multi-year | CROSS_VALIDATION_ONLY | P2 | Secondary/fallback |
| Climate | Open-Meteo ERA5 | Open-Meteo processing Copernicus ERA5 | No | Planned A8 | Yes | None | Fair-use/product-specific | CC BY 4.0/data-source attribution varies | Open-Meteo + Copernicus | 15 min in WM | Global | 1940+ advertised | CROSS_VALIDATION_ONLY | P2 | Formal PCS ERA5 should prefer Copernicus CDS |
| Geosphere | JMA/HKO | JMA and Hong Kong Observatory | No | Missing | Official feeds | None | Published | Government terms | Required | Warning cadence | Regional | Limited | DIRECT_UPSTREAM | P2 | Regional authoritative hazards |

## Integration decision

No World Monitor API or MCP integration is activated in this phase. Direct
upstreams dominate the recommended set. World Monitor remains a provider
inventory and potential cross-validation path until its API/MCP terms,
payload-level provenance, quotas, and redistribution rights are verified.
