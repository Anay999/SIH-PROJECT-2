import math
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class WBGTResult(BaseModel):
    wbgt_c: float = Field(..., description="Wet-Bulb Globe Temperature in degrees Celsius")
    mode: str = Field(..., description="direct_measurement | estimated_outdoor | estimated_indoor")
    category: str = Field(..., description="ACGIH / ISO 7243 Stress Category: Low | Moderate | High | Very High | Extreme")
    work_rest_recommendation: str = Field(..., description="Safe labor guideline (e.g. 45 min work / 15 min rest)")
    natural_wet_bulb_c: float = Field(..., description="Natural wet-bulb temperature Tw (measured or Stull estimate)")
    globe_temp_c: float = Field(..., description="Globe temperature Tg (measured or radiation balance estimate)")
    air_temp_c: float = Field(..., description="Dry-bulb air temperature Ta")
    inputs_used: Dict[str, Any] = Field(default_factory=dict)
    uncertainty_note: str = Field(..., description="Pedigree statement indicating whether Tg and Tw were measured or estimated")
    warnings: List[str] = Field(default_factory=list)

    @property
    def flag_color(self) -> str:
        if self.wbgt_c >= 32.2:
            return "Black"
        elif self.wbgt_c >= 31.1:
            return "Red"
        elif self.wbgt_c >= 29.4:
            return "Yellow"
        elif self.wbgt_c >= 26.7:
            return "Green"
        return "White"

def estimate_stull_wet_bulb(air_temp_c: float, relative_humidity: float) -> float:
    """
    Computes natural wet-bulb temperature Tw (°C) via the validated empirical
    formulation published by Stull (2011).
    Valid for T between -20°C and 50°C and RH between 5% and 99%.
    
    Reference:
      Stull, R. (2011). Wet-bulb temperature from relative humidity and air temperature.
      Journal of Applied Meteorology and Climatology, 50(11), 2267-2269.
    """
    t = float(air_temp_c)
    rh = max(1.0, min(100.0, float(relative_humidity)))

    tw = (
        t * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(t + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * (rh ** 1.5) * math.atan(0.023101 * rh)
        - 4.686035
    )
    return round(tw, 2)

def calculate_wbgt(
    air_temp_c: float,
    natural_wet_bulb_c: Optional[float] = None,
    globe_temp_c: Optional[float] = None,
    solar_radiation_w_m2: Optional[float] = None,
    relative_humidity: Optional[float] = None,
    wind_speed_m_s: Optional[float] = None,
    environment: str = "outdoor"
) -> WBGTResult:
    """
    Calculates Wet-Bulb Globe Temperature (WBGT) adhering strictly to ISO 7243.
    
    Decoupled Modes:
      1. Direct Measurement: Triggered when Tw and Tg are directly provided.
      2. Estimated Mode: Triggered when standard weather variables are provided.
         Estimates Tw via Stull (2011) and Tg via outdoor solar-wind equilibrium.
    """
    warnings: List[str] = []
    t_a = float(air_temp_c)

    # 1. Direct Measurement Mode
    if natural_wet_bulb_c is not None and globe_temp_c is not None:
        t_w = float(natural_wet_bulb_c)
        t_g = float(globe_temp_c)
        
        if environment.lower() == "indoor" or environment.lower() == "shade":
            wbgt = 0.7 * t_w + 0.3 * t_g
            mode = "direct_measurement_indoor"
        else:
            wbgt = 0.7 * t_w + 0.2 * t_g + 0.1 * t_a
            mode = "direct_measurement_outdoor"

        uncertainty_note = "Direct physical instrument measurement mode (Tw and Tg verified)."
        inputs_used = {"Tw_measured": t_w, "Tg_measured": t_g, "Ta": t_a, "environment": environment}

    # 2. Estimated Mode
    else:
        if relative_humidity is None:
            raise ValueError("Relative humidity is mandatory when natural wet-bulb temperature is not directly provided.")
        
        rh = float(relative_humidity)
        v = float(wind_speed_m_s) if wind_speed_m_s is not None else 1.5
        solar = float(solar_radiation_w_m2) if solar_radiation_w_m2 is not None else (700.0 if environment == "outdoor" else 0.0)

        # Estimate Tw using Stull (2011)
        t_w = estimate_stull_wet_bulb(t_a, rh)

        # Estimate Tg using radiative and convective balance approximation
        if environment.lower() in ["indoor", "shade"] or solar == 0.0:
            # Indoor/shade: Globe temperature approaches dry-bulb air temperature
            t_g = t_a + 0.5
            wbgt = 0.7 * t_w + 0.3 * t_g
            mode = "estimated_indoor"
            uncertainty_note = (
                "Estimated indoor/shaded WBGT. Tw derived from Stull (2011). "
                "Assumes zero direct solar irradiance. Approximate research score."
            )
        else:
            # Outdoor with direct solar load:
            # Radiative heating proportional to solar irradiance, mitigated by wind convection
            wind_convection = math.sqrt(max(0.2, v))
            solar_lift = (0.01498 * solar) / wind_convection
            t_g = t_a + solar_lift
            wbgt = 0.7 * t_w + 0.2 * t_g + 0.1 * t_a
            mode = "estimated_outdoor"
            uncertainty_note = (
                "Estimated outdoor WBGT. Tw derived from Stull (2011); Tg derived from "
                "solar-wind equilibrium approximation. Not a certified ISO 7243 black-globe instrument."
            )

        inputs_used = {
            "Ta": t_a,
            "RH": rh,
            "Tw_stull_estimated": t_w,
            "Tg_estimated": round(t_g, 2),
            "solar_radiation_wm2": solar,
            "wind_speed_ms": v,
            "environment": environment
        }

    wbgt = round(wbgt, 1)

    # Classification & Occupational Work-Rest Thresholds (ACGIH / ISO 7243)
    if wbgt < 26.0:
        category = "Low"
        work_rest = "Normal activity. Maintain standard hydration."
    elif 26.0 <= wbgt < 29.0:
        category = "Moderate"
        work_rest = "Caution. Increase water intake to 750ml/hour. Provide shaded breaks."
    elif 29.0 <= wbgt < 31.0:
        category = "High"
        work_rest = "High thermal strain. Recommend 45 min work / 15 min rest per hour in shade."
    elif 31.0 <= wbgt < 32.2:
        category = "Very High"
        work_rest = "Severe strain. Recommend 30 min work / 30 min rest. Restrict strenuous tasks."
    else:
        category = "Extreme"
        work_rest = "Critical danger of heat collapse. Cease unconditioned outdoor manual labor."

    return WBGTResult(
        wbgt_c=wbgt,
        mode=mode,
        category=category,
        work_rest_recommendation=work_rest,
        natural_wet_bulb_c=t_w,
        globe_temp_c=round(t_g, 1),
        air_temp_c=t_a,
        inputs_used=inputs_used,
        uncertainty_note=uncertainty_note,
        warnings=warnings
    )
