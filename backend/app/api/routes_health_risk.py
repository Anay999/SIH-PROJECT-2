from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.city_ward import Ward
from app.models.thermal import ThermalMetric
from app.models.health_risk import MortalityRiskEstimate, HospitalizationRiskEstimate
from app.engines.mortality_engine import (
    calculate_hamri_and_surge,
    HealthRiskResult,
    MORTALITY_DISCLAIMER,
)

router = APIRouter(prefix="/risk", tags=["Health Risk & Hospital Surge Intelligence"])

class HealthRiskSimulateRequest(BaseModel):
    htsi_score: float = Field(78.5, ge=0.0, le=100.0, description="Composite Human Thermal Stress Index")
    vulnerability_score: float = Field(65.0, ge=0.0, le=100.0, description="Ward Vulnerability Score")
    consecutive_days: int = Field(3, ge=1, le=14, description="Consecutive days of extreme heat")
    nighttime_min_temp_c: float = Field(29.8, ge=15.0, le=42.0, description="Nocturnal minimum temperature (°C)")
    ward_population: int = Field(85000, ge=1000, le=2000000)
    baseline_daily_mortality_rate_per_100k: float = Field(2.1, ge=0.5, le=10.0)

@router.get("/mortality")
def get_ward_mortality_risks(db: Session = Depends(get_db)):
    """
    Returns HAMRI scores, Relative Risk with 95% CI bands, and excess mortality ranges
    for all 15 wards based on active microclimate and vulnerability.
    """
    wards = db.query(Ward).all()
    results = []

    for ward in wards:
        # Fetch latest thermal metric
        thermal = (
            db.query(ThermalMetric)
            .filter(ThermalMetric.ward_id == ward.id)
            .order_by(ThermalMetric.timestamp.desc())
            .first()
        )
        htsi = thermal.htsi_score if thermal else 70.0
        vuln_score = ward.vulnerability_profile.vulnerability_score if ward.vulnerability_profile else 50.0

        computed = calculate_hamri_and_surge(
            htsi_score=htsi,
            vulnerability_score=vuln_score,
            consecutive_days=3,
            nighttime_min_temp_c=29.4 if int(ward.ward_number) in [4, 5, 6, 7] else 28.2,
            ward_population=ward.total_population
        )

        results.append({
            "ward_id": ward.id,
            "ward_number": ward.ward_number,
            "ward_name": ward.name,
            "zone_id": ward.zone_id,
            "htsi_score": htsi,
            "vulnerability_score": vuln_score,
            "hamri_score": computed.hamri_score,
            "risk_category": computed.risk_category,
            "relative_risk": computed.relative_risk.dict(),
            "excess_mortality": computed.excess_mortality.dict(),
            "persistence_factor": computed.persistence_factor,
            "nocturnal_factor": computed.nocturnal_factor,
            "model_confidence": computed.model_confidence,
            "disclaimer": computed.disclaimer,
            "summary": computed.epidemiological_summary
        })

    # Sort descending by HAMRI score
    results.sort(key=lambda x: x["hamri_score"], reverse=True)

    return {
        "city": "Chennai",
        "total_wards": len(results),
        "methodology": "Distributed Lag Non-Linear (DLNM) Conceptual Transfer with 95% Confidence Intervals",
        "disclaimer": MORTALITY_DISCLAIMER,
        "wards": results
    }

@router.get("/hospitalization")
def get_hospital_surge_forecast(db: Session = Depends(get_db)):
    """
    Returns clinical emergency surge index, projected ED presentations,
    and ICU bed pressure metrics across all wards.
    """
    wards = db.query(Ward).all()
    ward_surges = []
    total_projected_cases = 0

    for ward in wards:
        thermal = (
            db.query(ThermalMetric)
            .filter(ThermalMetric.ward_id == ward.id)
            .order_by(ThermalMetric.timestamp.desc())
            .first()
        )
        htsi = thermal.htsi_score if thermal else 70.0
        vuln_score = ward.vulnerability_profile.vulnerability_score if ward.vulnerability_profile else 50.0

        computed = calculate_hamri_and_surge(
            htsi_score=htsi,
            vulnerability_score=vuln_score,
            consecutive_days=3,
            nighttime_min_temp_c=29.4 if int(ward.ward_number) in [4, 5, 6, 7] else 28.2,
            ward_population=ward.total_population
        )

        total_projected_cases += computed.hospital_surge.projected_emergency_cases_today

        ward_surges.append({
            "ward_id": ward.id,
            "ward_number": ward.ward_number,
            "ward_name": ward.name,
            "surge_index": computed.hospital_surge.surge_index,
            "readiness_alert_level": computed.hospital_surge.readiness_alert_level,
            "projected_cases_today": computed.hospital_surge.projected_emergency_cases_today,
            "icu_bed_pressure_pct": computed.hospital_surge.projected_icu_bed_pressure_pct,
            "clinical_directives": computed.hospital_surge.clinical_action_directives
        })

    ward_surges.sort(key=lambda x: x["surge_index"], reverse=True)

    # City-wide aggregate readiness level
    avg_surge = round(sum(w["surge_index"] for w in ward_surges) / max(1, len(ward_surges)), 1)
    city_readiness = (
        "Critical" if avg_surge >= 80 else
        "Severe" if avg_surge >= 60 else
        "Elevated" if avg_surge >= 35 else "Normal"
    )

    return {
        "city": "Chennai",
        "city_wide_readiness": city_readiness,
        "city_average_surge_index": avg_surge,
        "total_projected_emergency_cases_today": total_projected_cases,
        "disclaimer": MORTALITY_DISCLAIMER,
        "ward_surges": ward_surges
    }

@router.post("/calculate", response_model=HealthRiskResult)
def calculate_custom_health_risk(req: HealthRiskSimulateRequest):
    """
    Dynamic reactive epidemiological & clinical surge simulator.
    Evaluates what happens as heatwave duration or nocturnal temperatures increase.
    """
    return calculate_hamri_and_surge(
        htsi_score=req.htsi_score,
        vulnerability_score=req.vulnerability_score,
        consecutive_days=req.consecutive_days,
        nighttime_min_temp_c=req.nighttime_min_temp_c,
        ward_population=req.ward_population,
        baseline_daily_mortality_rate_per_100k=req.baseline_daily_mortality_rate_per_100k
    )
