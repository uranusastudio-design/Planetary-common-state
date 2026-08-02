# Orbit Precision

Status: **Functionally completed; Foundation Release Audit pending**

## Architecture and source hierarchy

The existing single Cesium Viewer and Deep Space `CustomDataSource` remain authoritative. Orbit entities are rebuilt through the existing solar-scale lifecycle and never create another render loop.

Priority is matching cached NASA/JPL Horizons DE441 vectors, traceable JPL approximate planetary elements for 1800–2050, traceable parent-centered mean satellite elements, then representative visualization.

The deployed cache currently contains one vector epoch per planet. It cannot honestly define a complete mission-grade path, so complete planetary paths remain labeled **Orbital-element approximation** while matching current-position states may use the cached JPL vector. Satellite paths are parent-centered mean-element approximations, not SPICE or mission-navigation trajectories.

## Orbit contract

Every orbit records object ID, parent, source, preferred source, epoch, coordinate frame, valid-time range, sample interval, precision status, render status, fallback status, periapsis, apoapsis, and inclination. Missing validity bounds remain unavailable and are not replaced by zero.

Planet paths use one period centered on the active UTC epoch. Satellite paths use one period relative to the current parent position. Scientific Scale preserves the kilometre scale; Exhibition Scale uses the existing documented compression.

## Interaction and lifecycle

The existing Orbits toggle controls all paths. The selected orbit receives stronger emphasis. Existing body entities remain current-position markers. Scale changes and close/reopen use the current cleanup path.

## Known limitations

- No mission-grade SPICE kernels are bundled.
- A single cached JPL vector is not interpolated into a fabricated trajectory.
- Satellite mean elements do not assert a mission-navigation validity interval.
- Titania surface imagery remains deferred and unchanged.
