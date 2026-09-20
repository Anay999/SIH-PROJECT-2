"""
HEATSHIELD AI — Heat-Attributable Mortality Risk (HAMRI) & Hospital Surge Engine
================================================================================
Translates composite biometeorological thermal stress (HTSI), consecutive-day
lagged exposure, nocturnal minimum temperature deficits, and localized vulnerability
into estimated relative risk, excess mortality ranges, and emergency hospital demand.

Methodological & Epidemiological Foundation:
- Gasparrini et al. (Lancet 2015): Distributed lag non-linear models (DLNM) for temperature-mortality.
- Armstrong (1998): Relative risk models of heat exposure.
- Vicedo-Cabrera et al. (Nature Climate Change 2021): Heat-related mortality burden attribution.
- National Centre for Disease Control (NCDC, India) National Action Plan on Heat-Related Illnesses.

DISCLAIMER:
All health risk scores and case projections are synthetic research approximations
for municipal triage simulation and operational planning. They are NOT clinically
validated diagnostic tools and do not constitute official mortality statistics.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field

MORTALITY_DISCLAIMER = (
    "RESEARCH/DEMO ESTIMATE. NOT CLINICALLY VALIDATED. NOT AN OFFICIAL MORTALITY FORECAST."
)

class UncertaintyBand(BaseModel):
    lower: float = Field(..., description="Lower 95% confidence limit of Relative Risk")
    central: float = Field(..., description="Central point estimate of Relative Risk")
    upper: float = Field(..., description="Upper 95% confidence limit of Relative Risk")

class ExcessMortalityEstimate(BaseModel):
    rate_per_100k_lower: float
    rate_per_100k_upper: float
    formatted_range: str
    estimated_excess_cases_in_ward: float

class HospitalSurgeDemand(BaseModel):
    surge_index: float = Field(..., ge=0.0, le=100.0, description="Hospital ED surge pressure index (0-100)")
    readiness_alert_level: str = Field(..., description="Normal | Elevated | Severe | Critical")
    projected_emergency_cases_today: int
    projected_icu_bed_pressure_pct: float
    clinical_action_directives: List[str]

class HealthRiskResult(BaseModel):
    hamri_score: float = Field(..., ge=0.0, le=100.0, description="Heat-Attributable Mortality Risk Index (0-100)")
    risk_category: str = Field(..., description="Low | Moderate | High | Very High | Extreme Health Risk")
    relative_risk: UncertaintyBand
    excess_mortality: ExcessMortalityEstimate
    hospital_surge: HospitalSurgeDemand
    persistence_factor: float
    nocturnal_factor: float
    vulnerability_modifier: float
    model_confidence: float
    disclaimer: str
    epidemiological_summary: str

def classify_hamri_category(score: float) -> str:
    if score >= 75.0:
        return "Extreme Health Risk"
    if score >= 55.0:
        return "Very High Risk"
    if score >= 35.0:
        return "High Risk"
    if score >= 20.0:
        return "Moderate Risk"
    return "Low / Baseline"

def classify_surge_level(surge: float) -> str:
    if surge >= 80.0:
        return "Critical"
    if surge >= 60.0:
        return "Severe"
    if surge >= 35.0:
        return "Elevated"
    return "Normal"

def calculate_hamri_and_surge(
    htsi_score: float,
    vulnerability_score: float = 50.0,
    consecutive_days: int = 1,
    nighttime_min_temp_c: float = 28.0,
    ward_population: int = 100000,
    baseline_daily_mortality_rate_per_100k: float = 2.1
) -> HealthRiskResult:
    """
    Computes HAMRI score, relative risk with 95% confidence bands, excess mortality
    ranges, and clinical hospital surge demand for a ward.
    """
    # 1. Thermal excess factor (threshold at HTSI 35)
    htsi_clamped = min(100.0, max(0.0, htsi_score))
    vuln_clamped = min(100.0, max(0.0, vulnerability_score))
    days_clamped = max(1, consecutive_days)
    pop = max(1, ward_population)

    thermal_excess = max(0.0, (htsi_clamped - 35.0) / 65.0)

    # 2. Lagged persistence multiplier: cumulative cardiovascular fatigue
    persistence_factor = 1.0 + min(0.60, (days_clamped - 1) * 0.12)

    # 3. Nocturnal deficit multiplier: minimum temperature >= 26°C restricts recovery
    night_excess = max(0.0, nighttime_min_temp_c - 26.0)
    nocturnal_factor = 1.0 + min(0.40, night_excess * 0.08)

    # 4. Vulnerability modifier: higher baseline frailty increases relative risk
    vulnerability_modifier = 1.0 + (vuln_clamped / 100.0) * 0.50

    # 5. Composite Relative Risk (RR)
    # At baseline thermal stress (HTSI <= 35), RR is ~ 1.00.
    # At extreme stress (HTSI 90+, 3 consecutive days, 30°C night, high vulnerability), RR reaches 1.50 - 1.70+
    rr_delta = (thermal_excess * 0.65) * persistence_factor * nocturnal_factor * vulnerability_modifier
    relative_risk_central = round(1.0 + rr_delta, 2)

    # 6. Uncertainty interval (95% CI equivalent)
    rr_lower = max(1.0, round(1.0 + (relative_risk_central - 1.0) * 0.70, 2))
    rr_upper = round(1.0 + (relative_risk_central - 1.0) * 1.35, 2)

    # 7. HAMRI Score (0-100 scale)
    hamri_raw = (relative_risk_central - 1.0) / 0.65 * 100.0
    hamri_score = min(100.0, max(0.0, round(hamri_raw, 1)))
    category = classify_hamri_category(hamri_score)

    # 8. Excess Mortality Rate and Counts (Demo Illustrative Range)
    rate_lower = round(baseline_daily_mortality_rate_per_100k * (rr_lower - 1.0), 2)
    rate_upper = round(baseline_daily_mortality_rate_per_100k * (rr_upper - 1.0), 2)
    formatted_range = f"{rate_lower:.1f} - {rate_upper:.1f} per 100k (Illustrative Demo)"
    
    mid_rate = (rate_lower + rate_upper) / 2.0
    excess_cases = round(mid_rate * (pop / 100000.0), 1)

    # 9. Hospital Surge Demand
    # Consecutive days compound clinical emergency demand as reserve capacity deteriorates
    surge_base = hamri_score * 0.55 + vuln_clamped * 0.30
    surge_raw = min(100.0, max(5.0, round(surge_base * (1.0 + (persistence_factor - 1.0) * 0.35), 1)))
    surge_index = min(100.0, surge_raw)
    readiness_level = classify_surge_level(surge_index)

    # Case rate per 10,000 population accounts for surge index and cumulative persistence
    case_rate = ((surge_index / 100.0) ** 1.35) * 14.0 * (1.0 + (persistence_factor - 1.0) * 0.30)
    projected_cases = max(1, int(round((pop / 10000.0) * case_rate)))
    icu_pressure = min(98.0, max(5.0, round(surge_index * 0.58 + 12.0, 1)))

    # Clinical action directives
    directives = []
    if readiness_level in ["Critical", "Severe"]:
        directives.append("Stage emergency ice bath / rapid cold water immersion tubs at emergency reception.")
        directives.append("Pre-stock IV cold normal saline (4°C) and electrolyte balance solutions.")
        directives.append("Alert nephrology and intensive care teams for acute renal and multiorgan heat failure.")
        directives.append("Double paramedical transport staffing for high-density elderly residential sectors.")
    elif readiness_level == "Elevated":
        directives.append("Prepare shaded cooling triage overflow tents outside emergency entrance.")
        directives.append("Increase oral rehydration salt (ORS) distribution at outpatient clinics.")
        directives.append("Ensure backup diesel generators are tested for uncompromised hospital chilling.")
    else:
        directives.append("Maintain baseline heat-related illness clinical surveillance and protocol readiness.")

    # Summary text
    summary = (
        f"HAMRI categorized as {category} ({hamri_score}/100) with an estimated Relative Risk of {relative_risk_central:.2f} "
        f"[95% CI: {rr_lower:.2f} - {rr_upper:.2f}]. Hospital emergency surge is at {readiness_level} level ({surge_index}/100) "
        f"with projected {projected_cases} heat-related acute presentations and {icu_pressure}% ICU bed pressure."
    )

    return HealthRiskResult(
        hamri_score=hamri_score,
        risk_category=category,
        relative_risk=UncertaintyBand(lower=rr_lower, central=relative_risk_central, upper=rr_upper),
        excess_mortality=ExcessMortalityEstimate(
            rate_per_100k_lower=rate_lower,
            rate_per_100k_upper=rate_upper,
            formatted_range=formatted_range,
            estimated_excess_cases_in_ward=excess_cases
        ),
        hospital_surge=HospitalSurgeDemand(
            surge_index=surge_index,
            readiness_alert_level=readiness_level,
            projected_emergency_cases_today=projected_cases,
            projected_icu_bed_pressure_pct=icu_pressure,
            clinical_action_directives=directives
        ),
        persistence_factor=round(persistence_factor, 2),
        nocturnal_factor=round(nocturnal_factor, 2),
        vulnerability_modifier=round(vulnerability_modifier, 2),
        model_confidence=0.84,
        disclaimer=MORTALITY_DISCLAIMER,
        epidemiological_summary=summary
    )
