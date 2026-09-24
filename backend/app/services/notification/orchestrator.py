import uuid
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.alert_intervention import Alert
from app.models.notifications import (
    NotificationJob,
    NotificationDelivery,
    NotificationAuditLog,
    DeliveryStatus,
    ChannelType,
    NotificationPriority
)
from app.services.notification.message_builder import AlertMessageBuilder, CanonicalAlertMessage
from app.services.notification.renderers.whatsapp_renderer import WhatsAppRenderer
from app.services.notification.renderers.sms_renderer import SMSRenderer
from app.services.notification.recipient_resolver import RecipientResolver, EligibleRecipient
from app.services.notification.providers.factory import ProviderFactory
from app.services.notification.providers.base import ProviderResult

logger = logging.getLogger("thermosafe.notifications.orchestrator")

class NotificationOrchestrator:
    @classmethod
    async def dispatch_alert(
        cls,
        db: Session,
        alert_id: str,
        actor_id: Optional[str] = "SYSTEM_ORCHESTRATOR",
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Main multi-channel alert dispatch orchestration flow:
        1. Validate alert
        2. Build canonical message
        3. Resolve eligible consented recipients
        4. Apply deduplication & idempotency checks
        5. Queue & dispatch to WhatsApp and/or SMS
        6. Persist delivery and audit logs
        """
        # 1. Load Alert
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            return {"success": False, "error": f"Alert '{alert_id}' not found."}

        # 2. Check Deduplication Window
        now_utc = datetime.now(timezone.utc)
        if not force:
            window_ago = now_utc - timedelta(minutes=settings.ALERT_DEDUP_WINDOW_MINUTES)
            recent_job = db.query(NotificationJob).filter(
                NotificationJob.alert_id == alert.id,
                NotificationJob.created_at >= window_ago
            ).first()

            if recent_job:
                logger.info(f"Deduplication applied: Alert '{alert_id}' was dispatched within {settings.ALERT_DEDUP_WINDOW_MINUTES} mins.")
                return {
                    "success": True,
                    "deduplicated": True,
                    "message": f"Alert was already dispatched within the {settings.ALERT_DEDUP_WINDOW_MINUTES} minute window.",
                    "alert_id": alert.id
                }

        # 3. Build Canonical Alert Message
        canonical_msg: CanonicalAlertMessage = AlertMessageBuilder.build(db, alert)
        sms_text = SMSRenderer.render(canonical_msg)
        content_hash = hashlib.sha256(sms_text.encode("utf-8")).hexdigest()[:16]

        # 4. Resolve Eligible Recipients
        recipients_map = RecipientResolver.resolve_recipients(db, alert.id)
        wa_recipients = recipients_map.get("whatsapp", [])
        sms_recipients = recipients_map.get("sms", [])

        total_targeted = len(set([r.user_id for r in wa_recipients + sms_recipients]))
        
        # Priority mapping
        priority = NotificationPriority.HIGH.value
        if canonical_msg.severity == "EXTREME":
            priority = NotificationPriority.CRITICAL.value
        elif canonical_msg.severity == "MODERATE":
            priority = NotificationPriority.LOW.value

        wa_provider = ProviderFactory.get_whatsapp_provider()
        sms_provider = ProviderFactory.get_sms_provider()

        wa_results_summary = {"targeted": len(wa_recipients), "sent": 0, "delivered": 0, "failed": 0, "skipped": 0}
        sms_results_summary = {"targeted": len(sms_recipients), "sent": 0, "delivered": 0, "failed": 0, "skipped": 0}

        delivery_mode = settings.NOTIFICATION_DELIVERY_MODE.upper() # PARALLEL or FAILOVER

        # Track audit start
        audit_start = NotificationAuditLog(
            id=f"audit_{uuid.uuid4().hex[:10]}",
            actor_id=actor_id,
            action="ALERT_DISPATCH_REQUESTED",
            alert_id=alert.id,
            timestamp=now_utc,
            extra_metadata={
                "severity": canonical_msg.severity,
                "targeted_users": total_targeted,
                "whatsapp_count": len(wa_recipients),
                "sms_count": len(sms_recipients),
                "delivery_mode": delivery_mode
            }
        )
        db.add(audit_start)
        db.commit()

        # 5. Process WhatsApp Dispatches
        wa_success_users = set()
        for recip in wa_recipients:
            idempotency_key = f"alert:{alert.id}:user:{recip.user_id}:chan:WA:v1"
            
            # Idempotency check
            existing_job = db.query(NotificationJob).filter(NotificationJob.idempotency_key == idempotency_key).first()
            if existing_job:
                wa_results_summary["skipped"] += 1
                if existing_job.status in [DeliveryStatus.SENT.value, DeliveryStatus.DELIVERED.value]:
                    wa_success_users.add(recip.user_id)
                continue

            wa_text = WhatsAppRenderer.render(canonical_msg, recipient_name=recip.full_name)
            
            job_id = f"job_wa_{uuid.uuid4().hex[:10]}"
            job = NotificationJob(
                id=job_id,
                alert_id=alert.id,
                recipient_id=recip.user_id,
                recipient_phone=recip.phone_number,
                recipient_name=recip.full_name,
                channel=ChannelType.WHATSAPP.value,
                status=DeliveryStatus.PROCESSING.value,
                attempt_count=1,
                priority=priority,
                scheduled_at=now_utc,
                started_at=now_utc,
                idempotency_key=idempotency_key,
                rendered_message=wa_text,
                content_hash=content_hash
            )
            db.add(job)
            db.flush()

            # Execute provider dispatch
            res: ProviderResult = await wa_provider.send_message(
                recipient_phone=recip.phone_number,
                message_text=wa_text,
                priority=priority
            )

            job.status = res.status
            job.provider_message_id = res.message_id
            job.completed_at = datetime.now(timezone.utc)
            if not res.success:
                job.last_error = f"{res.error_code}: {res.error_message}"

            # Create delivery record
            delivery = NotificationDelivery(
                id=f"del_wa_{uuid.uuid4().hex[:10]}",
                job_id=job.id,
                alert_id=alert.id,
                recipient_id=recip.user_id,
                channel=ChannelType.WHATSAPP.value,
                status=res.status,
                provider=res.provider,
                provider_message_id=res.message_id,
                provider_error_code=res.error_code,
                provider_error_message=res.error_message,
                raw_provider_response=res.raw_response,
                rendered_message=wa_text,
                content_hash=content_hash,
                sent_at=now_utc,
                delivered_at=now_utc if res.status in ["DELIVERED", "SENT"] else None,
                failed_at=now_utc if not res.success else None
            )
            db.add(delivery)

            if res.success:
                wa_results_summary["sent"] += 1
                wa_results_summary["delivered"] += 1
                wa_success_users.add(recip.user_id)
            else:
                wa_results_summary["failed"] += 1

        db.commit()

        # 6. Process SMS Dispatches
        for recip in sms_recipients:
            # If in FAILOVER mode, only send SMS if WhatsApp was not successful
            if delivery_mode == "FAILOVER" and recip.user_id in wa_success_users:
                sms_results_summary["skipped"] += 1
                continue

            idempotency_key = f"alert:{alert.id}:user:{recip.user_id}:chan:SMS:v1"
            
            existing_job = db.query(NotificationJob).filter(NotificationJob.idempotency_key == idempotency_key).first()
            if existing_job:
                sms_results_summary["skipped"] += 1
                continue

            job_id = f"job_sms_{uuid.uuid4().hex[:10]}"
            job = NotificationJob(
                id=job_id,
                alert_id=alert.id,
                recipient_id=recip.user_id,
                recipient_phone=recip.phone_number,
                recipient_name=recip.full_name,
                channel=ChannelType.SMS.value,
                status=DeliveryStatus.PROCESSING.value,
                attempt_count=1,
                priority=priority,
                scheduled_at=now_utc,
                started_at=now_utc,
                idempotency_key=idempotency_key,
                rendered_message=sms_text,
                content_hash=content_hash
            )
            db.add(job)
            db.flush()

            res: ProviderResult = await sms_provider.send_message(
                recipient_phone=recip.phone_number,
                message_text=sms_text,
                priority=priority
            )

            job.status = res.status
            job.provider_message_id = res.message_id
            job.completed_at = datetime.now(timezone.utc)
            if not res.success:
                job.last_error = f"{res.error_code}: {res.error_message}"

            delivery = NotificationDelivery(
                id=f"del_sms_{uuid.uuid4().hex[:10]}",
                job_id=job.id,
                alert_id=alert.id,
                recipient_id=recip.user_id,
                channel=ChannelType.SMS.value,
                status=res.status,
                provider=res.provider,
                provider_message_id=res.message_id,
                provider_error_code=res.error_code,
                provider_error_message=res.error_message,
                raw_provider_response=res.raw_response,
                rendered_message=sms_text,
                content_hash=content_hash,
                sent_at=now_utc,
                delivered_at=now_utc if res.status in ["DELIVERED", "SENT"] else None,
                failed_at=now_utc if not res.success else None
            )
            db.add(delivery)

            if res.success:
                sms_results_summary["sent"] += 1
                sms_results_summary["delivered"] += 1
            else:
                sms_results_summary["failed"] += 1

        db.commit()

        # Audit completion
        audit_end = NotificationAuditLog(
            id=f"audit_{uuid.uuid4().hex[:10]}",
            actor_id=actor_id,
            action="MESSAGE_SENT",
            alert_id=alert.id,
            timestamp=datetime.now(timezone.utc),
            extra_metadata={
                "whatsapp": wa_results_summary,
                "sms": sms_results_summary
            }
        )
        db.add(audit_end)
        db.commit()

        return {
            "success": True,
            "alert_id": alert.id,
            "headline": canonical_msg.headline,
            "severity": canonical_msg.severity,
            "total_recipients_targeted": total_targeted,
            "whatsapp": wa_results_summary,
            "sms": sms_results_summary,
            "dispatched_at": now_utc.isoformat(),
            "rendered_messages": {
                "whatsapp": WhatsAppRenderer.render(canonical_msg, "Citizen"),
                "sms": sms_text
            }
        }
