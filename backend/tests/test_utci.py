import pytest
from app.engines.utci_engine import calculate_utci, calculate_water_vapour_pressure

def test_water_vapour_pressure():
    """Tetens vapour pressure calculation."""
    # At T = 30C, saturation vapour pressure is approx 42.4 hPa. At 50% RH -> ~21.2 hPa
    ea = calculate_water_vapour_pressure(air_temp_c=30.0, relative_humidity=50.0)
    assert 20.0 <= ea <= 23.0

def test_utci_moderate_stress():
    """Moderate ambient conditions."""
    res = calculate_utci(air_temp_c=28.0, relative_humidity=45.0, wind_speed_10m_ms=2.0)
    assert res.stress_category in ["Thermal Comfort", "Moderate Heat Stress"]
    assert "COST Action 730" in res.method or "pythermalcomfort" in res.method

def test_utci_very_strong_heat_stress():
    """Extreme tropical sun conditions."""
    res = calculate_utci(
        air_temp_c=38.0,
        relative_humidity=65.0,
        wind_speed_10m_ms=1.5,
        solar_radiation_w_m2=800.0
    )
    assert res.utci_c >= 40.0
    assert res.stress_category in ["Very Strong Heat Stress", "Extreme Heat Stress"]

def test_utci_wind_bounds_clamping():
    """Wind speed clamped to model operational domain (0.5 to 17 m/s)."""
    res_low = calculate_utci(air_temp_c=30.0, relative_humidity=50.0, wind_speed_10m_ms=0.1)
    assert res_low.wind_speed_10m_ms == 0.5
    assert len(res_low.warnings) > 0
