from typing import Optional, Dict
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.thermal import ThermalMetric
from app.models.city_ward import Ward
from app.engines.heat_index_engine import calculate_heat_index
from app.engines.wbgt_engine import calculate_wbgt
from app.engines.utci_engine import calculate_utci
from app.engines.htsi_engine import calculate_htsi

router = APIRouter(prefix="/thermal", tags=["Thermal Stress Engine"])

class ThermalCalculationRequest(BaseModel):
    air_temp_c: float = Field(..., ge=-10.0, le=60.0, description="Air temperature in Celsius")
    relative_humidity: float = Field(..., ge=0.0, le=100.0, description="Relative humidity percentage")
    wind_speed_ms: Optional[float] = Field(default=1.8, ge=0.0, le=35.0, description="Wind speed in m/s")
    solar_radiation_wm2: Optional[float] = Field(default=700.0, ge=0.0, le=1400.0, description="Solar irradiance W/m²")
    environment: Optional[str] = Field(default="outdoor", description="outdoor | indoor | shade")
    consecutive_hot_days: Optional[int] = Field(default=1, ge=1, le=30)
    min_night_temp_c: Optional[float] = Field(default=28.0, ge=10.0, le=45.0)
    vulnerability_score: Optional[float] = Field(default=55.0, ge=0.0, le=100.0)
    custom_weights: Optional[Dict[str, float]] = None

@router.post("/calculate")
def compute_thermal_stress(req: ThermalCalculationRequest):
    """
    On-demand biometeorological calculation engine.
    Computes NOAA Rothfusz Heat Index, Liljegren/ISO WBGT, Bröde UTCI, and composite HTSI.
    Also produces real-time sensitivity analysis comparing dry vs humid conditions.
    """
    # 1. Heat Index
    hi_res = calculate_heat_index(req.air_temp_c, req.relative_humidity)

    # 2. WBGT
    wbgt_res = calculate_wbgt(
        air_temp_c=req.air_temp_c,
        relative_humidity=req.relative_humidity,
        wind_speed_m_s=req.wind_speed_ms,
        solar_radiation_w_m2=req.solar_radiation_wm2,
        environment=req.environment
    )

    # 3. UTCI
    utci_res = calculate_utci(
        air_temp_c=req.air_temp_c,
        relative_humidity=req.relative_humidity,
        wind_speed_10m_ms=req.wind_speed_ms,
        solar_radiation_w_m2=req.solar_radiation_wm2
    )

    # 4. HTSI
    htsi_res = calculate_htsi(
        heat_index_c=hi_res.value_c,
        wbgt_c=wbgt_res.wbgt_c,
        utci_c=utci_res.utci_c,
        consecutive_hot_days=req.consecutive_hot_days,
        min_night_temp_c=req.min_night_temp_c,
        vulnerability_score=req.vulnerability_score,
        custom_weights=req.custom_weights
    )

    # Sensitivity analysis: compare if RH was 15% lower or wind doubled
    hi_dry = calculate_heat_index(req.air_temp_c, max(10.0, req.relative_humidity - 15.0))
    wbgt_windy = calculate_wbgt(
        air_temp_c=req.air_temp_c,
        relative_humidity=req.relative_humidity,
        wind_speed_m_s=req.wind_speed_ms * 2.0,
        solar_radiation_w_m2=req.solar_radiation_wm2,
        environment=req.environment
    )

    return {
        "inputs": {
            "air_temp_c": req.air_temp_c,
            "relative_humidity": req.relative_humidity,
            "wind_speed_ms": req.wind_speed_ms,
            "solar_radiation_wm2": req.solar_radiation_wm2,
            "environment": req.environment,
            "vulnerability_score": req.vulnerability_score
        },
        "heat_index": hi_res,
        "wbgt": wbgt_res,
        "utci": utci_res,
        "htsi": htsi_res,
        "sensitivity_analysis": {
            "humidity_drop_15pct": {
                "delta_heat_index_c": round(hi_dry.value_c - hi_res.value_c, 1),
                "note": "Decreasing relative humidity by 15% significantly restores evaporative sweat cooling."
            },
            "wind_speed_doubled": {
                "delta_wbgt_c": round(wbgt_windy.wbgt_c - wbgt_res.wbgt_c, 1),
                "note": "Doubling air velocity increases convective cooling off the globe and wet bulb."
            }
        },
        "data_pedigree": {
            "status": "Validated Scientific Calculations",
            "models": ["NOAA Rothfusz (1990)", "Stull (2011)", "Bröde COST Action 730 (2012)"],
            "disclaimer": "For operational decision support. Not a medical prognosis."
        }
    }

@router.get("/current")
def get_current_thermal_metrics(db: Session = Depends(get_db)):
    """Returns the latest thermal metrics for all 15 wards."""
    metrics = db.query(ThermalMetric).all()
    return [
        {
            "ward_id": m.ward_id,
            "ward_name": m.ward.name if m.ward else "",
            "timestamp": m.timestamp.isoformat(),
            "air_temp_c": m.air_temp_c,
            "relative_humidity": m.relative_humidity,
            "heat_index_c": m.heat_index_c,
            "heat_index_category": m.heat_index_category,
            "wbgt_c": m.wbgt_c,
            "wbgt_category": m.wbgt_category,
            "wbgt_mode": m.wbgt_mode,
            "utci_c": m.utci_c,
            "utci_category": m.utci_category,
            "htsi_score": m.htsi_score,
            "htsi_category": m.htsi_category,
            "component_scores": m.component_scores,
            "explanation": m.explanation
        } for m in metrics
    ]

@router.get("/methodology")
def get_thermal_methodology():
    """Returns mathematical formulas, references, and operational constraints."""
    return {
        "title": "HEATSHIELD AI Biometeorological Methodology & Formulations",
        "engines": [
            {
                "name": "Heat Index (HI)",
                "organization": "National Oceanic and Atmospheric Administration (NOAA) / NWS",
                "formula": "HI = -42.379 + 2.04901523*T + 10.14333127*RH - 0.22475541*T*RH - ... (with low/high RH adjustments)",
                "valid_domain": "T >= 26.7°C (80°F), RH >= 40% (Steadman simple baseline fallback for lower ranges)",
                "citation": "Rothfusz, L. P. (1990). The computation and use of heat index offenses. NWS SR 90-23."
            },
            {
                "name": "Wet-Bulb Globe Temperature (WBGT)",
                "organization": "International Organization for Standardization (ISO 7243) / ACGIH",
                "formula_outdoor": "WBGT_outdoor = 0.7*Tw + 0.2*Tg + 0.1*Ta",
                "formula_indoor": "WBGT_indoor = 0.7*Tw + 0.3*Tg",
                "estimation_procedure": "Tw estimated via Stull (2011) psychrometric formulation; Tg estimated from solar-convective equilibrium.",
                "citation": "Stull, R. (2011). Wet-bulb temperature from relative humidity and air temperature. J. Appl. Meteor. Climatol."
            },
            {
                "name": "Universal Thermal Climate Index (UTCI)",
                "organization": "European COST Action 730 / International Society of Biometeorology (ISB)",
                "basis": "187-node Fiala human thermoregulation multi-node model response surface.",
                "valid_domain": "-50°C <= Ta <= +50°C, 0.5 m/s <= v_10 <= 17 m/s, ea <= 50 hPa.",
                "citation": "Bröde, P. et al. (2012). Deriving the operational procedure for the Universal Thermal Climate Index (UTCI). Int. J. Biometeorol."
            },
            {
                "name": "Human Thermal Stress Index (HTSI)",
                "organization": "HEATSHIELD AI Project Decision-Support Framework",
                "formula": "HTSI = 0.45*Thermal + 0.20*Persistence + 0.20*Vulnerability + 0.15*UrbanExposure",
                "status": "Configurable prototype research index. Clearly labeled. Not an established universal medical index."
            }
        ]
    }
