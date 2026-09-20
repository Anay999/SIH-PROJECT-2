from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class ThermalMetric(Base):
    __tablename__ = "thermal_metrics"

    id = Column(String(60), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    mode = Column(String(30), default="observed") # observed | forecast | simulated

    # Inputs snapshot
    air_temp_c = Column(Float, nullable=False)
    relative_humidity = Column(Float, nullable=False)
    wind_speed_ms = Column(Float, default=2.5)
    solar_radiation_wm2 = Column(Float, default=650.0)

    # Scientific Thermal Outputs
    heat_index_c = Column(Float, nullable=False)
    heat_index_category = Column(String(50), nullable=False)
    
    wbgt_c = Column(Float, nullable=False)
    wbgt_mode = Column(String(50), default="estimated_outdoor") # direct | estimated_outdoor | estimated_indoor
    wbgt_category = Column(String(50), nullable=False)
    
    utci_c = Column(Float, nullable=False)
    utci_category = Column(String(50), nullable=False)

    # Composite Decision Support Metric
    htsi_score = Column(Float, nullable=False) # 0-100
    htsi_category = Column(String(50), nullable=False) # Low | Moderate | High | Very High | Extreme
    
    component_scores = Column(JSON, nullable=True) # {thermal: 78, persistence: 65, vulnerability: 80, urban: 72}
    weights = Column(JSON, nullable=True) # {thermal: 0.45, persistence: 0.20, vulnerability: 0.20, urban: 0.15}
    
    explanation = Column(String(500), nullable=True)
    uncertainty_note = Column(String(255), nullable=True)

    ward = relationship("Ward", back_populates="thermal_metrics")
