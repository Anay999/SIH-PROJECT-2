from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class City(Base):
    __tablename__ = "cities"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    country = Column(String(100), default="India")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timezone = Column(String(50), default="Asia/Kolkata")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    zones = relationship("Zone", back_populates="city", cascade="all, delete-orphan")
    wards = relationship("Ward", back_populates="city", cascade="all, delete-orphan")

class Zone(Base):
    __tablename__ = "zones"

    id = Column(String(50), primary_key=True)
    city_id = Column(String(50), ForeignKey("cities.id"), nullable=False)
    zone_number = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)

    city = relationship("City", back_populates="zones")
    wards = relationship("Ward", back_populates="zone")

class Ward(Base):
    __tablename__ = "wards"

    id = Column(String(50), primary_key=True)
    city_id = Column(String(50), ForeignKey("cities.id"), nullable=False)
    zone_id = Column(String(50), ForeignKey("zones.id"), nullable=False)
    ward_number = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    
    # Representative centroid
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # GeoJSON Polygon/MultiPolygon
    geometry_geojson = Column(JSON, nullable=False)
    area_sq_km = Column(Float, default=5.0)

    # Demographics & Socio-Environmental Proxies
    total_population = Column(Integer, nullable=False)
    elderly_population = Column(Integer, nullable=False) # > 65 yrs
    children_population = Column(Integer, nullable=False) # < 5 yrs
    outdoor_worker_population = Column(Integer, nullable=False)
    poverty_rate_proxy = Column(Float, default=0.25) # 0.0 - 1.0
    vegetation_ndvi_proxy = Column(Float, default=0.20) # -0.2 to 0.8
    builtup_surface_fraction = Column(Float, default=0.75) # 0.0 - 1.0
    
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    city = relationship("City", back_populates="wards")
    zone = relationship("Zone", back_populates="wards")
    
    weather_observations = relationship("WeatherObservation", back_populates="ward", cascade="all, delete-orphan")
    weather_forecasts = relationship("WeatherForecast", back_populates="ward", cascade="all, delete-orphan")
    thermal_metrics = relationship("ThermalMetric", back_populates="ward", cascade="all, delete-orphan")
    vulnerability_profile = relationship("VulnerabilityProfile", back_populates="ward", uselist=False, cascade="all, delete-orphan")
    mortality_estimates = relationship("MortalityRiskEstimate", back_populates="ward", cascade="all, delete-orphan")
    hospitalization_estimates = relationship("HospitalizationRiskEstimate", back_populates="ward", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="ward", cascade="all, delete-orphan")
    interventions = relationship("Intervention", back_populates="ward", cascade="all, delete-orphan")
    cooling_centers = relationship("CoolingCenter", back_populates="ward", cascade="all, delete-orphan")
    hospitals = relationship("Hospital", back_populates="ward", cascade="all, delete-orphan")
