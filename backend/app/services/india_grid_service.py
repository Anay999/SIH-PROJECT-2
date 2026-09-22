"""
Pan-India Thermal Grid & Municipal 3D Thermal Terrain Service
Generates geographically aligned spatial grid cells covering India (Lat 8°-37°N, Lon 68°-97.5°E)
with regional microclimate modeling, diurnal variation, and 3D thermal plume dispersion contours.
Architecture is designed with a provider abstraction ready for live IMD/Open-Meteo API keys.
"""
from datetime import datetime, timezone
import math
from typing import Dict, Any, List, Optional, Tuple

from app.engines.heat_index_engine import calculate_heat_index
from app.engines.wbgt_engine import calculate_wbgt
from app.engines.utci_engine import calculate_utci
from app.engines.htsi_engine import calculate_htsi


# Geographic bounding box of India
INDIA_BBOX = {
    "min_lon": 68.0,
    "min_lat": 8.0,
    "max_lon": 97.5,
    "max_lat": 37.2
}

# Major cities in India with their primary climate baseline and coordinates
INDIAN_ANCHORS = [
    {"city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707, "type": "coastal"},
    {"city": "Kavaraipettai", "state": "Tamil Nadu", "lat": 13.357, "lon": 80.170, "type": "coastal"},
    {"city": "New Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090, "type": "gangetic"},
    {"city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777, "type": "coastal"},
    {"city": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639, "type": "gangetic_delta"},
    {"city": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946, "type": "plateau"},
    {"city": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867, "type": "deccan"},
    {"city": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714, "type": "arid"},
    {"city": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "type": "arid"},
    {"city": "Jodhpur", "state": "Rajasthan", "lat": 26.2389, "lon": 73.0243, "type": "desert"},
    {"city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462, "type": "gangetic"},
    {"city": "Patna", "state": "Bihar", "lat": 25.5941, "lon": 85.1376, "type": "gangetic"},
    {"city": "Srinagar", "state": "Jammu & Kashmir", "lat": 34.0837, "lon": 74.7973, "type": "alpine"},
    {"city": "Shimla", "state": "Himachal Pradesh", "lat": 31.1048, "lon": 77.1734, "type": "alpine"},
    {"city": "Guwahati", "state": "Assam", "lat": 26.1445, "lon": 91.7362, "type": "ne_tropical"},
    {"city": "Bhubaneswar", "state": "Odisha", "lat": 20.2961, "lon": 85.8245, "type": "coastal"},
    {"city": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lon": 79.0882, "type": "central"},
    {"city": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126, "type": "central"},
    {"city": "Kochi", "state": "Kerala", "lat": 9.9312, "lon": 76.2673, "type": "coastal_humid"}
]


def get_nearest_anchor_city(lat: float, lon: float) -> Tuple[str, str, str]:
    """Finds the closest reference city, state, and geographic type for coordinates."""
    min_dist = 999999.0
    best = ("Central District", "India", "central")
    for a in INDIAN_ANCHORS:
        d = math.hypot(lat - a["lat"], lon - a["lon"])
        if d < min_dist:
            min_dist = d
            best = (a["city"], a["state"], a["type"])
    return best


def get_india_regional_climate(
    lat: float,
    lon: float,
    time_of_day: str = "afternoon"
) -> Dict[str, Any]:
    """
    Computes realistic physical temperatures for any coordinate in India based on
    geographic climate zones, latitude, elevation proxies, coastal proximity, and diurnal curves.
    """
    nearest_city, state_name, geo_type = get_nearest_anchor_city(lat, lon)

    # 1. Base regional temperature zones (Peak Afternoon Base)
    if lat >= 31.0:
        # Himalayan / Northern Alpine Zone (J&K, Ladakh, HP, Uttarakhand)
        region = "Western Himalayan Alpine Zone"
        base_air = 21.5
        base_lst = 23.0
        base_rh = 48.0
        wind = 3.8
        solar = 700.0
    elif lat >= 27.5 and lon >= 88.0:
        # Eastern Himalayan (Sikkim, Arunachal)
        region = "Eastern Himalayan Mountain Belt"
        base_air = 23.0
        base_lst = 24.5
        base_rh = 68.0
        wind = 2.9
        solar = 650.0
    elif 23.5 <= lat <= 29.5 and 68.0 <= lon <= 75.5:
        # Thar Desert & Semi-Arid Heatwave Belt (Rajasthan, Kutch)
        region = "Thar Desert & Semi-Arid Heatwave Belt"
        base_air = 44.8
        base_lst = 51.5
        base_rh = 28.0
        wind = 4.2
        solar = 980.0
    elif 24.5 <= lat <= 29.5 and 76.0 <= lon <= 88.0:
        # Indo-Gangetic Plains (Delhi, Haryana, UP, Bihar)
        region = "Indo-Gangetic High-Humidity Heat Corridor"
        base_air = 41.6
        base_lst = 47.8
        base_rh = 64.0
        wind = 2.4
        solar = 910.0
    elif (lon <= 73.6 and lat < 21.0) or (lon >= 80.0 and lat < 18.0) or (lat <= 11.5):
        # Coastal Peninsula (Mumbai, Goa, Kerala, Tamil Nadu, Andhra, Odisha)
        region = "Peninsular Coastal High-Humidity Belt"
        base_air = 35.8
        base_lst = 41.2
        base_rh = 76.0
        wind = 4.5
        solar = 860.0
    elif 16.0 <= lat < 24.5 and 75.0 <= lon <= 82.5:
        # Deccan Plateau & Central India (MP, Maharashtra, Telangana)
        region = "Deccan Plateau Continental Semi-Arid Zone"
        base_air = 41.2
        base_lst = 46.5
        base_rh = 42.0
        wind = 2.8
        solar = 930.0
    elif lon > 89.0:
        # North-Eastern Tropical Belt (Assam, Meghalaya, etc.)
        region = "North-Eastern Tropical Rain Forest Belt"
        base_air = 31.5
        base_lst = 33.8
        base_rh = 78.0
        wind = 2.1
        solar = 750.0
    else:
        # Southern Peninsula Inland (Karnataka, Interior TN)
        region = "Southern Peninsular Inland Plateau"
        base_air = 36.5
        base_lst = 42.0
        base_rh = 58.0
        wind = 3.0
        solar = 880.0

    # 2. Diurnal Temporal Offsets
    if time_of_day == "morning":
        air_temp = round(base_air - 8.5, 1)
        lst_temp = round(base_lst - 14.2, 1)
        rh = min(95.0, round(base_rh + 18.0, 1))
        solar = max(100.0, round(solar * 0.4, 1))
    elif time_of_day == "evening":
        air_temp = round(base_air - 4.5, 1)
        lst_temp = round(base_lst - 8.0, 1)
        rh = min(90.0, round(base_rh + 10.0, 1))
        solar = max(50.0, round(solar * 0.2, 1))
    elif time_of_day == "night":
        air_temp = round(base_air - 11.2, 1)
        lst_temp = round(air_temp - 1.5, 1)
        rh = min(96.0, round(base_rh + 24.0, 1))
        solar = 0.0
    else:
        # Peak Afternoon
        air_temp = base_air
        lst_temp = base_lst
        rh = base_rh

    # Controlled local spatial variation based on coordinates
    spatial_noise = (math.sin(lat * 8.0) * 0.8) + (math.cos(lon * 8.0) * 0.6)
    air_temp = round(air_temp + spatial_noise, 1)
    if solar > 0:
        lst_temp = round(max(air_temp + 1.5, lst_temp + (spatial_noise * 1.2)), 1)
    else:
        lst_temp = round(air_temp - 1.2 + (spatial_noise * 0.4), 1)

    # 3. Biometeorological Calculations
    hi_result = calculate_heat_index(air_temp, rh)
    wbgt_result = calculate_wbgt(
        air_temp_c=air_temp,
        relative_humidity=rh,
        wind_speed_m_s=wind,
        solar_radiation_w_m2=solar,
        environment="outdoor"
    )
    utci_result = calculate_utci(
        air_temp_c=air_temp,
        relative_humidity=rh,
        wind_speed_10m_ms=wind,
        solar_radiation_w_m2=solar
    )
    htsi_result = calculate_htsi(
        heat_index_c=hi_result.value_c,
        wbgt_c=wbgt_result.wbgt_c,
        utci_c=utci_result.utci_c,
        consecutive_hot_days=3 if air_temp > 40 else 1,
        min_night_temp_c=28.0 if time_of_day == "night" else 26.0,
        vulnerability_score=50.0
    )

    score = htsi_result.htsi_score
    # IMD severe heatwave criteria: air_temp >= 44.0°C or (air_temp >= 42.0°C with severe LST)
    if air_temp >= 44.0 or lst_temp >= 49.0:
        score = max(score, 78.0)
    elif air_temp >= 40.0:
        score = max(score, 65.0)

    if score < 40.0:
        category = "LOW"
        color = "#10b981"
    elif score < 60.0:
        category = "MODERATE"
        color = "#f59e0b"
    elif score < 75.0:
        category = "HIGH"
        color = "#f97316"
    elif score < 88.0:
        category = "VERY HIGH"
        color = "#ea580c"
    else:
        category = "EXTREME"
        color = "#b91c1c"

    # Air temp color threshold
    if air_temp > 42.0:
        temp_color = "#b91c1c"
    elif air_temp > 39.0:
        temp_color = "#ea580c"
    elif air_temp > 35.0:
        temp_color = "#f97316"
    elif air_temp > 32.0:
        temp_color = "#f59e0b"
    elif air_temp > 28.0:
        temp_color = "#10b981"
    else:
        temp_color = "#06b6d4"

    return {
        "region_name": region,
        "state_name": state_name,
        "nearest_city": nearest_city,
        "air_temperature_c": air_temp,
        "land_surface_temp_c": lst_temp,
        "relative_humidity": rh,
        "wind_speed_kmh": round(wind * 3.6, 1),
        "wbgt_c": wbgt_result.wbgt_c,
        "utci_c": utci_result.utci_c,
        "heat_index_c": hi_result.value_c,
        "htsi_score": score,
        "risk_category": category,
        "color": color,
        "temp_color": temp_color,
        "time_of_day": time_of_day
    }


def generate_india_grid_geojson(
    min_lat: float,
    min_lon: float,
    max_lat: float,
    max_lon: float,
    zoom: float = 5.0,
    time_of_day: str = "afternoon"
) -> Dict[str, Any]:
    """
    Generates an auto-aligned Cartesian lined grid spanning India or a visible viewport
    within India boundaries. Grid steps automatically adjust based on zoom to ensure
    high performance and smooth rendering without browser lag.
    """
    # Clamp bounds to India geographical extent
    c_min_lat = max(INDIA_BBOX["min_lat"], min_lat)
    c_max_lat = min(INDIA_BBOX["max_lat"], max_lat)
    c_min_lon = max(INDIA_BBOX["min_lon"], min_lon)
    c_max_lon = min(INDIA_BBOX["max_lon"], max_lon)

    if c_min_lat >= c_max_lat or c_min_lon >= c_max_lon:
        # Fallback to whole India if bounds are reversed or outside
        c_min_lat, c_max_lat = INDIA_BBOX["min_lat"], INDIA_BBOX["max_lat"]
        c_min_lon, c_max_lon = INDIA_BBOX["min_lon"], INDIA_BBOX["max_lon"]

    # Auto-align step sizes based on zoom
    if zoom <= 6.0:
        step = 0.65  # National scale (~70km cells, ~1,200 cells for all of India)
    elif zoom <= 8.5:
        step = 0.25  # Regional state scale (~27km cells)
    elif zoom <= 11.0:
        step = 0.08  # District scale (~9km cells)
    else:
        step = 0.025 # City/local scale (~2.7km cells)

    # Quantize start and end coordinates so cells auto-align seamlessly
    grid_start_lat = math.floor(c_min_lat / step) * step
    grid_end_lat = math.ceil(c_max_lat / step) * step
    grid_start_lon = math.floor(c_min_lon / step) * step
    grid_end_lon = math.ceil(c_max_lon / step) * step

    # Cap max cell count to protect client performance (limit 2,000 cells max)
    lat_steps = int(round((grid_end_lat - grid_start_lat) / step))
    lon_steps = int(round((grid_end_lon - grid_start_lon) / step))
    if (lat_steps * lon_steps) > 2200:
        # Expand step dynamically to maintain under 2,000 cells
        step = max(step * 2.0, 0.5)
        grid_start_lat = math.floor(c_min_lat / step) * step
        grid_end_lat = math.ceil(c_max_lat / step) * step
        grid_start_lon = math.floor(c_min_lon / step) * step
        grid_end_lon = math.ceil(c_max_lon / step) * step

    features = []
    now_iso = datetime.now(timezone.utc).isoformat()

    r = 0
    cur_lat = grid_start_lat
    while cur_lat < grid_end_lat:
        next_lat = round(cur_lat + step, 5)
        mid_lat = round((cur_lat + next_lat) / 2.0, 5)

        c = 0
        cur_lon = grid_start_lon
        while cur_lon < grid_end_lon:
            next_lon = round(cur_lon + step, 5)
            mid_lon = round((cur_lon + next_lon) / 2.0, 5)

            # Compute regional climate for cell center
            climate = get_india_regional_climate(mid_lat, mid_lon, time_of_day)

            cell_id = f"IN_R{int(round(cur_lat*100)):04d}_C{int(round(cur_lon*100)):04d}"
            sector_name = f"{climate['nearest_city']} Sector ({climate['state_name']})"

            # Closed 5-point polygon ring
            poly_coords = [
                [
                    [round(cur_lon, 5), round(next_lat, 5)],
                    [round(next_lon, 5), round(next_lat, 5)],
                    [round(next_lon, 5), round(cur_lat, 5)],
                    [round(cur_lon, 5), round(cur_lat, 5)],
                    [round(cur_lon, 5), round(next_lat, 5)]
                ]
            ]

            features.append({
                "type": "Feature",
                "id": cell_id,
                "properties": {
                    "cell_id": cell_id,
                    "grid_id": cell_id,
                    "h3_index": cell_id, # Backwards compatibility
                    "center_lat": mid_lat,
                    "center_lon": mid_lon,
                    "state_name": climate["state_name"],
                    "nearest_city": climate["nearest_city"],
                    "street_name": sector_name,
                    "region_name": climate["region_name"],
                    "air_temperature_c": climate["air_temperature_c"],
                    "land_surface_temp_c": climate["land_surface_temp_c"],
                    "temperature_c": climate["air_temperature_c"],
                    "feels_like_c": climate["heat_index_c"],
                    "relative_humidity": climate["relative_humidity"],
                    "wind_speed_kmh": climate["wind_speed_kmh"],
                    "wbgt_c": climate["wbgt_c"],
                    "utci_c": climate["utci_c"],
                    "heat_index_c": climate["heat_index_c"],
                    "htsi_score": climate["htsi_score"],
                    "risk_score": climate["htsi_score"],
                    "risk_category": climate["risk_category"],
                    "color": climate["color"],
                    "temp_color": climate["temp_color"],
                    "time_of_day": time_of_day,
                    "data_status": "Simulated Regional Indian Climate Model (Demo Data)",
                    "data_source": "ThermoSafe AI Pan-India Spatial Engine",
                    "updated_at": now_iso
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": poly_coords
                }
            })

            cur_lon = next_lon
            c += 1

        cur_lat = next_lat
        r += 1

    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "country": "India",
            "bbox": [c_min_lon, c_min_lat, c_max_lon, c_max_lat],
            "step_degrees": step,
            "cell_count": len(features),
            "zoom": zoom,
            "time_of_day": time_of_day,
            "generated_at": now_iso,
            "data_status": "Mock / Simulated Data (Ready for IMD/Open-Meteo API Keys)",
            "disclaimer": "Temperatures are calibrated development simulations based on Indian geographical zones. Connect verified API keys for live readings."
        }
    }


def generate_3d_thermal_terrain_data(
    latitude: float,
    longitude: float,
    radius_km: float = 8.0,
    time_of_day: str = "afternoon"
) -> Dict[str, Any]:
    """
    Generates high-resolution 3D thermal dispersion plume geometries and radar emission
    contours centered on a municipal jurisdiction for the Municipal Officer 3D Command Center.
    Matches the user reference screenshot (AARTOS 3D Command Center style).
    """
    profile_climate = get_india_regional_climate(latitude, longitude, time_of_day)
    base_air = profile_climate["air_temperature_c"]
    base_lst = profile_climate["land_surface_temp_c"]

    # 1. Concentric multi-band thermal dispersion plume rings
    # Bands: Core (intense red), Plume (orange), Dispersion (yellow), Ambient (cyan)
    plume_bands = [
        {"name": "Core Thermal Emission", "radius_factor": 0.22, "temp_delta": +4.5, "color": "#b91c1c", "opacity": 0.85, "level": "CRITICAL"},
        {"name": "Near-Core Heat Dome", "radius_factor": 0.45, "temp_delta": +2.8, "color": "#ea580c", "opacity": 0.75, "level": "EXTREME"},
        {"name": "Intermediate Heat Plume", "radius_factor": 0.72, "temp_delta": +1.2, "color": "#f97316", "opacity": 0.65, "level": "HIGH"},
        {"name": "Urban Heat Dispersion Buffer", "radius_factor": 1.0, "temp_delta": -0.5, "color": "#f59e0b", "opacity": 0.50, "level": "MODERATE"},
        {"name": "Ambient Microclimate Margin", "radius_factor": 1.35, "temp_delta": -2.2, "color": "#10b981", "opacity": 0.35, "level": "LOW"},
    ]

    features = []
    lat_deg = radius_km / 111.0
    lon_deg = radius_km / (111.0 * max(0.2, math.cos(math.radians(latitude))))

    for idx, band in enumerate(plume_bands):
        # Generate an elliptical / topographic contour polygon simulating prevailing wind direction
        r_lat = lat_deg * band["radius_factor"]
        r_lon = lon_deg * band["radius_factor"]
        num_pts = 36
        ring = []

        for i in range(num_pts):
            theta = (i / num_pts) * 2.0 * math.pi
            # Wind distortion plume: stretches downwind towards northeast
            wind_distortion = 1.0 + (0.35 * math.sin(theta))
            d_lat = r_lat * math.sin(theta) * wind_distortion
            d_lon = r_lon * math.cos(theta) * wind_distortion
            ring.append([round(longitude + d_lon, 5), round(latitude + d_lat, 5)])

        # Close polygon
        ring.append(ring[0])

        b_air = round(base_air + band["temp_delta"], 1)
        b_lst = round(base_lst + (band["temp_delta"] * 1.3), 1)

        elevation_offsets = [260, 190, 130, 80, 25]
        elev = elevation_offsets[idx] if idx < len(elevation_offsets) else 30
        disp_rates = ["94.2%", "81.6%", "65.4%", "44.1%", "22.8%"]
        disp_rate = disp_rates[idx] if idx < len(disp_rates) else "30%"

        features.append({
            "type": "Feature",
            "id": f"plume-band-{idx + 1}",
            "properties": {
                "band": idx + 1,
                "band_index": idx,
                "band_name": band["name"],
                "risk_level": band["level"],
                "air_temperature_c": b_air,
                "surface_temp_c": b_lst,
                "land_surface_temp_c": b_lst,
                "wbgt_c": round(profile_climate["wbgt_c"] + band["temp_delta"] * 0.7, 1),
                "utci_c": round(profile_climate["utci_c"] + band["temp_delta"] * 0.9, 1),
                "htsi_score": round(max(10, min(100, profile_climate["htsi_score"] + (4 - idx) * 8.0)), 1),
                "risk_score": round(max(10, min(100, profile_climate["htsi_score"] + (4 - idx) * 8.0)), 1),
                "color": band["color"],
                "fill_opacity": band["opacity"],
                "elevation_offset_m": elev,
                "radius_km": round(radius_km * band["radius_factor"], 2),
                "dispersion_rate": disp_rate,
                "description": f"Concentric {band['name']} displaying {b_air}°C air temperature and {band['level']} heat dispersion."
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [ring]
            }
        })

    # 2. Add simulated thermal sensor / telemetry targets matching top tabs
    sensor_nodes = [
        {
            "id": "isolog_1",
            "name": "IsoLOG 1 - Directional RF/Heat Array",
            "lat": round(latitude + 0.0052, 5),
            "lon": round(longitude - 0.0041, 5),
            "elevation_m": 42.0,
            "temp_c": round(base_air + 1.2, 1),
            "status": "ONLINE",
            "classification": "Directional Radar Node",
            "freq": "2.4 GHz / 5.8 GHz",
            "signal_dbm": -42,
            "battery_pct": 98
        },
        {
            "id": "isolog_2",
            "name": "IsoLOG 2 - Radiation Radar Array",
            "lat": round(latitude - 0.0064, 5),
            "lon": round(longitude + 0.0068, 5),
            "elevation_m": 58.0,
            "temp_c": round(base_air + 3.1, 1),
            "status": "ACTIVE",
            "classification": "Multi-Sector Thermal Array",
            "freq": "9 kHz - 6 GHz",
            "signal_dbm": -38,
            "battery_pct": 95
        },
        {
            "id": "isolog_3",
            "name": "IsoLOG 3 - Substation Thermal Monitor",
            "lat": round(latitude + 0.0098, 5),
            "lon": round(longitude + 0.0051, 5),
            "elevation_m": 28.0,
            "temp_c": round(base_air + 2.4, 1),
            "status": "MONITORING",
            "classification": "Critical Substation Telemetry",
            "freq": "433 MHz Telemetry",
            "signal_dbm": -51,
            "battery_pct": 91
        },
        {
            "id": "spectran",
            "name": "Spectran V5 - Thermal Spectrum Analyzer",
            "lat": round(latitude - 0.0045, 5),
            "lon": round(longitude - 0.0078, 5),
            "elevation_m": 35.0,
            "temp_c": round(base_air - 0.8, 1),
            "status": "ONLINE",
            "classification": "Real-Time Spectrum Sensor",
            "freq": "I/Q 175MHz Stream",
            "signal_dbm": -46,
            "battery_pct": 100
        },
        {
            "id": "drone_detect",
            "name": "Thermal Sensor 3D - Drone Node",
            "lat": round(latitude + 0.0022, 5),
            "lon": round(longitude + 0.0089, 5),
            "elevation_m": 120.0,
            "temp_c": round(base_air + 0.4, 1),
            "status": "ONLINE",
            "classification": "Aerial UAV Sensor Pod",
            "freq": "5.8 GHz Telemetry",
            "signal_dbm": -55,
            "battery_pct": 84
        }
    ]

    target_features = []
    for t in sensor_nodes:
        target_features.append({
            "type": "Feature",
            "id": t["id"],
            "properties": {
                "target_id": t["id"],
                "name": t["name"],
                "temperature_c": t["temp_c"],
                "status": t["status"],
                "type": "sensor_node",
                "elevation_m": t["elevation_m"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [t["lon"], t["lat"]]
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features,
        "targets": sensor_nodes,
        "target_features": target_features,
        "metadata": {
            "center": [round(longitude, 5), round(latitude, 5)],
            "city": profile_climate["nearest_city"],
            "state": profile_climate["state_name"],
            "region": profile_climate["region_name"],
            "base_air_temp": base_air,
            "base_lst": base_lst,
            "time_of_day": time_of_day,
            "terrain_mode": "3D Topographical Thermal Plume",
            "command_center": "AARTOS-Style Municipal 3D Operations",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
