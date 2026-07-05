# PCS Demo Data Plan

## Objective

Build a minimal reproducible demonstration of the PCS projection idea using four public Earth-observation observables:

- \(L_T\): thermal projection
- \(L_C\): chemical projection
- \(L_S\): structural projection
- \(L_I\): biosphere/informational projection

The output is a yearly state estimate

\[
S_{\mathrm{demo}}(t)=\frac{1}{4}\left[L_T(t)+L_C(t)+L_S(t)+L_I(t)\right].
\]

## Common Time Axis

Use annual values and retain only years where all four projections are available. The expected common interval is likely constrained by MODIS NDVI and satellite altimetry:

- Sea level: approximately 1993 to present
- MODIS NDVI: 2000 to present

The first complete demonstration interval will likely begin in 2001 after annual aggregation of MOD13C2.

## Normalization

For each observable \(x_i(t)\), compute

\[
L_i(t)=\frac{x_i(t)-x_i^{\mathrm{ref}}}{x_i^{\mathrm{crit}}-x_i^{\mathrm{ref}}}.
\]

The demo pipeline includes placeholder reference and critical values. These are not scientific claims. They must be replaced with documented choices before manuscript use.

Suggested placeholder choices for software testing:

- \(L_T\): reference = 1951-1980 anomaly baseline value, critical = 1.5 degrees C anomaly
- \(L_C\): reference = first available common-period value, critical = 450 ppm
- \(L_S\): reference = first available common-period value, critical = reference + 100 mm
- \(L_I\): reference = common-period mean NDVI, critical = reference minus a documented negative anomaly threshold

For variables where lower values indicate greater constraint, such as NDVI decline, use an inverted denominator:

\[
L_I(t)=\frac{x_I^{\mathrm{ref}}-x_I(t)}{x_I^{\mathrm{ref}}-x_I^{\mathrm{crit}}}.
\]

Clip all projections to \([0,1]\) for the minimal dashboard-style demonstration, while retaining unclipped values in intermediate output for auditability.

## Dataset-Specific Processing

### Thermal \(L_T\)

1. Download NASA GISTEMP global table.
2. Parse the annual `J-D` column.
3. Convert hundredths of degrees C to degrees C if required by the table format.
4. Keep columns `year,temp_anomaly_c`.

### Chemical \(L_C\)

1. Download NOAA GML Mauna Loa annual mean CO2 text file.
2. Ignore comment lines beginning with `#`.
3. Parse `year` and annual mean CO2 concentration.
4. Keep columns `year,co2_ppm`.

### Structural \(L_S\)

1. Download or manually prepare an annual global mean sea-level satellite altimetry series.
2. Use global mean sea-level change in mm.
3. If source data are monthly or cycle-based, average to annual means.
4. Keep columns `year,gmsl_mm`.

### Biosphere / Informational \(L_I\)

1. Download MOD13C2 monthly global NDVI granules through NASA Earthdata/LP DAAC.
2. Apply quality control using the product QA layer where possible.
3. Area-weight pixels by latitude before computing global means.
4. Aggregate monthly global means to annual means.
5. Keep columns `year,ndvi`.

## Reproducibility Rules

- Do not fabricate missing data.
- Record manual-download files in `data/raw/`.
- Write processed annual series to `data/processed/`.
- Store normalization constants in the pipeline configuration.
- Keep clipped and unclipped projections for diagnostics.
- Document any missing years before computing \(S_{\mathrm{demo}}\).
