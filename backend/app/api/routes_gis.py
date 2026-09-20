from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.city_ward import Ward, City
from app.models.weather import WeatherObservation
from app.models.thermal import ThermalMetric
from app.models.vulnerability import VulnerabilityProfile
from app.models.health_risk import MortalityRiskEstimate, HospitalizationRiskEstimate
from app.models.facilities import CoolingCenter, Hospital

router = APIRouter(prefix="/gis", tags=["GIS & Spatial"])

@router.get("/wards")
def get_gis_wards(metric: Optional[str] = "htsi", db: Session = Depends(get_db)):
    """
    Returns a GeoJSON FeatureCollection of all wards with real-time calculated
    biometeorological, vulnerability, and risk metrics populated in properties.
    Ideal for direct Leaflet choropleth rendering.
    """
    wards = db.query(Ward).all()
    features = []

    for ward in wards:
        # Latest thermal snapshot
        thermal = (
            db.query(ThermalMetric)
            .filter(ThermalMetric.ward_id == ward.id)
            .order_by(ThermalMetric.timestamp.desc())
            .first()
        )
        # Latest vulnerability
        vuln = db.query(VulnerabilityProfile).filter(VulnerabilityProfile.ward_id == ward.id).first()
        # Latest mortality
        mort = (
            db.query(MortalityRiskEstimate)
            .filter(MortalityRiskEstimate.ward_id == ward.id)
            .order_by(MortalityRiskEstimate.timestamp.desc())
            .first()
        )
        # Latest surge
        surge = (
            db.query(HospitalizationRiskEstimate)
            .filter(HospitalizationRiskEstimate.ward_id == ward.id)
            .order_by(HospitalizationRiskEstimate.timestamp.desc())
            .first()
        )

        props = {
            "ward_id": ward.id,
            "ward_number": ward.ward_number,
            "name": ward.name,
            "zone_id": ward.zone_id,
            "zone_name": ward.zone.name if ward.zone else "",
            "latitude": ward.latitude,
            "longitude": ward.longitude,
            "total_population": ward.total_population,
            "elderly_population": ward.elderly_population,
            "outdoor_workers": ward.outdoor_worker_population,
            "poverty_rate_proxy": ward.poverty_rate_proxy,
            "builtup_fraction": ward.builtup_surface_fraction,
            "vegetation_ndvi": ward.vegetation_ndvi_proxy,
            
            # Biometeorological metrics
            "air_temp_c": thermal.air_temp_c if thermal else 38.0,
            "relative_humidity": thermal.relative_humidity if thermal else 65.0,
            "heat_index_c": thermal.heat_index_c if thermal else 44.0,
            "wbgt_c": thermal.wbgt_c if thermal else 32.5,
            "wbgt_mode": thermal.wbgt_mode if thermal else "estimated_outdoor",
            "utci_c": thermal.utci_c if thermal else 41.2,
            "htsi_score": thermal.htsi_score if thermal else 72.0,
            "htsi_category": thermal.htsi_category if thermal else "Very High",
            
            # Vulnerability & Risk
            "vulnerability_score": vuln.vulnerability_score if vuln else 60.0,
            "vulnerability_category": vuln.vulnerability_category if vuln else "High",
            "hamri_score": mort.hamri_score if mort else 68.0,
            "mortality_category": mort.risk_category if mort else "Very High",
            "surge_index": surge.surge_index if surge else 65.0,
            "hospital_readiness": surge.readiness_alert_level if surge else "Severe",
            
            "data_provenance": {
                "source": "synthetic_scenario_engine",
                "type": "simulated",
                "disclaimer": "PROTOTYPE DEMONSTRATION ONLY"
            }
        }

        features.append({
            "type": "Feature",
            "id": ward.id,
            "geometry": ward.geometry_geojson,
            "properties": props
        })

    return {
        "type": "FeatureCollection",
        "name": "chennai_wards_realtime_heatshield",
        "city": "Chennai",
        "active_metric": metric,
        "features": features
    }

@router.get("/wards/{ward_id}")
def get_ward_detail(ward_id: str, db: Session = Depends(get_db)):
    """Deep-dive situation report for an individual ward."""
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail=f"Ward '{ward_id}' not found.")

    thermal = (
        db.query(ThermalMetric)
        .filter(ThermalMetric.ward_id == ward.id)
        .order_by(ThermalMetric.timestamp.desc())
        .first()
    )
    vuln = db.query(VulnerabilityProfile).filter(VulnerabilityProfile.ward_id == ward.id).first()
    mort = (
        db.query(MortalityRiskEstimate)
        .filter(MortalityRiskEstimate.ward_id == ward.id)
        .order_by(MortalityRiskEstimate.timestamp.desc())
        .first()
    )
    surge = (
        db.query(HospitalizationRiskEstimate)
        .filter(HospitalizationRiskEstimate.ward_id == ward.id)
        .order_by(HospitalizationRiskEstimate.timestamp.desc())
        .first()
    )
    cooling_centers = db.query(CoolingCenter).filter(CoolingCenter.ward_id == ward.id).all()
    hospitals = db.query(Hospital).filter(Hospital.ward_id == ward.id).all()

    return {
        "ward_id": ward.id,
        "ward_number": ward.ward_number,
        "name": ward.name,
        "zone": ward.zone.name if ward.zone else "",
        "coordinates": {"lat": ward.latitude, "lon": ward.longitude},
        "demographics": {
            "total_population": ward.total_population,
            "elderly_population": ward.elderly_population,
            "elderly_percentage": round((ward.elderly_population / ward.total_population) * 100, 1),
            "children_population": ward.children_population,
            "outdoor_workers": ward.outdoor_worker_population,
            "outdoor_worker_percentage": round((ward.outdoor_worker_population / ward.total_population) * 100, 1),
            "poverty_rate_proxy": ward.poverty_rate_proxy,
            "builtup_fraction": ward.builtup_surface_fraction,
            "vegetation_ndvi": ward.vegetation_ndvi_proxy
        },
        "thermal_intelligence": {
            "air_temp_c": thermal.air_temp_c if thermal else None,
            "relative_humidity": thermal.relative_humidity if thermal else None,
            "heat_index_c": thermal.heat_index_c if thermal else None,
            "heat_index_category": thermal.heat_index_category if thermal else None,
            "wbgt_c": thermal.wbgt_c if thermal else None,
            "wbgt_mode": thermal.wbgt_mode if thermal else "estimated_outdoor",
            "wbgt_category": thermal.wbgt_category if thermal else None,
            "utci_c": thermal.utci_c if thermal else None,
            "utci_category": thermal.utci_category if thermal else None,
            "htsi_score": thermal.htsi_score if thermal else None,
            "htsi_category": thermal.htsi_category if thermal else None,
            "component_scores": thermal.component_scores if thermal else None,
            "explanation": thermal.explanation if thermal else None
        },
        "vulnerability_profile": {
            "score": vuln.vulnerability_score if vuln else None,
            "category": vuln.vulnerability_category if vuln else None,
            "subscores": {
                "demographic": vuln.demographic_subscore if vuln else None,
                "socioeconomic": vuln.socioeconomic_subscore if vuln else None,
                "cooling_access": vuln.cooling_access_subscore if vuln else None,
                "healthcare_access": vuln.healthcare_access_subscore if vuln else None
            },
            "explanation": vuln.explanation if vuln else None
        },
        "health_impacts": {
            "hamri_score": mort.hamri_score if mort else None,
            "risk_category": mort.risk_category if mort else None,
            "relative_risk": mort.relative_risk_estimate if mort else None,
            "excess_mortality_range": mort.excess_mortality_range if mort else None,
            "uncertainty_interval": [mort.uncertainty_lower, mort.uncertainty_upper] if mort else None,
            "hospital_surge_index": surge.surge_index if surge else None,
            "hospital_readiness_level": surge.readiness_alert_level if surge else None,
            "estimated_cases": surge.estimated_heat_related_cases if surge else None
        },
        "facilities": {
            "cooling_centers": [
                {
                    "name": cc.name,
                    "capacity": cc.total_capacity,
                    "occupancy": cc.current_occupancy,
                    "status": cc.status,
                    "water": cc.water_available,
                    "power": cc.power_backup
                } for cc in cooling_centers
            ],
            "hospitals": [
                {
                    "name": h.name,
                    "type": h.hospital_type,
                    "total_beds": h.total_beds,
                    "icu_beds": h.icu_beds,
                    "admissions": h.current_admissions,
                    "readiness": h.readiness_status
                } for h in hospitals
            ]
        }
    }

@router.get("/facilities")
def get_facilities(facility_type: Optional[str] = "all", db: Session = Depends(get_db)):
    """Returns point features for cooling centers and hospitals."""
    result = {"cooling_centers": [], "hospitals": []}

    if facility_type in ["all", "cooling_centers"]:
        ccs = db.query(CoolingCenter).all()
        for cc in ccs:
            result["cooling_centers"].append({
                "id": cc.id,
                "ward_id": cc.ward_id,
                "name": cc.name,
                "address": cc.address,
                "latitude": cc.latitude,
                "longitude": cc.longitude,
                "capacity": cc.total_capacity,
                "occupancy": cc.current_occupancy,
                "occupancy_rate": round((cc.current_occupancy / cc.total_capacity) * 100, 1),
                "operating_hours": cc.operating_hours,
                "water_available": cc.water_available,
                "power_backup": cc.power_backup,
                "status": cc.status,
                "contact": cc.contact
            })

    if facility_type in ["all", "hospitals"]:
        hs = db.query(Hospital).all()
        for h in hs:
            result["hospitals"].append({
                "id": h.id,
                "ward_id": h.ward_id,
                "name": h.name,
                "type": h.hospital_type,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "total_beds": h.total_beds,
                "icu_beds": h.icu_beds,
                "current_admissions": h.current_admissions,
                "bed_occupancy_rate": round((h.current_admissions / h.total_beds) * 100, 1),
                "heat_stroke_cases_today": h.heat_stroke_cases_today,
                "readiness_status": h.readiness_status,
                "contact": h.contact
            })

    return result
