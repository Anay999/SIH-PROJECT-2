import pytest
from app.engines.wbgt_engine import calculate_wbgt, estimate_stull_wet_bulb

def test_stull_wet_bulb_estimation():
    """Golden vectors for Stull psychrometric natural wet-bulb equation."""
    # Stull (2011) reference test point: T = 30C, RH = 50% -> Tw ≈ 22.1C
    tw = estimate_stull_wet_bulb(air_temp_c=30.0, relative_humidity=50.0)
    assert 21.5 <= tw <= 22.8

    # High humidity: T = 35C, RH = 80% -> Tw ≈ 31.8C
    tw_high = estimate_stull_wet_bulb(air_temp_c=35.0, relative_humidity=80.0)
    assert 31.0 <= tw_high <= 33.0

def test_wbgt_direct_measurement_mode():
    """Direct measurement mode with known Tw and Tg."""
    # Outdoor: 0.7 * 28.0 + 0.2 * 36.0 + 0.1 * 34.0 = 19.6 + 7.2 + 3.4 = 30.2C
    res = calculate_wbgt(
        air_temp_c=34.0,
        natural_wet_bulb_c=28.0,
        globe_temp_c=36.0,
        environment="outdoor"
    )
    assert res.mode == "direct_measurement_outdoor"
    assert res.wbgt_c == 30.2
    assert res.category == "High"
    assert "Direct physical" in res.uncertainty_note

def test_wbgt_estimated_outdoor_mode():
    """Estimated outdoor mode from ambient variables and solar flux."""
    res = calculate_wbgt(
        air_temp_c=38.0,
        relative_humidity=70.0,
        wind_speed_m_s=2.0,
        solar_radiation_w_m2=800.0,
        environment="outdoor"
    )
    assert res.mode == "estimated_outdoor"
    assert res.wbgt_c >= 32.0 # High humid outdoor conditions exceed 32C
    assert "Stull (2011)" in res.uncertainty_note
    assert res.category in ["Very High", "Extreme"]
    assert "rest" in res.work_rest_recommendation.lower() or "cease" in res.work_rest_recommendation.lower()

def test_wbgt_estimated_indoor_mode():
    """Estimated indoor/shade mode."""
    res = calculate_wbgt(
        air_temp_c=32.0,
        relative_humidity=50.0,
        environment="indoor"
    )
    assert res.mode == "estimated_indoor"
    assert "indoor/shaded" in res.uncertainty_note.lower()
