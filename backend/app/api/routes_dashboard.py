from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.city_ward import Ward, City
from app.models.thermal import ThermalMetric
from app.models.vulnerability import VulnerabilityProfile
from app.models.health_risk import MortalityRiskEstimate, HospitalizationRiskEstimate
from app.models.alert_intervention import HeatwaveEvent, Alert, Intervention
from app.models.facilities import CoolingCenter, Hospital

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    """
    Unified situation report for municipal disaster managers.
    Aggregates city-wide thermal burden, active heatwave alert, top high-risk wards,
    and priority action directives.
    """
    wards = db.query(Ward).all()
    if not wards:
        return {"status": "empty", "message": "No ward data available. Run seed script."}

    # Aggregate KPIs
    thermals = db.query(ThermalMetric).all()
    temps = [t.air_temp_c for t in thermals if t.air_temp_c]
    rhs = [t.relative_humidity for t in thermals if t.relative_humidity]
    htsis = [t.htsi_score for t in thermals if t.htsi_score]

    avg_temp = round(sum(temps) / len(temps), 1) if temps else 38.0
    max_temp = round(max(temps), 1) if temps else 40.2
    avg_rh = round(sum(rhs) / len(rhs), 1) if rhs else 65.0
    avg_htsi = round(sum(htsis) / len(htsis), 1) if htsis else 72.0

    total_pop = sum(w.total_population for w in wards)
    total_elderly = sum(w.elderly_population for w in wards)
    total_workers = sum(w.outdoor_worker_population for w in wards)

    # Active heatwave
    heatwave = db.query(HeatwaveEvent).filter(HeatwaveEvent.active == True).first()
    active_alerts = db.query(Alert).filter(Alert.acknowledged == False).all()
    interventions = db.query(Intervention).filter(Intervention.status != "Completed").all()

    # Hospital load
    hospitals = db.query(Hospital).all()
    heat_cases = sum(h.heat_stroke_cases_today for h in hospitals)
    total_beds = sum(h.total_beds for h in hospitals)
    occupied_beds = sum(h.current_admissions for h in hospitals)
    bed_utilization = round((occupied_beds / total_beds) * 100, 1) if total_beds else 80.0

    # Rank top 5 highest risk wards by HTSI
    ward_risk_list = []
    for w in wards:
        t = db.query(ThermalMetric).filter(ThermalMetric.ward_id == w.id).first()
        v = db.query(VulnerabilityProfile).filter(VulnerabilityProfile.ward_id == w.id).first()
        m = db.query(MortalityRiskEstimate).filter(MortalityRiskEstimate.ward_id == w.id).first()
        h_risk = db.query(HospitalizationRiskEstimate).filter(HospitalizationRiskEstimate.ward_id == w.id).first()

        ward_risk_list.append({
            "ward_id": w.id,
            "ward_number": w.ward_number,
            "name": w.name,
            "zone": w.zone.name if w.zone else "",
            "total_population": w.total_population,
            "outdoor_workers": w.outdoor_worker_population,
            "air_temp_c": t.air_temp_c if t else 38.0,
            "relative_humidity": t.relative_humidity if t else 65.0,
            "wbgt_c": t.wbgt_c if t else 32.0,
            "utci_c": t.utci_c if t else 40.0,
            "htsi_score": t.htsi_score if t else 70.0,
            "htsi_category": t.htsi_category if t else "High",
            "vulnerability_score": v.vulnerability_score if v else 60.0,
            "hamri_score": m.hamri_score if m else 65.0,
            "hospital_surge_index": h_risk.surge_index if h_risk else 60.0,
            "recommended_action": (
                "Deploy ORS misting tents & halt outdoor work" if (t and t.htsi_score >= 75)
                else "Increase drinking water tankers"
            )
        })

    # Sort descending by HTSI
    ward_risk_list.sort(key=lambda x: x["htsi_score"], reverse=True)
    top_5_wards = ward_risk_list[:5]

    return {
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "timestamp": thermals[0].timestamp.isoformat() if thermals else None,
        "kpis": {
            "average_temperature_c": avg_temp,
            "max_temperature_c": max_temp,
            "average_relative_humidity": avg_rh,
            "city_htsi_score": avg_htsi,
            "city_htsi_category": "Very High" if avg_htsi >= 65 else "High",
            "total_population": total_pop,
            "total_elderly_population": total_elderly,
            "total_outdoor_workers": total_workers,
            "active_alerts_count": len(active_alerts),
            "pending_interventions_count": len(interventions),
            "heat_stroke_cases_today": heat_cases,
            "hospital_bed_utilization_pct": bed_utilization
        },
        "active_heatwave": {
            "event_type": heatwave.event_type if heatwave else "Normal Summer",
            "severity": heatwave.severity if heatwave else "None",
            "peak_temperature_c": heatwave.peak_temperature_c if heatwave else max_temp,
            "peak_wbgt_c": heatwave.peak_wbgt_c if heatwave else 33.0,
            "consecutive_days": heatwave.consecutive_days if heatwave else 0,
            "active": heatwave.active if heatwave else False
        },
        "top_high_risk_wards": top_5_wards,
        "all_wards_summary": ward_risk_list,
        "priority_interventions": [
            {
                "id": it.id,
                "ward_id": it.ward_id,
                "department": it.department,
                "action": it.action_name,
                "priority": it.priority,
                "status": it.status,
                "reason": it.reason
            } for it in interventions[:4]
        ],
        "data_provenance": {
            "source": "Chennai Metropolitan Area Synthetic Biometeorological Model",
            "type": "simulated",
            "disclaimer": "PROTOTYPE DEMONSTRATION ONLY. NOT AN OFFICIAL IMD FORECAST."
        }
    }
