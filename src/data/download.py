"""Data Acquisition Module for ERA5 / ERA5-Land Meteorological Data.

Retrieves official ERA5 reanalysis data for multiple geographic locations (Districts and Wards)
covering the full study period (2014-2024). Features caching, automated retries, and rate limit handling.
"""

import os
import json
import time
import logging
import urllib.request
import urllib.error
import yaml
import pandas as pd
from typing import Dict, List, Any, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("src.data.download")

DEFAULT_CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "configs", "experiment_config.yaml")
RAW_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "raw")
GEOJSON_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "geojson", "chennai_wards.geojson")

def load_config(config_path: str = DEFAULT_CONFIG_PATH) -> Dict[str, Any]:
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def get_ward_locations_from_geojson(geojson_path: str = GEOJSON_PATH) -> List[Dict[str, Any]]:
    """Extracts ward locations and coordinates from the official/prototype ward boundaries GeoJSON."""
    if not os.path.exists(geojson_path):
        logger.warning(f"GeoJSON not found at {geojson_path}")
        return []
    with open(geojson_path, "r") as f:
        data = json.load(f)
    wards = []
    for feat in data.get("features", []):
        props = feat.get("properties", {})
        ward_id = props.get("ward_id") or feat.get("id")
        name = props.get("name", ward_id)
        lat = props.get("latitude")
        lon = props.get("longitude")
        if lat is not None and lon is not None:
            wards.append({
                "id": ward_id,
                "name": f"Ward - {name}",
                "type": "ward",
                "parent_id": "loc_chennai",
                "district": "Chennai",
                "category": "coastal",
                "latitude": float(lat),
                "longitude": float(lon),
                "population": props.get("total_population", 200000),
                "builtup_surface_fraction": props.get("builtup_surface_fraction", 0.70)
            })
    return wards

def fetch_era5_location_data(
    location_id: str,
    lat: float,
    lon: float,
    start_date: str = "2014-01-01",
    end_date: str = "2024-12-31",
    raw_dir: str = RAW_DATA_DIR,
    force_refresh: bool = False
) -> pd.DataFrame:
    """Fetches daily ERA5/ERA5-Land reanalysis from Open-Meteo Archive API or loads cached parquet/csv."""
    os.makedirs(raw_dir, exist_ok=True)
    cache_file = os.path.join(raw_dir, f"era5_{location_id}.parquet")
    csv_fallback = os.path.join(raw_dir, f"era5_{location_id}.csv")

    if not force_refresh:
        if os.path.exists(cache_file):
            logger.info(f"Loading cached ERA5 data for {location_id} from {cache_file}")
            return pd.read_parquet(cache_file)
        elif os.path.exists(csv_fallback):
            logger.info(f"Loading cached ERA5 data for {location_id} from {csv_fallback}")
            return pd.read_csv(csv_fallback, parse_dates=["time"])

    daily_vars = [
        "temperature_2m_max",
        "temperature_2m_min",
        "temperature_2m_mean",
        "apparent_temperature_max",
        "apparent_temperature_min",
        "apparent_temperature_mean",
        "precipitation_sum",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "wind_direction_10m_dominant",
        "shortwave_radiation_sum",
        "surface_pressure_mean"
    ]
    vars_str = ",".join(daily_vars)
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={lat:.4f}&longitude={lon:.4f}&"
        f"start_date={start_date}&end_date={end_date}&"
        f"daily={vars_str}&"
        f"timezone=Asia%2FKolkata"
    )

    max_retries = 5
    for attempt in range(max_retries):
        try:
            logger.info(f"Fetching ERA5 reanalysis for {location_id} ({lat}, {lon}) [Attempt {attempt+1}/{max_retries}]...")
            req = urllib.request.Request(url, headers={"User-Agent": "HeatwavePredictionResearch/1.0"})
            with urllib.request.urlopen(req, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
            
            daily_dict = payload.get("daily", {})
            if not daily_dict or "time" not in daily_dict:
                raise ValueError(f"Malformed response payload for {location_id}: {payload}")

            df = pd.DataFrame(daily_dict)
            df["time"] = pd.to_datetime(df["time"])
            df["location_id"] = location_id
            df["latitude"] = lat
            df["longitude"] = lon
            df["data_source"] = "ECMWF_ERA5_Reanalysis"

            try:
                df.to_parquet(cache_file, index=False)
            except Exception:
                pass
            df.to_csv(csv_fallback, index=False)
                
            logger.info(f"Successfully retrieved {len(df)} records for {location_id}")
            time.sleep(3.5) # Polite delay between requests
            return df
        except urllib.error.HTTPError as http_err:
            if http_err.code == 429:
                sleep_secs = 25.0 * (attempt + 1)
                logger.warning(f"HTTP 429 Rate Limit for {location_id}. Sleeping {sleep_secs}s before retry...")
                time.sleep(sleep_secs)
            else:
                logger.warning(f"HTTP Error {http_err.code} for {location_id}: {http_err.reason}")
                time.sleep(5.0)
        except Exception as exc:
            logger.warning(f"Error fetching data for {location_id}: {exc}")
            if attempt < max_retries - 1:
                sleep_secs = 5.0 * (attempt + 1)
                logger.info(f"Sleeping {sleep_secs}s before retry...")
                time.sleep(sleep_secs)
            else:
                raise RuntimeError(f"Failed to fetch ERA5 data for {location_id} after {max_retries} attempts.") from exc

def download_all_locations(config_path: str = DEFAULT_CONFIG_PATH, force_refresh: bool = False) -> Dict[str, pd.DataFrame]:
    """Downloads meteorological reanalysis data for all districts and ward locations."""
    cfg = load_config(config_path)
    locations = cfg.get("geographic", {}).get("locations", [])
    wards = get_ward_locations_from_geojson()
    all_locations = locations + wards

    start_date = cfg.get("temporal", {}).get("start_date", "2014-01-01")
    end_date = cfg.get("temporal", {}).get("end_date", "2024-12-31")

    datasets = {}
    logger.info(f"Starting acquisition for {len(all_locations)} total locations ({len(locations)} districts + {len(wards)} wards)...")
    for loc in all_locations:
        loc_id = loc["id"]
        lat = loc["latitude"]
        lon = loc["longitude"]
        df = fetch_era5_location_data(
            location_id=loc_id,
            lat=lat,
            lon=lon,
            start_date=start_date,
            end_date=end_date,
            force_refresh=force_refresh
        )
        datasets[loc_id] = df

    logger.info(f"All {len(datasets)} location datasets ready.")
    return datasets

if __name__ == "__main__":
    download_all_locations()
