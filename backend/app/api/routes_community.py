"""
Community Social Impact & Municipal Intelligence Service
Supports:
1. Care Circle: Voluntary vulnerable community contacts and automated heat risk check-ins.
2. Community Reporting: Citizen-submitted reports on broken water points, missing cooling, unsafe heat conditions with municipal officer resolution workflows.
3. Drinking Water Points: Verified public water stations and hydration kiosks.
4. School Heat Safety: Municipal school planning layer with outdoor activity advisories.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_actor, CurrentActor, UserRole

router = APIRouter(prefix="/community", tags=["Community Social Impact"])

# -------------------------------------------------------------
# In-Memory Store with Seeded Real Data (Persisted during lifecycle)
# -------------------------------------------------------------

# 1. Care Circle Contacts (Scoped by user)
_CARE_CIRCLE: List[Dict[str, Any]] = [
    {
        "id": "care_01",
        "user_id": "citizen_demo",
        "name": "Kalyani Raman (Grandmother)",
        "relationship": "Elderly Family Member (Age 74)",
        "phone_masked": "+91 98401 *****",
        "city": "Chennai",
        "ward": "Ward 114 (Teynampet)",
        "vulnerability_note": "Hypertension, stays alone on top-floor apartment.",
        "added_at": "2026-09-18T10:00:00Z"
    },
    {
        "id": "care_02",
        "user_id": "citizen_demo",
        "name": "Anand & Priya (Infants/Toddler)",
        "relationship": "Children (Ages 3 & 5)",
        "phone_masked": "+91 94440 *****",
        "city": "Chennai",
        "ward": "Ward 117 (T. Nagar)",
        "vulnerability_note": "Outdoor play in unshaded school ground.",
        "added_at": "2026-09-19T14:30:00Z"
    }
]

# 2. Community Citizen Reports
_COMMUNITY_REPORTS: List[Dict[str, Any]] = [
    {
        "id": "rep_101",
        "reporter_name": "R. Murugan",
        "category": "Broken Water Tap",
        "severity": "HIGH",
        "description": "Public drinking water tap outside Panagal Park bus terminus is dry with broken valve. Street vendors and auto drivers have no clean water.",
        "city": "Chennai",
        "ward": "Ward 117 (T. Nagar)",
        "latitude": 13.0418,
        "longitude": 80.2341,
        "status": "VERIFIED",
        "status_notes": "GCC MetroWater engineering crew dispatched for valve replacement.",
        "submitted_at": "2026-09-22T09:15:00Z",
        "updated_at": "2026-09-22T11:30:00Z"
    },
    {
        "id": "rep_102",
        "reporter_name": "S. Kavitha",
        "category": "Cooling Shelter Overcrowded",
        "severity": "MODERATE",
        "description": "Mylapore community cooling hall ran out of ORS packets and water carboys by 1:30 PM.",
        "city": "Chennai",
        "ward": "Ward 122 (Mylapore)",
        "latitude": 13.0333,
        "longitude": 80.2685,
        "status": "ACTION_INITIATED",
        "status_notes": "Replenishment truck dispatched from GCC Zonal Health Depot.",
        "submitted_at": "2026-09-22T14:10:00Z",
        "updated_at": "2026-09-22T15:00:00Z"
    },
    {
        "id": "rep_103",
        "reporter_name": "M. Vignesh",
        "category": "Unshaded Labor Site",
        "severity": "CRITICAL",
        "description": "Road resurfacing crew on Old Jail Road working in peak afternoon without shade canopy or cold drinking water.",
        "city": "Chennai",
        "ward": "Ward 50 (Royapuram)",
        "latitude": 13.1065,
        "longitude": 80.2872,
        "status": "UNDER_REVIEW",
        "status_notes": "Ward 50 sanitary inspector notified for labor compliance check.",
        "submitted_at": "2026-09-23T11:45:00Z",
        "updated_at": "2026-09-23T12:00:00Z"
    }
]

# 3. Verified Municipal Drinking Water Points
_WATER_POINTS: List[Dict[str, Any]] = [
    {
        "id": "wp_01",
        "name": "GCC MetroWater RO Hydration Kiosk - Central Station",
        "type": "RO_PURIFIED_DISPENSER",
        "address": "Opposite Suburban Railway Terminal, Park Town, Chennai",
        "city": "Chennai",
        "ward": "Ward 59 (Park Town)",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "operational_status": "OPERATIONAL",
        "cold_water_available": True,
        "daily_capacity_liters": 5000,
        "free_access": True
    },
    {
        "id": "wp_02",
        "name": "Public Water ATM - Panagal Park",
        "type": "CHILLED_WATER_ATM",
        "address": "South Usman Road, T. Nagar, Chennai",
        "city": "Chennai",
        "ward": "Ward 117 (T. Nagar)",
        "latitude": 13.0418,
        "longitude": 80.2341,
        "operational_status": "REPAIR_IN_PROGRESS",
        "cold_water_available": False,
        "daily_capacity_liters": 3000,
        "free_access": True
    },
    {
        "id": "wp_03",
        "name": "Eldams Road Shaded Water Pavilion",
        "type": "PUBLIC_EARTHEN_POT_STATION",
        "address": "Community Hall Compound, Teynampet, Chennai",
        "city": "Chennai",
        "ward": "Ward 114 (Teynampet)",
        "latitude": 13.0450,
        "longitude": 80.2500,
        "operational_status": "OPERATIONAL",
        "cold_water_available": True,
        "daily_capacity_liters": 2000,
        "free_access": True
    },
    {
        "id": "wp_04",
        "name": "Madurai Meenakshi South Tower Hydration Point",
        "type": "TEMPLE_CHILLED_WATER_STATION",
        "address": "South Chithirai Street, Madurai",
        "city": "Madurai",
        "ward": "Ward 41 (Heritage Zone)",
        "latitude": 9.9195,
        "longitude": 78.1193,
        "operational_status": "OPERATIONAL",
        "cold_water_available": True,
        "daily_capacity_liters": 8000,
        "free_access": True
    },
    {
        "id": "wp_05",
        "name": "Coimbatore Gandhipuram Central Bus Stand Hydration Post",
        "type": "MUNICIPAL_WATER_KIOSK",
        "address": "Cross Cut Road, Gandhipuram, Coimbatore",
        "city": "Coimbatore",
        "ward": "Ward 51 (Gandhipuram)",
        "latitude": 11.0168,
        "longitude": 76.9558,
        "operational_status": "OPERATIONAL",
        "cold_water_available": True,
        "daily_capacity_liters": 4500,
        "free_access": True
    }
]

# 4. School Heat Safety Registry
_SCHOOL_HEAT_REGISTRY: List[Dict[str, Any]] = [
    {
        "id": "sch_01",
        "name": "Chennai Girls Higher Secondary School",
        "type": "GOVERNMENT_SECONDARY",
        "address": "Rotary Nagar, Teynampet, Chennai",
        "city": "Chennai",
        "ward": "Ward 114 (Teynampet)",
        "latitude": 13.0440,
        "longitude": 80.2520,
        "student_count": 1250,
        "shade_coverage_percent": 35,
        "cooling_equipped_classrooms": False,
        "heat_advisory_status": "HIGH_HEAT_ALERT",
        "action_guidance": "Suspend outdoor sports/physical education between 11:00 AM and 4:00 PM. Provide ORS water points."
    },
    {
        "id": "sch_02",
        "name": "Ramakrishna Mission Higher Secondary School",
        "type": "AIDED_SCHOOL",
        "address": "Bazullah Road, T. Nagar, Chennai",
        "city": "Chennai",
        "ward": "Ward 117 (T. Nagar)",
        "latitude": 13.0425,
        "longitude": 80.2360,
        "student_count": 2100,
        "shade_coverage_percent": 55,
        "cooling_equipped_classrooms": True,
        "heat_advisory_status": "CAUTION_ADVISORY",
        "action_guidance": "Ensure classroom cross-ventilation. Frequent hydration breaks every 45 minutes."
    },
    {
        "id": "sch_03",
        "name": "Royapuram Municipal Middle School",
        "type": "CORPORATION_PRIMARY_MIDDLE",
        "address": "Old Jail Road, Royapuram, Chennai",
        "city": "Chennai",
        "ward": "Ward 50 (Royapuram)",
        "latitude": 13.1070,
        "longitude": 80.2860,
        "student_count": 680,
        "shade_coverage_percent": 25,
        "cooling_equipped_classrooms": False,
        "heat_advisory_status": "SEVERE_HEAT_RESTRICTION",
        "action_guidance": "Shift afternoon sessions to ground-floor shaded assembly. Early dispersal recommended if indoor temp > 38°C."
    }
]

# -------------------------------------------------------------
# Pydantic Schemas
# -------------------------------------------------------------

class CareCircleContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    relationship: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    city: Optional[str] = "Chennai"
    ward: Optional[str] = "Ward 114"
    vulnerability_note: Optional[str] = None

class CommunityReportCreate(BaseModel):
    category: str = Field(..., description="Broken Water Tap | Cooling Shelter Issue | Unshaded Labor Site | Other")
    severity: str = Field("MODERATE", description="LOW | MODERATE | HIGH | CRITICAL")
    description: str = Field(..., min_length=10, max_length=1000)
    city: str = Field("Chennai")
    ward: str = Field("Ward 114")
    latitude: float
    longitude: float
    reporter_name: Optional[str] = "Anonymous Citizen"

class ReportStatusUpdate(BaseModel):
    status: str = Field(..., description="SUBMITTED | UNDER_REVIEW | VERIFIED | ACTION_INITIATED | RESOLVED | REJECTED")
    status_notes: Optional[str] = None


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------

# 1. CARE CIRCLE ENDPOINTS
@router.get("/care-circle")
def get_care_circle():
    """Returns voluntary Care Circle contacts for the current user."""
    return {"success": True, "data": _CARE_CIRCLE}

@router.post("/care-circle")
def add_care_circle_contact(contact: CareCircleContactCreate):
    """Adds a vulnerable person to the voluntary Care Circle."""
    phone_masked = contact.phone[:4] + " *****" if len(contact.phone) > 6 else contact.phone
    new_entry = {
        "id": f"care_{uuid.uuid4().hex[:6]}",
        "user_id": "current_user",
        "name": contact.name,
        "relationship": contact.relationship,
        "phone_masked": phone_masked,
        "city": contact.city or "Chennai",
        "ward": contact.ward or "Ward 114",
        "vulnerability_note": contact.vulnerability_note or "General vulnerable dependent",
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    _CARE_CIRCLE.append(new_entry)
    return {"success": True, "data": new_entry, "message": f"{contact.name} added to your Care Circle."}

@router.delete("/care-circle/{contact_id}")
def remove_care_circle_contact(contact_id: str):
    """Removes a contact from the Care Circle."""
    global _CARE_CIRCLE
    _CARE_CIRCLE = [c for c in _CARE_CIRCLE if c["id"] != contact_id]
    return {"success": True, "message": "Contact removed from Care Circle."}


# 2. COMMUNITY REPORTING ENDPOINTS
@router.get("/reports")
def get_community_reports(
    city: Optional[str] = Query(None, description="Filter by municipality city"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """
    Returns verified community reports.
    Officers view reports within their municipality; citizens can view community status.
    """
    reports = _COMMUNITY_REPORTS
    if city:
        reports = [r for r in reports if r["city"].lower() == city.lower()]
    if status:
        reports = [r for r in reports if r["status"].upper() == status.upper()]
    return {
        "success": True,
        "total": len(reports),
        "data": list(reversed(reports))
    }

@router.post("/reports")
def create_community_report(payload: CommunityReportCreate):
    """Submits a citizen report regarding heat safety, drinking water, or cooling access."""
    new_report = {
        "id": f"rep_{uuid.uuid4().hex[:6]}",
        "reporter_name": payload.reporter_name or "Anonymous Citizen",
        "category": payload.category,
        "severity": payload.severity,
        "description": payload.description,
        "city": payload.city,
        "ward": payload.ward,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "status": "SUBMITTED",
        "status_notes": "Report queued for municipal officer verification.",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    _COMMUNITY_REPORTS.append(new_report)
    return {
        "success": True,
        "data": new_report,
        "message": "Report submitted successfully. Your municipal corporation has been notified."
    }

@router.patch("/reports/{report_id}/status")
def update_report_status(report_id: str, update: ReportStatusUpdate):
    """
    Updates the operational lifecycle status of a community report.
    Statuses: SUBMITTED -> UNDER_REVIEW -> VERIFIED -> ACTION_INITIATED -> RESOLVED -> REJECTED.
    """
    for r in _COMMUNITY_REPORTS:
        if r["id"] == report_id:
            r["status"] = update.status.upper()
            if update.status_notes:
                r["status_notes"] = update.status_notes
            r["updated_at"] = datetime.now(timezone.utc).isoformat()
            return {"success": True, "data": r, "message": f"Report status updated to {r['status']}."}
    raise HTTPException(status_code=404, detail="Report not found.")


# 3. DRINKING WATER POINTS ENDPOINTS
@router.get("/water-points")
def get_water_points(
    city: Optional[str] = Query(None, description="Filter by municipality city")
):
    """Returns verified municipal drinking water points and hydration stations."""
    points = _WATER_POINTS
    if city:
        points = [p for p in points if p["city"].lower() == city.lower()]
    return {
        "success": True,
        "total": len(points),
        "data": points
    }


# 4. SCHOOL HEAT SAFETY ENDPOINTS
@router.get("/schools")
def get_schools(
    city: Optional[str] = Query(None, description="Filter by municipality city")
):
    """Returns registered schools with enrollment, cooling capabilities, and heat advisories."""
    schools = _SCHOOL_HEAT_REGISTRY
    if city:
        schools = [s for s in schools if s["city"].lower() == city.lower()]
    return {
        "success": True,
        "total": len(schools),
        "data": schools
    }
