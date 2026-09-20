import os
import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.geojson_validator import validate_ward_geojson, CHENNAI_LON_BOUNDS, CHENNAI_LAT_BOUNDS

client = TestClient(app)

def test_chennai_wards_geojson_validity():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    geojson_path = os.path.join(base_dir, "data", "geojson", "chennai_wards.geojson")
    assert os.path.exists(geojson_path), f"GeoJSON file not found at {geojson_path}"

    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    is_valid, errors = validate_ward_geojson(data)
    assert is_valid is True, f"GeoJSON validation failed with errors: {errors}"
    assert len(errors) == 0
    assert len(data["features"]) == 15

def test_synthetic_boundary_disclaimers():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    geojson_path = os.path.join(base_dir, "data", "geojson", "chennai_wards.geojson")
    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data.get("is_synthetic") is True
    assert "disclaimer" in data
    assert "SYNTHETIC DEMONSTRATION WARD BOUNDARIES" in data["disclaimer"]

    for feature in data["features"]:
        props = feature["properties"]
        assert props.get("is_synthetic") is True
        assert "disclaimer" in props

def test_validator_rejects_unclosed_polygon():
    invalid_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": "ward_bad",
                "properties": {"name": "Bad Ward"},
                "geometry": {
                    "type": "Polygon",
                    # First point != last point
                    "coordinates": [[[80.20, 13.00], [80.25, 13.00], [80.25, 13.05], [80.21, 13.05]]]
                }
            }
        ]
    }
    is_valid, errors = validate_ward_geojson(invalid_geojson)
    assert is_valid is False
    assert any("not closed" in e for e in errors)

def test_validator_rejects_out_of_bounds_coordinates():
    out_of_bounds_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": "ward_oob",
                "properties": {"name": "OOB Ward"},
                "geometry": {
                    "type": "Polygon",
                    # Longitude 72.0 is in Mumbai/Arabian Sea, not Chennai
                    "coordinates": [[[72.80, 13.00], [72.85, 13.00], [72.85, 13.05], [72.80, 13.05], [72.80, 13.00]]]
                }
            }
        ]
    }
    is_valid, errors = validate_ward_geojson(out_of_bounds_geojson)
    assert is_valid is False
    assert any("outside Chennai bounds" in e for e in errors)

def test_gis_wards_endpoint_returns_polygons():
    res = client.get("/api/v1/gis/wards")
    assert res.status_code == 200
    data = res.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 15

    for f in data["features"]:
        geom = f["geometry"]
        assert geom["type"] in ["Polygon", "MultiPolygon"]
        assert len(geom["coordinates"]) >= 1
        # Check properties are populated
        props = f["properties"]
        assert "htsi_score" in props
        assert "wbgt_c" in props
        assert "air_temp_c" in props
        assert "hamri_score" in props
        assert "surge_index" in props
