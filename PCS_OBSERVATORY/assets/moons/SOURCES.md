# Phase-one natural-satellite imagery sources

All deployed textures are local, repository-tracked derivatives of official
NASA/JPL/USGS mission products. Processing is reproducible with
`scripts/build-mission-moon-textures.py`. It performs only documented crop,
longitude rotation, conservative resize, RGB conversion, JPEG export, and—in
two incomplete-coverage products—neutral low-frequency filling of unobserved
near-black pixels. It does not generate terrain, craters, fractures, or color
noise.

| Body | Official product and mission | Instrument / color | Coverage and processing | Local asset |
|---|---|---|---|---|
| Moon | [USGS LROC WAC global morphology mosaic](https://astrogeology.usgs.gov/search/map/moon_lro_lroc_wac_global_morphology_mosaic_100m), LRO | LROC WAC, grayscale morphology | Existing global Moon implementation retained unchanged | Existing Moon imagery layer |
| Phobos | [NASA 3D Resources: Mars – Phobos](https://science.nasa.gov/3d-resources/mars-phobos/), Viking/USGS | Viking VIS, grayscale | Global texture; RGB/JPEG export | `phobos/phobos-global-1440.jpg` |
| Deimos | [NASA 3D Resources: Mars – Deimos](https://science.nasa.gov/3d-resources/mars-deimos/), Viking/USGS | Viking VIS, grayscale | Global texture; RGB/JPEG export | `deimos/deimos-global-1440.jpg` |
| Io | [NASA 3D Resources: Jupiter – Io (B)](https://science.nasa.gov/3d-resources/jupiter-io-b/), Voyager/Galileo | ISS/SSI, Galileo-derived enhanced color | Global mosaic; documented polar interpolation; RGB/JPEG export | `io/io-global-1440.jpg` |
| Europa | [NASA 3D Resources: Jupiter – Europa](https://science.nasa.gov/3d-resources/jupiter-europa/), Voyager/USGS | ISS, grayscale | Global Voyager mosaic; RGB/JPEG export | `europa/europa-global-1440.jpg` |
| Ganymede | [NASA 3D Resources: Jupiter – Ganymede](https://science.nasa.gov/3d-resources/jupiter-ganymede/), Voyager/USGS | ISS, grayscale | Global Voyager mosaic; RGB/JPEG export | `ganymede/ganymede-global-1440.jpg` |
| Callisto | [NASA 3D Resources: Jupiter – Callisto](https://science.nasa.gov/3d-resources/jupiter-callisto/), Voyager/Galileo/USGS | ISS/SSI, grayscale | Global mosaic; source data seams retained | `callisto/callisto-global-1440.jpg` |
| Titan | [PIA19658, Titan Global Map – June 2015](https://science.nasa.gov/resource/titan-global-map-june-2015/), Cassini | ISS, 938 nm albedo; not direct visible-light surface color | Near-global, 3–5% documented gaps; frame crop, 180° origin rotation, resize | `titan/titan-global-2048.jpg` |
| Enceladus | [PIA24027, Enceladus in the Infrared](https://science.nasa.gov/photojournal/enceladus-in-the-infrared-map-view/), Cassini | VIMS/ISS, enhanced infrared spectral color | Global, 200 m/pixel source; resized from 8192 × 4096 | `enceladus/enceladus-global-4096.jpg` |
| Titania | [NASA 3D Resources: Uranus – Titania](https://science.nasa.gov/3d-resources/uranus-titania/), Voyager 2/USGS | ISS NAC, grayscale | Partial observation, reconstructed global texture; unobserved black pixels neutral-filled without terrain | `titania/titania-global-1440.jpg` |
| Triton | [PIA18668, Map of Triton](https://science.nasa.gov/photojournal/map-of-triton/), Voyager 2 | NAC orange/green/blue filters; enhanced, close to natural color | Global reconstruction, 600 m/pixel; unobserved northern pixels neutral-filled without terrain; resized | `triton/triton-global-4096.jpg` |

Each body directory includes a `source.json` with the exact source asset URL,
credit, original and deployed resolution, projection, coverage, processing,
and access date (2026-07-17). NASA/USGS source credits remain visible in the
Observatory information panel. Mission-derived texture does not imply live
observation, true inter-body scale, or complete coverage where the source
record says otherwise.
