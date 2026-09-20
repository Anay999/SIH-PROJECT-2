import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.weather import WeatherObservation
from app.models.city_ward import Ward
from app.engines.forecast_provider import DeterministicDemoForecastProvider

router = APIRouter(tags=["Weather & Forecast"])

def unified_response(data: Any, request_id: Optional[str] = None) -> Dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "error": None,
        "request_id": request_id or f"req_{uuid.uuid4().hex[:10]}",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "display_timezone": "Asia/Kolkata"
    }

@router.get("/weather/current")
def get_current_weather(ward_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Current microclimate observations across wards."""
    query = db.query(WeatherObservation)
    if ward_id:
        query = query.filter(WeatherObservation.ward_id == ward_id)
    obs = query.all()
    results = [
        {
            "ward_id": o.ward_id,
            "ward_name": o.ward.name if o.ward else "",
            "timestamp_utc": o.timestamp.isoformat(),
            "display_timezone": "Asia/Kolkata",
            "air_temp_c": o.air_temp_c,
            "relative_humidity": o.relative_humidity,
            "wind_speed_ms": o.wind_speed_ms,
            "solar_radiation_wm2": o.solar_radiation_wm2,
            "dew_point_c": o.dew_point_c,
            "source": o.source,
            "quality_flag": o.quality_flag
        } for o in obs
    ]
    return unified_response({"observations_count": len(results), "observations": results})

@router.get("/weather/forecast")
def get_forecast(
    ward_id: Optional[str] = Query(None, description="Ward ID e.g. ward_04_tondiarpet"),
    days: int = Query(5, ge=1, le=7, description="Forecast horizon in days"),
    db: Session = Depends(get_db)
):
    """
    5-Day multi-variable biometeorological forecast projections with diurnal curves,
    indicative WBGT work-rest guidance, uncertainty bands, and explicit DEMO pedigree.
    """
    all_wards = db.query(Ward).order_by(Ward.ward_number.asc()).all()
    wards_list = [{"id": w.id, "name": f"Ward {w.ward_number} - {w.name}"} for w in all_wards]

    target_ward_id = ward_id or "ward_04_tondiarpet"
    target_ward = db.query(Ward).filter(Ward.id == target_ward_id).first()
    if not target_ward and all_wards:
        target_ward = all_wards[0]
        target_ward_id = target_ward.id

    # Fetch latest baseline observation for this ward
    obs = db.query(WeatherObservation).filter(WeatherObservation.ward_id == target_ward_id).order_by(WeatherObservation.timestamp.desc()).first()

    base_t = obs.air_temp_c if obs else 35.8
    base_rh = obs.relative_humidity if obs else 68.0
    base_wind = obs.wind_speed_ms if obs else 3.2
    base_solar = obs.solar_radiation_wm2 if obs else 780.0

    builtup = target_ward.builtup_surface_fraction if target_ward else 0.75
    ndvi = target_ward.vegetation_ndvi_proxy if target_ward else 0.20

    provider = DeterministicDemoForecastProvider(seed=42)
    forecast_data = provider.get_forecast(
        ward_id=target_ward_id,
        ward_name=target_ward.name if target_ward else target_ward_id,
        base_temp_c=base_t,
        base_rh=base_rh,
        base_wind_ms=base_wind,
        base_solar_wm2=base_solar,
        builtup_fraction=builtup,
        vegetation_ndvi=ndvi,
        days=days,
        step_hours=3
    )

    # Attach available wards list and metadata for frontend convenience
    forecast_data["available_wards"] = wards_list
    forecast_data["ward_number"] = target_ward.ward_number if target_ward else ""

    return unified_response(forecast_data)
