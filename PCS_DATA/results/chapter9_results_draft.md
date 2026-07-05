# Chapter 9 Results Draft: PCS Benchmark Demonstration

## Introduction

This operational demonstration evaluates a minimal Planetary Common State (PCS) benchmark using the available Tier 1 dataset assembled for 2000--2024. The present benchmark includes two automatically available projection components, \(L_T\) and \(L_C\), derived from NASA GISTEMP temperature anomaly and NOAA Mauna Loa CO2, respectively. The sea-level projection \(L_S\) and vegetation projection \(L_I\) are retained as missing values because the corresponding sources require manual or authenticated Earthdata processing in the current run.

No predictive claim is made. The purpose of the benchmark is to test whether the PCS projection workflow produces internally consistent annual trajectories from available public observations.

## Methods Summary

The processed annual dataset contains the columns `Year`, `Temperature`, `CO2`, `SeaLevel`, and `NDVI`. Temperature is preserved in degrees C anomaly relative to the NASA GISTEMP baseline, and CO2 is preserved in ppm. Sea level and NDVI remain `NaN` for all benchmark years.

The normalized projection dataset contains

\[
L_T,\quad L_C,\quad L_S,\quad L_I,\quad S_{\mathrm{demo}},
\]

with

\[
S_{\mathrm{demo}}(t)=\mathrm{mean}\{L_i(t): L_i(t)\ \mathrm{is\ available}\}.
\]

For this Tier 1 run, \(S_{\mathrm{demo}}\) is the mean of \(L_T\) and \(L_C\) in every year, and `coverage_count` equals 2 throughout the interval.

## Results

The thermal projection \(L_T\) covers 2000--2024. It ranges from 0.260000 to 0.853333, with a mean of 0.511200. Its linear annual trend is positive, approximately 0.017205 per year.

The chemical projection \(L_C\) covers 2000--2024. It ranges from 0.400910 to 0.810551, with a mean of 0.593097. Its linear annual trend is positive, approximately 0.016902 per year.

The structural projection \(L_S\) and informational projection \(L_I\) are unavailable in this run. Both remain `NaN` for all years from 2000 through 2024. These missing values are not interpolated or replaced.

The demo state \(S_{\mathrm{demo}}\) ranges from 0.330455 to 0.831942, with a mean of 0.552148. The total change from 2000 to 2024 is 0.501487. The fitted annual trend is approximately 0.017054 per year.

The largest annual increases in \(S_{\mathrm{demo}}\) occur in 2022--2023, 2004--2005, and 2014--2015, with changes of 0.102847, 0.058506, and 0.058208, respectively. The largest change is associated with the large increase in the temperature projection between 2022 and 2023, while \(L_C\) increases smoothly.

## Interpretation

The benchmark is internally consistent with the available source variables. The thermal projection follows the long-term increase in global temperature anomaly, while retaining expected interannual variability. The chemical projection follows the sustained increase in atmospheric CO2 and is smoother than the thermal projection.

Because \(S_{\mathrm{demo}}\) is computed from available projections only, it changes consistently with \(L_T\) and \(L_C\). No numerical discontinuity is apparent beyond year-to-year changes that reflect the underlying temperature and CO2 series. The coverage count remains constant at 2, so changes in \(S_{\mathrm{demo}}\) are not caused by changing data availability within this run.

## Limitations

This operational demonstration is incomplete because \(L_S\) and \(L_I\) are unavailable. The current benchmark therefore tests only a two-projection subset of the intended four-projection PCS demonstration. It should not be interpreted as a complete PCS state estimate.

No predictive claim is made. The benchmark does not test forecasting skill, causal structure, or model performance against independent targets. It only verifies that the projection and aggregation procedure behaves consistently for the available observations.

The normalization constants follow the PCS Projection Standard v1.0 and should be treated as demonstration choices. They are not universal thresholds.

## Future Extension

The next benchmark extension should add authenticated NASA global mean sea-level data and processed MODIS MOD13C2 NDVI annual global aggregates. Once all four projections are available, \(S_{\mathrm{demo}}\) should be recomputed with `coverage_count=4` and compared with the current two-projection operational baseline.

Future work should also retain both clipped and unclipped projections, evaluate sensitivity to reference and critical values, and compare the demo state with simpler baselines. Such comparisons are required before using the demonstration as evidence of empirical utility.
