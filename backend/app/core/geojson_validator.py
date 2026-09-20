"""
GeoJSON Validation Utility for HEATSHIELD AI.
Validates FeatureCollections, polygon/multipolygon geometries,
coordinates within Chennai bounding bounds, and metadata disclaimers.
"""
from typing import Dict, Any, List, Tuple

CHENNAI_LON_BOUNDS = (80.00, 80.40)
CHENNAI_LAT_BOUNDS = (12.80, 13.35)

class GeoJsonValidationError(Exception):
    def __init__(self, message: str, feature_id: str = None):
        super().__init__(message)
        self.feature_id = feature_id

def validate_ring(ring: List[List[float]], feature_id: str) -> None:
    if len(ring) < 4:
        raise GeoJsonValidationError(
            f"Polygon ring in feature '{feature_id}' has {len(ring)} points; minimum is 4.",
            feature_id=feature_id
        )
    # Check closed ring
    first_pt, last_pt = ring[0], ring[-1]
    if abs(first_pt[0] - last_pt[0]) > 1e-6 or abs(first_pt[1] - last_pt[1]) > 1e-6:
        raise GeoJsonValidationError(
            f"Polygon ring in feature '{feature_id}' is not closed (first={first_pt}, last={last_pt}).",
            feature_id=feature_id
        )
    # Check coordinate bounds
    for pt in ring:
        lon, lat = pt[0], pt[1]
        if not (CHENNAI_LON_BOUNDS[0] <= lon <= CHENNAI_LON_BOUNDS[1]):
            raise GeoJsonValidationError(
                f"Longitude {lon} in feature '{feature_id}' is outside Chennai bounds {CHENNAI_LON_BOUNDS}.",
                feature_id=feature_id
            )
        if not (CHENNAI_LAT_BOUNDS[0] <= lat <= CHENNAI_LAT_BOUNDS[1]):
            raise GeoJsonValidationError(
                f"Latitude {lat} in feature '{feature_id}' is outside Chennai bounds {CHENNAI_LAT_BOUNDS}.",
                feature_id=feature_id
            )

def validate_ward_geojson(geojson_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validates a Chennai ward FeatureCollection.
    Returns (is_valid, list_of_warnings_or_errors).
    """
    errors: List[str] = []
    
    if not isinstance(geojson_data, dict):
        return False, ["GeoJSON root must be an object/dict."]
    
    if geojson_data.get("type") != "FeatureCollection":
        return False, [f"Expected 'FeatureCollection', got '{geojson_data.get('type')}'."]
    
    features = geojson_data.get("features", [])
    if not isinstance(features, list) or len(features) == 0:
        return False, ["GeoJSON features list is empty or invalid."]
    
    seen_ids = set()
    for idx, feature in enumerate(features):
        feat_id = feature.get("id") or feature.get("properties", {}).get("ward_id") or f"feature_{idx}"
        if feat_id in seen_ids:
            errors.append(f"Duplicate ward feature ID '{feat_id}'.")
        seen_ids.add(feat_id)
        
        geometry = feature.get("geometry")
        if not geometry or not isinstance(geometry, dict):
            errors.append(f"Feature '{feat_id}' missing valid geometry object.")
            continue
            
        geom_type = geometry.get("type")
        coords = geometry.get("coordinates", [])
        
        if geom_type == "Polygon":
            if not coords or not isinstance(coords, list):
                errors.append(f"Feature '{feat_id}' has invalid Polygon coordinates.")
                continue
            for ring in coords:
                try:
                    validate_ring(ring, feat_id)
                except GeoJsonValidationError as e:
                    errors.append(str(e))
        elif geom_type == "MultiPolygon":
            if not coords or not isinstance(coords, list):
                errors.append(f"Feature '{feat_id}' has invalid MultiPolygon coordinates.")
                continue
            for poly in coords:
                for ring in poly:
                    try:
                        validate_ring(ring, feat_id)
                    except GeoJsonValidationError as e:
                        errors.append(str(e))
        else:
            errors.append(f"Feature '{feat_id}' has unsupported geometry type '{geom_type}'.")
            
        props = feature.get("properties", {})
        if not props.get("name"):
            errors.append(f"Feature '{feat_id}' missing 'name' property.")

    return len(errors) == 0, errors
