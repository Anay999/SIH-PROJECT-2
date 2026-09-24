import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.notifications import NotificationJob, NotificationDelivery, DeliveryStatus
from app.services.notification.providers.factory import ProviderFactory
from app.services.notification.providers.base import ProviderResult

logger = logging.getLogger("thermosafe.notifications.worker")

class NotificationWorker:
    _is_running = False

    @classmethod
    async def process_retries_once(cls):
        """Processes any RETRYING or pending jobs whose scheduled time has arrived."""
        db: Session = SessionLocal()
        try:
            now_utc = datetime.now(timezone.utc)
            pending_jobs = db.query(NotificationJob).filter(
                NotificationJob.status == DeliveryStatus.RETRYING.value,
                NotificationJob.scheduled_at <= now_utc,
                NotificationJob.attempt_count < NotificationJob.max_attempts
            ).limit(20).all()

            if not pending_jobs:
                return

            wa_provider = ProviderFactory.get_whatsapp_provider()
            sms_provider = ProviderFactory.get_sms_provider()

            for job in pending_jobs:
                job.attempt_count += 1
                job.status = DeliveryStatus.PROCESSING.value
                db.flush()

                provider = wa_provider if job.channel == "WHATSAPP" else sms_provider
                res: ProviderResult = await provider.send_message(
                    recipient_phone=job.recipient_phone,
                    message_text=job.rendered_message or "",
                    priority=job.priority
                )

                job.status = res.status
                job.provider_message_id = res.message_id
                job.completed_at = datetime.now(timezone.utc)
                if not res.success:
                    job.last_error = f"{res.error_code}: {res.error_message}"
                    if res.is_retryable and job.attempt_count < job.max_attempts:
                        job.status = DeliveryStatus.RETRYING.value

                # Update delivery record
                delivery = db.query(NotificationDelivery).filter(NotificationDelivery.job_id == job.id).first()
                if delivery:
                    delivery.status = job.status
                    delivery.attempt_count = job.attempt_count
                    delivery.provider_message_id = res.message_id
                    delivery.updated_at = datetime.now(timezone.utc)
                    if res.success:
                        delivery.delivered_at = datetime.now(timezone.utc)

            db.commit()
        except Exception as exc:
            db.rollback()
            logger.error(f"Error in NotificationWorker retry cycle: {exc}")
        finally:
            db.close()
