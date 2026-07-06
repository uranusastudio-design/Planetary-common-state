# PCS Data Source Schema

Every future dataset record should follow this schema.

| Field | Description |
|---|---|
| Dataset ID | Stable identifier assigned by the PCS registry. |
| Dataset Name | Official dataset, product, or dataset-family name. |
| Scientific Domain | PCS scientific domain. |
| Subdomain | Domain category or subdomain. |
| Observed Quantity | Quantity measured or estimated by the dataset. |
| Physical Unit | Native unit before PCS normalization. |
| Provider | Data provider or portal. |
| Organization | Responsible institution or program. |
| Official Website | Official dataset or provider landing page. |
| Official API | Official API, service, or access endpoint if available. |
| Data Format | Typical format such as NetCDF, HDF, GeoTIFF, CSV, JSON, GRIB, or API response. |
| Spatial Resolution | Native or effective spatial resolution. |
| Temporal Resolution | Native or effective temporal resolution. |
| Update Frequency | Expected update cadence. |
| Coverage | Spatial and temporal coverage. |
| Latency | Delay between observation and public availability. |
| License | Usage license, access terms, or data policy. |
| Citation | Required dataset citation or provider citation. |
| Current Status | Planned, candidate, active, deprecated, unavailable, or under review. |
| Future PCS Connector | Planned connector or access approach. |
| Notes | Caveats, access constraints, quality notes, or integration considerations. |

No API implementation is included in this schema.

