# Third-party integrations

Last reviewed: 2026-08-13.

| Integration | Role | Code license | Data ownership | PCS decision | Boundary |
|---|---|---|---|---|---|
| World Monitor | External provider inventory; possible API/MCP signal provider | AGPL-3.0 (repository license) | Upstream-specific; not transferred by the code license | No source copied. API/MCP remains `LICENSE_REVIEW` until terms and attribution are confirmed. | `PCS_CONNECTORS/providers/external-aggregators/worldmonitor/` |
| Open-Meteo | Possible Tier-2 processor for ERA5-derived observations | Service-specific | Copernicus/ECMWF source terms plus Open-Meteo terms | Research candidate; not yet a formal PCS ERA5 connector | scientific provider |

World Monitor must be labelled `External signal provider: World Monitor` and,
when known, `Original source: <source>`. PCS must not imply ownership,
membership, or partnership.
