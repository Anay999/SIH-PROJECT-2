import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.models.notifications import (
    NotificationPreference,
    NotificationTemplate,
    NotificationProviderConfig,
    ProviderHealthStatus
)

def seed_notifications_data(db: Session = None):
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # 1. Seed Default Templates if empty
        existing_tmpls = db.query(NotificationTemplate).count()
        if existing_tmpls == 0:
            templates = [
                NotificationTemplate(
                    id=f"tmpl_{uuid.uuid4().hex[:10]}",
                    template_key="EXTREME_HEAT_ALERT",
                    channel="WHATSAPP",
                    provider="META",
                    template_name="thermosafe_extreme_heat_v1",
                    language="en",
                    version=1,
                    status="APPROVED",
                    body_pattern=(
                        "🚨 *THERMOSAFE AI — EXTREME HEAT ALERT*\n"
                        "Dear {{recipient_name}},\n\n"
                        "Extreme heat conditions (HTSI: {{htsi}}) are expected across {{affected_wards}}.\n"
                        "Active Window: {{time_window}}\n\n"
                        "❄️ Nearest Shelter: {{cooling_centre_name}}\n"
                        "Guidance: {{recommended_actions}}\n\n"
                        "Live Command: {{dashboard_url}}\n"
                        "Alert Ref: {{alert_id}}"
                    ),
                    variables_schema=["recipient_name", "htsi", "affected_wards", "time_window", "cooling_centre_name", "recommended_actions", "dashboard_url", "alert_id"],
                    approved_at=datetime.now(timezone.utc)
                ),
                NotificationTemplate(
                    id=f"tmpl_{uuid.uuid4().hex[:10]}",
                    template_key="EXTREME_HEAT_ALERT",
                    channel="SMS",
                    provider="MSG91",
                    template_name="1007161829304918234",
                    language="en",
                    version=1,
                    status="APPROVED",
                    body_pattern="THERMOSAFE ALERT: EXTREME heat risk in {#var#}. HTSI {#var#}. Window: {#var#}. Stay hydrated & seek cooling centres. Ref:{#var#}",
                    variables_schema=["wards", "htsi", "window", "alert_id"],
                    approved_at=datetime.now(timezone.utc)
                ),
                NotificationTemplate(
                    id=f"tmpl_{uuid.uuid4().hex[:10]}",
                    template_key="VERY_HIGH_HEAT_ALERT",
                    channel="WHATSAPP",
                    provider="META",
                    template_name="thermosafe_very_high_heat_v1",
                    language="en",
                    version=1,
                    status="APPROVED",
                    body_pattern=(
                        "⚠️ *THERMOSAFE AI — VERY HIGH HEAT ADVISORY*\n"
                        "Dear {{recipient_name}},\n\n"
                        "Severe heat stress detected in {{affected_wards}} (HTSI {{htsi}}).\n"
                        "Stay hydrated, limit direct sun exposure and check on vulnerable family members.\n"
                        "Shelter Hub: {{cooling_centre_name}}\n"
                        "Alert Ref: {{alert_id}}"
                    ),
                    variables_schema=["recipient_name", "affected_wards", "htsi", "cooling_centre_name", "alert_id"],
                    approved_at=datetime.now(timezone.utc)
                ),
                NotificationTemplate(
                    id=f"tmpl_{uuid.uuid4().hex[:10]}",
                    template_key="VERY_HIGH_HEAT_ALERT",
                    channel="SMS",
                    provider="MSG91",
                    template_name="1007161829304918235",
                    language="en",
                    version=1,
                    status="APPROVED",
                    body_pattern="THERMOSAFE ALERT: VERY HIGH heat in {#var#}. HTSI {#var#}. Avoid direct sun, drink ORS water. Ref:{#var#}",
                    variables_schema=["wards", "htsi", "alert_id"],
                    approved_at=datetime.now(timezone.utc)
                )
            ]
            for t in templates:
                db.add(t)

        # 2. Seed Preferences for all users who don't have one
        users = db.query(User).all()
        for u in users:
            pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == u.id).first()
            if not pref:
                db.add(NotificationPreference(
                    id=f"pref_{u.id}",
                    user_id=u.id,
                    phone_number=u.phone_number or "+919876543210",
                    phone_verified=True,
                    phone_verified_at=datetime.now(timezone.utc),
                    whatsapp_opt_in=True,
                    sms_opt_in=True,
                    notification_enabled=True,
                    severity_threshold="HIGH",
                    consent_source="REGISTRATION",
                    consent_timestamp=datetime.now(timezone.utc)
                ))

        # 3. Seed Provider Config records
        wa_cfg = db.query(NotificationProviderConfig).filter(NotificationProviderConfig.channel == "WHATSAPP").first()
        if not wa_cfg:
            db.add(NotificationProviderConfig(
                id=f"pcfg_wa_{uuid.uuid4().hex[:8]}",
                channel="WHATSAPP",
                provider_name="META_WHATSAPP_CLOUD_API",
                is_enabled=True,
                status=ProviderHealthStatus.CONNECTED.value,
                last_health_check=datetime.now(timezone.utc)
            ))

        sms_cfg = db.query(NotificationProviderConfig).filter(NotificationProviderConfig.channel == "SMS").first()
        if not sms_cfg:
            db.add(NotificationProviderConfig(
                id=f"pcfg_sms_{uuid.uuid4().hex[:8]}",
                channel="SMS",
                provider_name="MSG91_INDIA_DLT",
                is_enabled=True,
                status=ProviderHealthStatus.CONNECTED.value,
                last_health_check=datetime.now(timezone.utc)
            ))

        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"Error seeding notifications: {exc}")
    finally:
        if should_close:
            db.close()
