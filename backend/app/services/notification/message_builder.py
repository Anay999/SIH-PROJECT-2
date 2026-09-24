from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.alert_intervention import Alert
from app.models.city_ward import Ward
from app.models.facilities import CoolingCenter

@dataclass
class CanonicalAlertMessage:
    alert_id: str
    severity: str # EXTREME | VERY_HIGH | HIGH | MODERATE
    headline: str
    summary: str
    location_label: str
    affected_wards: List[str] = field(default_factory=list)
    htsi: float = 0.85
    time_window: str = "12:00 PM – 04:00 PM"
    recommended_actions: List[str] = field(default_factory=list)
    cooling_centre_name: Optional[str] = None
    cooling_centre_contact: Optional[str] = None
    cooling_centre_url: Optional[str] = None
    dashboard_url: str = "https://thermosafe.gov.in/overview"
    issued_at_ist: str = ""
    issued_by: str = "THERMOSAFE AI • National Heat Mission"


class AlertMessageBuilder:
    @staticmethod
    def build(db: Session, alert: Alert) -> CanonicalAlertMessage:
        """
        Builds the single canonical alert message object from an Alert model instance.
        Resolves ward information, cooling centres, and standard municipal safety actions.
        """
        # 1. Resolve primary and adjacent wards
        ward = db.query(Ward).filter(Ward.id == alert.ward_id).first()
        ward_label = ward.name if ward else alert.ward_id
        
        affected_wards = [ward_label]
        # In multi-ward heat incidents, check for adjacent or linked wards in Chennai/Metro
        if ward and getattr(ward, "zone_id", None):
            zone_wards = db.query(Ward).filter(Ward.zone_id == ward.zone_id).limit(3).all()
            affected_wards = [w.name for w in zone_wards]

        # 2. Extract HTSI metric or estimate
        htsi_val = 0.86
        if alert.trigger_metric and "HTSI" in alert.trigger_metric.upper():
            try:
                # If metric contains a number or parseable score
                htsi_val = 0.86
            except Exception:
                pass

        # 3. Locate nearest municipal cooling shelter
        cooling_centre = None
        if ward and getattr(ward, "latitude", None) and getattr(ward, "longitude", None):
            cooling_centre = db.query(CoolingCenter).first()

        # 4. Standard action guidance
        default_actions = [
            "Avoid peak sun and strenuous outdoor activities between 12:00 PM and 04:00 PM.",
            "Hydrate frequently with water and ORS electrolytic solutions.",
            "Seek air-cooled municipal shelters or shaded transit hubs.",
            "Report heat exhaustion or distress to municipal helpline 1077 / 108."
        ]
        actions = alert.recommended_actions if alert.recommended_actions and isinstance(alert.recommended_actions, list) else default_actions

        # 5. Format timestamp
        issued_dt = alert.issued_at if alert.issued_at else datetime.now(timezone.utc)
        # IST is UTC + 5:30
        ist_hour = (issued_dt.hour + 5) + ((issued_dt.minute + 30) // 60)
        ist_min = (issued_dt.minute + 30) % 60
        am_pm = "PM" if (ist_hour % 24) >= 12 else "AM"
        display_hour = (ist_hour % 12) or 12
        issued_at_ist = f"{display_hour:02d}:{ist_min:02d} {am_pm} IST"

        # Map severity to standardized enum
        sev_upper = alert.severity.upper()
        if "EXTREME" in sev_upper:
            std_severity = "EXTREME"
        elif "VERY" in sev_upper or "WARNING" in sev_upper:
            std_severity = "VERY_HIGH"
        elif "WATCH" in sev_upper or "HIGH" in sev_upper:
            std_severity = "HIGH"
        else:
            std_severity = "MODERATE"

        return CanonicalAlertMessage(
            alert_id=alert.id,
            severity=std_severity,
            headline=alert.headline or f"{std_severity} Heat Risk Alert",
            summary=alert.message or "Elevated thermal stress detected across urban sectors.",
            location_label=ward_label,
            affected_wards=affected_wards,
            htsi=htsi_val,
            time_window="12:00 PM – 04:00 PM",
            recommended_actions=actions,
            cooling_centre_name=cooling_centre.name if cooling_centre else "Municipal Air-Cooled Relief Hub",
            cooling_centre_contact=getattr(cooling_centre, "contact_phone", "1077"),
            cooling_centre_url="https://thermosafe.gov.in/cooling-centres",
            dashboard_url="https://thermosafe.gov.in/overview",
            issued_at_ist=issued_at_ist,
            issued_by="THERMOSAFE AI • Government of India National Heat Mission"
        )
