import pytest
from app.engines.htsi_engine import calculate_htsi

def test_htsi_normalization_and_bounds():
    """HTSI score must strictly remain between 0 and 100."""
    res_mild = calculate_htsi(
        heat_index_c=25.0,
        wbgt_c=22.0,
        utci_c=20.0,
        consecutive_hot_days=1,
        min_night_temp_c=24.0,
        vulnerability_score=20.0
    )
    assert 0.0 <= res_mild.htsi_score <= 100.0
    assert res_mild.category in ["Low", "Moderate"]

    res_extreme = calculate_htsi(
        heat_index_c=56.0,
        wbgt_c=36.0,
        utci_c=50.0,
        consecutive_hot_days=5,
        min_night_temp_c=32.0,
        vulnerability_score=90.0,
        builtup_fraction=0.95,
        vegetation_ndvi=0.05
    )
    assert res_extreme.htsi_score >= 80.0
    assert res_extreme.category == "Extreme"

def test_htsi_custom_weights():
    """Weight customizability and mathematical normalization."""
    custom = {
        "thermal_burden": 0.60,
        "persistence_burden": 0.20,
        "vulnerability_context": 0.10,
        "urban_exposure": 0.10
    }
    res = calculate_htsi(
        heat_index_c=45.0,
        wbgt_c=32.0,
        utci_c=42.0,
        custom_weights=custom
    )
    assert res.weights_applied["thermal_burden"] == 0.60
    assert len(res.explanation) > 0
    assert res.primary_risk_driver != ""
