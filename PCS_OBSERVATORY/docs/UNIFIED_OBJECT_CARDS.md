# Unified Deep Space Object Cards

Status: **Functionally completed; Foundation Release Audit pending**

## Model contract

The shared model contains `id`, canonical and localized names, aliases, object type, parent structure, catalog IDs, coordinates and frame, distance and uncertainty, redshift, velocity, physical size, orbital data, epoch, sources, data and visualization status, references, and known limitations. Missing values remain null in the model and render as **Unavailable**; they are never replaced by zero.

Adapters cover Solar System registry bodies, Gaia nearby-star records, Milky Way landmarks and HMSFR tracers, Local Group galaxies, and selectable spiral-arm reconstructions. The same model is designed for future Phase 4 structures without adding another selection store.

## Evidence vocabulary

Cards keep the following statuses distinct: Catalog observation, Direct mission data, JPL ephemeris, Observation-based reconstruction, Orbital-element approximation, Representative visualization, and Unavailable. A reconstruction is never described as an external photograph.

## Interaction and accessibility

The card reuses the existing Deep Space selection variables, language event, control panel, and lifecycle. Selection opens a card without moving the camera. Camera movement occurs only through the explicit Focus button. The card supports Close, Escape, keyboard focus, ARIA live updates, responsive scrolling, and safe external links using `noopener noreferrer`.

No external catalog API is called when the page or card loads. All adapters use already deployed registries and catalogs.

## Known limitations

- Canonical scientific names are intentionally preserved when no approved localized name exists.
- Not every catalog contains redshift, physical diameter, or a complete velocity vector.
- Titania surface imagery remains a deferred issue; its orbit and card do not claim the texture is repaired.
