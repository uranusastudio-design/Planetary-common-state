# PCS Benchmark Analysis Report

Date: 2026-07-05

## Scope

Analyzed the first PCS benchmark demonstration using the available benchmark dataset. No manuscript chapters were modified, no equations were changed, and no unavailable values were inferred.

## Inputs

- `PCS_DATA/processed/demo_annual_dataset.csv`
- `PCS_DATA/normalized/demo_projection_dataset.csv`
- `PCS_DATA/figures/fig09_demo_projection_components.png`
- `PCS_DATA/figures/fig10_demo_state_trajectory.png`

## Outputs

Tables:

- `PCS_DATA/tables/table06_projection_statistics.tex`
- `PCS_DATA/tables/table07_demo_summary.tex`

Figures:

- `PCS_DATA/figures/fig11_projection_timeseries.png`
- `PCS_DATA/figures/fig12_demo_statistics.png`

Results draft:

- `PCS_DATA/results/chapter9_results_draft.md`

## Projection Statistics

| Projection | Years covered | Min | Max | Mean | Trend direction | Missing years |
|---|---:|---:|---:|---:|---|---|
| \(L_T\) | 2000--2024 | 0.260000 | 0.853333 | 0.511200 | Increasing | none |
| \(L_C\) | 2000--2024 | 0.400910 | 0.810551 | 0.593097 | Increasing | none |
| \(L_S\) | none | NaN | NaN | NaN | unavailable | 2000--2024 |
| \(L_I\) | none | NaN | NaN | NaN | unavailable | 2000--2024 |

Linear trend estimates:

- \(L_T\): 0.017205 per year.
- \(L_C\): 0.016902 per year.

## Demo State Statistics

- Minimum: 0.330455.
- Maximum: 0.831942.
- Mean: 0.552148.
- Total change from 2000 to 2024: 0.501487.
- Linear annual trend: 0.017054 per year.
- Largest annual changes:
  - 2022--2023: 0.102847.
  - 2004--2005: 0.058506.
  - 2014--2015: 0.058208.
  - 2018--2019: 0.054265.
  - 2000--2001: 0.052673.
- Coverage count: minimum 2, maximum 2, mean 2.00.

## Physical Consistency Check

- \(L_T\) follows the long-term increase in the temperature anomaly while retaining interannual variability.
- \(L_C\) follows the long-term atmospheric CO2 increase and is monotonic over the benchmark interval.
- \(S_{\mathrm{demo}}\) changes consistently with the two available projections because it is computed as their annual mean.
- No numerical artifact or discontinuity was detected in the normalized series. The largest annual change occurs in 2022--2023 and is consistent with the large increase in \(L_T\) over that interval.

## Limitations

- \(L_S\) and \(L_I\) are unavailable and remain `NaN`.
- The benchmark uses `coverage_count=2` for every year.
- This is an operational demonstration only.
- No predictive claim is made.
- No unavailable dataset is inferred or interpolated.

## Final Status

PASS. The benchmark analysis produced publication-ready operational results for a Chapter 9 demonstration, subject to the stated limitations.
