# Nearby Stars catalog sources

## Primary catalog

- **Gaia Catalogue of Nearby Stars (GCNS)**, based on Gaia EDR3: ESA Gaia Archive table `external.gaiaedr3_gcns_main_1`.
- Gaia Collaboration, Smart et al. (2021), *Gaia Early Data Release 3: The Gaia Catalogue of Nearby Stars*, A&A 649, A6. https://doi.org/10.1051/0004-6361/202039498
- Official overview: https://www.cosmos.esa.int/web/gaia/edr3-gcns
- Archive: https://gea.esac.esa.int/archive/

The deployed point clouds use GCNS posterior median distance `dist_50`, not unqualified inverse parallax. `dist_16` and `dist_84` are retained as the distance interval. The query is versioned at `scripts/nearby-stars-gcns.adql`.

## Landmark cross-checks and supplements

- Gaia DR3 `gaiadr3.gaia_source` supplies landmark astrometry when SIMBAD resolves an official Gaia DR3 identifier.
- SIMBAD is used only for common names, aliases, object type, and identifier cross-checking: https://simbad.cds.unistra.fr/simbad/
- Hipparcos new reduction (`public.hipparcos_newreduction` in the Gaia Archive) supplements bright or saturated landmark sources absent from Gaia DR3.
- Components without independently deployable astrometry use an explicitly co-located **system marker**. No component separation or binary orbit is invented.

## Credit and use

Gaia data are open and free to use provided credit is given to **ESA/Gaia/DPAC**. Official credit and citation instructions: https://gea.esac.esa.int/archive/documentation/GDR3/Miscellaneous/sec_credit_and_citation_instructions/

Acknowledgement: This work has made use of data from the European Space Agency mission Gaia, processed by the Gaia Data Processing and Analysis Consortium (DPAC). Funding for DPAC has been provided by national institutions, in particular the institutions participating in the Gaia Multilateral Agreement.

## Snapshot

- Query/build date: see `catalog-metadata.json` and `landmark-systems.json`.
- Reference epoch: GCNS / Gaia EDR3 J2016.0; Hipparcos supplement J1991.25.
- No Gaia DR4 data, generated stars, or random positions are present.
