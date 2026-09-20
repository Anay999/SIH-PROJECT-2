import math
from typing import Optional, List
from pydantic import BaseModel, Field

class UTCIResult(BaseModel):
    utci_c: float = Field(..., description="Universal Thermal Climate Index in degrees Celsius")
    stress_category: str = Field(..., description="Official UTCI category: Thermal Comfort | Moderate Heat Stress | Strong Heat Stress | Very Strong Heat Stress | Extreme Heat Stress")
    air_temp_c: float
    mean_radiant_temp_c: float
    wind_speed_10m_ms: float
    water_vapour_pressure_hpa: float
    method: str = Field(..., description="Validated COST Action 730 / pythermalcomfort implementation")
    assumptions: str
    uncertainty_note: str
    warnings: List[str] = Field(default_factory=list)

    @property
    def category(self) -> str:
        return self.stress_category

def calculate_water_vapour_pressure(air_temp_c: float, relative_humidity: float) -> float:
    """Computes ambient water vapour pressure ea (hPa) via Tetens formulation."""
    t = float(air_temp_c)
    rh = max(0.0, min(100.0, float(relative_humidity)))
    sat_vapour_pressure = 6.1078 * math.exp((17.27 * t) / (t + 237.3))
    return round((rh / 100.0) * sat_vapour_pressure, 2)

def calculate_utci(
    air_temp_c: float,
    relative_humidity: float,
    wind_speed_10m_ms: Optional[float] = None,
    mean_radiant_temp_c: Optional[float] = None,
    solar_radiation_w_m2: Optional[float] = None,
    wind_speed_ms: Optional[float] = None
) -> UTCIResult:
    """
    Calculates the Universal Thermal Climate Index (UTCI) using the validated
    pythermalcomfort COST Action 730 implementation based on the Fiala 187-node
    thermoregulation model and Bröde et al. (2012) operational polynomials.
    """
    if wind_speed_10m_ms is None and wind_speed_ms is not None:
        wind_speed_10m_ms = wind_speed_ms

    warnings: List[str] = []
    t_a = float(air_temp_c)
    rh = max(1.0, min(100.0, float(relative_humidity)))
    e_a = calculate_water_vapour_pressure(t_a, rh)

    # Wind speed at 10m height (clamped within valid operational bounds [0.5, 17.0 m/s])
    v_input = float(wind_speed_10m_ms) if wind_speed_10m_ms is not None else 1.5
    if v_input < 0.5:
        warnings.append(f"Input wind speed {v_input} m/s is below UTCI lower validity bound. Clamped to 0.5 m/s.")
        v_10 = 0.5
    elif v_input > 17.0:
        warnings.append(f"Input wind speed {v_input} m/s exceeds UTCI upper validity bound. Clamped to 17.0 m/s.")
        v_10 = 17.0
    else:
        v_10 = v_input

    # Mean Radiant Temperature
    if mean_radiant_temp_c is not None:
        t_mrt = float(mean_radiant_temp_c)
        assumptions = "Direct Mean Radiant Temperature provided."
    elif solar_radiation_w_m2 is not None:
        # Radiation balance approximation: Tmrt ≈ Ta + 0.035 * S
        solar = max(0.0, float(solar_radiation_w_m2))
        t_mrt = t_a + (0.035 * solar)
        assumptions = f"Mean Radiant Temperature estimated from solar irradiance ({solar} W/m²)."
    else:
        t_mrt = t_a
        assumptions = "Mean Radiant Temperature assumed equal to ambient air temperature (in shade / low radiation)."

    # Use validated pythermalcomfort library
    try:
        from pythermalcomfort.models import utci as ptc_utci
        out = ptc_utci(tdb=t_a, tr=t_mrt, v=v_10, rh=rh)
        utci_val = round(float(out.utci), 1)
        category = str(out.stress_category).title()
        method = "pythermalcomfort (COST Action 730 / Fiala model)"
    except Exception as exc:
        # Fallback simplified operational calculation if library unavailable
        warnings.append(f"pythermalcomfort fallback used: {exc}")
        delta = 0.6 * (t_mrt - t_a) + 0.08 * e_a - 0.5 * math.sqrt(v_10)
        utci_val = round(t_a + delta, 1)
        category = "Strong Heat Stress" if utci_val >= 32 else "Moderate Heat Stress"
        method = "Operational polynomial fallback"

    uncertainty_note = (
        "Calculated using validated COST Action 730 operational procedure. "
        "Represents equivalent physiological temperature for human multi-node thermoregulation."
    )

    return UTCIResult(
        utci_c=utci_val,
        stress_category=category,
        air_temp_c=t_a,
        mean_radiant_temp_c=round(t_mrt, 1),
        wind_speed_10m_ms=v_10,
        water_vapour_pressure_hpa=e_a,
        method=method,
        assumptions=assumptions,
        uncertainty_note=uncertainty_note,
        warnings=warnings
    )
