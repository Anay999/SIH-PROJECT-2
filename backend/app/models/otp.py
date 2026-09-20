import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Index
from app.core.database import Base

class OtpStatus(str, enum.Enum):
    CREATED = "CREATED"
    SENT = "SENT"
    VERIFIED = "VERIFIED"
    CONSUMED = "CONSUMED"
    EXPIRED = "EXPIRED"
    LOCKED = "LOCKED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class OtpChallenge(Base):
    __tablename__ = "otp_challenges"

    id = Column(String(50), primary_key=True)
    challenge_id = Column(String(64), unique=True, nullable=False, index=True)
    phone_number_hash = Column(String(64), nullable=False, index=True)
    phone_number_masked = Column(String(30), nullable=False)
    otp_hash = Column(String(128), nullable=False)
    created_at_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    expires_at_utc = Column(DateTime, nullable=False, index=True)
    verified_at_utc = Column(DateTime, nullable=True)
    consumed_at_utc = Column(DateTime, nullable=True)
    failed_attempts = Column(Integer, default=0, nullable=False)
    resend_count = Column(Integer, default=0, nullable=False)
    status = Column(String(30), default=OtpStatus.SENT.value, nullable=False, index=True)
    purpose = Column(String(50), default="LOGIN_2FA", nullable=False, index=True)
    user_id = Column(String(50), nullable=True, index=True)
    provider = Column(String(50), default="mock", nullable=False)
    provider_message_id = Column(String(100), nullable=True)
    request_ip_hash = Column(String(64), nullable=False)
    user_agent_hash = Column(String(64), nullable=False)
    demo_mode = Column(Boolean, default=True, nullable=False)
    created_by = Column(String(50), nullable=True)
    last_attempt_at_utc = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_otp_phone_status", "phone_number_hash", "status"),
        Index("idx_otp_expiry", "expires_at_utc"),
    )

class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id = Column(String(50), primary_key=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    session_token_hash = Column(String(128), unique=True, nullable=False, index=True)
    actor_id = Column(String(64), nullable=False, index=True)
    role = Column(String(30), default="VIEWER", nullable=False)
    phone_masked = Column(String(30), nullable=False)
    created_at_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    expires_at_utc = Column(DateTime, nullable=False, index=True)
    revoked_at_utc = Column(DateTime, nullable=True)
    last_seen_at_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)
    request_ip_hash = Column(String(64), nullable=False)
    user_agent_hash = Column(String(64), nullable=False)
    demo_mode = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("idx_session_active", "session_id", "revoked_at_utc", "expires_at_utc"),
    )
