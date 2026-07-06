# Connector Scheduler

The Connector Scheduler defines future refresh timing categories.

## Update Frequencies

| Frequency | Intended use |
|---|---|
| Real-time | Data streams or near-continuous operational feeds. |
| 15 min | High-frequency monitoring products. |
| Hourly | Operational environmental products. |
| Daily | Daily observational or reanalysis updates. |
| Weekly | Products updated on weekly or rolling cycles. |
| Monthly | Climate, statistical, or long-latency products. |

## Scheduler Rules

- Do not refresh more frequently than the provider supports.
- Record provider update time separately from PCS retrieval time.
- Preserve failure records.
- Do not interpolate missed updates.
- Do not fabricate delayed observations.
