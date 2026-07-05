# PCS Observatory v1.0

PCS Observatory v1.0 is a static, read-only observatory page for the Planetary Common State platform.

## Scope

- Reads `../PCS_ENGINE/output/latest_state.json`.
- Displays a scientific observatory dashboard with current state, status, coverage, latest update, and projection cards for Thermal `L_T`, Chemical `L_C`, Structural `L_S`, and Informational `L_I`.
- Displays status as `Operational Prototype`.
- Displays `Waiting for data` when source JSON values are null or unavailable.
- Shows horizontal progress bars for numeric projection values.
- Does not compute values.
- Does not interpolate missing values.
- Does not make prediction claims.
- Does not render charts or Earth animation.

## Files

- `index.html` contains the static page structure.
- `style.css` contains the responsive scientific visual style.
- `app.js` loads and displays the latest PCS state JSON.
- `assets/` is reserved for future static Observatory assets.

## Running Locally

Because the page reads a JSON file from the repository, serve the repository root with a local static file server and open:

```text
PCS_OBSERVATORY/index.html
```

The Observatory is intentionally framework-free: pure HTML, CSS, and JavaScript.
