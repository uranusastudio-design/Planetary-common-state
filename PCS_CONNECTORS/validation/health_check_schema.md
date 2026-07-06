# Connector Health Check Schema

The connector health-check schema defines the minimum information required to evaluate connector output readiness.

## Health Dimensions

| Field | Description |
|---|---|
| `file` | Connector output file name. |
| `status` | `valid`, `invalid`, `pending`, or `missing`. |
| `missing_fields` | Required fields missing from one or more records. |
| `warnings` | Non-fatal issues or pending-state notes. |
| `latest_timestamp` | Latest observed timestamp when available. |
| `notes` | Validation context, including missing-file or pending-data explanations. |

## Required Connector Record Fields

- `id`
- `provider`
- `dataset`
- `variable`
- `timestamp`
- `unit`
- `value`
- `quality`
- `confidence`
- `source_url`
- `version`

## Status Meanings

| Status | Meaning |
|---|---|
| `valid` | File exists, records are present, required fields exist, and records pass validation rules. |
| `pending` | File exists but contains no records because real data access is pending. |
| `missing` | Expected connector output file is not present. |
| `invalid` | File exists but violates required validation rules. |

## No-Repair Rule

The health layer reports validation problems only. It does not repair records, infer missing fields, or fabricate values.
