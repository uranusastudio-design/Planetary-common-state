# PCS Connector Fallback Strategy

The PCS fallback strategy defines how connectors behave when a scientific dataset cannot be downloaded, accessed, parsed, or validated.

This strategy is documentation only. It does not implement new data access, change calculations, create fallback JSON, or mark any new source as connected.

## Fallback Levels

| Level | Meaning |
|---|---|
| Primary source | Preferred authoritative source for a variable. |
| Secondary source | Approved fallback when the primary source is unavailable or invalid. |
| Tertiary source | Additional approved fallback when primary and secondary sources are unavailable. |
| Manual pending | Source requires manual download, authentication, preprocessing, or review. |
| Data access pending | Source is identified but cannot currently be accessed by the connector. |
| Connector disabled | Connector is intentionally inactive because no approved source is available, validation failed, or access rules prohibit use. |

## No Fabricated Values Rule

PCS connectors must never fabricate missing scientific data. Missing observations must remain missing, and unavailable variables must remain `Waiting`, `Data Access Pending`, or `Disabled` until a real approved source is parsed and validated.

## Provenance Requirement

Every connector output record must include source provenance. At minimum, the connector must record provider, dataset, source URL or access route, license or access terms, dataset version when available, and notes describing manual or authenticated access requirements.

## Quality Flag Requirement

Every connector output record must include a quality status. Recommended quality flags include:

- `observed`
- `missing`
- `pending`
- `validated`
- `validation_failed`
- `fallback_source`
- `manual_pending`

## Fallback Use Rules

- A fallback source may be used only if it is listed in `DATA_SOURCE_PRIORITY.md` or explicitly approved in connector documentation.
- Fallback data must retain provider-specific provenance.
- Fallback use must be visible in connector output notes or quality flags.
- Fallback records must not be blended with primary records unless an approved data-fusion method is explicitly documented in a later milestone.
- Fallback use does not imply prediction skill or scientific validation.
