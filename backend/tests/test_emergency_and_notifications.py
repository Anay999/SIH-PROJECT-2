import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_emergency_routing_fallback_and_structure():
    """Verify emergency routing returns polyline coordinates, steps, distance, and duration."""
    resp = client.get("/api/routes?start_lat=13.0827&start_lon=80.2707&end_lat=13.0400&end_lon=80.2500")
    assert resp.status_code == 200
    data = resp.json()
    assert "coordinates" in data
    assert len(data["coordinates"]) >= 2
    assert "distance_km" in data
    assert data["distance_km"] > 0
    assert "duration_minutes" in data
    assert data["duration_minutes"] > 0
    assert "steps" in data
    assert len(data["steps"]) >= 1

def test_nearest_facilities_ranking_and_suitability():
    """Verify smart facility suitability ranking factoring distance and capability."""
    resp = client.get("/api/facilities/nearest?lat=13.0450&lon=80.2450&limit=4")
    assert resp.status_code == 200
    data = resp.json()
    assert "facilities" in data
    facilities = data["facilities"]
    assert len(facilities) > 0
    # Verify suitability scoring and rationale
    top_facility = facilities[0]
    assert "suitability_score" in top_facility
    assert "suitability_rationale" in top_facility
    assert "travel_time_minutes" in top_facility
    assert "distance_km" in top_facility
    assert top_facility["distance_km"] > 0

def test_notification_status_endpoint():
    """Verify notification status lists providers and recent dispatches."""
    resp = client.get("/api/notifications/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert "callmebot" in data["providers"]
    assert "fast2sms" in data["providers"]

def test_whatsapp_test_dispatch():
    """Verify WhatsApp test endpoint dispatches simulation message safely."""
    payload = {
        "phone": "+919876543210",
        "ward": "Ward 114 (Teynampet)",
        "risk": "VERY HIGH",
        "htsi": 82.4,
        "facility": "Government Multi Super Speciality Hospital",
        "distance": "1.2 km"
    }
    resp = client.post("/api/notifications/whatsapp/test", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "THERMOSAFE AI TEST ALERT" in data["message_sent"]

def test_sms_test_dispatch():
    """Verify SMS test endpoint dispatches simulation message safely."""
    payload = {
        "numbers": "9876543210",
        "ward": "Ward 114 (Teynampet)",
        "value": 82.4,
        "route": "q"
    }
    resp = client.post("/api/notifications/sms/test", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "THERMOSAFE AI ALERT" in data["message_sent"]

def test_system_api_monitor():
    """Verify system API monitor checks all 8 services."""
    resp = client.get("/api/system/api-monitor")
    assert resp.status_code == 200
    data = resp.json()
    assert "services" in data
    assert len(data["services"]) == 8
    service_ids = [s["id"] for s in data["services"]]
    assert "database" in service_ids
    assert "weather_api" in service_ids
    assert "gis_basemap" in service_ids
    assert "osrm_routing" in service_ids
    assert "callmebot" in service_ids
    assert "fast2sms" in service_ids
    assert "ml_engine" in service_ids
