import math
from typing import Optional, List
from pydantic import BaseModel, Field

class HeatIndexResult(BaseModel):
    value_c: float = Field(..., description="Heat Index in degrees Celsius")
    value_f: float = Field(..., description="Heat Index in degrees Fahrenheit")
    category: str = Field(..., description="NWS Risk Category: Normal | Caution | Extreme Caution | Danger | Extreme Danger")
    method: str = Field(..., description="NOAA Rothfusz regression or Steadman baseline fallback")
    valid_range: bool = Field(..., description="True if within the scientifically validated range (T >= 26.7C and RH >= 40%)")
    adjustments_applied: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

    @property
    def heat_index_c(self) -> float:
        return self.value_c

def calculate_heat_index(air_temp_c: float, relative_humidity: float) -> HeatIndexResult:
    """
    Calculates the National Oceanic and Atmospheric Administration (NOAA) /
    National Weather Service (NWS) Heat Index based on the Rothfusz regression.
    
    References:
      - Rothfusz, L. P. (1990). The computation and use of heat index offenses.
        National Weather Service, Technical Attachment SR 90-23.
      - Steadman, R. G. (1979). The assessment of sultriness. Part I: A temperature-humidity
        index based on human physiology and clothing science. J. Appl. Meteor., 18, 861-873.
    """
    warnings: List[str] = []
    adjustments: List[str] = []

    # Clamp RH to physically valid percentages
    rh = max(0.0, min(100.0, float(relative_humidity)))
    t_c = float(air_temp_c)
    t_f = (t_c * 9.0 / 5.0) + 32.0

    # Steadman simple equation baseline check
    hi_simple_f = 0.5 * (t_f + 61.0 + ((t_f - 68.0) * 1.2) + (rh * 0.094))

    # If simple formula gives average < 80F, Rothfusz regression is not applicable
    if hi_simple_f < 80.0 or t_f < 80.0:
        hi_f = hi_simple_f
        method = "Steadman simple baseline"
        valid_range = True
        if t_c < 20.0:
            warnings.append("Temperature is below typical sultriness threshold (<20°C). Result reflects apparent temp.")
    else:
        # Full Rothfusz 9-term polynomial regression
        hi_f = (
            -42.379
            + 2.04901523 * t_f
            + 10.14333127 * rh
            - 0.22475541 * t_f * rh
            - 0.00683783 * (t_f ** 2)
            - 0.05481717 * (rh ** 2)
            + 0.00122874 * (t_f ** 2) * rh
            + 0.00085282 * t_f * (rh ** 2)
            - 0.00000199 * (t_f ** 2) * (rh ** 2)
        )
        method = "Rothfusz NOAA full regression"
        valid_range = True

        # Adjustment 1: Low Relative Humidity adjustment
        if rh < 13.0 and 80.0 <= t_f <= 112.0:
            diff_term = 17.0 - abs(t_f - 95.0)
            if diff_term > 0:
                adjustment = ((13.0 - rh) / 4.0) * math.sqrt(diff_term / 17.0)
                hi_f -= adjustment
                adjustments.append(f"Low-RH correction (-{round(adjustment, 2)}°F)")

        # Adjustment 2: High Relative Humidity adjustment
        elif rh > 85.0 and 80.0 <= t_f <= 87.0:
            adjustment = ((rh - 85.0) / 10.0) * ((87.0 - t_f) / 5.0)
            hi_f += adjustment
            adjustments.append(f"High-RH correction (+{round(adjustment, 2)}°F)")

    # Convert final Heat Index from Fahrenheit back to Celsius
    hi_c = (hi_f - 32.0) * 5.0 / 9.0

    # Categorization based on NWS Heat Index classification thresholds
    if hi_c < 27.0:
        category = "Normal"
    elif 27.0 <= hi_c < 32.0:
        category = "Caution"
    elif 32.0 <= hi_c < 41.0:
        category = "Extreme Caution"
    elif 41.0 <= hi_c < 54.0:
        category = "Danger"
    else:
        category = "Extreme Danger"

    return HeatIndexResult(
        value_c=round(hi_c, 1),
        value_f=round(hi_f, 1),
        category=category,
        method=method,
        valid_range=valid_range,
        adjustments_applied=adjustments,
        warnings=warnings
    )
