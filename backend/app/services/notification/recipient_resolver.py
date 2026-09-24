import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Set
from sqlalchemy.orm import Session

from app.models.alert_intervention import Alert
from app.models.city_ward import Ward, Zone, City
from app.models.user import User, UserRole
from app.models.notifications import NotificationPreference, SeverityThreshold

SEVERITY_RANKS = {
    "MODERATE": 1,
    "HIGH": 2,
    "VERY_HIGH": 3,
    "EXTREME": 4,
    "ADVISORY": 1,
    "WATCH": 2,
    "WARNING": 3,
    "EXTREME WARNING": 4
}

def normalize_phone(phone: str) -> Optional[str]:
    """
    Normalizes strictly Indian mobile numbers to strict E.164 format (+91XXXXXXXXXX).
    Only valid 10-digit Indian numbers starting with 6, 7, 8, 9 are accepted.
    Rejects all non-Indian or malformed numbers.
    """
    if not phone:
        return None
    # Strip spaces, dashes, parentheses
    cleaned = re.sub(r"[\s\-\(\)]", "", phone.strip())

    # If starts with +91
    if cleaned.startswith("+91"):
        digits = cleaned[3:]
        if re.match(r"^[6-9]\d{9}$", digits):
            return f"+91{digits}"
        return None

    # If starts with 91 (without +) and 12 digits total
    if cleaned.startswith("91") and len(cleaned) == 12:
        digits = cleaned[2:]
        if re.match(r"^[6-9]\d{9}$", digits):
            return f"+91{digits}"
        return None

    # If starts with 0 and 11 digits total
    if cleaned.startswith("0") and len(cleaned) == 11:
        digits = cleaned[1:]
        if re.match(r"^[6-9]\d{9}$", digits):
            return f"+91{digits}"
        return None

    # If standard 10 digit Indian number
    if re.match(r"^[6-9]\d{9}$", cleaned):
        return f"+91{cleaned}"

    return None

def mask_phone_number(phone: str) -> str:
    """Masks phone number for privacy (+91 ******1234)."""
    if not phone or len(phone) < 7:
        return "+91 ******0000"
    prefix = phone[:3] if phone.startswith("+") else "+91"
    suffix = phone[-4:]
    return f"{prefix} ******{suffix}"

@dataclass
class EligibleRecipient:
    user_id: str
    full_name: str
    phone_number: str # E.164
    masked_phone: str
    role: str
    language: str
    ward_id: Optional[str] = None
    city: str = "Chennai"


class RecipientResolver:
    @staticmethod
    def resolve_recipients(db: Session, alert_id: str) -> Dict[str, List[EligipientRecipient := EligibleRecipient]]:
        """
        Input: alert_id
        Output: Eligible recipients grouped by channel:
        {
            "whatsapp": [EligibleRecipient, ...],
            "sms": [EligibleRecipient, ...]
        }
        """
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            return {"whatsapp": [], "sms": []}

        # 1. Resolve alert severity rank
        alert_sev_upper = alert.severity.upper()
        alert_rank = 3
        for k, v in SEVERITY_RANKS.items():
            if k in alert_sev_upper:
                alert_rank = v
                break

        # 2. Resolve alert ward & city
        ward = db.query(Ward).filter(Ward.id == alert.ward_id).first()
        alert_city_name = "Chennai"
        if ward and ward.zone_id:
            zone = db.query(Zone).filter(Zone.id == ward.zone_id).first()
            if zone and zone.city_id:
                c = db.query(City).filter(City.id == zone.city_id).first()
                if c:
                    alert_city_name = c.name

        # 3. Query all candidate active users in the jurisdiction
        users = db.query(User).filter(
            User.is_active == True,
            User.phone_verified == True
        ).all()

        whatsapp_recipients: List[EligibleRecipient] = []
        sms_recipients: List[EligibleRecipient] = []
        
        seen_wa_phones: Set[str] = set()
        seen_sms_phones: Set[str] = set()

        for u in users:
            # Check phone number validity
            norm_phone = normalize_phone(u.phone_number)
            if not norm_phone:
                continue

            # Load or auto-seed preference for user
            pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == u.id).first()
            if not pref:
                # Provide standard opt-in defaults for verified users
                pref = NotificationPreference(
                    id=f"pref_{u.id}",
                    user_id=u.id,
                    phone_number=norm_phone,
                    phone_verified=True,
                    whatsapp_opt_in=True,
                    sms_opt_in=True,
                    notification_enabled=True,
                    severity_threshold="HIGH",
                    consent_source="REGISTRATION"
                )
                db.add(pref)
                db.flush()

            # Filter: notifications must be enabled and user must not be opted out
            if not pref.notification_enabled or pref.opted_out_at is not None:
                continue

            # Filter: severity threshold check
            pref_sev = pref.severity_threshold.upper()
            pref_rank = SEVERITY_RANKS.get(pref_sev, 2)
            if alert_rank < pref_rank:
                continue

            # Filter: geographic scope
            # Officers & Admins receive alerts across the municipality; citizens receive if in city/ward
            if u.role == UserRole.CITIZEN.value:
                if pref.ward_scope and pref.ward_scope != alert.ward_id:
                    continue
                if u.city and alert_city_name and u.city.lower() != alert_city_name.lower():
                    continue

            recipient_obj = EligibleRecipient(
                user_id=u.id,
                full_name=u.full_name or u.username,
                phone_number=norm_phone,
                masked_phone=mask_phone_number(norm_phone),
                role=u.role,
                language=pref.notification_language or "en",
                ward_id=alert.ward_id,
                city=u.city or alert_city_name
            )

            # Check WhatsApp opt-in
            if pref.whatsapp_opt_in and norm_phone not in seen_wa_phones:
                whatsapp_recipients.append(recipient_obj)
                seen_wa_phones.add(norm_phone)

            # Check SMS opt-in
            if pref.sms_opt_in and norm_phone not in seen_sms_phones:
                sms_recipients.append(recipient_obj)
                seen_sms_phones.add(norm_phone)

        return {
            "whatsapp": whatsapp_recipients,
            "sms": sms_recipients
        }
