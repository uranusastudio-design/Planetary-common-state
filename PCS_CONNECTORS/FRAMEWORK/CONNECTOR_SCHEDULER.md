# Connector Scheduler

The Connector Scheduler defines future timing rules for data refresh.

## Scheduler Role

The scheduler will eventually coordinate when connectors check for updates, download new observations, and record refresh events. This document defines the scheduling concept only.

## Scheduling Metadata

Each future connector should document:

- Native update frequency
- Expected PCS refresh frequency
- Latency
- Time zone or timestamp convention
- Failure retry policy
- Manual-download requirement, if any
- Last successful update
- Next scheduled check

## Rules

- Do not refresh more frequently than the provider supports.
- Do not infer missing updates.
- Keep provider update time separate from PCS processing time.
- Record failed refresh attempts without fabricating values.
