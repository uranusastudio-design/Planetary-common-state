#!/usr/bin/env python3
"""Build the PCS major-planet long-horizon runtime bundle from JPL DE441.

This script is an offline release tool. It reads official SPICE kernels,
samples authoritative DE441 barycentric states, then continues from the
common DE441 boundary with a reproducible REBOUND WHFast integration.
The browser never integrates the entire 100,000-year interval per frame;
it performs only bounded interpolation from these checkpoints.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import rebound
import spiceypy as spice

AU_KM = 149_597_870.7
DAY_SECONDS = 86_400.0
J2000_JD_TDB = 2_451_545.0
BODY_IDS = ["sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]
NAIF_IDS = [10, 1, 2, 3, 4, 5, 6, 7, 8]
REQUIRED_YEARS = [-13199, -10000, -5000, 1, 1000, 1800, 2026, 2050, 2100, 2500, 5000, 7500, 10000, 12000, 15000, 17000, 18000, 19000, 20000, 25000, 50000, 75000, 100000]
OFFICIAL_MD5 = {
    "de441_part-1.bsp": "7e5fcf9ecb5d08e1ab70c049baa60cd3",
    "de441_part-2.bsp": "ad8dfa4e505ef0e3a5d587a5b4705632",
    "gm_de440.tpc": "a6bb37afab6815c9573a3ec208a8199a",
}


def gregorian_jd(year: int, month: int = 1, day: int = 1) -> float:
    """Proleptic Gregorian noon-based Julian date, astronomical year numbering."""
    y, m = year, month
    if m <= 2:
        y -= 1
        m += 12
    a = math.floor(y / 100)
    b = 2 - a + math.floor(a / 4)
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + day + b - 1524.5


def extended_iso(year: int) -> str:
    if 0 <= year <= 9999:
        return f"{year:04d}-01-01T00:00:00.000 TDB"
    sign = "+" if year >= 0 else "-"
    return f"{sign}{abs(year):06d}-01-01T00:00:00.000 TDB"


def file_record(path: Path) -> dict:
    digest = hashlib.sha256()
    md5 = hashlib.md5()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
            md5.update(chunk)
    return {"path": path.name, "bytes": path.stat().st_size, "sha256": digest.hexdigest(), "md5": md5.hexdigest()}


def verified_file_record(path: Path) -> dict:
    record = file_record(path)
    expected = OFFICIAL_MD5.get(path.name)
    if expected and record["md5"] != expected:
        raise RuntimeError(f"Official checksum mismatch for {path.name}: {record['md5']} != {expected}")
    return {**record, "officialMd5": expected, "checksumStatus": "verified" if expected else "recorded-no-pinned-checksum"}


def common_coverage() -> tuple[float, float]:
    starts, ends = [], []
    for naif_id in NAIF_IDS:
        windows = spice.spkcov(str(ARGUMENTS.spk[0]), naif_id)
        for extra in ARGUMENTS.spk[1:]:
            windows = spice.wnunid(windows, spice.spkcov(str(extra), naif_id))
        if spice.wncard(windows) == 0:
            raise RuntimeError(f"No DE441 coverage for NAIF {naif_id}")
        starts.append(spice.wnfetd(windows, 0)[0])
        ends.append(spice.wnfetd(windows, spice.wncard(windows) - 1)[1])
    return max(starts), min(ends)


def gm_values() -> list[float]:
    values = []
    for naif_id in NAIF_IDS:
        gm_km3_s2 = float(spice.bodvcd(naif_id, "GM", 1)[1][0])
        values.append(gm_km3_s2 * DAY_SECONDS * DAY_SECONDS / (AU_KM ** 3))
    return values


def state_at_jd(jd_tdb: float) -> list[float]:
    et = (jd_tdb - J2000_JD_TDB) * DAY_SECONDS
    output = []
    for naif_id in NAIF_IDS:
        state, _ = spice.spkez(naif_id, et, "ECLIPJ2000", "NONE", 0)
        output.extend([state[0] / AU_KM, state[1] / AU_KM, state[2] / AU_KM,
                       state[3] * DAY_SECONDS / AU_KM, state[4] * DAY_SECONDS / AU_KM, state[5] * DAY_SECONDS / AU_KM])
    return output


def make_simulation(flat_state: list[float], gm: list[float], step_days: float) -> rebound.Simulation:
    simulation = rebound.Simulation()
    simulation.G = 1.0
    for index, body_id in enumerate(BODY_IDS):
        offset = index * 6
        simulation.add(m=gm[index], x=flat_state[offset], y=flat_state[offset + 1], z=flat_state[offset + 2],
                       vx=flat_state[offset + 3], vy=flat_state[offset + 4], vz=flat_state[offset + 5])
    simulation.integrator = "whfast"
    simulation.dt = step_days
    simulation.integrator.safe_mode = 0
    simulation.integrator.corrector = 11
    return simulation


def flatten_simulation(simulation: rebound.Simulation) -> list[float]:
    output = []
    for particle in simulation.particles:
        output.extend([particle.x, particle.y, particle.z, particle.vx, particle.vy, particle.vz])
    return output


def angular_momentum(simulation: rebound.Simulation) -> list[float]:
    result = [0.0, 0.0, 0.0]
    for particle in simulation.particles:
        result[0] += particle.m * (particle.y * particle.vz - particle.z * particle.vy)
        result[1] += particle.m * (particle.z * particle.vx - particle.x * particle.vz)
        result[2] += particle.m * (particle.x * particle.vy - particle.y * particle.vx)
    return result


def scheduled_jds(start_jd: float, end_jd: float, spacing_years: int) -> list[float]:
    spacing_days = 365.25 * spacing_years
    values = [start_jd]
    current = math.ceil(start_jd / spacing_days) * spacing_days
    while current < end_jd:
        if current > start_jd:
            values.append(current)
        current += spacing_days
    for year in REQUIRED_YEARS:
        jd = gregorian_jd(year)
        if start_jd <= jd <= end_jd:
            values.append(jd)
    values.append(end_jd)
    return sorted(set(values))


def relative_residual(reference: list[float], candidate: list[float], body_index: int) -> tuple[float, float]:
    offset = body_index * 6
    ref_pos = [reference[offset + axis] - reference[axis] for axis in range(3)]
    got_pos = [candidate[offset + axis] - candidate[axis] for axis in range(3)]
    ref_vel = [reference[offset + 3 + axis] - reference[3 + axis] for axis in range(3)]
    got_vel = [candidate[offset + 3 + axis] - candidate[3 + axis] for axis in range(3)]
    position_km = math.sqrt(sum((got_pos[axis] - ref_pos[axis]) ** 2 for axis in range(3))) * AU_KM
    velocity_m_s = math.sqrt(sum((got_vel[axis] - ref_vel[axis]) ** 2 for axis in range(3))) * AU_KM * 1000 / DAY_SECONDS
    return position_km, velocity_m_s


def heliocentric_state(flat_state: list[float], body_index: int) -> tuple[list[float], list[float]]:
    offset = body_index * 6
    return ([flat_state[offset + axis] - flat_state[axis] for axis in range(3)],
            [flat_state[offset + 3 + axis] - flat_state[3 + axis] for axis in range(3)])


def orbital_elements(flat_state: list[float], gm: list[float], body_index: int) -> dict:
    """Return osculating two-body elements for validation diagnostics only."""
    position, velocity = heliocentric_state(flat_state, body_index)
    radius = math.sqrt(sum(value * value for value in position))
    speed2 = sum(value * value for value in velocity)
    mu = gm[0] + gm[body_index]
    angular_momentum = [
        position[1] * velocity[2] - position[2] * velocity[1],
        position[2] * velocity[0] - position[0] * velocity[2],
        position[0] * velocity[1] - position[1] * velocity[0],
    ]
    h = math.sqrt(sum(value * value for value in angular_momentum))
    radial_velocity = sum(position[index] * velocity[index] for index in range(3))
    eccentricity_vector = [
        ((speed2 - mu / radius) * position[index] - radial_velocity * velocity[index]) / mu
        for index in range(3)
    ]
    eccentricity = math.sqrt(sum(value * value for value in eccentricity_vector))
    energy = speed2 / 2 - mu / radius
    semi_major_axis = -mu / (2 * energy) if energy != 0 else math.inf
    inclination_deg = math.degrees(math.acos(max(-1.0, min(1.0, angular_momentum[2] / h)))) if h else 0.0
    return {"semiMajorAxisAu": semi_major_axis, "eccentricity": eccentricity, "inclinationDeg": inclination_deg}


def angular_separation_deg(left: list[float], right: list[float]) -> float:
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    cosine = sum(left[index] * right[index] for index in range(3)) / (left_norm * right_norm)
    return math.degrees(math.acos(max(-1.0, min(1.0, cosine))))


def body_residual(reference: list[float], candidate: list[float], gm: list[float], body_index: int) -> dict:
    position_km, velocity_m_s = relative_residual(reference, candidate, body_index)
    reference_position, _ = heliocentric_state(reference, body_index)
    candidate_position, _ = heliocentric_state(candidate, body_index)
    reference_elements = orbital_elements(reference, gm, body_index)
    candidate_elements = orbital_elements(candidate, gm, body_index)
    return {
        "bodyId": BODY_IDS[body_index],
        "positionResidualKm": position_km,
        "velocityResidualMPerS": velocity_m_s,
        "orbitalPhaseErrorDeg": angular_separation_deg(reference_position, candidate_position),
        "semiMajorAxisDifferenceAu": candidate_elements["semiMajorAxisAu"] - reference_elements["semiMajorAxisAu"],
        "eccentricityDifference": candidate_elements["eccentricity"] - reference_elements["eccentricity"],
        "inclinationDifferenceDeg": candidate_elements["inclinationDeg"] - reference_elements["inclinationDeg"],
    }


def holdout_validation(gm: list[float], coverage_start_jd: float, coverage_end_jd: float) -> dict:
    requested_years = [-10000, -5000, 1, 1000, 1800, 2000, 2500, 5000, 7500, 9999, 12000, 15000, 17000]
    supported = [(year, gregorian_jd(year)) for year in requested_years if coverage_start_jd <= gregorian_jd(year) <= coverage_end_jd]
    if len(supported) < 2:
        fallback_start = max(coverage_start_jd, gregorian_jd(2000))
        fallback_end = coverage_end_jd
        supported = [(round((fallback_start - 1721059.5) / 365.2425), fallback_start),
                     (round((fallback_end - 1721059.5) / 365.2425), fallback_end)]
    initial_jd = supported[0][1]
    initial_state = state_at_jd(initial_jd)
    simulation = make_simulation(initial_state, gm, ARGUMENTS.step_days)
    checkpoints = []
    for year, jd in supported:
        if jd <= initial_jd or jd > coverage_end_jd:
            continue
        simulation.integrate(jd - initial_jd, exact_finish_time=1)
        candidate, reference = flatten_simulation(simulation), state_at_jd(jd)
        bodies = [body_residual(reference, candidate, gm, index) for index in range(1, len(BODY_IDS))]
        checkpoints.append({"year": year, "jdTdb": jd, "bodies": bodies})
    return {"initialEpochJdTdb": initial_jd, "stepDays": ARGUMENTS.step_days, "integrator": f"REBOUND {rebound.__version__} WHFast corrector 11", "checkpoints": checkpoints}


def bounded_interpolation_validation(gm: list[float], coverage_start_jd: float, coverage_end_jd: float) -> dict:
    years = sorted(set([-10000, -5000, 1, 1000, 1800, 2000, 2026, 2050, 2100, 2500, 5000, 7500, 9999, 12000, 15000, 17000]))
    checkpoints = []
    half_span_days = ARGUMENTS.anchor_years * 365.25 / 2
    for year in years:
        anchor_jd = gregorian_jd(year)
        target_jd = anchor_jd + half_span_days
        if not (coverage_start_jd <= anchor_jd < target_jd <= coverage_end_jd):
            continue
        simulation = make_simulation(state_at_jd(anchor_jd), gm, ARGUMENTS.step_days)
        simulation.integrate(target_jd - anchor_jd, exact_finish_time=1)
        candidate, reference = flatten_simulation(simulation), state_at_jd(target_jd)
        bodies = [body_residual(reference, candidate, gm, index) for index in range(1, len(BODY_IDS))]
        checkpoints.append({"anchorYear": year, "anchorJdTdb": anchor_jd, "targetJdTdb": target_jd,
                            "propagationDays": target_jd - anchor_jd, "bodies": bodies})
    return {"maximumPropagationDays": half_span_days, "stepDays": ARGUMENTS.step_days, "checkpoints": checkpoints,
            "purpose": "Validates the browser's bounded integration between deployed DE441 anchors; this is separate from the long holdout experiment."}


def timestep_convergence(initial_state: list[float], gm: list[float], start_jd: float) -> dict:
    steps = sorted(set([ARGUMENTS.step_days / 2, ARGUMENTS.step_days, ARGUMENTS.step_days * 2]))
    years = [year for year in [20000, 25000, 50000, 75000, 100000] if gregorian_jd(year) >= start_jd]
    simulations = {step: make_simulation(initial_state, gm, step) for step in steps}
    initial_invariants = {
        step: {"energy": simulation.energy(), "angularMomentum": angular_momentum(simulation)}
        for step, simulation in simulations.items()
    }
    checkpoints = []
    for year in years:
        jd = gregorian_jd(year)
        states = {}
        invariants = {}
        for step, simulation in simulations.items():
            simulation.integrate(jd - start_jd, exact_finish_time=1)
            states[step] = flatten_simulation(simulation)
            momentum = angular_momentum(simulation)
            baseline = initial_invariants[step]
            invariants[str(step)] = {
                "relativeEnergyDrift": (simulation.energy() - baseline["energy"]) / baseline["energy"],
                "relativeAngularMomentumDrift": math.sqrt(sum((momentum[index] - baseline["angularMomentum"][index]) ** 2 for index in range(3))) / math.sqrt(sum(value * value for value in baseline["angularMomentum"])),
            }
        fine, nominal, coarse = states[steps[0]], states[steps[1]], states[steps[2]]
        bodies = []
        for index in range(1, len(BODY_IDS)):
            fine_nominal = body_residual(fine, nominal, gm, index)
            nominal_coarse = body_residual(nominal, coarse, gm, index)
            bodies.append({
                "bodyId": BODY_IDS[index],
                "fineVsNominalPositionKm": fine_nominal["positionResidualKm"],
                "fineVsNominalVelocityMPerS": fine_nominal["velocityResidualMPerS"],
                "nominalVsCoarsePositionKm": nominal_coarse["positionResidualKm"],
                "nominalVsCoarseVelocityMPerS": nominal_coarse["velocityResidualMPerS"],
            })
        checkpoints.append({"year": year, "jdTdb": jd, "invariants": invariants, "bodies": bodies})
    return {"stepDays": steps, "checkpoints": checkpoints,
            "interpretation": "Timestep sensitivity quantifies numerical convergence only; it is not an observational covariance or a guarantee of physical predictability."}


def main() -> None:
    for kernel in [*ARGUMENTS.spk, ARGUMENTS.gm]:
        spice.furnsh(str(kernel))
    try:
        coverage_start_et, coverage_end_et = common_coverage()
        coverage_start_jd = J2000_JD_TDB + coverage_start_et / DAY_SECONDS
        coverage_end_jd = J2000_JD_TDB + coverage_end_et / DAY_SECONDS
        gm = gm_values()

        de441_jds = scheduled_jds(coverage_start_jd, coverage_end_jd, ARGUMENTS.anchor_years)
        de441_anchors = [[jd, *state_at_jd(jd)] for jd in de441_jds]

        future_end_jd = gregorian_jd(100000)
        future_jds = scheduled_jds(coverage_end_jd, future_end_jd, ARGUMENTS.anchor_years)
        future_simulation = make_simulation(de441_anchors[-1][1:], gm, ARGUMENTS.step_days)
        initial_energy = future_simulation.energy()
        initial_momentum = angular_momentum(future_simulation)
        future_anchors, conservation = [], []
        for jd in future_jds:
            future_simulation.integrate(jd - coverage_end_jd, exact_finish_time=1)
            future_anchors.append([jd, *flatten_simulation(future_simulation)])
            if jd in {future_jds[0], future_jds[-1]} or any(abs(jd - gregorian_jd(year)) < 1e-8 for year in REQUIRED_YEARS):
                energy = future_simulation.energy()
                momentum = angular_momentum(future_simulation)
                conservation.append({"jdTdb": jd, "relativeEnergyDrift": (energy - initial_energy) / initial_energy,
                                     "relativeAngularMomentumDrift": math.sqrt(sum((momentum[i] - initial_momentum[i]) ** 2 for i in range(3))) / math.sqrt(sum(value * value for value in initial_momentum))})

        validation = holdout_validation(gm, coverage_start_jd, coverage_end_jd)
        browser_interpolation = bounded_interpolation_validation(gm, coverage_start_jd, coverage_end_jd)
        convergence = timestep_convergence(de441_anchors[-1][1:], gm, coverage_end_jd)
        boundary_state = state_at_jd(coverage_end_jd)
        boundary_residuals = [body_residual(boundary_state, de441_anchors[-1][1:], gm, index) for index in range(1, len(BODY_IDS))]
        generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        source_files = [verified_file_record(path) for path in [*ARGUMENTS.spk, ARGUMENTS.gm]]
        model_version = "PCS-SS-LH-2026.08"
        common = {
            "browserInterpolationMaxStepDays": ARGUMENTS.step_days,
            "integrator": f"REBOUND {rebound.__version__} WHFast corrector 11 for checkpoints; velocity-Verlet max {ARGUMENTS.step_days:g} d for bounded browser interpolation",
            "diagnostics": {"holdoutValidationFile": str(ARGUMENTS.validation.name), "conservation": conservation,
                            "boundaryContinuityMaxPositionKm": max(item["positionResidualKm"] for item in boundary_residuals)},
        }
        bundle = {
            "schemaVersion": 1,
            "datasetId": "pcs-solar-system-long-horizon-de441-nbody-v1",
            "modelVersion": model_version,
            "generatedAt": generated_at,
            "bodyIds": BODY_IDS,
            "bodySemantics": {"sun": "Sun center", "mercury": "Mercury system barycenter", "venus": "Venus system barycenter", "earth": "Earth-Moon barycenter", "mars": "Mars system barycenter", "jupiter": "Jupiter system barycenter", "saturn": "Saturn system barycenter", "uranus": "Uranus system barycenter", "neptune": "Neptune system barycenter"},
            "gmAu3Day2": gm,
            "timeScale": "TDB",
            "referenceSystem": "ICRF",
            "referencePlane": "ECLIPJ2000",
            "referenceFrame": "Solar-System barycentric ICRF/J2000 ecliptic scientific state; heliocentric display transform",
            "sourceFiles": source_files,
            "segments": [
                {"id": "jpl-de441-long-term-ephemeris", "provider": "AUTHORITATIVE_EPHEMERIS", "providerSubtype": "LONG_TERM_EPHEMERIS", "startJdTdb": coverage_start_jd, "endJdTdb": coverage_end_jd, "startEpoch": f"{coverage_start_jd} JDTDB", "endEpoch": f"{coverage_end_jd} JDTDB", "source": "NASA/JPL DE441 SPICE binary planetary ephemeris", "catalogEphemeris": "JPL DE441", "positionMode": "Long-Term Ephemeris anchor + bounded N-body interpolation", "orbitMode": "N-body trajectory from the same state provider", "qualityStatus": "Long-term ephemeris-derived; not direct observation at every epoch", "uncertainty": "DE441 model uncertainty is epoch/body dependent; browser interpolation residual is separately validated", "fidelityLabel": "Authoritative Long-Term Ephemeris", "fidelityDetail": "DE441-derived state; observational constraint and uncertainty vary with epoch", "notice": "The long-term planet markers represent planet-system barycenters where DE441 does not provide isolated planet centers.", "anchors": de441_anchors, **common},
                {"id": "pcs-nbody-de441-boundary-to-ad100000", "provider": "PCS_NUMERICAL_ANALYSIS", "providerSubtype": "LONG_TERM_DYNAMICAL_RECONSTRUCTION", "startJdTdb": coverage_end_jd, "endJdTdb": future_end_jd, "startEpoch": f"{coverage_end_jd} JDTDB", "endEpoch": extended_iso(100000), "source": f"PCS numerical analysis initialized from JPL DE441 boundary ({coverage_end_jd} JDTDB)", "catalogEphemeris": model_version, "positionMode": "PCS Numerical Analysis", "orbitMode": "Long-term N-body dynamical reconstruction", "qualityStatus": "Model-dependent long-horizon dynamical reconstruction", "uncertainty": "Numerical convergence is quantified; observational/model uncertainty and chaotic divergence grow with propagation age", "fidelityLabel": "PCS Numerical Dynamical Analysis", "fidelityDetail": "Long-horizon reconstruction — not a deterministic prediction", "notice": "Nine-body planet-system model; omitted asteroids, relativistic terms, satellite internal motion and non-gravitational forces are documented limitations.", "anchors": future_anchors, **common},
            ],
        }
        ARGUMENTS.output.parent.mkdir(parents=True, exist_ok=True)
        source = "(function(g){\"use strict\";g.PCSSolarSystemLongHorizonDataset=Object.freeze(" + json.dumps(bundle, separators=(",", ":")) + ");})(window);\n"
        ARGUMENTS.output.write_text(source, encoding="utf-8")
        validation.update({"schemaVersion": 1, "datasetId": bundle["datasetId"], "modelVersion": model_version, "generatedAt": generated_at,
                           "de441Coverage": {"startJdTdb": coverage_start_jd, "endJdTdb": coverage_end_jd}, "sourceFiles": source_files,
                           "conservation": conservation, "boundedBrowserInterpolation": browser_interpolation,
                           "timestepConvergence": convergence,
                           "providerBoundaryContinuity": {"jdTdb": coverage_end_jd, "bodies": boundary_residuals,
                                                          "method": "The first PCS numerical state is initialized from the exact final DE441 boundary state."},
                           "uncertaintyStatus": "Numerical convergence and ephemeris holdout divergence quantified; no observational covariance ensemble is asserted.",
                           "status": "CANDIDATE — HUMAN AND SCIENTIFIC REVIEW REQUIRED"})
        ARGUMENTS.validation.parent.mkdir(parents=True, exist_ok=True)
        ARGUMENTS.validation.write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"output": str(ARGUMENTS.output), "bytes": ARGUMENTS.output.stat().st_size, "de441Anchors": len(de441_anchors),
                          "pcsAnchors": len(future_anchors), "validation": str(ARGUMENTS.validation)}, indent=2))
    finally:
        spice.kclear()


PARSER = argparse.ArgumentParser()
PARSER.add_argument("--spk", type=Path, action="append", required=True, help="DE441 SPK part; repeat for multiple parts")
PARSER.add_argument("--gm", type=Path, required=True, help="Official JPL/NAIF GM text kernel")
PARSER.add_argument("--output", type=Path, required=True)
PARSER.add_argument("--validation", type=Path, required=True)
PARSER.add_argument("--anchor-years", type=int, default=10)
PARSER.add_argument("--step-days", type=float, default=4.0)
ARGUMENTS = PARSER.parse_args()

if __name__ == "__main__":
    main()
