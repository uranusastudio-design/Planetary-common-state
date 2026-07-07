# PCS Variable Schema

Every PCS variable should follow the standard schema below.

## Required Fields

| Field | Description |
|---|---|
| Variable ID | Unique stable identifier for the variable. |
| Display Name | Human-readable name used in dashboards and reports. |
| Scientific Name | Formal scientific variable name. |
| Domain | Top-level scientific domain from `DOMAINS.md`. |
| Subdomain | More specific scientific category within the domain. |
| Description | Concise scientific definition and intended PCS use. |
| Physical Unit | Native physical unit before normalization or projection. |
| Normalization | Description of any projection or normalization rule. |
| Display Precision | Recommended display precision for the variable or projection, such as 3 decimals for prototype views and 5 decimals for scientific mode. |
| Normalization Range | Numeric range used after normalization, typically `0.00000` to `1.00000`, with reference and upper-bound meanings documented. |
| Interpretation Band | Provisional display band applied to the normalized value, if applicable. Bands remain provisional until empirically calibrated. |
| Calibration Status | Calibration lifecycle state for interpretation bands or thresholds, such as provisional, under validation, calibrated, or retired. |
| Observation Source | Dataset, instrument, model product, or data stream. |
| Fallback Sources | Approved secondary or tertiary sources if the primary observation source is unavailable. |
| Source Priority | Ordered source chain defining primary and approved fallback sources. |
| Provider | Organization responsible for the observation source. |
| Spatial Resolution | Native or effective spatial resolution. |
| Temporal Resolution | Native or effective temporal resolution. |
| Update Frequency | Expected update cadence. |
| Data Format | Source or processed data format. |
| Quality Flag | Quality-control status or flag definition. |
| Confidence Level | Qualitative or quantitative confidence statement. |
| Version | Registry entry version or dataset version. |
| References | Scientific references, dataset citations, or provider documentation. |
| Notes | Additional constraints, caveats, or implementation notes. |

No example variables are included in this schema document.
