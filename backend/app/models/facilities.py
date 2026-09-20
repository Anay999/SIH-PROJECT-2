from sqlalchemy import Column, String, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class CoolingCenter(Base):
    __tablename__ = "cooling_centers"

    id = Column(String(60), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    name = Column(String(120), nullable=False)
    address = Column(String(200), nullable=True)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    total_capacity = Column(Integer, nullable=False, default=150)
    current_occupancy = Column(Integer, default=45)
    operating_hours = Column(String(80), default="09:00 - 18:30 IST")
    
    water_available = Column(Boolean, default=True)
    power_backup = Column(Boolean, default=True)
    status = Column(String(50), default="Open") # Open | Standby | Full | Closed
    contact = Column(String(50), default="+91 44 2538 4520")

    ward = relationship("Ward", back_populates="cooling_centers")

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String(60), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    name = Column(String(120), nullable=False)
    hospital_type = Column(String(80), default="Government Hospital") # Govt General | UPHC | Private
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    total_beds = Column(Integer, nullable=False, default=250)
    icu_beds = Column(Integer, nullable=False, default=30)
    current_admissions = Column(Integer, default=190)
    heat_stroke_cases_today = Column(Integer, default=8)
    
    readiness_status = Column(String(50), default="Elevated") # Normal | Elevated | Critical
    contact = Column(String(50), default="+91 44 2530 5000")

    ward = relationship("Ward", back_populates="hospitals")
