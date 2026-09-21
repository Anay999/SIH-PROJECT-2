from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class HeatwaveEvent(Base):
    __tablename__ = "heatwave_events"

    id = Column(String(60), primary_key=True)
    city_id = Column(String(50), ForeignKey("cities.id"), nullable=False)
    event_type = Column(String(50), nullable=False) # heatwave | severe_heatwave | humid_heat_crisis
    severity = Column(String(50), nullable=False) # Moderate | Severe | Extreme
    
    start_time = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    expected_end_time = Column(DateTime, nullable=True)
    peak_temperature_c = Column(Float, default=40.0)
    peak_wbgt_c = Column(Float, default=33.5)
    consecutive_days = Column(Integer, default=2)
    active = Column(Boolean, default=True)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(60), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    severity = Column(String(50), nullable=False) # Advisory | Watch | Warning | Extreme Warning
    trigger_metric = Column(String(50), nullable=False) # HTSI | WBGT | Consecutive_Nights | Surge
    
    # Lifecycle: ACTIVE | ACKNOWLEDGED | ESCALATED | RESOLVED | EXPIRED
    status = Column(String(50), nullable=False, default="ACTIVE")
    alert_fingerprint = Column(String(120), nullable=True, index=True)
    escalation_level = Column(Integer, default=1)
    parent_alert_id = Column(String(60), nullable=True)

    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    
    headline = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    recommended_actions = Column(JSON, nullable=True)
    target_audience = Column(String(100), default="General Public & Outdoor Workers")
    
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(100), nullable=True)

    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)

    ward = relationship("Ward", back_populates="alerts")

class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(String(60), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    department = Column(String(100), nullable=False) # Public Health | Labor & Outdoor Work | Municipal Cooling | Power & Water
    action_name = Column(String(150), nullable=False)
    priority = Column(String(50), nullable=False) # Routine | High | Urgent | Critical
    urgency = Column(String(50), default="Within 12h")
    
    # State Flow: RECOMMENDED -> DISPATCHED -> IN_PROGRESS -> COMPLETED (or BLOCKED, CANCELLED)
    status = Column(String(50), default="RECOMMENDED", nullable=False)
    
    assigned_to = Column(String(100), nullable=True)
    due_at_utc = Column(DateTime, nullable=True)
    deadline = Column(DateTime, nullable=True)
    reason = Column(String(300), nullable=True)
    completion_note = Column(String(500), nullable=True)
    blocker_reason = Column(String(500), nullable=True)
    
    updated_by = Column(String(100), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    ward = relationship("Ward", back_populates="interventions")


class AlertDeliveryRecord(Base):
    __tablename__ = "alert_deliveries"

    id = Column(String(60), primary_key=True)
    alert_id = Column(String(60), ForeignKey("alerts.id"), nullable=False)
    channel = Column(String(30), nullable=False) # SMS | WHATSAPP | IN_APP
    municipality = Column(String(50), nullable=False, default="Chennai")
    recipient_type = Column(String(50), default="CITIZEN") # ALL_CITIZENS | VULNERABLE_ZONE | TARGETED
    recipient_count = Column(Integer, default=1)
    status = Column(String(30), nullable=False, default="SENT") # PENDING | SENT | DELIVERED | FAILED | RETRIED
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_detail = Column(String(300), nullable=True)
    dispatched_by = Column(String(100), nullable=False)
    dispatched_at_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_retry_at_utc = Column(DateTime, nullable=True)
