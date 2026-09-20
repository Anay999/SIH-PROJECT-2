from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(String(60), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    
    air_temp_c = Column(Float, nullable=False)
    relative_humidity = Column(Float, nullable=False)
    wind_speed_ms = Column(Float, default=2.5)
    solar_radiation_wm2 = Column(Float, default=650.0)
    surface_pressure_hpa = Column(Float, default=1010.0)
    dew_point_c = Column(Float, nullable=True)
    
    source = Column(String(100), default="synthetic_scenario_seed")
    quality_flag = Column(String(50), default="valid")

    ward = relationship("Ward", back_populates="weather_observations")

class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(String(60), primary_key=True)
    ward_id = Column(String(50), ForeignKey("wards.id"), nullable=False)
    forecast_for_time = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    horizon_hours = Column(Integer, nullable=False) # e.g. 1, 24, 48, 72, 96, 120
    air_temp_c = Column(Float, nullable=False)
    relative_humidity = Column(Float, nullable=False)
    wind_speed_ms = Column(Float, default=2.5)
    solar_radiation_wm2 = Column(Float, default=600.0)
    min_temp_c = Column(Float, nullable=True)
    max_temp_c = Column(Float, nullable=True)
    
    confidence_score = Column(Float, default=0.88)
    source = Column(String(100), default="synthetic_scenario_engine")

    ward = relationship("Ward", back_populates="weather_forecasts")
