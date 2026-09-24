import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class DeliveryStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    CANCELLED = "CANCELLED"
    SKIPPED = "SKIPPED"
    OPTED_OUT = "OPTED_OUT"

class ChannelType(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    SMS = "SMS"

class NotificationPriority(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"

class SeverityThreshold(str, enum.Enum):
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"
    EXTREME = "EXTREME"

class ProviderHealthStatus(str, enum.Enum):
    CONNECTED = "CONNECTED"
    DEGRADED = "DEGRADED"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    ERROR = "ERROR"
    SIMULATED = "SIMULATED"


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(String(60), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    phone_number = Column(String(30), nullable=False, index=True)
    phone_verified = Column(Boolean, default=True, nullable=False)
    phone_verified_at = Column(DateTime, nullable=True)
    
    whatsapp_opt_in = Column(Boolean, default=True, nullable=False)
    sms_opt_in = Column(Boolean, default=True, nullable=False)
    notification_enabled = Column(Boolean, default=True, nullable=False, index=True)
    notification_language = Column(String(10), default="en", nullable=False)
    preferred_channels = Column(JSON, default=lambda: ["WHATSAPP", "SMS"], nullable=False)
    severity_threshold = Column(String(30), default="HIGH", nullable=False) # MODERATE, HIGH, VERY_HIGH, EXTREME
    ward_scope = Column(String(50), nullable=True) # Specific ward id or None for all in city
    role_scope = Column(String(50), nullable=True)
    
    consent_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    consent_source = Column(String(50), default="USER_SETTINGS", nullable=False) # USER_SETTINGS | REGISTRATION | MUNICIPAL_ENROLLMENT
    opted_out_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", backref="notification_preference")


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(String(60), primary_key=True)
    template_key = Column(String(60), nullable=False, index=True) # e.g. EXTREME_HEAT_ALERT
    channel = Column(String(30), nullable=False, index=True) # WHATSAPP | SMS
    provider = Column(String(50), nullable=False, default="GENERIC") # META | MSG91 | GENERIC
    template_name = Column(String(100), nullable=False) # External/DLT Template ID or name
    language = Column(String(10), default="en", nullable=False)
    version = Column(Integer, default=1, nullable=False)
    status = Column(String(30), default="APPROVED", nullable=False) # DRAFT | PENDING_APPROVAL | APPROVED | RETIRED
    
    body_pattern = Column(Text, nullable=False)
    variables_schema = Column(JSON, nullable=True) # List of variable keys
    approved_at = Column(DateTime, nullable=True)
    retired_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_tmpl_key_chan_ver", "template_key", "channel", "version"),
    )


class NotificationJob(Base):
    __tablename__ = "notification_jobs"

    id = Column(String(60), primary_key=True)
    alert_id = Column(String(60), ForeignKey("alerts.id"), nullable=False, index=True)
    recipient_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    recipient_phone = Column(String(30), nullable=False)
    recipient_name = Column(String(100), nullable=True)
    channel = Column(String(30), nullable=False, index=True) # WHATSAPP | SMS
    
    status = Column(String(30), default=DeliveryStatus.QUEUED.value, nullable=False, index=True)
    attempt_count = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=4, nullable=False)
    priority = Column(String(20), default=NotificationPriority.HIGH.value, nullable=False)
    
    scheduled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    last_error = Column(String(500), nullable=True)
    
    provider_message_id = Column(String(100), nullable=True, index=True)
    idempotency_key = Column(String(160), unique=True, nullable=False, index=True)
    rendered_message = Column(Text, nullable=True)
    template_version = Column(Integer, default=1, nullable=False)
    content_hash = Column(String(64), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id = Column(String(60), primary_key=True)
    job_id = Column(String(60), ForeignKey("notification_jobs.id"), nullable=True, index=True)
    alert_id = Column(String(60), ForeignKey("alerts.id"), nullable=False, index=True)
    recipient_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    channel = Column(String(30), nullable=False, index=True) # WHATSAPP | SMS
    
    status = Column(String(30), default=DeliveryStatus.QUEUED.value, nullable=False, index=True)
    provider = Column(String(50), nullable=False, default="META") # META | MSG91 | MOCK
    provider_message_id = Column(String(100), nullable=True, index=True)
    provider_status = Column(String(50), nullable=True)
    provider_error_code = Column(String(50), nullable=True)
    provider_error_message = Column(String(500), nullable=True)
    raw_provider_response = Column(Text, nullable=True)
    
    content_hash = Column(String(64), nullable=True)
    rendered_message = Column(Text, nullable=True)
    attempt_count = Column(Integer, default=1, nullable=False)

    queued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class NotificationAuditLog(Base):
    __tablename__ = "notification_audit_logs"

    id = Column(String(60), primary_key=True)
    actor_id = Column(String(100), nullable=True)
    action = Column(String(60), nullable=False) # ALERT_DISPATCH_REQUESTED | MESSAGE_QUEUED | MESSAGE_SENT | etc.
    alert_id = Column(String(60), nullable=True, index=True)
    recipient_id = Column(String(50), nullable=True)
    channel = Column(String(30), nullable=True)
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    provider = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    extra_metadata = Column(JSON, nullable=True)


class NotificationProviderConfig(Base):
    __tablename__ = "notification_provider_configs"

    id = Column(String(60), primary_key=True)
    channel = Column(String(30), unique=True, nullable=False, index=True) # WHATSAPP | SMS
    provider_name = Column(String(50), nullable=False) # META_CLOUD_API | MSG91 | CALLMEBOT | FAST2SMS | MOCK
    is_enabled = Column(Boolean, default=True, nullable=False)
    status = Column(String(30), default=ProviderHealthStatus.CONNECTED.value, nullable=False)
    last_health_check = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    error_message = Column(String(300), nullable=True)
    config_metadata = Column(JSON, nullable=True)
