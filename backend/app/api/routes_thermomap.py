"""
ThermoMap GIS & H3 Risk API Endpoints
Provides GeoJSON FeatureCollections for H3 hexagonal risk grid,
OSM emergency facilities, and in-map OSRM routing.
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status, Depends
import httpx

from app.services.h3_service import generate_thermomap_geojson, generate_street_thermal_geojson
from app.services.india_grid_service import generate_india_grid_geojson, generate_3d_thermal_terrain_data
from app.services.overpass_service import fetch_osm_facilities
from app.core.auth import get_current_actor, require_roles, CurrentActor, UserRole

router = APIRouter(prefix="/thermomap", tags=["ThermoMap 2D GIS"])


@router.get("/risk")
def get_thermomap_risk(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Center latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Center longitude"),
    radius_km: float = Query(6.0, gt=0.5, le=30.0, description="Grid radius in km"),
    resolution: int = Query(8, ge=6, le=10, description="H3 hexagon resolution (recommended: 8)"),
    time_of_day: str = Query("afternoon", pattern="^(morning|afternoon|evening|night)$", description="Diurnal time period")
) -> Dict[str, Any]:
    """
    Returns an H3 hexagonal grid FeatureCollection centered on coordinates.
    Each hexagon feature contains real biometeorological metrics (WBGT, UTCI, HI, HTSI),
    satellite LST vs AI-estimated air temperature, and ergonomic work-rest guidance.
    """
    try:
        return generate_thermomap_geojson(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            resolution=resolution,
            time_of_day=time_of_day
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate H3 thermal grid: {str(exc)}"
        )


@router.get("/streets")
def get_thermomap_streets(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Center latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Center longitude"),
    radius_km: float = Query(4.0, gt=0.5, le=20.0, description="Radius in km"),
    time_of_day: str = Query("afternoon", pattern="^(morning|afternoon|evening|night)$", description="Diurnal time period")
) -> Dict[str, Any]:
    """
    Returns street road segments overlaid with localized thermal conditions (Air Temp, LST, WBGT).
    """
    try:
        return generate_street_thermal_geojson(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            time_of_day=time_of_day
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate street thermal data: {str(exc)}"
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


@router.get("/india-grid")
def get_india_thermal_grid(
    min_lat: float = Query(8.0, ge=5.0, le=40.0, description="Minimum latitude"),
    min_lon: float = Query(68.0, ge=65.0, le=100.0, description="Minimum longitude"),
    max_lat: float = Query(37.2, ge=5.0, le=40.0, description="Maximum latitude"),
    max_lon: float = Query(97.5, ge=65.0, le=100.0, description="Maximum longitude"),
    zoom: float = Query(5.0, ge=1.0, le=19.0, description="Map viewport zoom level"),
    time_of_day: str = Query("afternoon", pattern="^(morning|afternoon|evening|night)$", description="Diurnal period")
) -> Dict[str, Any]:
    """
    Returns an auto-aligned nationwide or regional thermal grid covering India.
    Each cell contains simulated regional temperatures (in proper degrees °C)
    ready to plug into live IMD/Open-Meteo API keys.
    """
    try:
        return generate_india_grid_geojson(
            min_lat=min_lat,
            min_lon=min_lon,
            max_lat=max_lat,
            max_lon=max_lon,
            zoom=zoom,
            time_of_day=time_of_day
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate India thermal grid: {str(exc)}"
        )


@router.get("/3d-command")
def get_3d_thermal_command_data(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Center latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Center longitude"),
    radius_km: float = Query(8.0, gt=0.5, le=30.0, description="Plume radius in km"),
    time_of_day: str = Query("afternoon", pattern="^(morning|afternoon|evening|night)$", description="Diurnal period"),
    actor: CurrentActor = Depends(require_roles([UserRole.MUNICIPAL_OFFICER, UserRole.ADMIN]))
) -> Dict[str, Any]:
    """
    Returns 3D thermal dispersion plume geometries and sensor telemetry
    modeled for the Municipal Officer 3D Topographical Thermal Command Center.
    Strictly restricted to Municipal Officers and Administrators.
    """
    try:
        return generate_3d_thermal_terrain_data(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            time_of_day=time_of_day
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate 3D thermal command data: {str(exc)}"
        )


