"""Projection engine for PCS demo observables."""

from .projections import (
    CO2_CRIT,
    CO2_REF,
    TEMP_CRIT,
    TEMP_REF,
    compute_projections,
    normalize_larger_is_stronger,
)

__all__ = [
    "CO2_CRIT",
    "CO2_REF",
    "TEMP_CRIT",
    "TEMP_REF",
    "compute_projections",
    "normalize_larger_is_stronger",
]

