import pytest
from app.engines.heat_index_engine import calculate_heat_index

def test_heat_index_steadman_baseline():
    """Conditions below 26.7C should trigger Steadman simple equation baseline."""
    res = calculate_heat_index(air_temp_c=24.0, relative_humidity=50.0)
    assert res.valid_range is True
    assert "Steadman" in res.method
    assert res.category == "Normal"
    # Steadman simple formula gives apparent temp close to ambient
    assert 22.0 <= res.value_c <= 26.0

def test_heat_index_noaa_standard_danger():
    """T = 35C (95F), RH = 60% produces high Heat Index in Danger category."""
    res = calculate_heat_index(air_temp_c=35.0, relative_humidity=60.0)
    assert res.valid_range is True
    assert "Rothfusz" in res.method
    # Expected NOAA Heat Index for 95F / 60% RH is ~114F (~45.5C)
    assert 44.0 <= res.value_c <= 48.0
    assert res.category == "Danger"

def test_heat_index_extreme_danger():
    """T = 40C (104F), RH = 65% is extreme lethal conditions."""
    res = calculate_heat_index(air_temp_c=40.0, relative_humidity=65.0)
    assert res.value_c >= 54.0
    assert res.category == "Extreme Danger"

def test_heat_index_low_rh_adjustment():
    """T = 38C (100.4F), RH = 10% should apply low-RH negative adjustment."""
    res = calculate_heat_index(air_temp_c=38.0, relative_humidity=10.0)
    assert len(res.adjustments_applied) > 0
    assert "Low-RH correction" in res.adjustments_applied[0]

def test_heat_index_high_rh_adjustment():
    """T = 28C (82.4F), RH = 90% should apply high-RH positive adjustment."""
    res = calculate_heat_index(air_temp_c=28.0, relative_humidity=90.0)
    assert len(res.adjustments_applied) > 0
    assert "High-RH correction" in res.adjustments_applied[0]
