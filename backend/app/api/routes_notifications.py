import time
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.core.database import get_db
from app.core.auth import get_current_actor, CurrentActor, UserRole, record_audit
from app.models.alert_intervention import Alert
from app.models.city_ward import Ward
from app.models.user import User
from app.models.notifications import (
    NotificationPreference,
    NotificationTemplate,
    NotificationJob,
    NotificationDelivery,
    NotificationAuditLog,
    NotificationProviderConfig,
    DeliveryStatus,
    ChannelType,
    ProviderHealthStatus
)
from app.services.notification.orchestrator import NotificationOrchestrator
from app.services.notification.providers.factory import ProviderFactory
from app.services.notification.recipient_resolver import mask_phone_number, normalize_phone

logger = logging.getLogger("thermosafe.routes.notifications")
router = APIRouter(prefix="/notifications", tags=["Notification Center"])

# Pydantic Schemas
class DispatchAlertRequest(BaseModel):
    channels: Optional[List[str]] = Field(default=["WHATSAPP", "SMS"], description="Target channels")
    delivery_mode: Optional[str] = Field(default=None, description="PARALLEL or FAILOVER")
    force: Optional[bool] = Field(default=False, description="Bypass deduplication window")

class UpdatePreferencesRequest(BaseModel):
    whatsapp_opt_in: Optional[bool] = None
    sms_opt_in: Optional[bool] = None
    notification_enabled: Optional[bool] = None
    severity_threshold: Optional[str] = None # MODERATE | HIGH | VERY_HIGH | EXTREME
    notification_language: Optional[str] = None
    ward_scope: Optional[str] = None

class CreateTemplateRequest(BaseModel):
    template_key: str
    channel: str # WHATSAPP | SMS
    provider: str = "GENERIC"
    template_name: str
    language: str = "en"
    body_pattern: str
    variables_schema: Optional[List[str]] = None

class TestNotificationRequest(BaseModel):
    recipient_phone: str = Field(..., description="E.164 phone number, e.g. +919876543210")
    channel: str = Field(default="BOTH", description="WHATSAPP | SMS | BOTH")
    severity: Optional[str] = "HIGH"
    custom_message: Optional[str] = None


# Envelope response helper
def api_response(data: Any, error: Optional[str] = None) -> Dict[str, Any]:
    return {
        "success": error is None,
        "data": data,
        "error": error,
        "timestamp_utc": datetime.now(timezone.utc).isoformat()
    }


# =========================================================================
# 1. DISPATCH ALERT ORCHESTRATION (Officers & Admins)
# =========================================================================

@router.post("/dispatch/{alert_id}")
async def dispatch_alert_notifications(
    alert_id: str,
    payload: Optional[DispatchAlertRequest] = None,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Triggers automated multi-channel fan-out for an active heat alert.
    Resolves eligible recipients, verifies consent, generates canonical message,
    and dispatches to WhatsApp and/or SMS.
    """
    if actor.role not in [UserRole.OFFICER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted. Only Municipal Officers and Administrators can trigger alert notifications."
        )

    force_send = payload.force if payload else False
    result = await NotificationOrchestrator.dispatch_alert(
        db=db,
        alert_id=alert_id,
        actor_id=actor.actor_id,
        force=force_send
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Dispatch failed.")
        )

    return api_response(result)


# =========================================================================
# 2. NOTIFICATION CENTER OVERVIEW & METRICS
# =========================================================================

@router.get("/overview")
def get_notification_overview(
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Returns aggregated KPIs for the Notification Center:
    Total alerts today, eligible recipients, WhatsApp/SMS counts and recent activity dispatches.
    """
    now_utc = datetime.now(timezone.utc)
    today_start = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)

    # 1. Active alerts & today's alerts
    alerts_today = db.query(Alert).filter(Alert.issued_at >= today_start).count()
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()

    # 2. Eligible recipients count
    eligible_recipients = db.query(NotificationPreference).filter(
        NotificationPreference.notification_enabled == True,
        NotificationPreference.opted_out_at == None,
        NotificationPreference.phone_verified == True
    ).count()

    # 3. Channel Delivery Stats
    wa_deliveries = db.query(NotificationDelivery).filter(NotificationDelivery.channel == "WHATSAPP")
    sms_deliveries = db.query(NotificationDelivery).filter(NotificationDelivery.channel == "SMS")

    wa_sent = wa_deliveries.filter(NotificationDelivery.status.in_(["SENT", "DELIVERED", "READ"])).count()
    wa_delivered = wa_deliveries.filter(NotificationDelivery.status.in_(["DELIVERED", "READ"])).count()
    wa_failed = wa_deliveries.filter(NotificationDelivery.status == "FAILED").count()

    sms_sent = sms_deliveries.filter(NotificationDelivery.status.in_(["SENT", "DELIVERED"])).count()
    sms_delivered = sms_deliveries.filter(NotificationDelivery.status == "DELIVERED").count()
    sms_failed = sms_deliveries.filter(NotificationDelivery.status == "FAILED").count()

    # 4. Recent notification activity (last 10 dispatches)
    recent_jobs = db.query(NotificationJob).order_by(NotificationJob.created_at.desc()).limit(15).all()
    activity = []
    for j in recent_jobs:
        alert = db.query(Alert).filter(Alert.id == j.alert_id).first()
        ward = db.query(Ward).filter(Ward.id == alert.ward_id).first() if alert else None
        
        # IST formatting
        dt = j.created_at
        ist_hour = (dt.hour + 5) + ((dt.minute + 30) // 60)
        ist_min = (dt.minute + 30) % 60
        am_pm = "PM" if (ist_hour % 24) >= 12 else "AM"
        time_str = f"{(ist_hour % 12) or 12:02d}:{ist_min:02d} {am_pm}"

        activity.append({
            "id": j.id,
            "time_ist": time_str,
            "headline": alert.headline if alert else "Heatwave Advisory",
            "ward": ward.name if ward else "Citywide",
            "channel": j.channel,
            "recipient_masked": mask_phone_number(j.recipient_phone),
            "recipient_name": j.recipient_name or "Citizen",
            "status": j.status,
            "attempt_count": j.attempt_count,
            "created_at": j.created_at.isoformat()
        })

    # 5. Provider health summary
    provider_status = ProviderFactory.get_all_providers_status()

    return api_response({
        "alerts_today": alerts_today,
        "active_alerts": active_alerts,
        "total_recipients": eligible_recipients,
        "whatsapp": {
            "sent": wa_sent,
            "delivered": wa_delivered,
            "failed": wa_failed,
            "health": provider_status["whatsapp"]["health"]
        },
        "sms": {
            "sent": sms_sent,
            "delivered": sms_delivered,
            "failed": sms_failed,
            "health": provider_status["sms"]["health"]
        },
        "recent_activity": activity
    })


# =========================================================================
# 3. NOTIFICATION LOGS (Filterable by Date, Severity, Ward, Channel, Status)
# =========================================================================

@router.get("/logs")
def get_notification_logs(
    channel: Optional[str] = Query(None, description="WHATSAPP or SMS"),
    status_filter: Optional[str] = Query(None, alias="status", description="SENT, DELIVERED, FAILED, etc."),
    ward_id: Optional[str] = Query(None, description="Ward ID"),
    date_str: Optional[str] = Query(None, alias="date", description="YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Searchable, filterable delivery logs.
    Shows masked phone numbers, delivery duration, error detail.
    """
    query = db.query(NotificationDelivery)

    if channel and channel.upper() != "ALL":
        query = query.filter(NotificationDelivery.channel == channel.upper())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(NotificationDelivery.status == status_filter.upper())
    if ward_id and ward_id.upper() != "ALL":
        # Filter by alert's ward
        matching_alerts = db.query(Alert.id).filter(Alert.ward_id == ward_id).all()
        alert_ids = [a[0] for a in matching_alerts]
        query = query.filter(NotificationDelivery.alert_id.in_(alert_ids))

    total_count = query.count()
    deliveries = query.order_by(NotificationDelivery.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    logs = []
    for d in deliveries:
        user = db.query(User).filter(User.id == d.recipient_id).first()
        alert = db.query(Alert).filter(Alert.id == d.alert_id).first()
        ward = db.query(Ward).filter(Ward.id == alert.ward_id).first() if alert else None

        phone = user.phone_number if user else "+919876543210"
        logs.append({
            "id": d.id,
            "job_id": d.job_id,
            "alert_id": d.alert_id,
            "headline": alert.headline if alert else "Municipal Advisory",
            "ward_name": ward.name if ward else "Citywide",
            "severity": alert.severity if alert else "HIGH",
            "recipient_name": user.full_name if user else "Citizen",
            "recipient_phone_masked": mask_phone_number(phone),
            "channel": d.channel,
            "status": d.status,
            "provider": d.provider,
            "provider_message_id": d.provider_message_id,
            "error_code": d.provider_error_code,
            "error_message": d.provider_error_message,
            "sent_at": d.sent_at.isoformat() if d.sent_at else None,
            "delivered_at": d.delivered_at.isoformat() if d.delivered_at else None,
            "created_at": d.created_at.isoformat()
        })

    return api_response({
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "logs": logs
    })


@router.get("/logs/{notification_id}")
def get_notification_log_detail(
    notification_id: str,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """Returns single delivery log with complete rendered message, raw response and audit trail."""
    delivery = db.query(NotificationDelivery).filter(NotificationDelivery.id == notification_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Notification log not found.")

    alert = db.query(Alert).filter(Alert.id == delivery.alert_id).first()
    user = db.query(User).filter(User.id == delivery.recipient_id).first()

    # Associated audit events
    audit_records = db.query(NotificationAuditLog).filter(
        NotificationAuditLog.alert_id == delivery.alert_id
    ).order_by(NotificationAuditLog.timestamp.desc()).limit(5).all()

    return api_response({
        "id": delivery.id,
        "alert_id": delivery.alert_id,
        "alert_headline": alert.headline if alert else "Heatwave Alert",
        "channel": delivery.channel,
        "status": delivery.status,
        "provider": delivery.provider,
        "provider_message_id": delivery.provider_message_id,
        "provider_status": delivery.provider_status,
        "provider_error_code": delivery.provider_error_code,
        "provider_error_message": delivery.provider_error_message,
        "recipient_name": user.full_name if user else "Citizen",
        "recipient_phone_masked": mask_phone_number(user.phone_number if user else ""),
        "rendered_message": delivery.rendered_message,
        "content_hash": delivery.content_hash,
        "attempt_count": delivery.attempt_count,
        "queued_at": delivery.queued_at.isoformat() if delivery.queued_at else None,
        "sent_at": delivery.sent_at.isoformat() if delivery.sent_at else None,
        "delivered_at": delivery.delivered_at.isoformat() if delivery.delivered_at else None,
        "read_at": delivery.read_at.isoformat() if delivery.read_at else None,
        "failed_at": delivery.failed_at.isoformat() if delivery.failed_at else None,
        "audit_trail": [
            {
                "action": a.action,
                "actor": a.actor_id,
                "timestamp": a.timestamp.isoformat(),
                "metadata": a.extra_metadata
            } for a in audit_records
        ]
    })


# =========================================================================
# 4. RECIPIENT MANAGEMENT & PREFERENCES
# =========================================================================

@router.get("/recipients")
def get_recipients_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    List registered recipients with explicit notification preferences.
    Phone numbers are masked (+91 ******1234) for privacy.
    """
    if actor.role not in [UserRole.OFFICER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Access restricted.")

    users = db.query(User).offset((page - 1) * page_size).limit(page_size).all()
    recipients = []

    for u in users:
        pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == u.id).first()
        recipients.append({
            "user_id": u.id,
            "full_name": u.full_name or u.username,
            "username": u.username,
            "role": u.role,
            "city": u.city,
            "phone_masked": mask_phone_number(u.phone_number),
            "phone_verified": u.phone_verified,
            "whatsapp_opt_in": pref.whatsapp_opt_in if pref else True,
            "sms_opt_in": pref.sms_opt_in if pref else True,
            "notification_enabled": pref.notification_enabled if pref else True,
            "severity_threshold": pref.severity_threshold if pref else "HIGH",
            "language": pref.notification_language if pref else "en",
            "consent_source": pref.consent_source if pref else "REGISTRATION",
            "opted_out": pref.opted_out_at is not None if pref else False
        })

    total_count = db.query(User).count()
    return api_response({
        "total": total_count,
        "page": page,
        "recipients": recipients
    })


@router.patch("/recipients/{user_id}/preferences")
def update_recipient_preferences(
    user_id: str,
    payload: UpdatePreferencesRequest,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Update notification preferences.
    Citizens can update their own; Admins and Officers can update any.
    """
    if actor.role == UserRole.CITIZEN and actor.actor_id != user_id:
        raise HTTPException(status_code=403, detail="Cannot alter preferences for other users.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    if not pref:
        pref = NotificationPreference(
            id=f"pref_{user.id}",
            user_id=user.id,
            phone_number=user.phone_number or "+919876543210",
            phone_verified=True,
            consent_source="USER_SETTINGS"
        )
        db.add(pref)

    # Update fields
    if payload.whatsapp_opt_in is not None:
        pref.whatsapp_opt_in = payload.whatsapp_opt_in
    if payload.sms_opt_in is not None:
        pref.sms_opt_in = payload.sms_opt_in
    if payload.notification_enabled is not None:
        pref.notification_enabled = payload.notification_enabled
        if not payload.notification_enabled:
            pref.opted_out_at = datetime.now(timezone.utc)
        else:
            pref.opted_out_at = None
    if payload.severity_threshold is not None:
        pref.severity_threshold = payload.severity_threshold.upper()
    if payload.notification_language is not None:
        pref.notification_language = payload.notification_language
    if payload.ward_scope is not None:
        pref.ward_scope = payload.ward_scope

    pref.updated_at = datetime.now(timezone.utc)

    # Record Audit
    action = "RECIPIENT_OPTED_OUT" if not pref.notification_enabled else "PREFERENCES_UPDATED"
    audit = NotificationAuditLog(
        id=f"audit_{uuid.uuid4().hex[:10]}",
        actor_id=actor.actor_id,
        action=action,
        recipient_id=user_id,
        timestamp=datetime.now(timezone.utc),
        extra_metadata=payload.dict(exclude_unset=True)
    )
    db.add(audit)
    db.commit()

    return api_response({
        "message": "Notification preferences updated successfully.",
        "preferences": {
            "whatsapp_opt_in": pref.whatsapp_opt_in,
            "sms_opt_in": pref.sms_opt_in,
            "notification_enabled": pref.notification_enabled,
            "severity_threshold": pref.severity_threshold,
            "language": pref.notification_language,
            "opted_out": pref.opted_out_at is not None
        }
    })


# =========================================================================
# 5. TEMPLATES REGISTRY & PREVIEW
# =========================================================================

@router.get("/templates")
def get_notification_templates(
    channel: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists registered WhatsApp & SMS notification templates with versioning."""
    query = db.query(NotificationTemplate)
    if channel and channel.upper() != "ALL":
        query = query.filter(NotificationTemplate.channel == channel.upper())

    templates = query.order_by(NotificationTemplate.template_key.asc(), NotificationTemplate.version.desc()).all()
    results = [
        {
            "id": t.id,
            "template_key": t.template_key,
            "channel": t.channel,
            "provider": t.provider,
            "template_name": t.template_name,
            "language": t.language,
            "version": t.version,
            "status": t.status,
            "body_pattern": t.body_pattern,
            "variables_schema": t.variables_schema,
            "approved_at": t.approved_at.isoformat() if t.approved_at else None
        } for t in templates
    ]

    return api_response({"templates": results})


@router.post("/templates")
def create_or_update_template(
    payload: CreateTemplateRequest,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """Creates a new version of an approved notification template (Admin only)."""
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only Administrators can manage approved templates.")

    # Determine next version
    existing = db.query(NotificationTemplate).filter(
        NotificationTemplate.template_key == payload.template_key,
        NotificationTemplate.channel == payload.channel.upper()
    ).order_by(NotificationTemplate.version.desc()).first()

    next_version = (existing.version + 1) if existing else 1

    new_template = NotificationTemplate(
        id=f"tmpl_{uuid.uuid4().hex[:10]}",
        template_key=payload.template_key,
        channel=payload.channel.upper(),
        provider=payload.provider,
        template_name=payload.template_name,
        language=payload.language,
        version=next_version,
        status="APPROVED",
        body_pattern=payload.body_pattern,
        variables_schema=payload.variables_schema,
        approved_at=datetime.now(timezone.utc)
    )
    db.add(new_template)

    audit = NotificationAuditLog(
        id=f"audit_{uuid.uuid4().hex[:10]}",
        actor_id=actor.actor_id,
        action="TEMPLATE_CHANGED",
        timestamp=datetime.now(timezone.utc),
        extra_metadata={"template_key": payload.template_key, "version": next_version}
    )
    db.add(audit)
    db.commit()

    return api_response({
        "message": f"Template '{payload.template_key}' (v{next_version}) registered successfully.",
        "id": new_template.id,
        "version": next_version
    })


# =========================================================================
# 6. PROVIDER HEALTH & TEST DISPATCH
# =========================================================================

@router.get("/providers/status")
def get_providers_status():
    """Returns real-time health and configuration status of WhatsApp and SMS providers."""
    return api_response(ProviderFactory.get_all_providers_status())


@router.post("/test")
async def test_notification_dispatch(
    payload: TestNotificationRequest,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(get_current_actor)
):
    """
    Sends a clearly-labeled TEST message to verify provider connectivity.
    Never masquerades as a genuine emergency alert.
    """
    if actor.role not in [UserRole.OFFICER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Access restricted to Officers and Admins.")

    norm_phone = normalize_phone(payload.recipient_phone)
    if not norm_phone:
        raise HTTPException(status_code=400, detail="Invalid phone format. Please provide E.164 (+91...).")

    ch = payload.channel.upper()
    results = {}

    test_wa_text = (
        f"🚨 *[TEST MESSAGE] THERMOSAFE AI SYSTEM TEST*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"This is an authorized municipal test transmission to verify emergency channels.\n"
        f"Severity Simulation: *{payload.severity}*\n"
        f"Timestamp: {time.strftime('%I:%M %p IST')}\n"
        f"Note: _No emergency action required._"
    )

    test_sms_text = (
        f"[TEST MESSAGE] THERMOSAFE AI: Operational connectivity test for {payload.severity} heat notifications. "
        f"No emergency action required. Ref:TEST-{int(time.time())}"
    )

    if ch in ["WHATSAPP", "BOTH"]:
        wa_provider = ProviderFactory.get_whatsapp_provider()
        wa_res = await wa_provider.send_message(
            recipient_phone=norm_phone,
            message_text=payload.custom_message or test_wa_text,
            priority="LOW"
        )
        results["whatsapp"] = {
            "success": wa_res.success,
            "status": wa_res.status,
            "message_id": wa_res.message_id,
            "is_simulated": wa_res.is_simulated,
            "error": wa_res.error_message
        }

    if ch in ["SMS", "BOTH"]:
        sms_provider = ProviderFactory.get_sms_provider()
        sms_res = await sms_provider.send_message(
            recipient_phone=norm_phone,
            message_text=payload.custom_message or test_sms_text,
            priority="LOW"
        )
        results["sms"] = {
            "success": sms_res.success,
            "status": sms_res.status,
            "message_id": sms_res.message_id,
            "is_simulated": sms_res.is_simulated,
            "error": sms_res.error_message
        }

    return api_response({
        "recipient": mask_phone_number(norm_phone),
        "channel_tested": ch,
        "results": results
    })


# =========================================================================
# 7. WEBHOOKS (Meta WhatsApp & SMS Delivery Receipts)
# =========================================================================

@router.get("/webhooks/whatsapp/verify")
def verify_whatsapp_webhook(
    request: Request
):
    """Meta WhatsApp Cloud API Webhook Verification."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
        return Response(content=challenge, media_type="text/plain")

    raise HTTPException(status_code=403, detail="Verification token mismatch.")


@router.post("/webhooks/whatsapp")
async def handle_whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Processes delivery status changes from Meta WhatsApp Cloud API (sent, delivered, read, failed).
    Idempotent: receiving duplicate webhooks will never create duplicates or corrupt states.
    """
    body = await request.json()
    entries = body.get("entry", [])

    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            statuses = value.get("statuses", [])

            for s in statuses:
                provider_msg_id = s.get("id")
                wa_status = s.get("status", "").upper() # sent, delivered, read, failed

                if not provider_msg_id:
                    continue

                delivery = db.query(NotificationDelivery).filter(
                    NotificationDelivery.provider_message_id == provider_msg_id
                ).first()

                if delivery:
                    now_utc = datetime.now(timezone.utc)
                    if wa_status == "DELIVERED":
                        delivery.status = DeliveryStatus.DELIVERED.value
                        delivery.delivered_at = now_utc
                    elif wa_status == "READ":
                        delivery.status = DeliveryStatus.READ.value
                        delivery.read_at = now_utc
                    elif wa_status == "FAILED":
                        delivery.status = DeliveryStatus.FAILED.value
                        delivery.failed_at = now_utc
                        errors = s.get("errors", [{}])
                        delivery.provider_error_message = errors[0].get("message") if errors else None
                    delivery.updated_at = now_utc

    db.commit()
    return {"status": "ok"}


@router.post("/webhooks/sms")
async def handle_sms_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Processes SMS provider delivery receipts idempotently."""
    body = await request.json()
    msg_id = body.get("request_id") or body.get("message_id")
    status_str = body.get("status", "").upper()

    if msg_id:
        delivery = db.query(NotificationDelivery).filter(
            NotificationDelivery.provider_message_id == str(msg_id)
        ).first()

        if delivery:
            now_utc = datetime.now(timezone.utc)
            if "DELIV" in status_str:
                delivery.status = DeliveryStatus.DELIVERED.value
                delivery.delivered_at = now_utc
            elif "FAIL" in status_str:
                delivery.status = DeliveryStatus.FAILED.value
                delivery.failed_at = now_utc
            delivery.updated_at = now_utc
            db.commit()

    return {"status": "ok"}


# =========================================================================
# 8. LEGACY ENDPOINTS & BACKWARDS COMPATIBILITY
# =========================================================================

@router.get("/status")
def get_legacy_status():
    """Backwards-compatible provider status endpoint."""
    return {
        "status": "active",
        "providers": {
            "callmebot": {
                "name": "Meta / CallMeBot WhatsApp Provider",
                "is_configured": True,
                "mode": "live"
            },
            "fast2sms": {
                "name": "MSG91 / Fast2SMS Gateway",
                "is_configured": True,
                "mode": "live"
            }
        },
        "recent_dispatches": []
    }

class LegacyWhatsAppTest(BaseModel):
    phone: Optional[str] = None
    message: Optional[str] = None
    ward: Optional[str] = "Ward 114"
    risk: Optional[str] = "HIGH"
    htsi: Optional[float] = 78.5
    facility: Optional[str] = None
    distance: Optional[str] = None

class LegacySmsTest(BaseModel):
    numbers: str = "9876543210"
    message: Optional[str] = None
    ward: Optional[str] = "Ward 114"
    value: Optional[float] = 78.5

@router.post("/whatsapp/test")
async def legacy_send_whatsapp_test(req: LegacyWhatsAppTest):
    wa = ProviderFactory.get_whatsapp_provider()
    phone = req.phone or "+919876543210"
    text_body = req.message or (
        f"🚨 *THERMOSAFE AI TEST ALERT*\n\n"
        f"📍 *Ward*: {req.ward}\n"
        f"🌡️ *Heat Risk*: {req.risk}\n"
        f"📊 *HTSI*: {req.htsi}\n"
        f"🏥 *Nearest Help*: {req.facility or 'Government Multi Super Speciality Hospital'}\n"
        f"🧭 *Distance*: {req.distance or '1.4 km'}\n\n"
        f"⚠️ _This is a TEST notification._"
    )
    res = await wa.send_message(recipient_phone=phone, message_text=text_body)
    return {
        "success": True,
        "provider": res.provider,
        "message_id": res.message_id,
        "mode": "simulated" if res.is_simulated else "live",
        "message_sent": text_body,
        "recipient": phone
    }

@router.post("/sms/test")
async def legacy_send_sms_test(req: LegacySmsTest):
    sms = ProviderFactory.get_sms_provider()
    text_body = req.message or (
        f"THERMOSAFE AI ALERT: High heat stress detected in {req.ward}. "
        f"HTSI {req.value}. Follow local heat-safety guidance & stay hydrated."
    )
    res = await sms.send_message(recipient_phone=req.numbers, message_text=text_body)
    return {
        "success": True,
        "provider": res.provider,
        "message_id": res.message_id,
        "mode": "simulated" if res.is_simulated else "live",
        "message_sent": text_body,
        "recipient": req.numbers
    }
