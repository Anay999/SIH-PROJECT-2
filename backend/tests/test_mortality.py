import pytest
from app.engines.mortality_engine import (
    calculate_hamri_and_surge,
    classify_hamri_category,
    classify_surge_level,
    MORTALITY_DISCLAIMER
)

def test_hamri_baseline_mild_weather():
    """At mild thermal conditions (HTSI <= 35), Relative Risk is ~1.00 and excess mortality is ~0."""
    res = calculate_hamri_and_surge(
        htsi_score=30.0,
        vulnerability_score=30.0,
        consecutive_days=1,
        nighttime_min_temp_c=24.0,
        ward_population=100000
    )
    assert res.relative_risk.central == 1.0
    assert res.relative_risk.lower >= 1.0
    assert res.relative_risk.upper >= res.relative_risk.central
    assert res.hamri_score == 0.0
    assert res.risk_category == "Low / Baseline"
    assert res.hospital_surge.readiness_alert_level in ["Normal", "Elevated"]
    assert res.disclaimer == MORTALITY_DISCLAIMER

def test_hamri_severe_heatwave_response():
    """Under severe heatwave, HAMRI and hospital surge scale appropriately with lagged exposure."""
    res_d1 = calculate_hamri_and_surge(
        htsi_score=85.0,
        vulnerability_score=75.0,
        consecutive_days=1,
        nighttime_min_temp_c=31.0,
        ward_population=100000
    )
    res_d4 = calculate_hamri_and_surge(
        htsi_score=85.0,
        vulnerability_score=75.0,
        consecutive_days=4,
        nighttime_min_temp_c=31.0,
        ward_population=100000
    )

    # Day 4 of consecutive heat must produce higher RR and HAMRI than Day 1
    assert res_d4.relative_risk.central > res_d1.relative_risk.central
    assert res_d4.hamri_score >= 80.0
    assert res_d4.risk_category in ["Very High Risk", "Extreme Health Risk"]
    assert res_d4.hospital_surge.readiness_alert_level in ["Severe", "Critical"]
    assert res_d4.hospital_surge.projected_emergency_cases_today > res_d1.hospital_surge.projected_emergency_cases_today
    assert res_d4.hospital_surge.projected_icu_bed_pressure_pct > 40.0
    assert len(res_d4.hospital_surge.clinical_action_directives) >= 3

def test_hamri_confidence_intervals():
    """Confidence interval bounds must strictly respect lower <= central <= upper."""
    res = calculate_hamri_and_surge(
        htsi_score=72.0,
        vulnerability_score=60.0,
        consecutive_days=2,
        nighttime_min_temp_c=29.5,
        ward_population=85000
    )
    assert res.relative_risk.lower <= res.relative_risk.central
    assert res.relative_risk.central <= res.relative_risk.upper
    assert res.excess_mortality.rate_per_100k_lower <= res.excess_mortality.rate_per_100k_upper
    assert "per 100k" in res.excess_mortality.formatted_range
