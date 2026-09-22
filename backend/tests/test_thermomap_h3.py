"""
Automated unit and API tests for H3 ThermoMap GIS service,
spatial indexing, Overpass facility normalization, and OSRM routing.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.h3_service import (
    latlng_to_h3_cell,
    get_surrounding_h3_cells,
    h3_cell_to_geojson_polygon,
    generate_thermomap_geojson
)
from app.services.overpass_service import fetch_osm_facilities

client = TestClient(app)


def test_h3_cell_indexing_and_grid():
    lat, lon = 13.0827, 80.2707 # Chennai
    cell = latlng_to_h3_cell(lat, lon, resolution=8)
    assert cell.startswith("88") # Valid res 8 H3 index
    assert len(cell) == 15

    surrounding = get_surrounding_h3_cells(cell, radius_km=5.0, resolution=8)
    assert len(surrounding) >= 19
    assert cell in surrounding


def test_h3_cell_to_geojson_polygon():
    lat, lon = 13.0827, 80.2707
    cell = latlng_to_h3_cell(lat, lon, resolution=8)
    poly = h3_cell_to_geojson_polygon(cell)

    assert poly["type"] == "Polygon"
    assert len(poly["coordinates"]) == 1
    ring = poly["coordinates"][0]
    assert len(ring) == 7 # 6 hexagon vertices + 1 closed ring endpoint
    # First point equals last point for closed ring
    assert ring[0] == ring[-1]
    # GeoJSON coordinates order must be [longitude, latitude]
    lon_sample, lat_sample = ring[0]
    assert 70.0 <= lon_sample <= 90.0
    assert 8.0 <= lat_sample <= 20.0


def test_generate_thermomap_geojson():
    fc = generate_thermomap_geojson(
        latitude=13.0827,
        longitude=80.2707,
        radius_km=4.0,
        resolution=8
    )

    assert fc["type"] == "FeatureCollection"
    assert len(fc["features"]) > 0
    assert "metadata" in fc
    assert fc["metadata"]["resolution"] == 8

    first_feat = fc["features"][0]
    props = first_feat["properties"]
    assert "h3_index" in props
    assert "risk_score" in props
    assert props["risk_category"] in ["LOW", "MODERATE", "HIGH", "VERY HIGH", "EXTREME"]
    assert "wbgt_c" in props
    assert "utci_c" in props
    assert "htsi_score" in props
    assert "safe_exposure_minutes" in props
    assert "work_rest_guidance" in props


def test_api_thermomap_risk_endpoint():
    res = client.get("/api/v1/thermomap/risk?latitude=13.0827&longitude=80.2707&radius_km=5.0&resolution=8")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 7
    assert data["metadata"]["cell_count"] == len(data["features"])
    assert data["metadata"]["data_quality"]["is_interpolated"] is True


def test_api_thermomap_facilities_endpoint():
    res = client.get("/api/v1/thermomap/facilities?latitude=13.0827&longitude=80.2707&radius_km=6.0")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 3

    first_fac = data["features"][0]
    assert first_fac["geometry"]["type"] == "Point"
    assert "name" in first_fac["properties"]
    assert "amenity" in first_fac["properties"]


def test_api_thermomap_routing_endpoint():
    # Route from Central Station (13.0827, 80.2707) to Rajiv Gandhi Govt Hospital (13.0805, 80.2775)
    res = client.get(
        "/api/v1/thermomap/routing"
        "?start_lat=13.0827&start_lon=80.2707"
        "&end_lat=13.0805&end_lon=80.2775"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "Feature"
    assert "distance_km" in data["properties"]
    assert "duration_minutes" in data["properties"]
    assert data["geometry"]["type"] == "LineString"
    assert len(data["geometry"]["coordinates"]) >= 2
