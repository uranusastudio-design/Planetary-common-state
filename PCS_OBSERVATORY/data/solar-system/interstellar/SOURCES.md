# Interstellar Objects source contract

The deployed registry contains the three officially numbered interstellar objects listed by the Minor Planet Center as of 2026-08-12:

- `1I`, primary provisional designation `A/2017 U1`, name `ʻOumuamua`
- `2I`, primary provisional designation `C/2019 Q4`, name `Borisov`
- `3I`, primary provisional designation `C/2025 N1`, name `ATLAS`

Authoritative identity and classification sources:

- Minor Planet Center `interstellar-names` List API: <https://data.minorplanetcenter.net/api/list>
- NASA/JPL Small-Body Database API: <https://ssd-api.jpl.nasa.gov/doc/sbdb.html>
- NASA/JPL Horizons API: <https://ssd.jpl.nasa.gov/horizons/>

Discovery context sources:

- NASA ʻOumuamua overview: <https://science.nasa.gov/solar-system/comets/oumuamua/>
- NASA 2I/Borisov overview: <https://science.nasa.gov/solar-system/comets/2i-borisov/>
- NASA 3I/ATLAS overview: <https://science.nasa.gov/solar-system/comets/3i-atlas/>

`scripts/build-interstellar-objects.mjs` obtains the MPC names, current JPL SBDB solution metadata, and Sun-centered Horizons VECTORS. The generated runtime file records its solution IDs, epochs, observation arcs, element uncertainties, fitted non-gravitational parameters, and vector coverage.

## Visualization contract

- Trajectories remain open. No first/last point is joined and no orbital period is assigned.
- Solid segments are within the JPL solution's observation arc.
- One dashed style denotes the pre-observation historical reconstruction; another denotes post-observation ephemeris-derived trajectory.
- The selected epoch is UTC in the interface and converted to TDB with the existing NAIF leap-second contract.
- A point marker is used for each object. PCS does not claim a physical shape from the marker.
- Inbound and outbound directions are finite far-field, ephemeris-derived directions at the cached coverage bounds. They are not parent-star associations.
- Origin system is `Unknown / unconstrained` for all three records.
- ʻOumuamua's Horizons solution warning is retained: the non-gravitational behavior outside its observation arc is assumed and may be substantially more uncertain.

This layer is a historical/ephemeris visualization. It is not a prediction product and does not imply that any object will return periodically.
