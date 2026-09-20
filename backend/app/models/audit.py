from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, Boolean
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(60), primary_key=True)
    actor_id = Column(String(100), nullable=False, default="officer_demo")
    actor_role = Column(String(50), nullable=False, default="OFFICER")
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False) # ALERT | INTERVENTION | SIMULATION
    entity_id = Column(String(100), nullable=False)
    timestamp_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    request_id = Column(String(60), nullable=False)
    demo_mode = Column(Boolean, default=True, nullable=False)
