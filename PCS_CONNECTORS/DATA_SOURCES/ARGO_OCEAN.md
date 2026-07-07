# Argo Ocean

## Dataset Description

The international Argo float observing system provides global ocean profile observations from autonomous profiling floats. Argo profiles are commonly distributed through Global Data Assembly Centres as NetCDF profile files.

## Scientific Variables

- Ocean Temperature Profile
- Ocean Salinity Profile
- Pressure
- Depth

## Spatial Resolution

Global float observations. Spatial sampling depends on active float distribution and profile cycle.

## Temporal Resolution

- Daily
- Near real-time

## Update Frequency

Argo profile availability depends on float surfacing, transmission, quality control, and GDAC publication. Near-real-time and delayed-mode records must remain distinguishable.

## Quality Considerations

Argo quality handling must preserve timestamp, latitude, longitude, depth, temperature, salinity, pressure, missing values, duplicate profiles, and quality flags. Native NetCDF quality-control variables should remain visible when supported by future connector revisions.

## Future PCS Role

Argo becomes the primary Ocean profile connector for future PCS ocean interior monitoring, including thermal and salinity profile context.

## Current PCS Status

Connector implemented v1.0. Data are confirmed only after official Argo records are successfully parsed and validated.
