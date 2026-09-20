from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.facilities import CoolingCenter, Hospital

router = APIRouter(tags=["Facilities"])

@router.get("/cooling-centers")
def get_cooling_centers(db: Session = Depends(get_db)):
    """List of all registered municipal cooling centers and current occupancy."""
    centers = db.query(CoolingCenter).all()
    return [
        {
            "id": c.id,
            "ward_id": c.ward_id,
            "ward_name": c.ward.name if c.ward else "",
            "name": c.name,
            "address": c.address,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "total_capacity": c.total_capacity,
            "current_occupancy": c.current_occupancy,
            "occupancy_pct": round((c.current_occupancy / c.total_capacity) * 100, 1),
            "operating_hours": c.operating_hours,
            "water_available": c.water_available,
            "power_backup": c.power_backup,
            "status": c.status,
            "contact": c.contact
        } for c in centers
    ]

@router.get("/hospitals")
def get_hospitals(db: Session = Depends(get_db)):
    """List of all hospitals with ICU capacity and heatstroke admissions."""
    hospitals = db.query(Hospital).all()
    return [
        {
            "id": h.id,
            "ward_id": h.ward_id,
            "ward_name": h.ward.name if h.ward else "",
            "name": h.name,
            "hospital_type": h.hospital_type,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "total_beds": h.total_beds,
            "icu_beds": h.icu_beds,
            "current_admissions": h.current_admissions,
            "bed_occupancy_pct": round((h.current_admissions / h.total_beds) * 100, 1),
            "heat_stroke_cases_today": h.heat_stroke_cases_today,
            "readiness_status": h.readiness_status,
            "contact": h.contact
        } for h in hospitals
    ]
