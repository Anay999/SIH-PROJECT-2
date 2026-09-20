from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class MortalityRiskEstimate(Base):
    __tablename__ = "mortality_risk_estimates"

    id = Column(String(60), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    model_mode = Column(String(50), default="demo_rule_based")
    hamri_score = Column(Float, nullable=False) # 0-100
    risk_category = Column(String(50), nullable=False)
    
    relative_risk_estimate = Column(Float, default=1.15)
    excess_mortality_range = Column(String(100), default="0 - 2 (Demo Illustrative Range)")
    uncertainty_lower = Column(Float, default=0.98)
    uncertainty_upper = Column(Float, default=1.42)
    model_confidence = Column(Float, default=0.82)
    
    disclaimer = Column(
        String(255),
        default="RESEARCH/DEMO ESTIMATE. NOT CLINICALLY VALIDATED. NOT AN OFFICIAL MORTALITY FORECAST."
    )

    ward = relationship("Ward", back_populates="mortality_estimates")

class HospitalizationRiskEstimate(Base):
    __tablename__ = "hospitalization_risk_estimates"

    id = Column(String(60), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    surge_index = Column(Float, nullable=False) # 0-100
    readiness_alert_level = Column(String(50), nullable=False) # Normal | Elevated | Severe | Critical
    estimated_heat_related_cases = Column(Integer, default=5)
    icu_bed_pressure_pct = Column(Float, default=18.5)

    ward = relationship("Ward", back_populates="hospitalization_estimates")
