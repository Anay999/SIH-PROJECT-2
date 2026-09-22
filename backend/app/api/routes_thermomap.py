"""
ThermoMap GIS & H3 Risk API Endpoints
Provides GeoJSON FeatureCollections for H3 hexagonal risk grid,
OSM emergency facilities, and in-map OSRM routing.
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status
import httpx

from app.services.h3_service import generate_thermomap_geojson
from app.services.overpass_service import fetch_osm_facilities

router = APIRouter(prefix="/thermomap", tags=["ThermoMap 2D GIS"])


@router.get("/risk")
def get_thermomap_risk(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Center latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Center longitude"),
    radius_km: float = Query(6.0, gt=0.5, le=30.0, description="Grid radius in km"),
    resolution: int = Query(8, ge=6, le=10, description="H3 hexagon resolution (recommended: 8)")
) -> Dict[str, Any]:
    """
    Returns an H3 hexagonal grid FeatureCollection centered on coordinates.
    Each hexagon feature contains real biometeorological metrics (WBGT, UTCI, HI, HTSI)
    and ergonomic work-rest guidance.
    """
    try:
        return generate_thermomap_geojson(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            resolution=resolution
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate H3 thermal grid: {str(exc)}"
        )


@router.get("/facilities")
async def get_thermomap_facilities(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(8.0, gt=0.5, le=50.0)
) -> Dict[str, Any]:
    """
    Returns nearby hospitals, clinics, and municipal cooling shelters
    as a GeoJSON Point FeatureCollection from OpenStreetMap Overpass with local caching.
    """
    try:
        return await fetch_osm_facilities(
            center_lat=latitude,
            center_lon=longitude,
            radius_km=radius_km
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch facilities: {str(exc)}"
        )


@router.get("/routing")
async def get_emergency_route(
    start_lat: float = Query(..., ge=-90.0, le=90.0),
    start_lon: float = Query(..., ge=-180.0, le=180.0),
    end_lat: float = Query(..., ge=-90.0, le=90.0),
    end_lon: float = Query(..., ge=-180.0, le=180.0)
) -> Dict[str, Any]:
    """
    Calculates turn-by-turn road network route via OSRM.
    Returns distance in km, duration in minutes, and GeoJSON LineString geometry.
    """
    url = (
        f"https://router.project-osrm.org/route/v1/driving/"
        f"{start_lon},{start_lat};{end_lon},{end_lat}"
        f"?overview=full&geometries=geojson"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and len(data.get("routes", [])) > 0:
                    route = data["routes"][0]
                    distance_km = route["distance"] / 1000.0
                    duration_mins = round(route["duration"] / 60.0)
                    summary = route.get("legs", [{}])[0].get("summary", "Road Network")

                    return {
                        "type": "Feature",
                        "properties": {
                            "distance_km": round(distance_km, 2),
                            "duration_minutes": duration_mins,
                            "summary": summary,
                            "mode": "emergency_driving"
                        },
                        "geometry": route["geometry"]
                    }
    except Exception:
        pass

    # Fallback to straight-line geodesic line if OSRM is unreachable
    # Haversine distance
    import math
    dlat = math.radians(end_lat - start_lat)
    dlon = math.radians(end_lon - start_lon)
    a = (math.sin(dlat / 2) ** 2) + math.cos(math.radians(start_lat)) * math.cos(math.radians(end_lat)) * (math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    dist_km = round(6371.0 * c, 2)
    est_mins = max(3, round(dist_km * 2.5)) # ~25 km/h urban emergency transit

    return {
        "type": "Feature",
        "properties": {
            "distance_km": dist_km,
            "duration_minutes": est_mins,
            "summary": "Direct Geodesic Corridor",
            "mode": "fallback_direct"
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [start_lon, start_lat],
                [end_lon, end_lat]
            ]
        }
    }
