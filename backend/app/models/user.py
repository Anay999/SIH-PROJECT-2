import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Index
from app.core.database import Base

class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    MUNICIPAL_OFFICER = "MUNICIPAL_OFFICER"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(30), nullable=False, index=True)
    email = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), default=UserRole.CITIZEN.value, nullable=False, index=True)
    city = Column(String(50), default="Chennai", nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    phone_verified = Column(Boolean, default=True, nullable=False)
    created_at_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    last_login_at_utc = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_user_active_role", "is_active", "role"),
    )
