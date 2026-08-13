# PCS EARTH provider boundary

Provider code is isolated by source role. An external aggregator failure must
not terminate scientific-provider retrieval or observation serving.

```text
providers/
├── scientific-providers/
├── human-system-providers/
├── infrastructure-providers/
└── external-aggregators/
    └── worldmonitor/
```

External-aggregator observations retain both `provider` and `original_source`.
They enter PCS as `observation_only` or `candidate`, never directly as a
residual or `L(t)`. Each runtime adapter must expose one of `CONNECTED`,
`DEGRADED`, `STALE`, `EMPTY`, `UNAVAILABLE`, `AUTH_REQUIRED`, or
`LICENSE_REVIEW` and must use bounded timeout, retry, and cache policies.
