from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, JSON
from app.core.database import Base

class SimulationRecord(Base):
    __tablename__ = "simulation_records"

    id = Column(String(60), primary_key=True)
    scenario_id = Column(String(50), nullable=False)
    scenario_name = Column(String(100), nullable=False)
    seed = Column(Integer, default=42, nullable=False)
    engine_version = Column(String(50), default="heatshield-engine-2.0", nullable=False)
    reproducible = Column(Boolean, default=True, nullable=False)
    is_demo = Column(Boolean, default=True, nullable=False)
    
    input_parameters = Column(JSON, nullable=False) # temp_delta, rh_delta, wind_delta
    baseline_snapshot = Column(JSON, nullable=False)
    simulated_snapshot = Column(JSON, nullable=False)
    delta_metrics = Column(JSON, nullable=False)
    triggered_alerts = Column(JSON, nullable=True)
    
    created_at_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_by = Column(String(100), default="officer_demo")
    active = Column(Boolean, default=True)
