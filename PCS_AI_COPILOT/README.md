# PCS AI Copilot Framework v1.0

The PCS AI Copilot is the planned interpretation and decision-support layer for the Planetary Common State platform.

Its purpose is to help human users understand PCS outputs, connector status, missing data, data-quality warnings, and monitoring summaries. It is not a source of scientific truth, and it does not replace the PCS Engine, Connector Framework, Variable Registry, or human scientific review.

## Purpose

The AI Copilot will assist with:

- summarizing the current PCS status;
- explaining which data sources are connected, waiting, planned, or unavailable;
- describing data-quality issues in clear language;
- identifying records that may require human review;
- reducing monitoring fatigue through calm, structured summaries.

## Architectural Role

The AI Copilot reads from validated PCS outputs and metadata. It should not create scientific observations, modify connector outputs, alter Engine calculations, or infer missing values.

## Current Boundary

Milestone 6 defines architecture only. No AI model calls, external AI APIs, predictions, data modification, or Engine calculations are implemented here.
