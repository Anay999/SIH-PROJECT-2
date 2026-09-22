"""
Automated unit and API tests for Pan-India Thermal Grid and
Municipal Officer 3D Topographical Thermal Command Center services.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.india_grid_service import (
    get_india_regional_climate,
    generate_india_grid_geojson,
    generate_3d_thermal_terrain_data,
    INDIA_BBOX
)

client = TestClient(app)


def test_india_regional_climate_diversity():
    # Thar Desert (Rajasthan)
    thar = get_india_regional_climate(26.5, 71.5, "afternoon")
    assert thar["air_temperature_c"] >= 42.0
    assert thar["land_surface_temp_c"] > thar["air_temperature_c"]
    assert thar["risk_category"] in ["VERY HIGH", "EXTREME"]

    # Himalayas (Ladakh / Kashmir)
    himalaya = get_india_regional_climate(34.0, 75.0, "afternoon")
    assert himalaya["air_temperature_c"] <= 26.0
    assert himalaya["risk_category"] == "LOW"

    # Peninsular Coastal (Chennai / Mumbai)
    coastal = get_india_regional_climate(13.1, 80.2, "afternoon")
    assert coastal["relative_humidity"] >= 70.0
    assert 33.0 <= coastal["air_temperature_c"] <= 39.0

    # Diurnal shift: Afternoon vs Night
    thar_night = get_india_regional_climate(26.5, 71.5, "night")
    assert thar_night["air_temperature_c"] < thar["air_temperature_c"]
    assert thar_night["land_surface_temp_c"] < thar["land_surface_temp_c"]


def test_generate_india_grid_geojson():
    # Nationwide scale (zoom 5.0)
    fc = generate_india_grid_geojson(
        min_lat=INDIA_BBOX["min_lat"],
        min_lon=INDIA_BBOX["min_lon"],
        max_lat=INDIA_BBOX["max_lat"],
        max_lon=INDIA_BBOX["max_lon"],
        zoom=5.0,
        time_of_day="afternoon"
    )

    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) > 50
    assert "metadata" in fc
    assert fc["metadata"]["country"] == "India"
    assert "Mock" in fc["metadata"]["data_status"]

    first_cell = fc["features"][0]
    assert first_cell["geometry"]["type"] == "Polygon"
    assert len(first_cell["geometry"]["coordinates"][0]) == 5 # 4 corners + closed endpoint
    props = first_cell["properties"]
    assert "air_temperature_c" in props
    assert "land_surface_temp_c" in props
    assert "state_name" in props
    assert "wbgt_c" in props


def test_generate_3d_thermal_terrain_data():
    data = generate_3d_thermal_terrain_data(
        latitude=13.0827,
        longitude=80.2707,
        radius_km=8.0,
        time_of_day="afternoon"
    )

    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 4 # Plume contour bands
    assert len(data["targets"]) >= 2 # Sensor telemetry nodes
    assert "terrain_mode" in data["metadata"]
    assert data["metadata"]["command_center"] == "AARTOS-Style Municipal 3D Operations"

    core_band = data["features"][0]
    assert core_band["properties"]["risk_level"] == "CRITICAL"
    assert core_band["properties"]["air_temperature_c"] > data["metadata"]["base_air_temp"]


def test_api_india_grid_endpoint():
    res = client.get("/api/v1/thermomap/india-grid?zoom=5.0&time_of_day=afternoon")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 20
    assert data["metadata"]["country"] == "India"


def test_api_3d_command_endpoint_rbac():
    # 1. Municipal Officer should succeed
    res_officer = client.get(
        "/api/v1/thermomap/3d-command?latitude=13.0827&longitude=80.2707&radius_km=8.0&time_of_day=afternoon",
        headers={"X-Actor-Role": "MUNICIPAL_OFFICER", "X-Actor-Id": "officer_101"}
    )
    assert res_officer.status_code == 200
    data = res_officer.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 4
    assert len(data["targets"]) >= 2

    # 2. Administrator should succeed
    res_admin = client.get(
        "/api/v1/thermomap/3d-command?latitude=13.0827&longitude=80.2707&radius_km=8.0&time_of_day=afternoon",
        headers={"X-Actor-Role": "ADMIN", "X-Actor-Id": "admin_01"}
    )
    assert res_admin.status_code == 200

    # 3. Public Citizen must be rejected with HTTP 403 FORBIDDEN
    res_citizen = client.get(
        "/api/v1/thermomap/3d-command?latitude=13.0827&longitude=80.2707&radius_km=8.0&time_of_day=afternoon",
        headers={"X-Actor-Role": "CITIZEN", "X-Actor-Id": "citizen_42"}
    )
    assert res_citizen.status_code == 403
    assert "unauthorized" in res_citizen.json()["detail"].lower() or "forbidden" in res_citizen.json().get("code", "").lower()

