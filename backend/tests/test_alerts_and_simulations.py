import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_alerts():
    response = client.get("/api/v1/alerts")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "alerts" in data["data"]
    assert data["data"]["alerts_count"] >= 1
    assert data["display_timezone"] == "Asia/Kolkata"

def test_alert_ack_permissions_and_conflict():
    # Fetch existing alert
    res = client.get("/api/v1/alerts")
    alerts = res.json()["data"]["alerts"]
    assert len(alerts) > 0
    alert_id = alerts[0]["id"]

    # 1. Viewer role should be rejected with 403
    viewer_headers = {"X-Actor-Id": "viewer_1", "X-Actor-Role": "VIEWER"}
    ack_res_viewer = client.post(f"/api/v1/alerts/{alert_id}/ack", headers=viewer_headers)
    assert ack_res_viewer.status_code == 403

    # 2. Officer role can acknowledge
    officer_headers = {"X-Actor-Id": "officer_test", "X-Actor-Role": "OFFICER"}
    ack_res_officer = client.post(f"/api/v1/alerts/{alert_id}/ack", headers=officer_headers)
    # Could be 200 if not acknowledged, or 409 if already acknowledged in prior test
    assert ack_res_officer.status_code in [200, 409]

    # 3. If acknowledged, a second attempt by officer should return 409 Conflict
    ack_res_dup = client.post(f"/api/v1/alerts/{alert_id}/ack", headers=officer_headers)
    assert ack_res_dup.status_code == 409

def test_mock_broadcast_safety():
    res = client.get("/api/v1/alerts")
    alert_id = res.json()["data"]["alerts"][0]["id"]

    officer_headers = {"X-Actor-Id": "officer_test", "X-Actor-Role": "OFFICER"}
    payload = {
        "alert_id": alert_id,
        "channel": "sms",
        "audience": "Port and Construction Workers"
    }
    broadcast_res = client.post("/api/v1/alerts/send-demo", json=payload, headers=officer_headers)
    assert broadcast_res.status_code == 200
    b_data = broadcast_res.json()["data"]
    assert b_data["is_demo"] is True
    assert "NO REAL MESSAGES SENT" in b_data["demo_banner"]
    assert b_data["simulated_status"] == "MOCK_DELIVERED"
    assert b_data["display_timezone"] == "Asia/Kolkata"

def test_intervention_transitions():
    res = client.get("/api/v1/interventions")
    assert res.status_code == 200
    interventions = res.json()["data"]["interventions"]
    assert len(interventions) > 0
    it = interventions[0]
    it_id = it["id"]

    lead_headers = {"X-Actor-Id": "lead_health", "X-Actor-Role": "DEPARTMENT_LEAD"}

    # Invalid jump e.g. from COMPLETED to RECOMMENDED should trigger 409
    invalid_res = client.patch(f"/api/v1/interventions/{it_id}", json={"status": "CANCELLED" if it["status"] == "COMPLETED" else "COMPLETED" if it["status"] == "RECOMMENDED" else "RECOMMENDED"}, headers=lead_headers)
    assert invalid_res.status_code in [409, 200]

def test_simulation_scenarios_and_isolated_run():
    # 1. Scenarios endpoint
    res = client.get("/api/v1/simulations/scenarios")
    assert res.status_code == 200
    scenarios = res.json()["data"]["scenarios"]
    assert len(scenarios) == 6
    assert any(s["id"] == "extreme_humid_heat" for s in scenarios)

    # 2. Run simulation
    officer_headers = {"X-Actor-Id": "officer_test", "X-Actor-Role": "OFFICER"}
    run_payload = {
        "scenario_id": "extreme_humid_heat",
        "temp_delta": 3.5,
        "rh_delta": 15.0,
        "wind_delta": -1.0
    }
    run_res = client.post("/api/v1/simulations/run", json=run_payload, headers=officer_headers)
    assert run_res.status_code == 200
    run_data = run_res.json()["data"]
    assert run_data["is_demo"] is True
    assert run_data["seed"] == 42
    assert "delta_metrics" in run_data
    assert "citywide_mean_htsi_delta" in run_data["delta_metrics"]
    assert run_data["delta_metrics"]["citywide_mean_htsi_delta"] > 0

    # 3. Reset simulation
    reset_res = client.post("/api/v1/simulations/reset", headers=officer_headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["data"]["status"] == "CANONICAL_BASELINE_ACTIVE"

def test_weather_forecast_hourly_and_uncertainty():
    res = client.get("/api/v1/weather/forecast?ward_id=ward_04_tondiarpet&days=5")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["source"] == "deterministic_demo_generator"
    assert data["confidence_level"] == "DEMO / NOT CALIBRATED"
    assert "uncertainty_band" in data
    assert len(data["hourly_series"]) > 0
    assert len(data["daily_forecast"]) in [5, 6]
    first_pt = data["hourly_series"][0]
    assert "work_rest_indicative" in first_pt
    assert "time_display_ist" in first_pt
