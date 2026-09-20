from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class HTSIResult(BaseModel):
    htsi_score: float = Field(..., description="Composite Human Thermal Stress Index on 0-100 scale")
    category: str = Field(..., description="Low | Moderate | High | Very High | Extreme")
    component_scores: Dict[str, float] = Field(
        ...,
        description="Normalized sub-scores (0-100) for thermal_burden, persistence_burden, vulnerability_context, urban_exposure"
    )
    weights_applied: Dict[str, float] = Field(
        ...,
        description="Configurable prototype weights (default: 45% thermal, 20% persistence, 20% vulnerability, 15% urban)"
    )
    primary_risk_driver: str = Field(..., description="Key meteorological or demographic contributor")
    explanation: str = Field(..., description="Transparent, human-readable breakdown of score causes")
    scientific_disclaimer: str = Field(
        default="HTSI is a project-defined municipal decision-support index. It is not an officially established universal medical diagnosis."
    )

    @property
    def htsi_category(self) -> str:
        return self.category

def calculate_htsi(
    heat_index_c: float,
    wbgt_c: float,
    utci_c: float,
    consecutive_hot_days: int = 1,
    min_night_temp_c: float = 27.0,
    vulnerability_score: float = 50.0,
    builtup_fraction: float = 0.75,
    vegetation_ndvi: float = 0.20,
    custom_weights: Optional[Dict[str, float]] = None
) -> HTSIResult:
    """
    Computes the composite Human Thermal Stress Index (HTSI, 0-100).
    
    Architecture:
      1. Thermal Burden (0-100): Scaled blend of Rothfusz HI, WBGT, and UTCI.
      2. Persistence Burden (0-100): Multi-day heatwave duration and nocturnal heat traps.
      3. Vulnerability Context (0-100): Demographic and socioeconomic susceptibility.
      4. Urban Exposure Context (0-100): Urban heat island retention (impervious surface - vegetation).
    """
    # 1. Thermal Burden calculation
    # Normalized against critical human physiological tolerance limits
    # (e.g. HI 54C = 100%, WBGT 35C = 100%, UTCI 46C = 100%)
    norm_hi = min(100.0, max(0.0, (heat_index_c - 25.0) / (55.0 - 25.0) * 100.0))
    norm_wbgt = min(100.0, max(0.0, (wbgt_c - 22.0) / (35.0 - 22.0) * 100.0))
    norm_utci = min(100.0, max(0.0, (utci_c - 20.0) / (48.0 - 20.0) * 100.0))
    thermal_burden = round((0.40 * norm_wbgt) + (0.35 * norm_hi) + (0.25 * norm_utci), 1)

    # 2. Persistence Burden calculation
    # Penalty for consecutive hot days (>38C) and nocturnal minimum temperature (>28C prevents recovery)
    day_penalty = min(50.0, (consecutive_hot_days - 1) * 12.5) if consecutive_hot_days > 1 else 0.0
    night_penalty = min(50.0, max(0.0, (min_night_temp_c - 26.0) * 10.0))
    persistence_burden = round(min(100.0, day_penalty + night_penalty + 15.0), 1)

    # 3. Vulnerability Context
    vulnerability_context = round(min(100.0, max(0.0, float(vulnerability_score))), 1)

    # 4. Urban Exposure Context
    # Higher built-up surface fraction and low vegetation trap solar flux
    urban_exposure = round(min(100.0, max(0.0, (builtup_fraction * 70.0) + ((1.0 - max(0.0, vegetation_ndvi)) * 30.0))), 1)

    # Apply Weights
    default_weights = {
        "thermal_burden": 0.45,
        "persistence_burden": 0.20,
        "vulnerability_context": 0.20,
        "urban_exposure": 0.15
    }
    weights = custom_weights if custom_weights else default_weights

    # Validate weight sum
    weight_sum = sum(weights.values())
    w_thermal = weights.get("thermal_burden", 0.45) / weight_sum
    w_persist = weights.get("persistence_burden", 0.20) / weight_sum
    w_vuln = weights.get("vulnerability_context", 0.20) / weight_sum
    w_urban = weights.get("urban_exposure", 0.15) / weight_sum

    htsi_raw = (
        (w_thermal * thermal_burden)
        + (w_persist * persistence_burden)
        + (w_vuln * vulnerability_context)
        + (w_urban * urban_exposure)
    )
    htsi_score = round(min(100.0, max(0.0, htsi_raw)), 1)

    # Risk Categorization
    if htsi_score < 20.0:
        category = "Low"
    elif 20.0 <= htsi_score < 40.0:
        category = "Moderate"
    elif 40.0 <= htsi_score < 60.0:
        category = "High"
    elif 60.0 <= htsi_score < 80.0:
        category = "Very High"
    else:
        category = "Extreme"

    # Identify Primary Driver
    components = {
        "Immediate Biometeorological Strain (WBGT & Humidity)": thermal_burden,
        "Consecutive Day & Night Heat Persistence": persistence_burden,
        "Demographic & Socioeconomic Susceptibility": vulnerability_context,
        "Urban Heat Island & Concrete Density": urban_exposure
    }
    primary_driver = max(components, key=components.get)

    # Detailed Explainability Text
    explanation_parts = []
    if thermal_burden >= 70.0:
        explanation_parts.append("Elevated wet-bulb temperature restricts physiological evaporative cooling.")
    if persistence_burden >= 60.0:
        explanation_parts.append(f"Nocturnal minimum temperature ({min_night_temp_c}°C) prevents physiological recovery overnight.")
    if vulnerability_context >= 65.0:
        explanation_parts.append("High proportion of outdoor laborers and elderly citizens amplifies population exposure.")
    if urban_exposure >= 70.0:
        explanation_parts.append("Dense built-up infrastructure exacerbates local microclimatic thermal retention.")

    explanation = " ".join(explanation_parts) if explanation_parts else "Moderate seasonal thermal load within standard operational thresholds."

    return HTSIResult(
        htsi_score=htsi_score,
        category=category,
        component_scores={
            "thermal_burden": thermal_burden,
            "persistence_burden": persistence_burden,
            "vulnerability_context": vulnerability_context,
            "urban_exposure": urban_exposure
        },
        weights_applied={
            "thermal_burden": round(w_thermal, 2),
            "persistence_burden": round(w_persist, 2),
            "vulnerability_context": round(w_vuln, 2),
            "urban_exposure": round(w_urban, 2)
        },
        primary_risk_driver=primary_driver,
        explanation=explanation
    )
