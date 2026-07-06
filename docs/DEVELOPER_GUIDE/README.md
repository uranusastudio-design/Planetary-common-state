# PCS Developer Guide

This guide describes how contributors should extend the Planetary Common State platform.

PCS development must remain:

- modular
- reproducible
- scientifically transparent
- data-source aware
- documentation-first
- careful about uncertainty and missing data

Contributors should treat the PCS platform as a layered research system. Registry changes, connector documentation, engine logic, observatory panels, and scientific publications should remain separate unless a milestone explicitly authorizes integration.

## Development Principles

### Modular

Each contribution should belong clearly to one layer, such as registry documentation, connector documentation, engine logic, data products, observatory UI, or publication material.

### Reproducible

Every data-dependent contribution should record source, version, update time, preprocessing assumptions, and normalization choices.

### Scientifically Transparent

Scientific definitions, units, references, quality flags, confidence, and limitations should be documented before implementation.

### Conservative

PCS contributors should avoid unsupported prediction claims, fabricated data, hidden transformations, and undocumented assumptions.

