# PCS Benchmark Comparison v1.0

## Benchmark Matrix

## Purpose

This matrix defines the first scientific comparison framework for PCS. It compares representational scope and reproducibility only. It does not compute prediction accuracy.

## Comparison Matrix

| Metric | Baseline A: Temperature only | Baseline B: Temperature + CO2 | PCS Benchmark v1 |
|---|---|---|---|
| Intended projections | \(L_T\) | \(L_T,L_C\) | \(L_T,L_C,L_S,L_I\) |
| Intended projection count | 1 | 2 | 4 |
| Information Coverage | Thermal domain only | Thermal and chemical domains | Thermal, chemical, structural, and biosphere/informational domains |
| Projection Coverage | Available if \(L_T\) is available | Available if \(L_T\) and \(L_C\) are available | Complete only if all four projections are available |
| Missing Projection Ratio | \(1-N_A/1\) | \(1-N_B/2\) | \(1-N_{PCS}/4\) |
| Representation Completeness | \(N_A/1\) | \(N_B/2\) | \(N_{PCS}/4\) |
| Reproducibility | High when GISTEMP is accessible | High when GISTEMP and NOAA CO2 are accessible | Limited by availability of sea-level and NDVI projections |
| Current benchmark status | Operational | Operational | Partially operational; \(L_S\) and \(L_I\) remain missing |
| Future Extension | Add CO2 and additional domains | Add structural and biosphere/informational projections | Add authenticated or automatically downloadable \(L_S\) and \(L_I\) data |

Here \(N_A\), \(N_B\), and \(N_{PCS}\) denote the number of available projections for each comparison object.

## Current Benchmark Interpretation

In the current benchmark dataset, Temperature and CO2 are available, while sea level and NDVI remain missing. Therefore:

- Baseline A is operational when \(L_T\) is available.
- Baseline B is operational when \(L_T\) and \(L_C\) are available.
- PCS Benchmark v1 is only partially operational because two intended projections are missing.

For the current dataset, the available-projection PCS estimate is equivalent to the Temperature + CO2 baseline. This equivalence should be reported directly and should not be interpreted as a failure or success of PCS.

## Metric Definitions

### Information Coverage

Information Coverage describes which observable domains are represented. It is qualitative unless a separate quantitative information measure is defined.

### Projection Coverage

Projection Coverage is the count or fraction of intended projections that are available for analysis.

### Missing Projection Ratio

Missing Projection Ratio is the fraction of intended projections that are unavailable.

### Representation Completeness

Representation Completeness is the fraction of intended projections available for a given comparison object.

### Reproducibility

Reproducibility describes whether the comparison object can be regenerated from public data, documented preprocessing, and the projection standard.

### Future Extension

Future Extension identifies the next data or methodological step needed to make the comparison more complete.

